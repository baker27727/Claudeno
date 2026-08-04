# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.221

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.221

- [VSCode] Added Focus view: a chat-menu toggle that hides tool activity behind an expandable per-turn summary with a live running-tool indicator, toggled with `Ctrl+Alt+F` or the "Claude Code: Toggle Focus view" command
- Added `mode: "mask"` for sandbox credential files on Linux and WSL — sandboxed commands read a sentinel copy (the whole file, or just the spans captured by an `extract` regex) while the sandbox proxy substitutes the real value on egress; on macOS file masking falls back to `deny`
- Added warnings to `claude plugin validate` when a marketplace or plugin name would be rejected by Claude Desktop's managed marketplace sync
- Added a `prompt-audit` subcommand to the `claude-api` skill for auditing prompts and tool descriptions for patterns written for older models
- Fixed a Bash tool permission-check bypass where zsh could execute hidden commands in `[[ ]]` regex conditionals; affected commands now prompt for permission
- Fixed PowerShell permission checks mishandling paths containing quote characters on Windows; such paths now prompt for approval
- Fixed the thinking toggle having no effect for the rest of a session that started with thinking off; disabling an MCP server mid-connect no longer silently reverts
- Fixed MCP servers from `--mcp-config` not being connected before the first turn in print mode (`-p`), which made the model emit tool calls as literal text
- Fixed @-mentioned files being silently dropped when pressing Esc to retract a prompt and resubmitting it
- Fixed a crash when preparing API requests for SDK MCP tools named after built-in object properties such as `constructor`
- Fixed WebSearch failing with a 400 error at effort `xhigh`/`max` when thinking is disabled
- Fixed sandboxed large uploads failing with TLS errors through the sandbox proxy
- Fixed Team and Enterprise spend-limit message incorrectly blaming the org's monthly limit instead of your individual spend limit
- Fixed Bedrock authentication with AWS SSO named profiles failing in desktop-managed sessions on Windows machines that set a stray `HOME` environment variable
- Fixed `CLAUDE_CODE_RESUME_INTERRUPTED_TURN=0` not disabling interrupted-turn auto-resume; falsy values are now honored
- Fixed a rare wake-from-sleep race where two Claude Code processes could both refresh the same MCP connector or WIF OAuth token at once, forcing re-authentication
- Fixed renaming a session from Claude Code Desktop or claude.ai not updating the CLI's session name; session names from every rename surface are now sanitized
- Fixed plugin- and org-delivered skills named after terminal-only built-ins (e.g. `/help`, `/feedback`) being un-invocable in non-interactive sessions
- Fixed the "Plugins changed" notification lingering after plugins were reloaded instead of clearing
- Fixed Vim mode: the yank register now survives dialogs, history search, and the transcript view instead of being silently emptied
- Fixed Vim mode: undoing back to an empty prompt now arms the "press ← again" confirm before returning to the agent view
- Improved tool search on Google Vertex AI: re-enabled for Claude 4.5-generation and newer models
- Improved auto mode: permission checks for parallel tool calls are now cache-efficient, and switching modes while a check is pending reliably prompts instead of applying the stale result
- Reduced prompt-cache costs for auto-mode permission checks by reusing the cached conversation prefix across decisions
- Improved Stats panel to count cache tokens in its token totals, with a breakdown by input, output, cache read, and cache write
- Improved `/ultrareview` error messages when a repo shares no history with its base: a checkout with no branches is now refused up front with advice to create one, and refusal hints no longer suggest `git fetch --unshallow` on clones that are already complete
- Improved Windows startup: process creation times are now read via a native kernel32 call instead of spawning PowerShell, so endpoint security tools that gate `powershell.exe` no longer prompt
- Changed background sessions to commit and push to preserve work, open a draft PR only when the task calls for one, follow your CLAUDE.md git instructions, and always end by reporting where the work lives
- Changed `/plugin install` to refresh a stale marketplace catalog and retry before reporting a plugin not found
- Changed plugins installed from `/plugin` to activate immediately when safe, instead of always requiring `/reload-plugins`
- Changed plugins to accept `"."` as a `skills` path, and the root-level `SKILL.md` validation error now suggests using the plugin root
- Changed `/status` to show the session kind: `interactive`, or a background job that is `attached` or `unattended`
- Changed emoji autocomplete to accept common alternate shortcodes like `:thumbsup:`, `:thumbsdown:`, and `:love:`
- Changed sessions forked with `/fork` to create a new worktree of their own instead of working in the original session's checkout
- Changed Claude in Chrome to close the browser tabs it opens once it no longer needs them
- Changed fast mode to report on the stream when usage credits run out mid-session, instead of failing silently
- Changed Monitor: a watch that exits without producing any output now says so instead of reporting "stream ended"
- Changed the Gateway `model` field validation: non-string values are rejected with a 400 instead of being forwarded
- Removed the repeated "Permission mode changed while the auto-mode classifier call was queued" notice from approval prompts

## 2.1.220

- Bug fixes and reliability improvements

## 2.1.219

- Added Claude Opus 5 (`claude-opus-5`), now the default Opus model — 1M context, fast mode at $10/$50 per Mtok
- Added `sandbox.network.strictAllowlist` setting to deny non-allowlisted hosts for sandboxed commands without prompting
- Added `DirectoryAdded` hook that fires after `/add-dir` or the SDK `register_repo_root` control request registers a new working directory mid-session
- Added `mcp_server_errors` to the headless stream-json init event, listing `--mcp-config` entries skipped by config validation; terminal runs print a startup warning
- Added the `workflowSizeGuideline` settings key so the advisory Dynamic workflow size guideline can be set from any settings file; the `/config` row is hidden while one does
- Added nested subagent forwarding in stream-json: subagents spawned at depth-2+ now appear when `--forward-subagent-text` is set, keyed by their spawning Agent `tool_use` id
- Fixed `claude -p` text output dropping the answer already produced when a turn dies on a mid-stream API error
- Added HTTP status and error text to `claude mcp list` and `/mcp` when a server fails to connect, and a warning for MCP config values with hidden leading or trailing whitespace
- Fixed the Fable model row showing "Requires usage credits" for plans that include it, when a stale cache had baked the label in
- Fixed the `/model` picker showing the merged Opus row as plain "Opus" instead of "Opus (1M context)"
- Fixed copy-on-select inside GNU screen printing base64 into the terminal instead of copying the selection
- Fixed Remote Control clients keeping a stale fast-mode status after a model switch, reconnect, or failed org check
- Fixed `CLAUDE_CODE_GIT_BASH_PATH` on Windows exiting or being used as bash when the path isn't a bash/sh binary; it's now ignored with a warning
- Fixed Vim mode: pressing ← on an empty prompt now returns to the agent view from NORMAL mode, not just INSERT
- Fixed screen-reader mode rewriting the entire input line on every keystroke instead of echoing only the typed character
- Improved the "Remote Control is only available via api.anthropic.com" error to name the specific setting that caused it
- Improved `claude --teleport` to show which repo your current checkout points at when it doesn't match the session's repo
- Changed dynamic workflows to default to a medium size guideline (aim for fewer than 15 agents); pick another size or unrestricted with Dynamic workflow size in `/config`
- Changed managed MCP allowlist/denylist `${VAR}` entries to resolve from the startup environment and managed-settings env instead of settings-file env
- Changed the `/model` picker to highlight only the newest model's name, so the highlight marks the new release rather than an arbitrary subset of the list
- Added the current default workflow size to the running-workflow status line, with a pointer to `/config` for changing it
- Removed Opus 4.7 from fast mode; `/fast` now applies to Opus 5 and Opus 4.8
- Updated the claude-api skill to default to Claude Opus 5, with a migration path from Opus 4.8
- Subagents can now spawn nested subagents up to depth 3 by default (was 1); set CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1 to disable nesting

## 2.1.218

- Changed `/code-review` to run as a background subagent, so review work no longer fills your conversation and keeps stacked slash commands as its review target
- Added screen-reader announcements of deleted text for word and line deletions (`Option+Delete`, `Ctrl+W`, `Cmd+Backspace`, `Ctrl+U`, `Ctrl+K`) in `--ax-screen-reader` mode
- Fixed Windows paths with `\u`-prefixed segments (like `C:\Users\unicorn`) being corrupted into CJK characters in tool inputs, which made those files inaccessible
- Fixed the left arrow key discarding the conversation with no undo: presses right after editing now ask to confirm, and Esc in the agent view returns to the conversation it backgrounded
- Fixed multi-line paste collapsing into one line with `j` in place of newlines in terminals that encode pasted newlines as Ctrl+J
- Fixed `/context` reporting stale pre-compact token usage after compacting from the message picker
- Fixed `/ultrareview` failing on descriptive arguments like "review my auth changes" — they now run a review of your current branch with the text applied as a note to the findings
- Fixed `/code-review ultra` silently running a local review in non-interactive sessions — it now launches the cloud review
- Fixed gateway spend metering to price Bedrock application-inference-profile ARNs and other config-mapped upstream model IDs at the configured model's rates
- Fixed mojibake when a long IDE selection was truncated mid-emoji, and a case where a tool executor error could be silently dropped
- Fixed an engine teardown race that could start and abandon a phantom turn, and made input pushed after close consistently rejected
- Fixed spurious "[Request interrupted by user]" messages after interrupted tool calls, and an unpaired `tool_use` block left in the transcript when a tool aborted mid-response
- Fixed VoiceOver reading "new line" instead of echoing the typed space at the end of the input in `--ax-screen-reader` mode
- Fixed plugin and settings panels not moving the terminal cursor to the focused row, so screen readers and magnifiers can follow arrow-key navigation
- Fixed crashes (maximum call stack exceeded) when a deeply nested watched directory tree was deleted or moved, and when rendering deeply nested UI trees
- Fixed pull request events occasionally being lost when a session exited immediately after creating or linking a PR
- Fixed the Bedrock setup wizard failing profile verification for assume-role profiles in partitioned AWS regions and on proxy-only networks
- Fixed rare negative or incorrect turn duration measurements after a system clock adjustment by timing turns with a monotonic clock
- Fixed the "N MCP servers need authentication" startup notice over-counting claude.ai connectors that aren't connected in claude.ai
- Fixed prompt history entries being dropped or duplicated when history writes raced or failed
- Fixed a retry loop that re-sent identical doomed requests after a context-overflow error with a large thinking budget; `Ctrl+B` backgrounding now applies the same background-shell caps as other paths
- Fixed agent frontmatter hooks running from untrusted folders: hooks now require the age