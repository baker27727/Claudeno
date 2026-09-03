# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.259

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.259

- Added `managedMcpServers` managed setting: organizations can provide HTTP/SSE MCP servers to every user (same entry shape as `.mcp.json`); entries that name a command to run are skipped
- Added `--permission-prompts none` for unattended headless hosts: anything that would prompt is denied automatically while the active permission mode (including auto mode) keeps deciding
- Added recognition of `glab mr create/merge/close/reopen/note/update` so GitLab merge requests show as `MR !N` in the collapsed tool summary and refresh the footer MR badge
- Added `--json` to `claude plugin validate` for a machine-readable validation report
- Fixed concurrent sessions silently reverting each other's `~/.claude.json` changes — workspace trust no longer resets and MCP/project state is no longer lost when running many sessions at once
- Fixed a conversation whose thinking was rejected once being rejected again on every later turn
- Fixed Bash `Read()` deny rules not covering files given as option values (`--ignore-revs-file=.env`, `-f.env`, `@file`), `git diff`/`git grep` file operands, or `cd DIR && cat FILE` compounds; `grep -r`/`cp -r` over a directory holding a denied file now asks
- Fixed the prompt cache being invalidated when the OAuth token refreshed in sessions with telemetry disabled
- Fixed fullscreen mode showing a blank conversation after a long turn with hundreds of tool calls
- Fixed auto mode running a turn on a model it doesn't support when a command or skill's frontmatter `model:` named one; the turn now keeps the session model
- Fixed `CLAUDE_CODE_MAX_CONTEXT_TOKENS` being ignored for Vertex-style model IDs (`@YYYYMMDD` suffix) of model versions Claude Code doesn't recognize
- Fixed the live output preview of a running shell command hiding its newest lines when an earlier line wrapped
- Fixed a background GitHub connection check that ran on every launch for claude.ai users; the result is now remembered across launches
- Fixed `--resume` failing (and `--continue` opening an empty conversation) when a saved session contains an attachment entry with no payload
- Fixed frontmatter `model:` on custom commands and skills being ignored in interactive sessions
- Fixed Artifact publishing failing once with an "unexpected parameter `note`" error in conversations continued from an older version
- Fixed managed `forceRemoteSettingsRefresh` being ignored at startup when a policy helper configured by MDM or the managed settings file had already run
- Fixed worktree isolation refusing hook-created worktrees on machines where `git rev-parse` fails with a message other than "not a git repository"
- Fixed OpenTelemetry metrics and events from cloud sessions missing the `user.email`, `organization.id`, and `user.account_uuid` attributes
- Fixed MCP servers that disconnect while their tools are being listed at startup showing as connected with no tools instead of reporting the error
- Fixed the file edit permission dialog sometimes showing a changed line cut short with no indication
- Fixed repository detection dropping a known repo identity after a transient git probe failure
- Fixed managed settings silently going unenforced when the managed-settings file, a drop-in, the MDM plist, or the HKLM value cannot be parsed: Claude Code now refuses to start and names the source
- Fixed Stop not actually stopping background agents and workflows in remote-control sessions: killed tasks now stay visible and re-stoppable until their processes exit
- Fixed resuming a workflow run while its previous stopped run was still exiting, which could run duplicate copies of its agents
- Fixed marketplace repo URLs on github.com with a trailing slash or dangling `?`/`#` producing an unusable `.git` clone URL
- Fixed blocking Stop hooks causing the turn after a block to lose the model's reasoning from that turn and, on some models, miss the prompt cache
- Fixed remote (claude.ai) sessions taking 60 seconds to start a turn after a browser-hosted MCP server's page had gone away
- Fixed worktree-isolated sessions refusing common Bash loops, xargs pipelines and launcher-wrapped commands that cannot reach the main checkout
- Improved terminal resize and first-render performance for long responses by reusing text measurements
- Improved `/workflows` agent detail: JSON outcomes are pretty-printed with syntax colors and real line breaks, and long outcomes fold behind an expand toggle
- Improved headless/SDK session start: the first turn begins up to 50 ms sooner when MCP servers finish connecting
- Improved `/install-github-app` to explain it is GitHub-only and point to the GitLab CI/CD docs when run inside a GitLab repository
- Improved nested background subagent results to be saved in the parent subagent's transcript, so resumed subagents keep them and shared transcripts show the delivery
- Changed `allowedMcpServers` to govern only servers users add: a literal `managed-mcp.json` server your allowlist used to filter out now loads on upgrade; use `deniedMcpServers` to keep it off
- [VSCode] Added an Active quick filter and a status filter menu (Needs input, Working, Completed) to the session list sidebar
- Fixed remote and scheduled sessions doing nothing after a connector-tool permission prompt was approved while the session was paused

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
- F