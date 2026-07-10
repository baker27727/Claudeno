# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.206

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.206

- Added directory path suggestions to `/cd`, matching `/add-dir` behavior
- Added a `/doctor` check that proposes trimming checked-in `CLAUDE.md` files by cutting content Claude could derive from the codebase
- `/commit-push-pr` now auto-allows `git push` to the repo's configured push remote (`remote.pushDefault`, or the sole remote when only one is configured) in addition to `origin`
- Gateway: `/login` now supports Anthropic-operated public gateway endpoints
- `EnterWorktree` now asks for confirmation before entering a git worktree outside the project's `.claude/worktrees/` directory
- Background agents now upgrade to a new version in the background right after a Claude Code update, instead of paying a slow stale-session upgrade when you attach
- Fixed an expired login failing every model with a misleading "There's an issue with the selected model" error instead of prompting to run `/login`
- Fixed `claude --resume` and `--continue` not responding to keyboard input on startup
- Fixed MCP servers configured via `--mcp-config` or `.mcp.json` ignoring a per-server `request_timeout_ms`, which caused long-running MCP tool calls to time out at the 60s default in fresh sessions
- Fixed `CLAUDE_CODE_EXTRA_BODY` being silently ignored by `claude agents` / `--bg` background workers; the shell-exported override now follows the dispatching session
- Fixed OAuth MCP servers requiring manual re-authentication after a single failed token refresh
- Fixed `--permission-prompt-tool` pointing at an MCP server crashing with "MCP tool not found" on cold start before the server finishes connecting
- Fixed `/model` picker rows printing a price for a different model than the row named, and stopped quoting first-party list prices on providers that don't bill them
- Fixed server-provided model rows being misplaced in the `/model` picker when an entitlement or allowlist restriction drops the row they were positioned against
- Fixed desktop sessions getting stuck showing "running" after a slash command was sent mid-turn
- Fixed keyboard input being ignored in the agents view when a setup prompt appeared before a bare `claude --resume` on Windows
- Fixed `claude rm` leaving the removed job in the daemon roster, causing the row to reappear in `claude agents`
- Fixed `/remote-control` showing "Unknown command" when logged out — it now explains how to sign in
- Fixed left arrow not stepping back out of a phase or agent in the workflow detail view
- Fixed `/status` listing the same broken-install warning twice
- Fixed false "disused plugin" tips and skewed disuse telemetry for LSP plugins
- Fixed `/doctor`'s update check to compare Homebrew installs against their cask's channel instead of the settings channel
- Fixed the fullscreen jump-to-bottom pill suggesting Ctrl+End on macOS, not showing rebound chords, and wrapping over the transcript
- Bedrock: fixed a multi-minute startup hang when using an `awsCredentialExport` helper on networks with restricted egress
- Improved `/code-review` findings quality on claude-opus-4-8 across all effort levels
- Improved agents view: status column now uses full terminal width instead of truncating at 64 characters
- Changed agents view: Ctrl+X now permanently removes a completed session, and sessions no longer render twice; deleted background jobs stay deleted

## 2.1.205

- Added an auto mode rule that blocks tampering with session transcript files
- Fixed `--json-schema` silently producing unstructured output when the schema was invalid, and schemas using the `format` keyword being rejected
- Fixed a message sent while Claude was working being silently lost when the turn ended at the `--max-turns` limit
- Fixed Windows worktree removal deleting files outside the worktree when an NTFS junction or directory symlink existed inside it
- Fixed background agents staying shown as "failed" or "completed" in the agent list after being resumed with `SendMessage`
- Fixed background jobs flipping from "needs input" back to "working" in the agent list when the agent's turn contained no readable text
- Fixed `claude attach` erroring when a background agent was mid-upgrade restart instead of waiting for it to come back
- Fixed session-to-PR linking missing a PR created in a Bash call whose output exceeded the 30K inline limit
- Fixed `claude mcp add-from-claude-desktop` getting stuck when a server name contains unsupported characters; invalid names are now reported and remaining servers still import
- Fixed a plugin LSP server that fails to initialize preventing a valid LSP server from another plugin handling the same file extension
- Fixed a Windows crash when the directory Claude was launched from is deleted, locked, or unmounted while a command is running
- Fixed a crash when a file watcher was closed while a directory scan was still in flight
- Fixed project verify skills being rewritten on every session instead of only when a documented command changed
- Fixed the agent view rendering one line too high and clipping its header when the job list slightly overflowed the screen
- Fixed background tasks in the web and mobile Remote Control panels showing stale "Running" status by forwarding full task state on every membership change
- Improved auto mode to ask before running `rm -rf` on a variable it can't resolve from context
- Auto-update binary downloads now stream to disk instead of buffering in memory, cutting the updater's peak memory usage by roughly 400 MB
- Background task notifications now explicitly state that no human input has occurred, preventing fabricated in-transcript approvals from being acted on
- Improved agent view: sessions that edit, merge, comment on, or push to an existing PR now link it in `claude agents`
- Improved agent view: rows now show a colored state word and a classifier-written headline instead of raw tool call text, and the peek opens with full status including the exact ask for blocked sessions
- `/doctor` is now a full setup checkup that can diagnose and fix issues; `/checkup` is its alias
- Reserved the "Claude Browser" MCP server name (alongside "Claude Preview") ahead of the Claude Desktop pane rename; user-configured MCP servers can no longer register under either name
- Fixed Cowork VM-mode local-agent sessions failing to start with "Not logged in · Please run /login" on CLI 2.1.203+

## 2.1.204

- Fixed hook events not streaming during SessionStart hooks in headless sessions, which could cause remote workers to be idle-reaped mid-hook

## 2.1.203

- Added a warning when your login is about to expire, so you can re-authenticate before background sessions are interrupted
- Added a grey ⏸ badge to the footer when in manual permission mode, making the active mode always visible
- Added the session's additional working directories to MCP `roots/list`, with `notifications/roots/list_changed` sent when the set changes
- Fixed opening or switching background agent sessions on macOS stalling for 15–20 seconds due to a false low-memory detection (regression in 2.1.196)
- Fixed background sessions becoming permanently unresponsive to attach, replies, and stop when the daemon's session token went stale — the session now recovers automatically
- Fixed returning to `claude agents` silently stopping running subagents and re-running the prompt from scratch — their work now carries over
- Fixed a memory and per-turn CPU regression in interactive sessions: the context-usage indicator no longer re-analyzes the entire transcript after every turn
- Fixed background agents inheriting a stale `PATH` from the daemon instead of the dispatching shell, causing missing tools on Windows
- Fixed background and agent-view sessions dropping a shell-exported `ANTHROPIC_BASE_URL`, which sent API keys to the default endpoint and failed with 401
- Fixed Bash failing with "argument list too long" in repos with many git worktrees
- Fixed worktree-isolated subagents sometimes running shell commands in the parent checkout instead of their own worktree
- Fixed worktree creation rejecting nested repositories in multi-repo workspaces, leaving background sessions unable to isolate and edit
- Fixed background agents crash-looping when their working directory was deleted, replaced by a file, or became an invalid path — they now fail once with a clear error
- Fixed a background daemon auto-upgrade failure silently killing all running background sessions
- Fixed `TaskStop` and `TaskOutput` failing to find background agents spawned by another agent — errors now list running agents by id and description
- Fixed the `claude agents` composer discarding your typed message when a slash command isn't available there
- Fixed the agent list crashing when opening a stopped session whose conversation was already open in another session
- Fixed background sessions showing "Needs input" in the agent list after the question was already answered
- Fixed background agent startup failures showing only "exit_with_message" instead of the actual error
- Fixed background sessions ignoring `effortLevel` changes in settings.json when forked through the daemon
- Fixed attached background sessions ignoring `CLAUDE_CODE_DISABLE_MOUSE` and `CLAUDE_CODE_DISABLE_MOUSE_CLICKS` opt-outs
- Fixed `/exit` incorrectly warning about running background agents after all named agents had completed
- Fixed background sessions started from a non-git directory unable to edit files when a `WorktreeCreate` hook was configured
- Fixed the `@` directory picker in `claude agents` not showing registered git worktrees
- Fixed background task output on Windows being permanently replaced by an empty file after `/clear`
- Fixed content jumping when scrolling up through long transcript history
- Fixed the terminal flickering and jumping while typing in bash mode when a shell-history suggestion was shown
- Fixed literal `^[[I` / `^[[O` escape codes being printed when reattaching to a background session
- Fixed LSP-only plugins being incorrectly flagged for disuse when their language servers deliver diagnostics or answer navigation requests
- Improved responsiveness while long responses stream: live-preview updates no longer re-render the whole screen
- Improved subagent behavior: agents are now less likely to re-delegate their entire task to another subagent
- Reduced binary size by ~7 MB and startup memory by ~7 MB by loading a large bundled dependency lazily instead of inlining it
- Changed left arrow to no longer close the background tasks, diff, and workflow detail views — press Esc instead
- Changed the empty `claude agents` view to always show the organized sections (Needs input / Working / Completed) with descriptions
- Removed the startup "claude command missing or broken" warnings — they now appear in `/doctor` and `/status` instead
- Removed a redundant navigation hint from the `claude agents` footer
- [VSCode] Added a Settings toggle for "Enable Remote Control for all sessions"

## 2.1.202

- Added a "Dynamic workflow size" setting in `/config` for controlling how large Claude generally makes dynamic workflows (small/medium/large agent counts) — an advisory guideline, not an enforced cap
- Added `workflow.run_id` and `workflow.name` OpenTelemetry attributes to telemetry emitted by workflow-spawned agents, so a workflow run's activity can be reconstructed from OTel data
- Fixed a crash in the inline Ctrl+R history search when accepting or cancelling while the search was still scanning the history file
- Fixed `/rename` on background sessions being reverted when the job restarts, which broke addressing the session by its new name
- Fixed transient mTLS handshake failures when settings were re-applied during an in-place client certificate rotation
- Fixed commands sent from Remote Control (mobile/web) into an interactive session failing with "Unknown command"
- Fixed images and files sent from the Remote Control mobile or web app without a caption being silently dropped
- Fixed the sign-in URL printed