<script lang="ts">
  // Dark/light toggle — persists to localStorage (BLUEPRINT §6.2.2).
  // Base.astro already applies the saved theme pre-paint to avoid flash.
  let { label = "Toggle theme" }: { label?: string } = $props();

  const KEY = "ccl:theme";

  function current(): "dark" | "light" {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") return stored;
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  let theme = $state<"dark" | "light">("dark");

  $effect(() => {
    theme = current();
  });

  function toggle() {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, theme);
    document.documentElement.dataset.theme = theme;
  }
</script>

<button
  type="button"
  onclick={toggle}
  aria-label={label}
  title={label}
  class="theme-toggle"
>
  {#if theme === "dark"}
    <!-- sun (switch to light) -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  {:else}
    <!-- moon (switch to dark) -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--fg);
    cursor: pointer;
    transition: border-color var(--dur) var(--ease), transform var(--dur-fast) var(--ease);
  }
  .theme-toggle:hover {
    border-color: var(--accent);
  }
  .theme-toggle:active {
    transform: scale(0.94);
  }
</style>
