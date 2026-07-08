<script lang="ts">
  // =========================================================================
  // SearchPalette — ⌘K / Ctrl+K modal that searches the static Pagefind index.
  //
  // Loaded lazily by Nav.astro with client:idle. The Pagefind bundle
  // (`/pagefind/pagefind.js`) is only fetched the first time the palette is
  // opened, keeping the initial page weight low.
  //
  // Source of truth: BLUEPRINT §2 + §5 (SearchPalette island).
  // =========================================================================

  import { onMount, tick } from "svelte";

  interface Props {
    /** نصوص الواجهة ثنائية اللغة. */
    locale?: "en" | "no";
    /** وسيلة إيضاح لزر الفتح (tooltip + aria-label). */
    buttonLabel?: string;
    /** هل يُعرض الزر في الـ navbar (false = لا زر، mount مُخفي). */
    showButton?: boolean;
  }

  let {
    locale = "en",
    buttonLabel = locale === "no" ? "Søk" : "Search",
    showButton = false,
  }: Props = $props();

  const strings = {
    en: {
      placeholder: "Search modules, blog, reference…",
      open: "Open search",
      close: "Close search",
      noResults: "No matches.",
      hint: "Press Enter to open · ↑↓ to navigate · Esc to close",
      loading: "Indexing…",
    },
    no: {
      placeholder: "Søk moduler, blogg, referanse…",
      open: "Åpne søk",
      close: "Lukk søk",
      noResults: "Ingen treff.",
      hint: "Trykk Enter for å åpne · ↑↓ for å navigere · Esc for å lukke",
      loading: "Indekserer …",
    },
  } as const;

  const t = $derived(strings[locale]);

  // ----- حالة المودال -----------------------------------------------------
  let open = $state(false);
  let query = $state("");
  let activeIndex = $state(0);
  let loading = $state(false);
  let results = $state<SearchResult[]>([]);
  let pagefindModule: PagefindModule | null = null;
  let inputEl: HTMLInputElement | undefined;
  let listEl: HTMLUListElement | undefined;
  let previouslyFocused: HTMLElement | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // ----- نوع نتائج البحث -------------------------------------------------
  interface SearchResult {
    url: string;
    title: string;
    excerpt: string;
    breadcrumb: string;
  }

  // نوع الـ Pagefind module المُحمَّل كسولًا.
  interface PagefindModule {
    search: (q: string) => Promise<{
      results: Array<{
        id: string;
        data: () => Promise<{
          url: string;
          meta: { title?: string };
          excerpt: string;
        }>;
      }>;
    }>;
    options?: (opts: Record<string, unknown>) => void;
  }

  // ----- فتح / إغلاق ----------------------------------------------------
  export function show() {
    openPalette();
  }

  async function openPalette() {
    if (open) return;
    previouslyFocused = document.activeElement as HTMLElement | null;
    open = true;
    await loadPagefind();
    await tick();
    inputEl?.focus();
    inputEl?.select();
  }

  function closePalette() {
    open = false;
    query = "";
    results = [];
    activeIndex = 0;
    previouslyFocused?.focus();
  }

  // ----- التحميل الكسول --------------------------------------------------
  async function loadPagefind() {
    if (pagefindModule) return;
    loading = true;
    try {
      // يبدأ بـ `/` لأن dist يُخدَم من الجذر. الملف موجود فقط في dist/ بعد
      // البناء (يولّده src/integrations/pagefind.ts postbuild) — وغير موجود
      // إطلاقًا في `astro dev`. نبني المسار من متغيّر لا سلسلة حرفية، لأن
      // Vite في وضع dev يحاول حلّ استيراد ديناميكي بسلسلة حرفية فورًا وقت
      // الترجمة حتى مع `@vite-ignore`، ما يُسقط خادم dev بالكامل. متغيّر غير
      // قابل للتحليل الساكن يتفادى ذلك، والبناء الإنتاجي (Rollup) لا يتأثر.
      const pagefindSrc = "/pagefind" + "/pagefind.js";
      // @ts-expect-error — Pagefind يضيف نفسه كـ global module بدون types.
      pagefindModule = (await import(/* @vite-ignore */ pagefindSrc)) as PagefindModule;
      // تخفيض أصوات الـ network chatter — نطلب 8 نتائج فقط، ونسحب البيانات عند الحاجة.
      pagefindModule.options?.({ excerptLength: 30 });
    } catch (err) {
      console.error("[SearchPalette] failed to load pagefind.js", err);
      results = [];
    } finally {
      loading = false;
    }
  }

  // ----- البحث مع debounce ----------------------------------------------
  $effect(() => {
    const q = query.trim();
    if (!open) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!q) {
      results = [];
      activeIndex = 0;
      return;
    }
    debounceTimer = setTimeout(() => runSearch(q), 150);
  });

  async function runSearch(q: string) {
    if (!pagefindModule) {
      await loadPagefind();
      if (!pagefindModule) return;
    }
    try {
      const res = await pagefindModule.search(q);
      const top = res.results.slice(0, 8);
      const detailed = await Promise.all(top.map((r) => r.data()));
      results = detailed.map((d) => {
        const title = d.meta?.title ?? cleanUrl(d.url);
        const breadcrumb = buildBreadcrumb(d.url);
        return { url: d.url, title, excerpt: stripTags(d.excerpt), breadcrumb };
      });
      activeIndex = 0;
      await tick();
      scrollActiveIntoView();
    } catch (err) {
      console.error("[SearchPalette] search failed", err);
      results = [];
    }
  }

  // ----- التنقل بالأسهم + Enter ----------------------------------------
  async function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length) {
        activeIndex = (activeIndex + 1) % results.length;
        await tick();
        scrollActiveIntoView();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) {
        activeIndex = (activeIndex - 1 + results.length) % results.length;
        await tick();
        scrollActiveIntoView();
      }
      return;
    }
    if (e.key === "Enter") {
      if (results[activeIndex]) {
        e.preventDefault();
        navigateTo(results[activeIndex].url);
      }
      return;
    }
    // عندما يضغط المستخدم Tab في المودال — أبقِ التركيز داخله (focus trap بدائي).
    if (e.key === "Tab") {
      trapFocus(e);
    }
  }

  function navigateTo(url: string) {
    closePalette();
    // الـ Astro ClientRouter يعترض الروابط الداخلية ويوفر انتقالًا سلسًا.
    // نستخدم location.assign لأن المودال قد يكون خارج View Transitions.
    if (url.startsWith("http")) {
      location.assign(url);
    } else {
      location.assign(url);
    }
  }

  function onItemClick(e: MouseEvent, r: SearchResult) {
    // نقبل Ctrl/Meta + click لفتح في تبويب جديد، وإلا انتقال عادي.
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      window.open(r.url, "_blank", "noopener,noreferrer");
      return;
    }
    e.preventDefault();
    navigateTo(r.url);
  }

  function trapFocus(e: KeyboardEvent) {
    const root = listEl?.parentElement?.parentElement; // المودال
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function scrollActiveIntoView() {
    const el = listEl?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }

  // ----- مستمعو النوافذ: اختصار ⌘K / Ctrl+K -----------------------------
  onMount(() => {
    const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    function globalKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const k = e.key.toLowerCase();
      // ⌘K (Mac) أو Ctrl+K (الكل).
      if ((isMac ? e.metaKey : e.ctrlKey) && k === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
        return;
      }
      // "/" يفتح المودال كما في GitHub/Linear — ما لم يكن المستخدم يكتب نصًا.
      if (!open && !inField && e.key === "/") {
        e.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", globalKeydown);
    return () => window.removeEventListener("keydown", globalKeydown);
  });

  // ----- أدوات مساعدة --------------------------------------------------
  function stripTags(html: string): string {
    // Pagefind يضع <mark>حول المطابقات؛ نُبقي النص فقط.
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? "").trim();
  }

  function cleanUrl(url: string): string {
    try {
      const u = new URL(url, location.origin);
      return u.pathname.split("/").filter(Boolean).pop() ?? u.pathname;
    } catch {
      return url;
    }
  }

  function buildBreadcrumb(url: string): string {
    // نحوّل /en/learn/getting-started/ → "Learn · Getting started".
    try {
      const u = new URL(url, location.origin);
      const parts = u.pathname.split("/").filter(Boolean);
      // نمط العنونة البسيطة: نأخذ أول مقطعَيْن ونُترجمهم.
      const segMap: Record<string, { en: string; no: string }> = {
        learn: { en: "Learn", no: "Lær" },
        playground: { en: "Playground", no: "Lekeplass" },
        build: { en: "Config Builder", no: "Konfigbygger" },
        reference: { en: "Reference", no: "Referanse" },
        catalog: { en: "Catalog", no: "Katalog" },
        changelog: { en: "Changelog", no: "Endringslogg" },
        quiz: { en: "Quiz", no: "Quiz" },
        feedback: { en: "Feedback", no: "Tilbakemelding" },
        blog: { en: "Blog", no: "Blogg" },
      };
      const langSeg = parts[0];
      const seg = parts[1];
      const label = segMap[seg]?.[locale as "en" | "no"];
      const langLabel = langSeg === "no" ? "NO" : "EN";
      return label ? `${langLabel} · ${label}` : langLabel;
    } catch {
      return "";
    }
  }
</script>

{#if showButton}
  <button
    type="button"
    class="search-trigger"
    onclick={openPalette}
    aria-label={t.open}
    title={`${t.open}  (⌘K)`}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
    <span class="search-trigger__text">{buttonLabel}</span>
    <kbd class="search-trigger__kbd" aria-hidden="true">⌘K</kbd>
  </button>
{/if}

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="palette-backdrop"
    onclick={closePalette}
    onkeydown={onKeydown}
    aria-hidden="true"
  ></div>

  <div
    class="palette"
    role="dialog"
    aria-modal="true"
    aria-label={t.open}
    onkeydown={onKeydown}
  >
    <div class="palette__inputrow">
      <svg class="palette__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        type="search"
        autocomplete="off"
        spellcheck="false"
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        aria-controls="search-palette-listbox"
        aria-activedescendant={results[activeIndex] ? `search-result-${activeIndex}` : undefined}
      />
      <button
        type="button"
        class="palette__close"
        onclick={closePalette}
        aria-label={t.close}
      >
        Esc
      </button>
    </div>

    {#if loading && !results.length}
      <p class="palette__status">{t.loading}</p>
    {:else if query.trim() && results.length === 0}
      <p class="palette__status">{t.noResults}</p>
    {:else if results.length}
      <ul
        bind:this={listEl}
        id="search-palette-listbox"
        class="palette__results"
        role="listbox"
      >
        {#each results as r, i (r.url + i)}
          <li role="presentation">
            <a
              id={`search-result-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              data-idx={i}
              class="palette__item"
              class:palette__item--active={i === activeIndex}
              href={r.url}
              onclick={(e) => onItemClick(e, r)}
            >
              <span class="palette__title">{r.title}</span>
              {#if r.breadcrumb}
                <span class="palette__crumb">{r.breadcrumb}</span>
              {/if}
              <span class="palette__excerpt">{r.excerpt}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}

    <p class="palette__hint">{t.hint}</p>
  </div>
{/if}

<style>
  /* -------- زر الفتح في النافبار -------------------------------------- */
  .search-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3) var(--space-1) var(--space-3);
    background: var(--bg-elev);
    color: var(--fg-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
  }
  .search-trigger:hover {
    color: var(--fg);
    border-color: var(--accent);
  }
  .search-trigger__text {
    white-space: nowrap;
  }
  .search-trigger__kbd {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    padding: 0.05rem 0.4rem;
    border-radius: var(--radius-sm);
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--fg);
  }

  /* -------- خلفية داكنة خلف المودال ---------------------------------- */
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.55);
    z-index: 50;
    animation: fade var(--dur) var(--ease);
  }

  /* -------- صندوق البحث ---------------------------------------------- */
  .palette {
    position: fixed;
    top: 12vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(40rem, calc(100vw - var(--space-8)));
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-elev);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    z-index: 51;
    overflow: hidden;
    animation: rise var(--dur) var(--ease);
  }
  @media (prefers-reduced-motion: reduce) {
    .palette,
    .palette-backdrop {
      animation: none;
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translate(-50%, -8px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  .palette__inputrow {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border-bottom: 1px solid var(--border);
  }
  .palette__icon {
    color: var(--fg-muted);
    flex-shrink: 0;
  }
  .palette__inputrow input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--fg);
    font: inherit;
    font-size: 1rem;
    outline: none;
  }
  .palette__inputrow input::placeholder {
    color: var(--fg-muted);
  }
  .palette__close {
    background: transparent;
    color: var(--fg-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.15rem 0.5rem;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .palette__close:hover {
    color: var(--fg);
    border-color: var(--accent);
  }

  .palette__status {
    margin: 0;
    padding: var(--space-6);
    color: var(--fg-muted);
    text-align: center;
    font-size: 0.9375rem;
  }
  .palette__results {
    list-style: none;
    margin: 0;
    padding: var(--space-2);
    overflow-y: auto;
  }
  .palette__item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: var(--space-3);
    border-radius: var(--radius);
    text-decoration: none;
    color: var(--fg);
    cursor: pointer;
  }
  .palette__item--active {
    background: var(--bg);
    outline: 1px solid var(--accent);
  }
  .palette__title {
    font-weight: 600;
    font-size: 0.9375rem;
  }
  .palette__crumb {
    color: var(--fg-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .palette__excerpt {
    color: var(--fg-muted);
    font-size: 0.8125rem;
    line-height: 1.4;
    /* قصّ متعدد الأسطر للـ snippet. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .palette__hint {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    color: var(--fg-muted);
    font-size: 0.75rem;
    border-top: 1px solid var(--border);
    text-align: center;
  }
</style>