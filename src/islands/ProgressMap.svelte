<script lang="ts">
  // Visual progress timeline (BLUEPRINT §5.3). Reads localStorage only —
  // no accounts, no server, GDPR-friendly by construction.
  import { onMount } from "svelte";
  import { loadProgress, type ModuleStatus } from "../lib/progress";

  interface ModuleInfo {
    id: string;
    href: string;
    title: { en: string; no: string };
  }

  let {
    modules,
    locale = "en",
  }: {
    modules: ModuleInfo[];
    locale?: "en" | "no";
  } = $props();

  const strings = {
    en: { "not-started": "Not started", "in-progress": "In progress", completed: "Completed", heading: "Your progress" },
    no: { "not-started": "Ikke startet", "in-progress": "Pågår", completed: "Fullført", heading: "Din fremgang" },
  } as const;

  const t = $derived(strings[locale]);

  let statuses = $state<Record<string, ModuleStatus>>({});

  function refresh() {
    statuses = loadProgress().modules;
  }

  onMount(() => {
    refresh();
    window.addEventListener("ccl:progress-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ccl:progress-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  });

  const doneCount = $derived(modules.filter((m) => statuses[m.id] === "completed").length);
</script>

<div class="progress">
  <div class="progress__head">
    <p class="progress__eyebrow">{t.heading}</p>
    <p class="progress__fraction">
      {doneCount}<span>/{modules.length}</span>
    </p>
  </div>

  <div class="progress__bar" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={modules.length}>
    <div class="progress__bar-fill" style={`width:${modules.length ? (doneCount / modules.length) * 100 : 0}%`}></div>
  </div>

  <ol class="progress__list">
    {#each modules as m (m.id)}
      {@const status = statuses[m.id] ?? "not-started"}
      <li>
        <a href={m.href} class="progress__link" data-status={status}>
          <span class="progress__dot" data-status={status} aria-hidden="true"></span>
          <span class="progress__title">{m.title[locale]}</span>
          <span class="progress__status">{t[status]}</span>
        </a>
      </li>
    {/each}
  </ol>
</div>

<style>
  .progress {
    padding-top: var(--space-2);
  }
  .progress__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .progress__eyebrow {
    margin: 0;
    color: var(--fg-muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .progress__fraction {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 1.0625rem;
    color: var(--accent);
  }
  .progress__fraction span {
    color: var(--fg-muted);
  }
  .progress__bar {
    height: 3px;
    border-radius: var(--radius-full);
    background: var(--border);
    overflow: hidden;
    margin-bottom: var(--space-5);
  }
  .progress__bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: var(--radius-full);
    transition: width var(--dur) var(--ease);
  }
  .progress__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .progress__link {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    text-decoration: none;
    color: var(--fg-muted);
    transition: color var(--dur) var(--ease);
  }
  .progress__link[data-status="completed"],
  .progress__link[data-status="in-progress"] {
    color: var(--fg);
  }
  .progress__link:hover {
    color: var(--accent);
  }
  .progress__dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--border);
  }
  .progress__dot[data-status="in-progress"] {
    background: var(--warn);
  }
  .progress__dot[data-status="completed"] {
    background: var(--ok);
  }
  .progress__title {
    flex: 1;
    font-size: 0.875rem;
  }
  .progress__status {
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
</style>
