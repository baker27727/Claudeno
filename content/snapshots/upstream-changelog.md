# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.223

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.223

- Added owner wildcard entries (`"owner/*"`) to the `strictKnownMarketplaces` and `blockedMarketplaces` managed settings for allowing or blocking all marketplace repos under a GitHub org
- Added a warning when workflow agents, forked skills, slash commands, or resumed background agents' requested subagent model is restricted and the parent model runs instead
- Added a `/teleport` hint in cloud sessions showing how to continue locally with `claude --teleport <session id>`
- Fixed a Bash permission bypass where a crafted command could hide parts of itself from permission checks
- Fixed permission prompts so commands padded with tabs or invisible Unicode can no longer hide part of the command from the approval dialog
- Fixed workflow scripts being able to use dynamic `import()` to run code outside the workflow sandbox
- Fixed a permission gap where an agent definition's `bypassPermissions` mode ignored the org bypass-permissions disable policy
- Fixed resuming a session after a mid-session `/cd` coming back empty
- Fixed gateway model discovery hiding Claude models registered under provider-prefixed IDs such as `vertex_ai/claude-*` or `bedrock/anthropic.claude-*`
- Fixed `modelOverrides` keys that aren't Anthropic model IDs being treated as the session's canonical model ID; unknown keys are now ignored as documented
- Fixed managed settings: server-delivered settings no longer disable the env block of a machine-local `managed-settings.json` or MDM profile; admin env now merges per key
- Fixed sandboxed commands failing to start on Linux when `sandbox.filesystem.denyWrite` covers the working directory
- Fixed forked background agents getting stuck "already resuming" for the rest of the session when rebuilding the fork's parent prompt failed during resume
- Fixed a resumed session failing every turn, or leaving the interactive app on an unresponsive error screen, when its history held a malformed diagnostics attachment
- Fixed a rare hang when parsing unusual `git push` output
- Changed `CLAUDE_CODE_DISABLE_1M_CONTEXT` to hold every Claude model with a native 1M window to 200K via auto-compaction, not just a fixed list; a startup warning now appears when auto-compaction isn't holding the session to 200K
- Changed auto-compact to keep sessions on unrecognized model IDs within the assumed context window instead of letting them grow past it; set `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT=1` to restore the previous behavior
- Changed `/review` to be an alias of `/code-review`, which reviews the current diff or a PR (`/code-review <level> <pr#>`); use `/code-review ultra` for a deep cloud review
- Changed `/code-review` with no effort level to reuse the level you typed last; type a level like `/code-review high` to change it

## 2.1.222

- Fixed worktree-isolated sessions and their subagents being able to run destructive git commands against the main checkout; isolation now applies to file edits and Bash in every session type
- Fixed PreToolUse auto-allow hooks bypassing tool restrictions in background agent tasks (summaries, compaction, renames)
- Fixed `/usage-credits` on Team and Enterprise showing "you've already sent a usage credit request" for members whose earlier request was dismissed, blocking them from sending a new one
- Fixed the startup connectivity check hanging and then failing behind an HTTPS proxy; it now uses the same proxy-aware transport as API requests and times out with a clear message
- Fixed "Connection closed mid-response" errors being reported on responses that had actually completed
- Fixed `/usage` overattributing usage to MCP servers: a server's share now reflects only the requests that actually consumed its tool results, instead of every turn after any call to it
- Fixed sessions not linking to pull requests created after the branch was pushed, including through the GitHub REST API
- Fixed org-restricted `model: opus`-style subagent and teammate family aliases dropping to the parent model instead of stepping down to the newest org-allowed model in the family
- Fixed stream idle timeout firing on custom `ANTHROPIC_BASE_URL` gateways despite server keep-alive pings arriving on the wire
- Fixed claude.ai connectors being falsely marked as needing authorization when the session token is invalid — they now show a `/login` hint instead
- Fixed tool errors not being displayed for tools no longer available locally, for example after an MCP server is removed
- Fixed `SendMessage` rejecting a long summary — it now truncates instead, so sends no longer fail on a character limit
- Fixed the spinner's effort label in a subagent's transcript view showing the session's effort level instead of the subagent's own `effort:` setting
- Fixed rare crashes when a file watcher hit a filesystem error or during file-watcher teardown
- Fixed screen readers re-reading the whole input line on every backspace in `--ax-screen-reader` mode — end-of-line deletions now echo just the deleted characters
- Fixed host model-selection keys not taking precedence over a stale on-disk `managed-settings.json` when `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` is set
- Improved auto mode safety: messages sent to other agent sessions via `SendMessage` are now evaluated by the permission classifier before dispatch
- Improved the refusal when Claude tries to invoke a skill with `disable-model-invocation`: Claude is now told to ask you to run the skill instead of replicating its workflow
- Improved the `/diff` view, the Remote Control workspace diff, and file-edit diffs in Claude Code on the web sessions to use raw git blob content, ignoring workspace-configured diff drivers and textconv
- Changed Remote Control auto-start so repo-local settings (`.claude/settings.json` or `.claude/settings.local.json`) can no longer turn it on (they can still turn it off); enable it at user scope via `/config`
- Removed ultraplan feature

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
- Added `mcp_server_errors` to the headless stream-json ini