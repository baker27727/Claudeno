# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.241

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.241

- Bug fixes and reliability improvements

## 2.1.240

- Bug fixes and reliability improvements

## 2.1.239

- Cost estimates (`/cost`, status line, `--max-budget-usd`) now include the 1.1× US-only-inference premium for data-residency workspaces
- Added the one-time fullscreen renderer offer on Bedrock, Vertex, Foundry and other previously excluded setups; new installs there now start in fullscreen
- Added `/claude-api upgrade` to migrate Python projects from `anthropic` 0.x to 1.x, and updated the skill's Python reference for 1.x (timeouts use `anthropic.Timeout`, not `httpx.Timeout`)
- Cloud sessions: plugins synced from claude.ai now show as `name@synced`, work with `claude plugin enable/disable <name>@synced`, and never override a same-named plugin you installed
- Alpine/musl builds: native image paste, clipboard, and audio-capture add-ons now load (musl-built binaries instead of glibc ones refused by the runtime)
- The usage-limit message shown when your monthly spend limit is already used up now also says when your session or weekly limit resets
- Fixed Bedrock streaming behind proxies that strip the response Content-Type header, which silently doubled billed API calls by re-running every turn non-streaming
- Fixed Claude Code hanging at startup behind an HTTPS proxy when using Bedrock with an SSO profile and `awsAuthRefresh` — the credential pre-check now honors `HTTPS_PROXY`
- Fixed a raw crash dump when starting Claude Code from a directory that no longer exists; it now prints a clear message
- Fixed Edit and Write calls pausing for about 5 seconds in JetBrains IDE terminals when the Claude Code plugin is connected
- Fixed a race where pressing Esc with a prompt queued could let the next turn finish early, leaving the session idle while Claude was still working and letting a later resubmit repeat actions
- Fixed WebFetch retaining expired page content in memory for the whole session instead of the intended 15 minutes
- Fixed cloud sessions (Claude Code on the web, desktop and mobile apps) resuming out of plan mode after an idle worker restart
- Fixed MCP elicitation forms taller than the terminal being clipped in fullscreen mode: the form now fits the window, with hidden fields reachable by scrolling and Accept/Decline always visible
- Fixed remote MCP servers staying failed after a transient 5xx on a mid-session reconnect in cloud sessions or via SDK `setMcpServers()`
- Fixed custom session titles disappearing from `/resume` after more than ~64 KB of conversation was written following the rename
- Fixed `claude -c`/resume picking up sessions from a different directory whose path differed only by characters like `_`, `-`, or `.`
- Fixed `/resume` and the agents view showing a session as recently changed (and reordering it) when only its file was touched or it was merely reopened
- Fixed `/resume` in all-projects mode telling you to `cd` into a deleted directory (e.g. a removed worktree); such sessions now resume in the current directory
- Fixed the `dark-ansi` theme rendering expanded tool results in fullscreen mode with text the same color as the background
- Fixed the fullscreen renderer prompt reappearing on every launch when it could never be answered; it now stops after being shown on three launches
- Fixed `.worktreeinclude` patterns starting with `**/` silently matching nothing when the target lived in a gitignored directory
- Fixed agents, skills, and commands whose `.md` file starts with a UTF-8 BOM being silently ignored
- Fixed `/insights` echoing literal `<message>` tags in its response on some models
- Fixed marketplace `metadata.pluginRoot` having no effect: bare plugin source names now resolve under it as the docs describe
- Fixed mouse movement in browser-based terminals inserting text like `"35;150;7M"` into the prompt when a mouse report arrived split across writes
- Fixed custom theme overrides for the effort/ultracode status badge colors being ignored
- Fixed OpenTelemetry trace fragmentation: tool executions deferred by a `PreToolUse` hook now resume in the original turn's trace instead of starting a new trace
- Fixed vim mode in the agent view: Escape now switches to NORMAL mode and keeps your text instead of clearing the prompt
- Fixed the `selection:copy` keybinding silently dropping a text selection that had been extended with Shift+Arrow keys
- Fixed the `/voice` startup tip still appearing after voice dictation was enabled via the `voice.enabled` setting
- Fixed shell-mode (`!`) Tab completion dropping the `./` from a `./script` path, which left a command the shell couldn't run
- Fixed fullscreen mode answering a permission prompt or pressing a button when you clicked the terminal window only to bring it back into focus
- Fixed slash-command panels (e.g. `/config`, `/model`) in fullscreen mode covering the latest messages; the conversation now stays pinned above the panel
- Fixed the `/workflows` detail dialog overflowing the terminal and losing its header off-screen when opened while Claude is still responding
- Fixed the Linux sandbox making a nonexistent `.git/config.worktree` unreadable, which broke every sandboxed git command in repos with `extensions.worktreeConfig` set
- Fixed hooks failing with "posix_spawn ENOENT" after the session's working directory was deleted; they now run from the project root or home directory instead
- Fixed `claudeMdExcludes` not excluding a symlinked `.claude/rules` file when the pattern names the rules directory or the symlink rather than its target
- Fixed runaway session-title syncing to Remote Control when two Claude Code processes shared one background job's state (2.1.232 regression); title updates are now deduplicated and rate-limited
- Fixed sessions whose title starts with `/` being unaddressable by `SendMessage` and shown as "(untitled)" in `ListAgents`
- Fixed Ctrl+W, Ctrl+U, Ctrl+K, Option+Backspace, Option+D and vim `df`/`dt` leaving a broken `[Pasted text #N]` placeholder when the cursor was inside it
- Fixed masked (password-style) inputs such as the login code field letting their text be pasted back with Ctrl+Y elsewhere or saved to prompt history when cleared with double Esc
- Fixed Ctrl+Backspace deleting one character instead of a word in search boxes
- Fixed a request rejected by an organization policy check being re-sent before the rejection was shown
- Improved the reminder shown after compaction so a skill's original arguments are not re-run as a new request
- Long file paths on tool-use rows now truncate in the middle to stay on one line
- Remote sessions keep sending keep-alives while a long `SessionStart` or `Setup` hook runs, so the container is not idle-reaped mid-hook
- `/goal`: repeat check-ins on long-running background work now back off (30 min, then 1 h, then every 2 h) instead of repeating every 30 minutes
- `/goal`: resuming a session from the `claude --resume` picker now restores its active goal
- `ListAgents` now tells a session its own name (the one peers use to message it), and `SendMessage` to your own name says so instead of "no agent named …"
- `ListAgents` and `/list-agents` now list your live teammates (previously only subagents and other sessions appeared, so a reachable teammate looked absent)
- `keybindingFlavor: "readline"` now also matches Bash for word keys: Alt+F and Ctrl/Option+→ stop at the end of the word, Alt+D deletes to it (Ctrl+Y pastes it back), and punctuation separates words
- Persistent retry mode (`CLAUDE_CODE_RETRY_WATCHDOG`) now fails immediately on organization spend-limit and out-of-credits errors instead of waiting indefinitely for a reset
- Claude in Chrome: `/clear` now closes the session's Chrome tab group, and empty groups are closed on `/resume` and when Claude Code exits
- Remote sessions: images uploaded from mobile now include their saved file path, so Claude can copy them into files it creates
- Claude Code on the web: requests from Bash and other tools to non-API anthropic.com hosts (e.g. www, docs) now go through the session's network proxy, so your environment's allowed domains apply
- Remote Control: clearer message and `claude doctor` wording when Remote Control isn't enabled for your account
- Windows: cross-session messaging is now available, so Claude Code sessions across your machines can message each other with `SendMessage` and find each other with `ListAgents`, as on macOS and Linux
- [VSCode] "View usage" in the usage-limit banner now sits inline with the warning text instead of floating mid-banner

## 2.1.238

- Added a `keybindingFlavor` setting: set it to `"readline"` to make Ctrl+W in the prompt delete back to the previous whitespace, as in Bash; the default (`"classic"`) is unchanged
- Plugin marketplaces: `headersHelper` on a url marketplace or a catalog entry runs a command that mints HTTP headers (e.g. a short-lived token) for catalog and same-origin archive fetches
- A catalog entry's `headersHelper` runs only when you install or update that plugin, after its command is shown; `claude plugin install/update` ask `[y/N]` (or pass `-y`)
- Added `claude self-hosted-runner --defer-shutdown-max-min <minutes>`: on SIGTERM, keep serving attached sessions, park what is left after that many minutes, then exit
- Added `claude self-hosted-runner --proxy-authorization-command` / `--proxy-authorization-file` for egress proxies that require a freshly issued `Proxy-Authorization` header on every connection
- Fixed unbounded memory growth in long interactive sessions: subagent tool results are now released once they leave the recent display window
- Fixed custom, project, and plugin output styles drifting back to the default voice mid-session
- Fixed `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=true` not keeping prompt suggestions on when your account is near, but not over, its usage limit
- Fixed worktree-isolation Bash refusals telling you to remove a redirect when the command had none
- Fixed self-hosted runners occasionally being removed by the server after a single slow or lost poll request, handing their healthy session to another runner
- Fixed MCP elicitation dialogs showing nothing for URLs longer than 4,096 characters, and permission prompts dropping the "don't ask again" option when the project path didn't fit the terminal width
- Fixed leftover `/tmp/claude-*-cwd` files when a Bash command is killed, times out, or is interrupted
- Fixed held Backspace being ignored on terminals that send Ctrl+H for Backspace when keystrokes arrive in large bursts (slow SSH/mosh links)
- Fixed text-wrapping in permission prompt diffs: lines containing wide multi-code-point characters (such as emoji) or tabs are no longer clipped
- Fixed killing a suspended (Ctrl+Z) session sometimes leaving the terminal in bracketed-paste mode with the cursor hidden
- Fixed stdio MCP servers receiving a `server/discover` request before `initialize`, forcing lazy servers to start their backend on every session open
- Fixed a proxy's refusal of a connection being reported as a generic network error instead of naming the proxy
- Fixed the `/model` and `/effort` cache-miss warning appearing when the prompt cache had already expired
- Fixed per-task Stop from the Remote Control tasks panel doing nothing on CLI-hosted sessions
- Fixed remote sessions exiting when a client delivered a user message without a valid role
- Fixed Remote Control sessions started by `claude remote-control` inheriting session-scoped environment variables from the launching shell
- Fixed a Remote Control session whose process crashed staying unavailable until `claude remote-control` was restarted; it can now be reused when you next message it
- Fixed Remote Control messages sent from the web or Desktop while Claude is mid-turn disappearing from the transcript after the turn finishes
- Fixed Remote Control model picks made on a phone or web not updating the model shown in the terminal
- Fixed Remote Control disconnecting with "login expired" when a brief net