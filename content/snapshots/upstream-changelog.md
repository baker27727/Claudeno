# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.258

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.258

- Fixed Claude Code failing to launch on macOS 12 (Monterey), a regression introduced in 2.1.255
- Fixed remote and scheduled sessions failing with "user messages must have non-empty content" after a re-sent permission approval could not be applied

## 2.1.257

- Added Claude Fable 5.1 (`claude-fable-5-1`), now the default Fable model — 1M context, $10/$50 per Mtok with $0.25/Mtok cache reads
- Added "Time format" (`timeFormat`) and `timeZone` settings: 12-hour, 24-hour, 24-hour UTC, or a strftime pattern for the turn-end clock and transcript-view timestamps
- Added a Containment Escape rule to auto mode so cloud metadata-credential fetches, egress evasion, and cross-tenant reach are no longer auto-approved unless your environment marks them expected
- Added `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` to apply `CLAUDE_CODE_SUBAGENT_MODEL` (or the main model) to every subagent, ignoring per-spawn and agent-definition model overrides
- Added `s` in `/effort` to change effort for the current session only, matching `/model`
- Added a `/doctor` warning for stale sandbox mask files left by a killed session
- Added a one-time prompt in auto mode before the first file read outside the working directories, with the option to block such reads (`permissions.blockReadsOutsideWorkingDirectories`)
- Added support for a gateway-supplied `description` on discovered `/model` picker entries (`CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY`); entries without one still read "From gateway"
- Fixed settings in a `.claude/` folder created after startup not being picked up until restart
- Fixed sessions dispatched from an agent view opened with `←` always starting in the original session's permission mode, overriding the target directory's `defaultMode` and the agent's `permissionMode`
- Fixed `keybindings.json` rebinds of Ctrl+G being ignored in `claude agents`; its Ctrl+S / Ctrl+T are now rebindable via the new `Agents` context
- Fixed background sessions failing to start on macOS npm installs during a self-update, and on Windows when a stale daemon lock file pointed at a reused process id
- Fixed the working spinner stopping while a response streams behind a slash-command panel
- Fixed a background session's `state.json` `detail` repeating its own dispatch prompt after a scheduled wake-up
- Fixed `claude agents` keeping a background session you re-prompted buried in Completed after it finished again; Completed now orders by the latest finish
- Fixed `claude --bg` from a directory that was just deleted reporting "backgrounded" and leaving a crashed session row; it now prints the reason and exits 1
- Fixed Remote Control connecting mid-session re-sending the Bash tool definition, causing a prompt-cache miss
- Fixed a doubly-listed custom `Authorization` header overriding the configured credential on Bedrock, Mantle, Vertex, and WIF, and the Vertex setup wizard picking up a leftover Anthropic profile from `~/.config/anthropic`
- Fixed Claude apps gateway sending stray host `Authorization` or profile headers to Foundry, Vertex, and Bedrock, and Foundry Entra ID upstreams not starting when `ANTHROPIC_FOUNDRY_API_KEY` is set
- Fixed a leftover Anthropic API key or auth token being sent alongside your Foundry subscription key in API-key mode
- Fixed `/schedule` routines whose prompt was saved without a message role and then ran with nothing to do
- Fixed `claude agents` not saying that a background session is waiting for you to approve a message from another session, or who sent it
- Fixed a prompt stashed with Ctrl+S inside an opened background session being lost when the session went idle or was stopped and then reopened
- Fixed telemetry (OTEL) settings pushed through server-managed settings being ignored on warm starts, including desktop-app Code sessions
- Fixed a teammate permission request being answered twice when the leader's mailbox write was briefly locked
- Fixed a phantom duplicate slash-command row rendering below the in-flight turn while a command's auto-continued response streamed
- Fixed `policyHelper` `timeoutMs` and `refreshIntervalMs` values above the timer maximum (2147483647) causing failures or re-runs every millisecond; they are now clamped
- Fixed the token counter freezing or crawling after switching to another subagent's transcript, and made background subagents' and teammates' counters update live while a response streams
- Fixed sandbox network hosts written with a trailing dot (`example.com.`): a `deniedDomains` entry didn't block the host inside the sandbox, and "don't ask again" for such a host kept prompting
- Fixed dismissing the Remote Control consent prompt (Esc, or `n` at `claude remote-control`) counting as consent, so the next request connected without asking
- Fixed `/mcp` reconnect and enable still connecting a settings-file MCP server that a managed MCP allow/deny list or `strictPluginOnlyCustomization` loaded after startup should block
- Fixed `claude mcp remove` leaving a remote server's stored OAuth credentials behind when `strictPluginOnlyCustomization` locks MCP to plugin-only servers
- Fixed Remote Control (`claude remote-control`) sessions started from the Claude app ignoring the selected model and running on the machine's default instead
- Fixed `--disallowedTools` and session deny rules being dropped after the first settings reload when `allowManagedPermissionRulesOnly` is enabled
- Fixed `--resume` listing a backgrounded conversation twice and `--continue` reopening its stalled pre-background copy; `--continue` now also opens finished background sessions
- Fixed fullscreen mode not letting you click `!` shell command output to expand it
- Fixed background sessions left running an older Claude Code binary piling up across auto-updates instead of being retired
- Fixed `claude agents --json` briefly switching the terminal to raw mode and undoing another program's terminal settings on exit
- Fixed Proactive output style sessions busy-looping with filler messages and repeated log reads instead of idling while a background command or Monitor they started is still running
- Fixed subagents stopping when a response was cut off mid-stream by a computer sleep, dropped connection, or server error; they now automatically continue instead of ending with an incomplete response
- Fixed `←` doing nothing in the `/btw` panel inside a `claude agents` session: it now returns to the agents list (even mid-answer), and the panel comes back when you reopen the session
- Fixed sessions with an advisor model set missing the prompt cache on background requests (compaction, `/recap`, prompt suggestions) and re-sending the full conversation uncached each time
- Fixed `claude -p` exiting about 5 seconds after its final result while a Monitor the model armed was still running; it now waits for the watch to fire or time out
- Fixed a `permissions.ask` rule being skipped in auto mode when the matching command ran inside a compound command or subshell, letting it run without the confirmation prompt
- Fixed plugins being able to read files outside their own directory through a declared command, agent, skill, hooks or other component path that is a symlink; such paths are now refused with an error
- Fixed `/add-dir` rejecting a directory inside the current working directory; it now loads that directory's skills, commands, and agents like `--add-dir` does at startup
- Fixed the main agent not being told when you resume a subagent you had stopped from its transcript view
- Fixed a crash when pasting ANSI-colored text (e.g. a CI log) into dialogs like `/feedback`
- Fixed `claude mcp add/remove` hanging or exhausting memory when the project's `.mcp.json` is a FIFO or a device-file symlink; it now fails fast with an actionable message
- Fixed unbounded memory growth when non-JSONL data is piped into `claude -p --input-format stream-json`; it now fails fast with a clear error
- Fixed backgrounding a turn (`←` or Ctrl+B) while a subagent or other tool was running occasionally making the background session treat that tool as rejected instead of re-running it
- Fixed Bash `Read()`/`Edit()` deny rules not applying to `< file` redirects and reader commands like `tac` and `egrep`; a deny rule on any argument or redirect target now refuses the command
- Fixed resuming or messaging a subagent whose transcript had grown past 5 MB (for example after reading many images) failing with "No transcript found"
- Fixed worktree-isolated sessions refusing Bash loops, `$VAR` reads, `"$(…)"` and heredocs that never touch git as "too complex to verify that it stays inside the worktree"
- Fixed `/model` and `/effort` showing a prompt-cache warning after rewinding a conversation back to empty
- Fixed prompt-cache misses on every turn in long screenshot-heavy sessions once images exceeded the per-request size cap
- Fixed the Edit permission prompt's diff view rendering emoji and multi-code-point characters with incorrect widths
- Fixed WebSocket MCP server connection failures being logged as "[object ErrorEvent]" instead of the underlying error
- Fixed background sessions failing to open with "Couldn't start the background service" while another Claude Code process was downloading an npm update; the start now waits for it
- Fixed background commands that detach from their shell (for example under `timeout` or `setsid`) surviving a task stop or Claude Code exit
- Fixed Claude not being told when you stop a background command from the tasks panel or a connected client
- Fixed stopping a background subagent leaving its monitors running
- Fixed sandboxed git commands in a linked worktree losing write access to the repository's common `.git` directory after `cd` into a subdirectory
- Fixed Bedrock and Bedrock Mantle requests going silent during long hidden-thinking phases on Opus 4.7 and later, which let idle timeouts cut the connection; the stream now carries progress events
- Fixed launching Claude Code after a Claude apps gateway expired or revoked your session: it now says the session ended and offers `/login` instead of reporting a network error
- Fixed cloud sessions losing git/GitHub credentials for the rest of the session when the session's network proxy failed to start at launch; it now retries in the background and recovers
- Fixed leftover `cc-daemon-*` folders in the system temp directory after an interrupted background daemon start; the `cleanupPeriodDays` retention sweep now removes them
- Fixed Bash permission checks auto-approving certain `[[ ]]` conditionals that zsh parses differently from bash; these commands now prompt for approval
- Fixed the managed-settings approval prompt showing the generic warning instead of its telemetry wording when the settings also turn detailed tracing or raw API body logging off, or trace export on
- Fixed agent-team teammates in tmux/iTerm2 panes sometimes staying open after acknowledging a shutdown request
- Fixed the keyless Console sign-in ("Sign in with your Console account") not applying your organization's server-managed settings, and `/status` not showing the Organization for that sign-in
- Improved rendering performance: less re-render work per turn in long conversations, streaming no longer slows down as the reply grows, and background-agent updates no longer re-render the whole screen
- Improved prompt input responsiveness by reducing per-keystroke rendering work
- Improved policy helper diagnostics — refresh failures now show in `/status`, declining the managed-settings dialog prints why Claude Code exited, and helper timeouts are reported as timeouts
- Improved `/code-review --comment` to post findings on GitLab merge requests via `glab mr note` instead of reporting the target as unsupported
- Improved notifications: an MCP elicitation or permission ask queued under another dialog now sends its idle desktop notification at the same delay as a visible ask
- Improved verbose/transcript output: async hook completion notices that arrive together 