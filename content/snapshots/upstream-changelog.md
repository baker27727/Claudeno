# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.214

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.214

- Fixed single-segment `dir/**` allow rules like `Edit(src/**)` auto-approving writes to nested `dir/` directories anywhere in the tree instead of only `<cwd>/dir`
- Fixed a permission-check bypass affecting commands run in Windows PowerShell 5.1 sessions
- Fixed Bash permission checks to fail closed on file-descriptor redirect forms that bash parses differently than the permission analyzer
- Fixed Bash permission checks misjudging very long commands — commands over 10,000 characters now always prompt instead of running automatically
- Fixed Bash permission checks treating zsh variable subscripts and modifiers in `[[ ]]` comparisons as inert text — these commands now prompt for approval
- Fixed Bash permission checks to no longer auto-approve certain `help` and `man` commands that could run unsafe options, command substitutions, or backslash paths
- Fixed permission prompts on remote sessions that could proceed before the local confirmation dialog
- Added the EndConversation tool: Claude can end sessions with highly abusive users or jailbreak attempts, as on claude.ai since 2025 — see https://www.anthropic.com/research/end-subset-conversations
- Added a periodic progress heartbeat for long-running tool calls that previously went silent
- Added an ISO `modified` timestamp to memory file frontmatter
- Added `message.uuid`, `client_request_id`, and `tool_source` attributes to OpenTelemetry log events for message-level correlation and tool provenance
- Added `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH` to configure the 60 KB truncation limit on OpenTelemetry content attributes
- Added reasoning effort to the `subagentStatusLine` payload, so custom agent rows can render model and effort
- Added permission prompts for `docker` commands (including the Podman `docker` shim) carrying daemon-redirect flags (`--url`, `--connection`, `--identity`, and Podman's remote mode) that previously ran without one
- Fixed a crash when a GrowthBook feature evaluates to null, and a bug where a malformed flag payload could wipe the cached feature flags
- Fixed Bash tool killing the Claude session when a `pkill -f` pattern accidentally matched the CLI's own process (Linux)
- Fixed unbounded memory growth when `--settings` points at a device file or multi-GB file; oversized (>2 MiB) settings files now fail at startup with a clear error
- Fixed streaming turns failing with "Socket is closed" behind corporate proxies on Windows
- Fixed stream-json output truncation at exit for slow-reading SDK/pipeline consumers; the exit drain now scales with queued bytes instead of a flat 2s cap
- Fixed scheduled tasks refusing their own configured prompt as untrusted input — the fired prompt is now delivered as the session's assigned task
- Fixed PowerShell tool commands hanging until timeout when a child process waited on standard input (Windows)
- Fixed Python scripts under the PowerShell tool crashing with UnicodeDecodeError when reading non-UTF-8 data from standard input (Windows)
- Fixed Python scripts run via the PowerShell tool crashing with UnicodeEncodeError on non-ASCII output, and PowerShell 7 error messages containing raw ANSI escape sequences (Windows)
- Fixed the PowerShell tool reporting `where.exe`, `fc.exe`, and `diff.exe` as errors when they return a valid negative answer (Windows)
- Fixed `>` and `>>` under the PowerShell tool on Windows PowerShell 5.1 writing UTF-16LE files that other tools couldn't read as UTF-8
- Fixed a displaced background daemon deleting its successor's control socket on shutdown, which made the next client kill the healthy replacement daemon
- Fixed background sessions parked with `←` or `/background` and left idle keeping the background daemon and a worker process alive indefinitely
- Fixed completed background sessions being impossible to remove via `claude rm` or the agent view once the background service had gone idle
- Fixed background sessions dispatched from a non-git folder being impossible to delete from the agents view
- Fixed reopening a stopped background session failing to restore its saved conversation when an unreadable folder exists in the session store
- Fixed the Remote Control "session ready" push notification firing for sessions where Remote Control was not explicitly enabled
- Fixed `/install-github-app` and the `/mcp` settings menu being blocked in agent-view sessions — they're now refused only in background sessions with no terminal attached
- Fixed plugins enabled via the `--settings` CLI flag not loading (regression since v2.1.181)
- Fixed feature flags going stale in long-running sessions after the OAuth token rotates
- Fixed `/ultrareview` refusing to run in repos with no merge base — it now offers to review all tracked files
- Fixed `claude update` and `claude doctor` hanging silently, and the `/status` System diagnostics section going blank, when a shell-config path is a directory
- Fixed memory frontmatter values being silently truncated at an inline `#` when memory files are saved
- Fixed session cost and token telemetry double-counting on streams that emit multiple cumulative `message_delta` frames
- Fixed a spurious "check your network" warning that appeared while the advisor was thinking
- Fixed hooks with exit code 2 not blocking as documented when the hook's stdout JSON fails schema validation
- Fixed OTel log events emitted outside the turn's async context missing the interaction span's trace context
- Fixed MCP transient errors during prompts/resources refresh clearing the server's slash commands and resources
- Improved the `claude rc` workspace-trust error in the home directory to say trust there is never saved and to suggest running from a project directory
- Changed single-segment `dir/**` hook `if:` conditions to match only `<cwd>/dir`; write `**/dir/**` for any-depth matching. `deny`/`ask` permission rules keep their any-depth match.
- Changed `file` commands using `-m`/`--magic-file` or `-f`/`--files-from` to require permission instead of being auto-allowed as read-only
- Changed keep-alive connection pooling to disable after a stale-connection error, so retries open a fresh socket
- Changed SessionStart hooks to report source `"fork"` when a session begins as a fork instead of `"resume"`

## 2.1.212

- `/fork` now copies your conversation into a new background session (its own row in `claude agents`) while you keep working; the in-session subagent it used to launch is now `/subtask`
- Added `claude auto-mode reset` to restore the default auto-mode configuration, with a confirmation prompt (pass `--yes` to skip)
- Added a session-wide limit on WebSearch tool calls (default 200, tunable via `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`) to stop runaway search loops
- Added a per-session cap on subagent spawns (default 200, override with `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`) to stop runaway delegation loops; `/clear` resets the budget
- MCP tool calls running longer than 2 minutes now move to the background automatically so the session stays usable; configure the threshold or disable with `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`
- Typing `/resume` in the agent view now opens a picker of past sessions — including sessions deleted from the list — and resumes your pick as a background session
- Fixed plan mode auto-running file-modifying Bash commands (e.g. `touch`, `rm`) without a permission prompt or SDK `canUseTool` callback
- Fixed worktree creation following a repository-committed symlink at `.claude/worktrees`, which could create files outside the repository
- Fixed a `continue:false` hook's halt being dropped when the tool fails or completes mid-stream, and hook infrastructure errors being misreported as user rejections
- Fixed SIGTERM during a running Bash tool orphaning the command's process tree in print/SDK mode; the CLI now aborts the turn, kills the tree, and exits 143
- Fixed `/background` and `claude --bg` failing with "EUNKNOWN: unknown error, uv_spawn" on Windows when Group Policy blocks PowerShell 5.1; the daemon now prefers PowerShell 7
- Fixed shell mode (`!`) not executing commands containing file paths while the path autocomplete popup was open
- Fixed auto-mode denial notifications rendering broken characters when a long denial reason was truncated mid-emoji
- Fixed Ctrl+J not inserting a newline in the agent view dispatch input on terminals with extended key reporting, and surfaced the newline shortcut in the `?` help overlay
- Fixed `/ultrareview` rejecting PR references like `#123`, `PR 123`, and pasted PR URLs; error hints now name the command you actually typed
- Fixed `/ultrareview <branch>` not fetching the branch from origin when it exists remotely; it now suggests the closest branch name on typos
- Fixed `/ultrareview` skipping the billing confirmation in a new conversation after `/clear`
- Fixed `/ultrareview`'s "not a git repository" error on Claude Desktop now suggesting the project's repository folder instead of terminal commands
- Fixed hosted (host-managed) sessions failing at startup when repository settings configured mTLS certs, extra CA bundles, or OAuth scopes; these transport settings are now ignored with a warning
- Fixed a spurious "File has not been read yet" error when editing a file that had been read with offset/limit before resuming a session
- Fixed `ExitWorktree` failing with "no active EnterWorktree session" after resuming a session with `--continue`/`--resume` in print/SDK mode
- Fixed the workflow agent grid staying empty for Remote Control clients that join a session mid-run
- Fixed streaming-mode control requests being marked complete before their handler finished, which could lose the request on session restart
- Fixed background sessions created with `/fork` losing their live-parent protection after a state write failure
- Fixed reopening a stopped background session from the agent view failing silently — it now resumes the session, or shows why it can't and lets you force a restart
- Fixed agent teams: a stopping teammate could send the leader duplicate idle notifications when team initialization re-ran within a session
- Fixed the plan-approval dialog footer splitting "ctrl+g to edit in <editor>" apart when the file path is long
- Fixed the welcome banner keeping its old panel widths after a combined width+height terminal resize in fullscreen mode
- Fixed diff previews losing their line numbers and +/- markers in narrow layouts
- Fixed @-mentions attaching nothing after a partial file read, plugin uninstall targeting the wrong marketplace, and false "Command timed out" on exit code 143
- Fixed OpenTelemetry HTTP exports being rejected with 411/400 by Azure Monitor and other endpoints that don't accept chunked transfer encoding
- Fixed OTLP event log records missing `trace_id`/`span_id` when `TRACEPARENT` is set in SDK/headless mode
- Fixed conversations with many images incorrectly failing with "Request too large" errors, and improved the error message to explain the actual cause
- Fixed web search and web fetch returning "API Error" text as search results or page content when the API was overloaded
- Improved web search and web fetch reliability by retrying 529 errors and rate-limited requests with bounded backoff
- Improved prompt caching: the mid-conversation system block now works behind LLM gateways and custom base URLs (Bedrock, Vertex, 1P)
- Improved background agent attach: cold-attaching now instantly shows the formatted transcript while the session boots, instead of a blank wait
- Reduced token usage in inter-agent messaging: `SendMessage` bodies are no longer duplicated into replayed history and tool results
- Changed `/fork` to name the copy after your prompt when the session has no title, so the row is recognizable in the agent view
- Changed bare `/btw` to reopen the side-question panel on your most recent exchange so you can browse earlier answers
- Changed the `←` footer hint to pulse `N done` for a moment when a background agent finishes w