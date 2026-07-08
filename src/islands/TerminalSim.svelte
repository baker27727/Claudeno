<script lang="ts">
  // Client-only terminal simulator (BLUEPRINT §5.1).
  // Guided mode walks fixed lesson steps in order; free mode accepts any
  // known command at any time (used by the hero and /playground).
  import { onMount } from "svelte";

  interface Step {
    id: string;
    command: string;
    output: string;
    explain?: { en: string; no: string };
    accepts_also?: string[];
  }

  interface HistoryEntry {
    command: string;
    output: string;
    explain?: string;
    ok: boolean;
  }

  let {
    steps,
    mode = "guided",
    locale = "en",
    prompt = "$",
  }: {
    steps: Step[];
    mode?: "guided" | "free";
    locale?: "en" | "no";
    prompt?: string;
  } = $props();

  const strings = {
    en: {
      placeholder: "Type a command…",
      run: "Run",
      reset: "Reset",
      showMe: "Show me the command",
      hint: "Not quite — try again, or",
      done: "Step complete!",
      allDone: "All steps complete — nice work.",
      freeHint: "Try any command from the modules, e.g.",
    },
    no: {
      placeholder: "Skriv en kommando…",
      run: "Kjør",
      reset: "Nullstill",
      showMe: "Vis meg kommandoen",
      hint: "Ikke helt riktig — prøv igjen, eller",
      done: "Steg fullført!",
      allDone: "Alle steg fullført — bra jobbet.",
      freeHint: "Prøv en hvilken som helst kommando fra modulene, f.eks.",
    },
  } as const;

  const t = $derived(strings[locale]);

  let history = $state<HistoryEntry[]>([]);
  let stepIndex = $state(0);
  let input = $state("");
  let wrongAttempt = $state(false);
  let announce = $state("");
  let logEl: HTMLDivElement | undefined;
  let reducedMotion = false;

  onMount(() => {
    reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const currentStep = $derived(mode === "guided" ? steps[stepIndex] : undefined);
  const finished = $derived(mode === "guided" && stepIndex >= steps.length);

  function normalize(s: string): string {
    return s.trim().replace(/\s+/g, " ");
  }

  function matchAny(candidates: Step[], value: string): Step | undefined {
    const v = normalize(value);
    return candidates.find(
      (s) => normalize(s.command) === v || (s.accepts_also ?? []).some((a) => normalize(a) === v),
    );
  }

  function scrollToEnd() {
    requestAnimationFrame(() => {
      logEl?.scrollTo({ top: logEl.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
    });
  }

  function submit() {
    const value = input.trim();
    if (!value) return;

    if (mode === "guided") {
      const step = steps[stepIndex];
      if (!step) return;
      const match = normalize(step.command) === normalize(value) || (step.accepts_also ?? []).some((a) => normalize(a) === normalize(value));
      if (match) {
        wrongAttempt = false;
        const explain = step.explain?.[locale];
        history = [...history, { command: value, output: step.output, explain, ok: true }];
        announce = `${step.output}${explain ? " — " + explain : ""}`;
        stepIndex += 1;
        input = "";
        scrollToEnd();
      } else {
        wrongAttempt = true;
      }
      return;
    }

    // Free mode: match against the whole command bank.
    const found = matchAny(steps, value);
    history = [
      ...history,
      found
        ? { command: value, output: found.output, explain: found.explain?.[locale], ok: true }
        : { command: value, output: `command not found: ${value}`, ok: false },
    ];
    announce = found ? found.output : `command not found: ${value}`;
    input = "";
    scrollToEnd();
  }

  function showMe() {
    if (mode === "guided" && currentStep) {
      input = currentStep.command;
      wrongAttempt = false;
    }
  }

  function reset() {
    history = [];
    stepIndex = 0;
    input = "";
    wrongAttempt = false;
    announce = "";
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }
</script>

<div class="term">
  <div class="term__bar">
    <span class="term__dot" style="background:var(--err)"></span>
    <span class="term__dot" style="background:var(--warn)"></span>
    <span class="term__dot" style="background:var(--ok)"></span>
    {#if mode === "guided" && !finished}
      <span class="term__step">{stepIndex + 1} / {steps.length}</span>
    {/if}
  </div>

  <div class="term__log" bind:this={logEl} role="log" aria-label="Terminal output">
    {#each history as entry, i (i)}
      <div class="term__line">
        <span class="term__prompt">{prompt}</span>
        <span class="term__cmd">{entry.command}</span>
      </div>
      <pre class="term__output" class:term__output--err={!entry.ok}>{entry.output}</pre>
      {#if entry.explain}
        <p class="term__explain">{entry.explain}</p>
      {/if}
    {/each}

    {#if finished}
      <p class="term__done">{t.allDone}</p>
    {:else if mode === "free" && history.length === 0}
      <p class="term__hint-text">{t.freeHint} <code>claude</code></p>
    {/if}
  </div>

  <div class="visually-hidden" aria-live="polite">{announce}</div>

  {#if !finished}
    <div class="term__inputrow">
      <span class="term__prompt" aria-hidden="true">{prompt}</span>
      <input
        type="text"
        bind:value={input}
        onkeydown={onKeydown}
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="button" onclick={submit}>{t.run}</button>
    </div>
    {#if wrongAttempt}
      <p class="term__wrong">
        {t.hint}
        <button type="button" class="term__linklike" onclick={showMe}>{t.showMe}</button>
      </p>
    {/if}
  {/if}

  <div class="term__footer">
    <button type="button" class="term__linklike" onclick={reset}>{t.reset}</button>
  </div>
</div>

<style>
  .term {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    font-family: var(--font-mono);
    font-size: 0.9375rem;
    overflow: hidden;
  }
  .term__bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
  }
  .term__dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    opacity: 0.85;
  }
  .term__step {
    margin-left: auto;
    color: var(--fg-muted);
    font-size: 0.8125rem;
  }
  .term__log {
    padding: var(--space-4);
    max-height: 20rem;
    overflow-y: auto;
  }
  .term__line {
    display: flex;
    gap: var(--space-2);
  }
  .term__prompt {
    color: var(--accent);
    user-select: none;
  }
  .term__cmd {
    color: var(--fg);
  }
  .term__output {
    margin: var(--space-1) 0 var(--space-2);
    white-space: pre-wrap;
    color: var(--fg-muted);
    font-family: var(--font-mono);
  }
  .term__output--err {
    color: var(--err);
  }
  .term__explain {
    margin: 0 0 var(--space-4);
    color: var(--fg-muted);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    border-left: 2px solid var(--accent);
    padding-left: var(--space-3);
  }
  .term__done {
    color: var(--ok);
    font-family: var(--font-sans);
  }
  .term__hint-text {
    color: var(--fg-muted);
    font-family: var(--font-sans);
    font-size: 0.875rem;
  }
  .term__inputrow {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--border);
  }
  .term__inputrow input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: inherit;
    outline: none;
  }
  .term__inputrow button {
    background: var(--accent);
    color: var(--accent-fg);
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-3);
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: 0.8125rem;
  }
  .term__wrong {
    margin: 0;
    padding: 0 var(--space-4) var(--space-3);
    color: var(--warn);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
  }
  .term__footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-2) var(--space-4) var(--space-3);
  }
  .term__linklike {
    background: none;
    border: none;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: inherit;
    padding: 0;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
