# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.237

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.237

- Fixed prompt caching for sessions using an LLM gateway or custom base URL
- Added a built-in "Concise" output style: Claude leads with results and skips preamble and narration, while doing the work just as thoroughly. Select it under Output style in /config.

## 2.1.236

- Added `ANTHROPIC_DEFAULT_MODEL` environment variable: sets the model new sessions start on, while a `/model` pick still overrides it and persists across restarts (unlike `ANTHROPIC_MODEL`)
- Added `notify_when_idle` to cross-session `SendMessage`: ask another Claude Code session on this machine to send one notice when it next goes idle — opt-in, one-shot, no polling (macOS and Linux)
- Sandbox: on macOS, wildcard read-deny rules (e.g. `**/.env`) now take precedence inside allowed read regions, cover matched directories' contents, and can't be bypassed by renaming the denied file
- Fixed clipboard copy, background housekeeping, background sessions, and local MCP logs breaking after the directory a session had switched into was removed (since 2.1.229)
- Fixed the fullscreen renderer failing permanently after a single failed start: it now falls back to the classic renderer instead of exiting on every subsequent launch
- Fixed the `/model` picker rendering taller than the terminal: it now shows only as many models as fit the window, with the rest reachable by scrolling
- Fixed `SendMessage` calls being rejected when a malformed closing tag left the message text inside the summary field
- Fixed unhandled promise rejections when a subprocess fails to start, for example `powershell.exe` on WSL with Windows interop disabled (regression in 2.1.234)
- Fixed fullscreen mode sometimes not showing a newly sent message until the next update after the terminal was resized
- Fixed a blank band that could remain above the prompt after clearing a multi-line prompt, and panes not repainting after resizing the terminal away and back, in fullscreen mode
- Fixed the managed-settings approval prompt sometimes not appearing at startup while still capturing the first keypress as approval
- Fixed terminal tab titles jumping in tmux (iTerm tmux integration): the title is now written only when its text changes instead of animating every 960ms
- Fixed an unclear error when the cloud environments list came back empty or malformed
- Fixed the Fable 5 first-time usage-credits prompt auto-selecting the fallback model after 60 seconds with no answer when using Remote Control
- Fixed spinner tips never appearing, with a repeated background error, when the cached guest-pass reward in `~/.claude.json` was malformed
- Fixed skills hot-reload in SDK/VS Code sessions raising an error on every skills change after the session's working directory was deleted (2.1.229+)
- Fixed self-hosted runner sessions released on idle, retire, or startup timeout occasionally resuming on another runner before the post-session hook had finished
- Fixed the Clawd mascot's eyes and feet rendering unevenly in iTerm2 at some font sizes
- Fixed occasional runaway session recaps: recap text (automatic and `/recap`) is now capped at 400 characters, cut at a word boundary
- Improved startup performance: the session counter is now written in the background
- Improved auto mode: `Monitor` allow rules are now set aside while auto mode is active, so Monitor commands are reviewed the same way Bash commands are
- Improved auto mode on Bedrock, Vertex AI, and Foundry, and when telemetry is disabled: the classifier now uses the same defaults as on the Claude API, including severity-scored classification
- Improved auto mode: the git status check can no longer be fooled by a repo's `status.showUntrackedFiles=no` setting into reporting a clean tree
- Changed the `/model` picker to highlight only the newest model's name, so the highlight marks the new release rather than an arbitrary subset of the list
- `/goal`: an idle session whose goal is parked behind long-running background work now checks in automatically after 30 minutes (then 1h, 2h) instead of waiting for you to return
- `/usage` now shows the usage-credits spend row for Team and Enterprise members, and shows a capped row at 0% before anything is spent
- SIGTERM in print/SDK mode no longer records an interrupted turn or synthetic tool denials before exiting; running commands are still terminated and the process still exits with code 143
- Pressing Enter on a slash-command typo or a command unavailable in this session now reports it instead of running the closest fuzzy match; prefixes and aliases still run
- Remote Control now marks a session offline within seconds when the CLI exits or its terminal closes
- `SendMessage` now refuses further messages to a session up front once a rapid burst would exceed what that session's inbox accepts, instead of reporting them sent while they were dropped
- Aligned the session title chip on the prompt border with the footer's right edge
- Right-aligned footer items (goal indicator, session state, background agent status) and truncated notices now share a consistent right margin with the rest of the prompt area
- [VSCode] Added screen reader support for the transcript: live announcements for replies, permission requests, errors, and status changes, plus per-turn heading navigation

## 2.1.235

- Added an optional `spellcheck` setting that underlines misspelled words in the prompt input as you type, using your installed `aspell`, `hunspell`, or `ispell`
- Fixed whole-prompt-cache invalidation when a language server disconnected or reconnected mid-session
- Fixed nested markdown list items misaligning at depth 3+ and added a hanging indent to wrapped list items in the terminal UI
- Fixed prompt input highlights (slash commands, keywords, mentions) appearing shifted by one or more characters in some multi-line prompts
- Fixed Shift+Tab inside the permission prompt's comment field approving the edit and granting session-wide edit permission instead of closing the field
- Fixed the Agent tool advertising a general-purpose default in sessions where that agent is unavailable: an omitted `subagent_type` there now gets a clear error listing the available agents
- Fixed notebook cell delete/replace approval dialogs silently omitting the existing cell content when the notebook or cell could not be read; the dialog now says why
- Fixed slash commands run while Claude is responding showing HTML entities instead of the actual characters
- Fixed the prompt footer not showing the "Update installed" restart notice after a background auto-update
- Fixed the expanded task list (`ctrl+t`) always starting collapsed when resuming or relaunching into a session that still has open tasks
- Improved memory and CPU usage while cloud sessions such as `/ultrareview` or `/autofix-pr` run in the background — their event streams are no longer re-scanned and re-rendered on every update
- Improved permission dialogs: display text and "don't ask again" options now always match what a grant would cover, and "don't ask again" is withheld when contents cannot be fully displayed
- Improved the embedded `grep` in native macOS/Linux builds: pathological patterns now fail fast instead of exhausting memory, and `-m N` with `-A/-C` prints correct context
- Improved the context-limit error to say when auto-compact is off and point to `/config` to re-enable it
- Vim mode: NORMAL mode and cursor position are now preserved when toggling the detailed transcript (ctrl+o) or closing a panel
- Dialogs: arrow keys and Enter pressed in quick succession now select the option you navigated to instead of the previously highlighted one
- `SendMessage` now refuses messages too large for cross-session delivery up front instead of silently dropping them
- Remote Control: `claude rc` now applies the same enterprise-gateway availability check as interactive startup
- [VSCode] Fixed focus jumping between open Claude tabs on its own when a window with several Claude panels is restored or reloaded

## 2.1.234

- Added the optional `CLAUDE_CODE_PROJECT_DIR_NAME` environment variable: hosts that give each session its own config directory can choose a short name for the per-project transcript directory
- Added the `selection:clear` keybinding action, so a key can be bound to clear an in-app text selection; also works in the agents view
- Added a GitLab merge request badge to the footer and statusline: repos with a GitLab remote and an authenticated glab CLI show MR !N with draft/pending/green states
- Claude Code now continues your session automatically when a claude.ai usage limit resets; turn it off in `/config` ("Continue automatically at usage limit")
- Claude is now told to use your account email only to identify you, and not to send it to unrelated services unless you ask
- Security: remote file reads, session restore, CLAUDE.md includes, workflow scripts and file uploads now reject Windows NT-namespace (`\??\`) paths, hardening the remaining pre-approval file accesses against the NTLM credential-leak vector
- Fixed auto mode in very long sessions repeatedly re-checking and denying sandboxed commands' network access after the conversation had been compacted
- Fixed session-scoped permission answers (including denies) being dropped when answering background subagent tool permission prompts
- Fixed a crash when an API response on the non-streaming fallback path (typically via third-party gateways) contained a thinking block missing its thinking field or a text block missing its text field
- Fixed markdown rendering becoming extremely slow for some messages containing unusual Unicode sequences
- Fixed `SendMessage` rejecting a recipient copied from `ListAgents` when the session name is at the 200-character cap or emoji-heavy
- Fixed repository detection mis-reading the host of git remotes with unusual userinfo, producing links and repo-specific behavior for the wrong host
- Fixed MCP diagnostics printing resolved secrets: scope-conflict warnings now show the configured `${VAR}` form, and connection-failure details show only the server origin
- Fixed `strictKnownMarketplaces` allowlists accepting SCP-style git marketplace sources whose host differs from the one git would actually connect to
- Fixed modal text such as the `/login` OAuth URL losing characters when copied in fullscreen
- Fixed a `---` horizontal rule in rendered markdown running into the line after it
- Fixed consecutive shell commands splitting into multiple "Ran 1 shell command" rows when todo/task updates were interleaved between them
- Fixed dialogs like `/permissions` opened while a `!` shell command was running being dismissed when the command finished
- Fixed a queued `!` shell command being sent to the model as plain text after pressing up-arrow to edit the queued input
- Fixed queued messages reappearing in the prompt history while still queued, Esc while selecting a queued message no longer interrupts the turn, and `!` mode no longer sticks after a mid-turn submit
- Fixed accepting the "Try the new fullscreen renderer?" prompt restarting the session without its permission mode (e.g. `--dangerously-skip-permissions`), tool allow/deny rules, model or effort flags
- Fixed `/tui` dropping launch `--allowed-tools`/`--disallowed-tools` rules when it restarts; it now declines to switch, with the reason, when the session has restrictions a restart can't carry over
- Fixed trust prompts omitting the repository-wide scope warning when the directory was first seen before the repository existed there
- Fixed a case where an IDE diff tab closing during a permission re-prompt could answer the new prompt with the previous input
- Fixed: files sent to the user during Remote Control sessions hosted by Claude Code Desktop or VS Code now upload, so they open on phone and web instead of showing an empty card
- Fixed: after `/login` while `CLAUDE_CODE_OAUTH_TOKEN` is set, the stale-token reminder no longer leaks into Claude's automatically resumed turn — it now appears 