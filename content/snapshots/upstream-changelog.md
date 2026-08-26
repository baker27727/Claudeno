# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.246

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.246

- Added a startup warning for Bash allow rules with a wildcard before the subcommand (e.g. `Bash(git * main)`), since they also match options inserted before the subcommand
- Added an Auto mode tab to `/permissions` for viewing and editing auto mode classifier rules
- Added the turn's completion time to the end-of-turn duration line, e.g. `✻ Sautéed for 23s · done 6:05 PM`
- Fixed fullscreen mode showing a blank transcript after resizing the terminal and jumping to the bottom until the next keypress
- Fixed a severe transcript slowdown when a diff contained a very long single line (e.g. a base64 string); such lines now render truncated with a marker
- Fixed erratic fullscreen scrolling when positioned at an earlier message, including jump-to-bottom getting stuck mid-transcript
- Fixed background sessions failing to open after 45 seconds when Claude Code's starting directory had been deleted, the machine had slept, or the host is slow to start processes
- Fixed background sessions failing to open with "Couldn't start the background service … EACCES" when another Claude Code process was re-installing the npm package at that moment
- Fixed markdown rendering being disabled for a whole message when its first 500 characters contained no markdown, and for `+`/`N)` lists and setext headings
- Fixed MCP tool calls interrupted by an incoming message in headless/remote sessions being reported to the model as "completed with no output" instead of an explicit interrupted error
- Fixed MCP tool arguments being sent as JSON strings when the parameter's schema is empty (`{}`), instead of their real type
- Fixed a command interrupted mid-run showing as "Ran 1 shell command" with no sign it was cut
- Fixed pressing ← or running `/background` during a dynamic workflow restarting its finished subagents; it now asks first and says how many subagents would restart
- Fixed opening a just-started session in `claude agents` while its worker was still booting (common on Windows) stopping it with "was stopped while the respawn was in flight"
- Fixed `claude agents` listing a backgrounded named session twice; backgrounding the same conversation again now numbers the new row (e.g. `my-session (2)`)
- Fixed the background retention sweep removing git worktrees under `.claude/worktrees/` that you created yourself when an old background-session record pointed at them
- Fixed auto mode tool calls being denied as "temporarily unavailable" on very large sessions by scaling the safety-check deadline with prompt size
- Fixed the plugin cache creating duplicate SHA-named directories for the same plugin
- Fixed plugin skills whose frontmatter `name` already includes the `<plugin>:` prefix showing it doubled in the slash menu (e.g. `/plugin:plugin:skill`)
- Fixed `claude plugin update` failing for an installed plugin given its bare name (only the fully-qualified name worked)
- Fixed plugin installation failing when `plugin.json` was saved with a UTF-8 byte-order mark (BOM)
- Fixed `/reload-plugins` reporting 0 skills for plugins that define skills under `skills/*/SKILL.md`
- Fixed hook error messages showing a literal `${CLAUDE_PLUGIN_ROOT}` instead of the resolved plugin path
- Fixed `/rename` replacing the theme's prompt border color (including a custom theme's `promptBorder`) with the default cyan; the border now keeps your theme's color unless you pick one with `/color`
- Fixed custom theme diff colors (`diffAdded`/`diffRemoved` and their dimmed variants) being ignored in diffs and the `/theme` preview
- Fixed a `keybindings.json` binding with an unknown action name silently deadening that key; it is now skipped so the default binding keeps working, and a warning is logged under `--debug`
- Fixed `/stats` activity heatmap showing each day's activity one cell off (Sunday's count under Monday) in timezones east of UTC
- Fixed `/fork` from an already-forked or backgrounded session starting the new session with an empty conversation
- Fixed prompts beginning with `/--` (e.g. Lean doc comments) being rejected as an unknown slash command instead of being sent to Claude
- Fixed the `@` file picker staying open after the typed text stopped matching a real path
- Fixed the status line's cost and duration resetting to zero after navigating to the agents view and back
- Fixed fullscreen mode moving keyboard focus onto the control under the pointer when you clicked the terminal window only to bring it back into focus
- Fixed path completion failing when the completion token or working directory contained a null byte
- Windows/macOS: Fixed headless sessions not cleaning up stale entries in `~/.claude/sessions` left by sessions that exited uncleanly
- Fixed the UI stopping with a render error on the first tool call when a third-party Anthropic-compatible endpoint (`ANTHROPIC_BASE_URL`) streams a `tool_use` block without an `id`
- Fixed the Write tool reporting "Out of memory" or freezing for a long time after overwriting a very large existing file, even though the file had been written
- Fixed `claude plugin install <name>` exiting silently (or hanging in a terminal) instead of reporting an error when `~/.claude/plugins/known_marketplaces.json` is empty or corrupted
- Fixed resumed sessions failing every turn with a 400 when the saved history contains tool blocks the Anthropic API does not accept (typically written by a third-party API proxy)
- Fixed `curl -fsSL https://claude.ai/install.sh | bash` failing with "Raw mode is not supported" for some Team/Enterprise users with server-managed settings
- Fixed sessions that ended in plan mode resuming outside plan mode in the VS Code extension, and in `claude -p --continue`/`--resume` with a permission prompt tool, when no permission mode was set
- Fixed the `Notification` hook not firing while the sandbox "Network request outside of sandbox" permission prompt is waiting
- Fixed Bash permission checks to always require approval for malformed commands with a dangling `&&` or `||` operator
- Fixed `--strict-mcp-config` sessions prompting to approve `.mcp.json` servers they would never load, which left background sessions waiting at startup
- Fixed telemetry and metrics requests to Anthropic carrying the API key configured for a third-party gateway (`ANTHROPIC_BASE_URL`); a credential is now only sent to its own host
- Fixed a visible API error on the first prompt after idle when `apiKeyHelper` returns short-lived JWTs: an expired cached token is now refreshed before sending, and 401/403 auth errors retry quietly
- Fixed memory growing with session length in the fullscreen and Ctrl+O transcript views: each rendered message row no longer retains a full copy of the transcript-wide tool lookups
- Fixed `/ultrareview` runs and cloud sessions launched at the same time from one repository (e.g. from several worktrees) sometimes starting with another launch's uncommitted changes
- Fixed the task progress count (e.g. `3/5`) shown for background cloud sessions such as `/autofix-pr` occasionally missing a task
- Fixed Remote Control sessions keeping their placeholder name in claude.ai and the Claude app until the second prompt; the auto-generated title now appears after the first prompt
- Fixed MCP tools marked `requiresUserInteraction` still offering "Yes, and don't ask again" in their permission prompt; the option wrote an allow rule the tool then ignored
- Fixed the self-hosted runner ending its live sessions or exiting when a work-poll response is malformed (e.g. an intercepting proxy's HTML page); it now retries the poll
- Improved `/cd`: the new directory's project settings, hooks, `.mcp.json` servers (behind the usual approval prompt), skills, and agents now take effect right after the move instead of on `--resume`
- Improved Bash tool latency on bash shells by replaying snapshot functions without a base64 subshell per function
- Improved subagent results: a subagent that stops at its `maxTurns` limit now returns its output marked as partial, with a hint to continue it via `SendMessage`, instead of appearing finished
- Improved non-interactive sessions (`-p`, SDK, cloud sessions) to automatically continue a response cut off mid-stream by a server error, connection loss, or stall instead of ending with an error
- Improved attribution of usage telemetry to your organization for workload identity federation sessions, events sent while `apiKeyHelper` runs at startup, and after a login token expired while idle
- Changed `/code-review` so Claude can also start it on its own on Bedrock, Vertex AI, and Foundry, through the Claude apps gateway, and when telemetry or non-essential traffic is disabled
- `/goal`: Changed idle sessions to start at most three check-ins on long-running background work per goal; your next message allows three more
- Changed `claude install` and `claude update` to defer a pending managed-settings consent prompt to the next interactive session instead of prompting mid-command
- Changed OpenTelemetry plugin events for plugins synced from claude.ai: `plugin_id_hash` now reflects the plugin's real marketplace, and `enabled_via` is `admin-install` for admin-installed plugins
- Fixed the command sandbox's filesystem configuration not respecting `--setting-sources`

## 2.1.245

- Fixed a crash on startup on Linux distributions that ship glibc 2.44 (for example Arch Linux, CachyOS and Fedora Rawhide)

## 2.1.243

- Added a Loops breakdown to `/usage`: per-loop run count, total tokens, tokens per run, and last run, so runaway or chatty `/loop` tasks are easy to spot
- Added `modelPicker` setting: curate the `/model` picker with an ordered, labeled list of models (any id spelling, including Vertex/Bedrock ids), appended to or replacing the built-in lineup
- Added `promptCacheTtl` and `subagentPromptCacheTtl` settings so API-key and cloud-provider users can keep a 1-hour prompt cache on the main conversation while subagents stay at 5 minutes
- Added `modelPricing` managed setting so an organization's contracted per-model rates and discount multiplier are used for `/cost`, the status line, and telemetry cost figures instead of list price
- Added a keyless sign-in under `/login` → Anthropic Console: "Sign in with your Console account" (recommended) alongside creating an API key, so organizations that don't allow API keys can sign in
- Added a `Skipped sources` line to `/status` that lists managed settings sources (for example `managed-settings.json`) present but not applied because a higher-precedence managed source is active
- Added a `managed` marker in `/mcp` and `/plugins` on claude.ai connectors whose authentication is managed by your organization
- Added a tip pointing claude.ai users who haven't connected GitHub for Claude Code on the web to `/web-setup`
- Added a `/status` line showing whether GitHub is connected for Claude Code on the web (Pro/Max), pointing to `/web-setup` when it isn't
- Added the model (and effort level) each subagent ran on to `/tasks` and the agent detail dialogs
- Fixed remote MCP servers in non-interactive (`-p`) and SDK sessions never recovering after a dropped connection; they now reconnect automatically or report as failed
- Fixed MCP server sign-in started from the desktop app failing with "Invalid redirect URI" on servers that support client ID metadata documents (for example Linear)
- Fixed auto mode staying unavailable at startup when a temporary server-side disable was cached and later flag fetches failed
- Fixed auto mode tool calls being denied as "temporarily unavailable" after about a minute of waiting when the API was briefly overloaded and asked the client to retry
- Fixed the `/model` picker silently ignoring an Ultracode selection; picking Ultracode now applies it to the current session
- Fixed `/resume` only listing the 50 most recent sessions; the picker now loads more as you scroll
- Fixed cloud sessions resuming after a mid-turn restart with a pending hook or background-task notification re-sent as