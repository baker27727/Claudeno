# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.217

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.217

- Added emoji shortcode autocomplete in the prompt input: type `:heart:` to insert ❤️, or `:hea` for suggestions — disable with the `emojiCompletionEnabled` setting
- Added warnings when transcript writes are failing (e.g. disk full) or when session saving is off due to an inherited environment variable, instead of losing transcripts silently
- Fixed a memory leak where truncated MCP tool outputs kept the full untruncated result in memory for the rest of the session
- Fixed Windows auto-update failures that could leave `claude.exe` missing; failed updates now restore the preserved executable automatically
- Fixed background session isolation not canonicalizing symlinked working directories, which could let sessions escape their workspace folder
- Fixed auto-compact never triggering for Claude Opus 4.8 on Bedrock and `/compact` failing once over the limit
- Fixed corporate mTLS, TLS-verify, OAuth scope, and proxy settings being ignored in Claude Desktop sessions
- Fixed screen reader mode's startup announcement being cut off by the first prompt render, and the thinking status row re-rendering every few seconds to update elapsed time and token counts
- Fixed managed settings that set `OTEL_EXPORTER_OTLP_ENDPOINT` not governing all signals — lower-scope signal-specific overrides no longer redirect telemetry away from the managed endpoint
- Fixed `--resume`/`--continue` and `/resume` failing with a TypeError when a transcript has a malformed attachment entry
- Fixed Remote Control sessions not showing a pending permission prompt or dialog to viewers that connected after it appeared
- Fixed background shells sometimes becoming impossible to stop after a session is sent to the background (`/background` or `←`) or when the session exits on a heavily loaded machine, most visible on Windows
- Fixed a `CLAUDE.md` or `SKILL.md` paths frontmatter value with many brace groups OOM-killing or stalling the CLI at startup — brace expansion is now budget-bounded
- Fixed the transcript preview sitting flush against the input area when attaching to a starting background session; it now leaves the same one-line gap as the live layout, so the transcript no longer shifts when the session takes over
- Improved footer PR badge links to be clickable hyperlinks even when terminal support can't be detected (e.g. over ssh/tmux); set `FORCE_HYPERLINK=0` to opt out
- Changed the login-expiry warning to appear 3 days before expiry instead of 5
- Capped the frontend-design plugin suggestion tip at 3 lifetime impressions instead of repeating indefinitely
- Added a cap on concurrently-running subagents (default 20, override with `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`) so one message can't fan out unbounded background agents
- Changed subagents to no longer spawn nested subagents by default; set `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` to allow deeper nesting
- Fixed `--max-budget-usd` not stopping background subagents: once the cap is reached, new spawns are denied and running background agents are halted

## 2.1.216

- Added `sandbox.filesystem.disabled` setting to skip filesystem isolation while keeping network egress control
- Fixed a slowdown in long sessions where message normalization cost grew quadratically with the number of turns, causing multi-second stalls and slow resumes
- Fixed auto mode denying commands with "HTTP 401" classifier errors after the OAuth token expired or rotated mid-session
- Fixed AskUserQuestion telling Claude to continue even when your answer asked it to wait or explain first — free-text answers now get neutral wording
- Fixed Claude Code on the web re-asking the same question and dropping your answer after the session sat idle for a few minutes
- Fixed @-mentions silently attaching nothing after file-modifying hooks, vim dot-repeat of `c`-operators and paste, statusline running twice on resume, and resume-picker hangs on failure
- Fixed resumed background agent sessions reverting to the default agent: the agent's prompt and tool restrictions are now restored
- Fixed worktree-isolated subagents redirecting git into the shared checkout via `git -C`, `--git-dir`, or `GIT_DIR`/`GIT_WORK_TREE`
- Fixed worktree sessions landing in another project's leftover worktree when the working directory did not match the selected project
- Fixed background sessions whose worktree has no git repository being undeletable
- Fixed `claude daemon stop --any` potentially terminating an unrelated process via a stale legacy daemon lockfile
- Fixed Esc-Esc at an idle prompt not opening the rewind picker in long-running sessions with background tasks
- Fixed Bash command permission checking for compound statements with redirects inside `&&` lists or negations
- Fixed pressing Ctrl+X twice in the agent list failing to delete a session, and deleted sessions reappearing when their background worker had died
- Fixed background subagents getting cancelled when a high-priority message arrives during their startup window
- Fixed mouse and focus garbage in the terminal while a GUI editor from `/memory`, `/plan`, `/keybindings`, or Ctrl+G is open; `/memory` no longer waits for the editor to close
- Fixed Claude-in-Chrome 403-looping on reconnect when the session's OAuth token lacks a required scope
- Fixed workflow saves and scheduled-task writes following a symlink at `.claude`, which could redirect writes outside the project
- Fixed MCP re-authenticate revoking working credentials before the new sign-in succeeds, and the reconnect needs-auth message in background sessions pointing at an unusable command
- Fixed read-only commands on Windows accessing network paths without a permission prompt
- Fixed Bash command parsing of non-ASCII characters to match real shell word boundaries
- Fixed PowerShell tool permission validation of commands containing invisible Unicode characters
- Fixed dialogs in fullscreen mode stretching past the right-hand edge of their panel
- Fixed the `/config` settings list in fullscreen mode clipping its keyboard-hint footer
- Fixed the transcript-mode (Ctrl+O) footer hint wrapping on terminals narrower than 104 columns
- Fixed the Prometheus metrics endpoint (`OTEL_METRICS_EXPORTER=prometheus`) emitting invalid `# UNIT` lines
- Fixed skills and commands changed during a session not appearing in the slash menu until restart
- Fixed plugin skills with a `name` frontmatter field losing their plugin prefix in slash-command autocomplete
- Fixed telemetry misreporting permission denials: failed permission-prompt requests no longer count as user rejections, and user interrupts are now reported as user aborts instead of rejections
- Improved the `/fork` confirmation to one line with the new session's name, `claude attach` id, and a note when the copy shares your checkout
- Improved validation of `git` and `gh` command arguments in the PowerShell tool
- Improved the `/ultrareview` diff-too-large error to show configured limits, measured diff size, and largest contributing files
- Improved `/code-review ultra` empty-diff message to name the exact base ref and suggest passing an explicit base
- Improved the spend limit adjustment prompt to show the server's reason when a spend limit change is rejected
- `/context` now shows an explicit warning when the conversation exceeds the context window, and a failed `/compact` displays as an error
- `/rewind` no longer restores or deletes files through symlinks or hard links at tracked paths and reports how many paths it skipped
- Background sessions: `/mcp` and `/install-github-app` now park a "needs input" request in the agent view when no client is attached
- Updated the bundled dataviz skill: reordered the default chart palette and fixed guidance that suggested direct labels for four-series charts
- [VSCode] Fixed right-to-left text (Arabic, Hebrew, Persian) rendering in the wrong order when mixed with English or code
- Fixed cloud sessions dropping the in-flight message when the session's container restarts mid-turn — the interrupted turn now re-runs on resume instead of leaving the session unresponsive

## 2.1.215

- Claude no longer runs the `/verify` and `/code-review` skills on its own; invoke them with `/verify` or `/code-review` when you want them

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
- Fixed background sessions parked with `←` or `/background` and left idle keeping the background daemon and a worker process alive