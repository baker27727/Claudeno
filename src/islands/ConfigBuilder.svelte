<script lang="ts">
  // Multi-builder suite (BLUEPRINT §5.2, expanded): generates ready-to-use
  // CLAUDE.md, subagent files, hook config, and MCP server commands. Pure
  // client-side, no backend. Every generated shape is verified against the
  // official docs (settings.json permissions/hooks, sub-agents, mcp add).

  type Kind = "claudemd" | "agent" | "hook" | "mcp";
  type ProjectType = "web" | "api" | "cli" | "library" | "other";

  let {
    locale = "en",
  }: {
    locale?: "en" | "no";
  } = $props();

  const strings = {
    en: {
      kinds: { claudemd: "CLAUDE.md", agent: "Subagent", hook: "Hook", mcp: "MCP Server" },
      copy: "Copy",
      copied: "Copied!",
      download: "Download",
      preview: "Preview",
      // CLAUDE.md
      step1: "Project type",
      step2: "Allowed commands",
      step3: "Tools to enable",
      // agent
      agentName: "Name (kebab-case)",
      agentDesc: "Description (when should Claude use this?)",
      agentTools: "Tools it can use",
      agentModel: "Model",
      agentPrompt: "System prompt",
      // hook
      hookEvent: "Event",
      hookMatcher: "Matcher",
      hookMatcherHint: "Tool name, regex, or * for all",
      hookCommand: "Command",
      hookCommandHint: "Shell command or script path",
      // mcp
      mcpName: "Server name",
      mcpTransport: "Transport",
      mcpUrl: "Server URL",
      mcpCommand: "Command",
      mcpCommandHint: "e.g. npx -y @some/mcp-server",
    },
    no: {
      kinds: { claudemd: "CLAUDE.md", agent: "Underagent", hook: "Hook", mcp: "MCP-tjener" },
      copy: "Kopier",
      copied: "Kopiert!",
      download: "Last ned",
      preview: "Forhåndsvisning",
      step1: "Prosjekttype",
      step2: "Tillatte kommandoer",
      step3: "Verktøy å aktivere",
      agentName: "Navn (kebab-case)",
      agentDesc: "Beskrivelse (når bør Claude bruke denne?)",
      agentTools: "Verktøy den kan bruke",
      agentModel: "Modell",
      agentPrompt: "Systemprompt",
      hookEvent: "Hendelse",
      hookMatcher: "Matcher",
      hookMatcherHint: "Verktøynavn, regex, eller * for alle",
      hookCommand: "Kommando",
      hookCommandHint: "Shell-kommando eller sti til skript",
      mcpName: "Tjenernavn",
      mcpTransport: "Transport",
      mcpUrl: "Tjener-URL",
      mcpCommand: "Kommando",
      mcpCommandHint: "f.eks. npx -y @some/mcp-server",
    },
  } as const;

  const t = $derived(strings[locale]);
  const kindOrder: Kind[] = ["claudemd", "agent", "hook", "mcp"];
  let kind = $state<Kind>("claudemd");
  let copyLabel = $state("");

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    copyLabel = t.copied;
    setTimeout(() => (copyLabel = ""), 1500);
  }

  function download(filename: string, content: string, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------------ //
  // CLAUDE.md
  // ------------------------------------------------------------------ //
  const projectTypes: Array<{ id: ProjectType; en: string; no: string; build: string; test: string }> = [
    { id: "web", en: "Web frontend", no: "Web-frontend", build: "npm run build", test: "npm run test" },
    { id: "api", en: "Backend API", no: "Backend-API", build: "npm run build", test: "npm run test" },
    { id: "cli", en: "CLI tool", no: "CLI-verktøy", build: "npm run build", test: "npm test" },
    { id: "library", en: "Library / package", no: "Bibliotek / pakke", build: "npm run build", test: "npm run test" },
    { id: "other", en: "Other", no: "Annet", build: "<build command>", test: "<test command>" },
  ];
  const commandOptions = [
    { id: "npm", pattern: "Bash(npm *)", label: "npm" },
    { id: "git", pattern: "Bash(git *)", label: "git" },
    { id: "docker", pattern: "Bash(docker *)", label: "Docker" },
    { id: "python", pattern: "Bash(python *)", label: "Python" },
    { id: "pytest", pattern: "Bash(pytest *)", label: "pytest" },
    { id: "cargo", pattern: "Bash(cargo *)", label: "Cargo" },
    { id: "go", pattern: "Bash(go *)", label: "Go" },
  ];
  const toolOptions = ["Bash", "Edit", "Write", "WebFetch", "WebSearch"];

  let projectType = $state<ProjectType>("web");
  let commands = $state<Record<string, boolean>>({ npm: true, git: true });
  let tools = $state<Record<string, boolean>>({ Bash: true, Edit: true, Write: true });

  const activeProject = $derived(projectTypes.find((p) => p.id === projectType)!);
  const claudeMd = $derived(`# Project conventions

## Commands
- Build: \`${activeProject.build}\`
- Test: \`${activeProject.test}\`

## Guidelines
- Follow existing code style and naming conventions.
- Prefer editing existing files over creating new ones.
- Do not add speculative abstractions or unused error handling.
`);
  const settingsJson = $derived(
    JSON.stringify(
      {
        permissions: {
          allow: [
            ...commandOptions.filter((c) => commands[c.id]).map((c) => c.pattern),
            ...toolOptions.filter((tool) => tools[tool]).map((tool) => tool),
          ],
        },
      },
      null,
      2,
    ),
  );

  // ------------------------------------------------------------------ //
  // Subagent (.claude/agents/<name>.md)
  // ------------------------------------------------------------------ //
  const agentToolOptions = ["Read", "Grep", "Glob", "Edit", "Write", "Bash", "WebFetch", "WebSearch"];
  const agentModels = ["sonnet", "haiku", "opus", "inherit"];

  let agentName = $state("code-reviewer");
  let agentDesc = $state("Reviews code for correctness and style before a commit.");
  let agentTools = $state<Record<string, boolean>>({ Read: true, Grep: true });
  let agentModel = $state("haiku");
  let agentPrompt = $state("You are a meticulous code reviewer. Point out bugs, unclear naming, and missed edge cases. Do not rewrite code yourself.");

  const agentSlug = $derived((agentName.trim() || "my-agent").toLowerCase().replace(/\s+/g, "-"));
  const agentToolList = $derived(agentToolOptions.filter((tl) => agentTools[tl]).join(", "));
  const agentFile = $derived(`---
name: ${agentSlug}
description: ${agentDesc.trim() || "Describe when Claude should delegate to this agent."}
tools: ${agentToolList || "Read"}
model: ${agentModel}
---
${agentPrompt.trim() || "You are a specialized assistant. Describe its behavior here."}
`);

  // ------------------------------------------------------------------ //
  // Hook (settings.json "hooks")
  // ------------------------------------------------------------------ //
  const hookEvents = ["PreToolUse", "PostToolUse", "UserPromptSubmit", "SessionStart", "Stop", "SessionEnd"];

  let hookEvent = $state("PreToolUse");
  let hookMatcher = $state("Bash");
  let hookCommand = $state("${CLAUDE_PROJECT_DIR}/.claude/hooks/check.sh");

  const hookJson = $derived(
    JSON.stringify(
      {
        hooks: {
          [hookEvent]: [
            {
              matcher: hookMatcher.trim() || "*",
              hooks: [{ type: "command", command: hookCommand.trim() || "echo hook fired" }],
            },
          ],
        },
      },
      null,
      2,
    ),
  );

  // ------------------------------------------------------------------ //
  // MCP server (`claude mcp add`)
  // ------------------------------------------------------------------ //
  const mcpTransports = ["http", "sse", "stdio"] as const;

  let mcpName = $state("my-server");
  let mcpTransport = $state<(typeof mcpTransports)[number]>("http");
  let mcpUrl = $state("https://mcp.example.com/mcp");
  let mcpCommand = $state("npx -y @some/mcp-server");

  const mcpSlug = $derived((mcpName.trim() || "my-server").toLowerCase().replace(/\s+/g, "-"));
  const mcpAddCommand = $derived(
    mcpTransport === "stdio"
      ? `claude mcp add --transport stdio ${mcpSlug} -- ${mcpCommand.trim() || "npx -y @some/mcp-server"}`
      : `claude mcp add --transport ${mcpTransport} ${mcpSlug} ${mcpUrl.trim() || "https://mcp.example.com/mcp"}`,
  );
</script>

<div class="builder">
  <div class="builder__tabs" role="tablist">
    {#each kindOrder as k (k)}
      <button
        type="button"
        role="tab"
        aria-selected={kind === k}
        class="builder__tab"
        class:builder__tab--active={kind === k}
        onclick={() => (kind = k)}
      >
        {t.kinds[k]}
      </button>
    {/each}
  </div>

  {#if kind === "claudemd"}
    <div class="builder__body">
      <div class="builder__form">
        <fieldset>
          <legend>{t.step1}</legend>
          <div class="builder__chips">
            {#each projectTypes as p (p.id)}
              <button type="button" class="builder__chip" class:builder__chip--active={projectType === p.id} onclick={() => (projectType = p.id)}>
                {p[locale]}
              </button>
            {/each}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.step2}</legend>
          <div class="builder__chips">
            {#each commandOptions as c (c.id)}
              <label class="builder__check">
                <input type="checkbox" bind:checked={commands[c.id]} />
                {c.label}
              </label>
            {/each}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.step3}</legend>
          <div class="builder__chips">
            {#each toolOptions as tool (tool)}
              <label class="builder__check">
                <input type="checkbox" bind:checked={tools[tool]} />
                {tool}
              </label>
            {/each}
          </div>
        </fieldset>
      </div>

      <div class="builder__output">
        <div class="builder__output-head">
          <span>{t.preview}: CLAUDE.md</span>
          <div class="builder__actions">
            <button type="button" onclick={() => copy(claudeMd)}>{copyLabel || t.copy}</button>
            <button type="button" onclick={() => download("CLAUDE.md", claudeMd)}>{t.download}</button>
          </div>
        </div>
        <pre class="builder__pre">{claudeMd}</pre>

        <div class="builder__output-head">
          <span>settings.json</span>
          <button type="button" onclick={() => copy(settingsJson)}>{copyLabel || t.copy}</button>
        </div>
        <pre class="builder__pre">{settingsJson}</pre>
      </div>
    </div>
  {:else if kind === "agent"}
    <div class="builder__body">
      <div class="builder__form">
        <label class="builder__field">
          <span>{t.agentName}</span>
          <input type="text" bind:value={agentName} />
        </label>
        <label class="builder__field">
          <span>{t.agentDesc}</span>
          <textarea rows="2" bind:value={agentDesc}></textarea>
        </label>
        <fieldset>
          <legend>{t.agentTools}</legend>
          <div class="builder__chips">
            {#each agentToolOptions as tl (tl)}
              <label class="builder__check">
                <input type="checkbox" bind:checked={agentTools[tl]} />
                {tl}
              </label>
            {/each}
          </div>
        </fieldset>
        <label class="builder__field">
          <span>{t.agentModel}</span>
          <select bind:value={agentModel}>
            {#each agentModels as m (m)}
              <option value={m}>{m}</option>
            {/each}
          </select>
        </label>
        <label class="builder__field">
          <span>{t.agentPrompt}</span>
          <textarea rows="4" bind:value={agentPrompt}></textarea>
        </label>
      </div>

      <div class="builder__output">
        <div class="builder__output-head">
          <span>{t.preview}: .claude/agents/{agentSlug}.md</span>
          <div class="builder__actions">
            <button type="button" onclick={() => copy(agentFile)}>{copyLabel || t.copy}</button>
            <button type="button" onclick={() => download(`${agentSlug}.md`, agentFile)}>{t.download}</button>
          </div>
        </div>
        <pre class="builder__pre">{agentFile}</pre>
      </div>
    </div>
  {:else if kind === "hook"}
    <div class="builder__body">
      <div class="builder__form">
        <label class="builder__field">
          <span>{t.hookEvent}</span>
          <select bind:value={hookEvent}>
            {#each hookEvents as e (e)}
              <option value={e}>{e}</option>
            {/each}
          </select>
        </label>
        <label class="builder__field">
          <span>{t.hookMatcher}</span>
          <input type="text" bind:value={hookMatcher} placeholder={t.hookMatcherHint} />
          <small>{t.hookMatcherHint}</small>
        </label>
        <label class="builder__field">
          <span>{t.hookCommand}</span>
          <input type="text" bind:value={hookCommand} placeholder={t.hookCommandHint} />
          <small>{t.hookCommandHint}</small>
        </label>
      </div>

      <div class="builder__output">
        <div class="builder__output-head">
          <span>{t.preview}: settings.json</span>
          <button type="button" onclick={() => copy(hookJson)}>{copyLabel || t.copy}</button>
        </div>
        <pre class="builder__pre">{hookJson}</pre>
      </div>
    </div>
  {:else if kind === "mcp"}
    <div class="builder__body">
      <div class="builder__form">
        <label class="builder__field">
          <span>{t.mcpName}</span>
          <input type="text" bind:value={mcpName} />
        </label>
        <fieldset>
          <legend>{t.mcpTransport}</legend>
          <div class="builder__chips">
            {#each mcpTransports as tr (tr)}
              <button type="button" class="builder__chip" class:builder__chip--active={mcpTransport === tr} onclick={() => (mcpTransport = tr)}>
                {tr}
              </button>
            {/each}
          </div>
        </fieldset>
        {#if mcpTransport === "stdio"}
          <label class="builder__field">
            <span>{t.mcpCommand}</span>
            <input type="text" bind:value={mcpCommand} placeholder={t.mcpCommandHint} />
            <small>{t.mcpCommandHint}</small>
          </label>
        {:else}
          <label class="builder__field">
            <span>{t.mcpUrl}</span>
            <input type="text" bind:value={mcpUrl} />
          </label>
        {/if}
      </div>

      <div class="builder__output">
        <div class="builder__output-head">
          <span>{t.preview}</span>
          <button type="button" onclick={() => copy(mcpAddCommand)}>{copyLabel || t.copy}</button>
        </div>
        <pre class="builder__pre">{mcpAddCommand}</pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .builder__tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
    border-bottom: 1px solid var(--border);
  }
  .builder__tab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--fg-muted);
    padding: var(--space-2) var(--space-1) var(--space-3);
    margin-bottom: -1px;
    cursor: pointer;
    font: inherit;
    font-size: 0.9375rem;
    font-weight: 500;
  }
  .builder__tab:hover {
    color: var(--fg);
  }
  .builder__tab--active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  .builder__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 var(--space-6);
  }
  legend {
    font-weight: 600;
    margin-bottom: var(--space-2);
    padding: 0;
  }
  .builder__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-5);
    font-size: 0.875rem;
    font-weight: 600;
  }
  .builder__field input[type="text"],
  .builder__field select,
  .builder__field textarea {
    font: inherit;
    font-weight: 400;
    font-size: 0.875rem;
    color: var(--fg);
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-sans);
  }
  .builder__field textarea {
    resize: vertical;
    font-family: var(--font-mono);
  }
  .builder__field small {
    font-weight: 400;
    color: var(--fg-muted);
    font-size: 0.75rem;
  }
  .builder__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .builder__chip {
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--fg);
    border-radius: var(--radius-full);
    padding: var(--space-1) var(--space-4);
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
  }
  .builder__chip--active {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-fg);
  }
  .builder__check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1) var(--space-3);
    font-size: 0.875rem;
    font-weight: 400;
    cursor: pointer;
  }
  .builder__output {
    min-width: 0;
  }
  .builder__output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    margin: 0 0 var(--space-2);
    font-size: 0.8125rem;
    color: var(--fg-muted);
  }
  .builder__output-head span {
    overflow-wrap: anywhere;
  }
  .builder__actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }
  .builder__output-head button {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    color: var(--fg);
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
    font-size: 0.75rem;
  }
  .builder__pre {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-4);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    max-height: 20rem;
    overflow-y: auto;
    margin: 0 0 var(--space-6);
  }
  @media (max-width: 860px) {
    .builder__body {
      grid-template-columns: 1fr;
    }
  }
</style>
