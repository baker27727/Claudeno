# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.210

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.210

- Added a live elapsed-time counter to the collapsed tool summary line so long-running tool calls visibly tick instead of looking stuck
- Added a startup warning for `Write(path)`, `NotebookEdit(path)`, and `Glob(path)` permission rules — use `Edit(path)` or `Read(path)` instead
- Fixed `isolation: 'worktree'` subagents being able to run git-mutating commands against the main repo checkout instead of their own isolated worktree
- Fixed the `ultracode` keyword opt-in firing on non-human-originated input such as webhook payloads and relayed PR comments
- Fixed a rendered text fragment leaking into crash telemetry when a UI component returned content outside a styled text element
- Fixed paste markers leaking into external editors opened from Claude Code, which could appear as stray È/É characters around pasted text
- Fixed `claude attach` sometimes failing with "job not found" or "agent is still starting" errors during session transitions — attach now waits for the daemon to settle, and terminal resizes during a slow attach are applied once it completes
- Fixed a session crash when a tool's result renderer returned a numeric bigint value or plain text instead of a UI element
- Fixed a hook callback timeout being misreported to the model as a user rejection, which made unattended sessions stop and wait
- Fixed Claude assuming a `cd` took effect after its command was moved to the background; the tool result now states the working directory is unchanged
- Fixed plugin-provided MCP servers being torn down when MCP servers are re-synced mid-session
- Fixed plan approvals without edits being labeled "(edited by user)" and overwriting the plan file with a stale snapshot
- Fixed `/doctor` skipping its auto-mode-default proposal on Bedrock, Vertex, and Foundry, where auto mode no longer needs an opt-in
- Fixed Grep content mode claiming "No matches found" when paginating past the end of results
- Fixed unmatched `$1`/`$2` positional placeholders in skills and commands being silently stripped; they are now preserved verbatim
- Fixed plugin cache writes leaving temp files behind on failure and failing on locked-file renames on Windows and network filesystems
- Fixed background workers crash-looping when a client resets its connection to the background service
- Fixed `claude agents --effort ultracode` not reaching dispatched sessions; the value was silently dropped
- Fixed pressing ← to open the agents view dropping the task tracker when returning to the session
- Fixed the agents dashboard retaining pasted images from abandoned reply drafts after their session was deleted
- Fixed killed background sessions leaving a permanent `git worktree lock` behind; the periodic sweep now releases locks whose owning process is gone
- Fixed SDK MCP servers registered via an `initialize` control request waiting until the next turn to start connecting
- Fixed returning to the agents view from a session leaving overlapping ghost frames with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`
- Fixed late-appearing `.claude/*` symlinks not being reconciled into the sandbox deny-write list
- Hardened the Agent tool against indirect prompt injection via content a subagent read
- Improved the Bash/PowerShell tool message when a command hits its timeout and is auto-backgrounded, so the model can distinguish a hang from an explicit background request
- Improved auto mode: the permission classifier now defaults to Sonnet 5 for external sessions, validated on the session's first request and pinned for the session
- Improved the bundled dataviz skill's chart color validation with perceptual OKLab color difference and recalibrated color-blindness thresholds
- Memory writes that leave a MEMORY.md index over its read limit now produce an explicit error instead of silent truncation
- Screen reader mode now announces permission mode changes aloud when cycling modes with Shift+Tab
- The agents footer hint now shows how many background agents are waiting on your input, with a brief color emphasis when the count changes
- Agent view: the session you pressed ← from stays visibly marked even after mouse hover or arrow keys move the selection
- Fable temporarily shows as unavailable in the advisor picker while a server-side issue causing Fable advisor failures is fixed

## 2.1.209

- Fixed /model and other dialogs being blocked in `claude agents` background sessions (reverts an overly broad guard)

## 2.1.208

- Added screen reader mode: opt-in plain-text rendering for screen reader users. Run `claude --ax-screen-reader`, set CLAUDE_AX_SCREEN_READER=1, or add "axScreenReader": true to settings.
- Added `vimInsertModeRemaps` setting: map two-key insert-mode sequences like `jj` to Escape in vim mode
- Added `CLAUDE_CODE_PROCESS_WRAPPER`: agent view and the background service now honor a corporate launcher by running every Claude Code self-spawn through a required wrapper executable
- Added mouse-click support for multi-select menus and "Other" input rows in fullscreen mode
- Fixed fast mode staying off after switching back to a model that supports it — it now restores automatically when enabled in settings
- Fixed replies typed to a background agent being lost when delivery fails — the text is now saved and delivered when the session restarts
- Fixed background-session attach failing permanently ("Couldn't start the background daemon") after an update replaced the binary a running `claude agents` process was launched from
- Fixed the context window (and auto-compact indicator) briefly resetting to 200k after the CLI auto-updates, causing a false "100% context used" when resuming long-context sessions
- Fixed supervised and background sessions crashing when a server closed an HTTP/2 connection with a GOAWAY while requests were in flight
- Fixed truncated stream-json/JSON output and missing result message when piping large responses from `claude -p`
- Fixed `CLAUDE_CODE_MAX_OUTPUT_TOKENS` and similar env vars silently using the mantissa of scientific-notation values (`1e6` became `1`)
- Fixed very large markdown tables stalling rendering or using excessive memory; tables over 200 rows show the first 200 with a "… N more rows" notice
- Fixed the Edit tool failing on files modified after reading when the target text still matches uniquely
- Fixed Read reporting empty files as "shorter than offset", Grep silently returning "No files found" for invalid regex patterns, Grep count mode under-reporting totals when paginated, and Glob crashing with an unclear error when the pattern, path, or working directory contained a null byte
- Fixed `apiKeyHelper` script failures being hidden behind a generic 401 after ~10 silent retries; the script's own error is now shown within 3 attempts
- Fixed Bedrock streaming requests failing with a misleading "Truncated event message received" when a gateway transforms the response — the error now names the content-type and points at the proxy
- Fixed `/upgrade` showing a login flow instead of the upgrade URL when the browser fails to open
- Fixed stream-json input killing the session on blank CRLF or whitespace-only lines from Windows-style SDK hosts
- Fixed headless stream-json sessions hanging permanently when a `control_request` carried a non-string `set_model` payload; the CLI now answers with an error response
- Fixed repeated "No completion record was found" notices on session resume — orphaned background tasks now collapse into a single summary
- Fixed Remote Control clients attaching to a terminal-hosted session not seeing background agents and workflow progress until a task started or stopped
- Fixed the Agent tool launching with no tools when a subagent's `tools` list resolves to nothing — it now returns a clear error naming the unrecognized entries
- Fixed `/usage` showing stale cached bars over fresher data, and `/mcp` not reclassifying placeholder servers after config edits
- Fixed "Change directory" in SDK hosts (e.g. Claude Desktop) failing with "A turn is in progress" on idle sessions that have a running background task
- Fixed the workflow save dialog showing `~/.claude/workflows/` instead of the `CLAUDE_CONFIG_DIR` location for user-scope saves
- Fixed `/release-notes` adding the viewed notes to the model's context — "Show all" previously injected the entire changelog into every subsequent request
- Fixed a memory leak in the agent view where pasted images were retained for the screen's lifetime after sending peek replies
- Fixed SDK sessions losing agents defined via the initialize request when a plugin refresh ran before the client attached
- Fixed several memory leaks in long sessions: MCP stdio server stderr accumulating up to 64 MB per server, LSP documents staying open indefinitely (now LRU with 50-doc cap), async hook output retained after backgrounding, and unbounded growth in headless/SDK sessions from large tool-result payloads
- Fixed a memory blowup when reading files with extremely long single lines using offset/limit — the read now returns a clean error instead of loading the whole line
- Fixed multi-second per-turn slowdowns in sessions with many permission deny/ask rules — rule matchers are now compiled once and cached
- Improved input responsiveness while agent task lists update — task updates no longer re-render the entire UI
- Reduced per-tool-call CPU overhead in print/SDK sessions with many MCP tools by caching tool-pool assembly (up to 7x faster tool rounds at high tool counts)
- Reduced memory usage by bounding the file edit read cache to 16 MB instead of pinning up to 1,000 full files
- Reduced session transcript size (up to 79x in edit-heavy sessions) and bounded checkpoint disk usage by pruning superseded file-history backups
- Reduced memory usage when resuming sessions with background agents or forks spawned from large conversations
- Completed background agents now stay listed in `/tasks` until cleanup instead of vanishing the moment they finish
- Attaching to a stopped background agent now shows its transcript immediately while the session warms up, instead of a blank "Session is starting" screen
- Background sessions: an older daemon no longer silently restarts workers spawned by a newer version onto the older binary
- Agent view: Ctrl+X now deletes renamed-branch worktrees, never destroys unpushed commits, keeps the session row when a worktree is kept, and reused worktree names reset to the current base
- Catastrophic removals (e.g. `rm -rf ~`) in commands containing `$(…)`/backticks/`<(…)` now prompt in `--dangerously-skip-permissions` and auto mode, matching the plain form
- `/install-github-app` and the `/mcp` settings menu no longer open in background sessions
- MCP servers configured with an empty URL now show as "not configured" in `/mcp` instead of a config error
- `/usage` now shows your last-known usage bars with an "as of" note when the usage endpoint is rate-limited, instead of an error screen
- Fixed Bedrock auth failing with "Session token not found or invalid" for AWS SSO profiles whose sso_region differs from the Bedrock region (2.1.207 regression)

## 2.1.207

- Auto mode is now available without `CLAUDE_CODE_ENABLE_AUTO_MODE` opt-in on Bedrock, Vertex AI, and Foundry; disable via `disableAutoMode` in settings
- Fixed the terminal freezing and keystrokes lagging while streaming responses containing very long lists, tables, paragraphs, or code blocks
- Fixed remote managed settings from a non-interactive run (`claude -p`, the SDK) being permanently recorded as consented without ever showing the security consent dialog
- Fixed spurious prompt-injection warnings triggered by benign system-generated conversation updates
- Fixed the auto-updater overwriting a custom launcher script or symlink at `~/.local/bin/claude` on every release; `/doctor` now reports an externally managed launcher
- Fixed compound commands with `cd` prompting for permission when the only output redirect was to `/dev/null`
- Fixed the transcript jumpin