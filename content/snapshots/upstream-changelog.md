# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.247

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.247

- Added the `SendFeedback` tool: when something goes wrong in a session, Claude can draft a feedback report for you to review and send from `/feedback` (turn off with the `feedbackDrafts` setting)
- Added `{id, text, cooldownSessions, priority}` entries, `tipsFile`, and `label` to `spinnerTipsOverride`, so organizations can rotate their own tips alongside the built-in ones
- Added a tip on Bash permission prompts pointing to auto mode, with a one-keystroke "Yes, and switch to auto mode" option
- Added `/claude-api cost-optimize` to profile an existing project's Claude API spend and work through cost levers (caching, token hygiene, batch, effort, model choice) one measured change at a time
- Updated the `/claude-api` skill with Admin API coverage (organization members, invites, workspaces, API keys, rate limit reports, workload identity federation, CMEK)
- Fixed fast arrow-key + Enter sequences acting on the row above the one you navigated to in history search, `/config`, `/mcp`, `/skills`, background tasks, and `/model`
- Fixed sub-agents dying on a first-call model 404: they now use the session's fallback model chain, and the error returned to the parent includes the error type, status, request id, and model
- Fixed a hook or background agent that printed megabytes of error output being able to overflow the conversation and wedge the session on "Prompt is too long"
- Fixed Ctrl keyboard shortcuts not firing under non-Latin (e.g. Cyrillic) keyboard layouts in kitty-protocol terminals
- Fixed text like `<35;150;7M` being inserted into the prompt when a mouse report arrived split across reads right after the escape prefix
- Fixed the Bash sandbox's after-command cleanup deleting a dotfile-managed `~/.claude/settings.json` symlink (nix/home-manager, stow) when it is repointed outside the sandbox's writable area
- Fixed `/terminal-setup` overwriting your entire Zed `keymap.json` instead of merging in its keybinding
- Fixed `/rename` silently confirming when the session registry could not be updated; it now says other sessions may still show the old name
- Fixed `/compact` and "Summarize from here" in sessions started with `--agent` summarizing under the default system prompt instead of the conversation's own
- Fixed a background session showing "opening…" forever in `claude agents` after its terminal host process died; the row now fails within seconds with the reason, and Enter restarts it
- Fixed unbounded memory growth when a hook's or background task's output file could not be written; the file now notes where output was lost
- Fixed `/install-github-app` over SSH: the copy shortcut now says how the sign-in URL was copied instead of always claiming success, and the URL appears immediately when no browser can open
- Fixed shell commands carried over from the foreground logging an internal error or showing a misleading `[exited with code -1]` line when they finish in background sessions
- Fixed a version-less marketplace plugin's live cache directory being deleted and recreated on a second-scope install, which could disrupt a running session using it
- Fixed Remote Control sessions started with `/remote-control` not reporting the working-tree diff to connected clients
- Fixed self-hosted runner sessions reporting `running` before Claude Code had started, which could trigger a premature "Claude is waiting for your input" notification from the Claude desktop app
- Fixed first-run setup exiting with "Unable to connect to Anthropic services" when managed settings configure Claude apps gateway sign-in and Anthropic endpoints are unreachable
- Fixed cloud sessions (Claude Code on the web, desktop and mobile apps) sometimes showing the previous permission mode when you switch modes right after sending a message
- Fixed cloud sessions going silent when the session's container restarts between turns while a background agent, shell, or monitor is still running — the resumed session now reports the lost work
- Improved plugin marketplace hardening: names containing control or invisible characters are rejected, and marketplace-supplied text in `/plugin` and `claude plugin` output is escape-safe
- Improved Bedrock, Vertex, and Foundry sessions (and any with telemetry disabled): Claude is now told when a configured MCP server failed to connect, instead of concluding its tools don't exist
- Changed Sonnet 5's default auto-compact window to its full 1M context, so sessions on the 1M window now auto-compact at about 967K tokens instead of about 934K
- Changed cross-session peer messages to collapse by default to a one-line `Message from @<sender>: <first line>` preview; Ctrl+O expands the full body
- Changed terminal hyperlinks in rendered markdown: link targets that point at a network or automounter path, contain a control character, or lead with an invisible character now render as plain text
- Changed the prompt-footer PR badge to skip its GitHub re-check on terminal refocus when the last check is under a minute old
- Changed analytics to stay off from startup, not only after login, when managed settings force gateway login or a custom OAuth deployment is configured
- Changed Claude apps gateway sign-in requests to identify Claude Code (a `surface=claude_code` device-authorization parameter and a `claude-code/<version>` User-Agent)
- Changed organization sign-in enforcement to exit at start when the administrator's managed settings cannot be read, even if host-supplied or per-user Windows registry settings exist

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
- Fixed a visible API error on the first prompt after idle when `apiKeyHelper` returns short-lived JWTs: an expired cached token is 