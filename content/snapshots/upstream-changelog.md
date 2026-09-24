# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.281

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.281

- Added Claude apps gateway support for newer Claude Desktop keys in `desktop` policy blocks, including `blockReadsOutsideWorkingDirectories` and `disableBypassPermissionsMode`
- Added `assume_role` on Claude apps gateway Bedrock upstreams: the gateway calls Bedrock as an IAM role it assumes through STS, in another AWS account if needed, optionally one session per developer
- Added `guardrail: {id, version}` on Claude apps gateway Bedrock upstreams to apply an Amazon Bedrock guardrail to every request sent through them (set it on all Bedrock upstreams or none)
- Added `telemetry.resource_attributes` to the Claude apps gateway config, to put fixed labels on the telemetry of Claude Desktop and `/login` sessions
- Added `"attribution": false` in `settings.json` to hide all commit and PR attribution; older CLI versions skip a settings file that holds it, so keep the object form in files shared across versions
- Added MCP URL-mode elicitation on 2026-07-28 protocol connections, so servers can ask Claude Code to open a browser-based flow; no waiting dialog is left on screen when the server has no way to confirm completion
- Added MCP server checks to `claude plugin validate`: it reports `.mcp.json` entries that would be silently dropped at load, undeclared `${user_config.*}` references, and insecure URLs
- Added an auto mode recommendation to `/insights` that estimates how many permission prompts auto mode could have handled in your recent sessions
- Added a scrollbar to the `/skills`, `/mcp` and `/plugin` Installed lists in fullscreen mode, like the one `/workflows` now has: it appears while the mouse is over the list and can be clicked or dragged
- Fixed a crash ("unrecoverable interface error") that could end a session while an API request was being retried
- Fixed a turn that could retry indefinitely, ignoring `--max-turns`, when the model alternated unparseable tool calls and output-limit truncation
- Fixed resumed sessions re-sending earlier turns in a changed form (a parallel tool-call turn, an MCP tool call's input or a tool-search result while its server was still reconnecting, or a tool-search result whose loading turn was interrupted), which could make the API drop the conversation's prior reasoning
- Fixed resuming a very large session sometimes restoring only its last few messages
- Fixed a session resumed after a restart during a pending permission prompt sending a different history than before, which broke the prompt cache from that point
- Fixed resuming a session that ended during a tool call: Claude now sees the call and is told its outcome is unknown, and a manual resume no longer adds a hidden "Continue" message
- Fixed sessions with an earlier advisor result the API could no longer read failing one request every turn and repeatedly losing earlier reasoning; the history is now repaired once
- Fixed the prompt cache being lost when an MCP server disconnects mid-conversation, or is still connecting after a resume, while tool search is off (for example behind a proxy or gateway)
- Fixed responses cut short by a proxy or gateway that closes the stream cleanly being shown as complete with no warning, and tool calls running twice on duplicated stream events
- Fixed responses failing with "Content block not found" when a proxy drops a stream event mid-response; the partial response is now kept, and web search keeps results that already arrived
- Fixed an empty completed response being requested twice when the connection dropped before the stream's final event
- Fixed the stop reason being lost when a proxy sends a trailing usage-only frame
- Fixed `CLAUDE_CODE_RETRY_WATCHDOG` sessions failing on the first 5xx or dropped connection after a run of 429/529 waits, and sleeping uncapped and silently on a long `Retry-After` from a 5xx
- Fixed fast mode retrying rate-limited requests back to back when the server sent `Retry-After: 0`
- Fixed a tool that returned an oversized image leaving sibling tool calls unanswered and still running, or ending the turn with no final message
- Fixed conversations getting permanently stuck on "tool_use.name: String should have at most 200 characters" after the model called a tool by an overlong name
- Fixed tool calls failing with "Failed to get memory usage", or being reported as failed after they ran, when Claude Code cannot read its own memory usage, for example when it has run out of file descriptors
- Fixed `--input-format stream-json` sessions (Agent SDK, VS Code extension) and scheduled cloud sessions failing every turn with an error when an earlier assistant message had plain-string content
- Fixed non-interactive sessions (`-p`, Agent SDK) failing on the next turn after the directory they were started in was deleted mid-session
- Fixed headless sessions with host-side (SDK) MCP servers stalling on the first message when the host stops responding mid-handshake; remote sessions now wait a few seconds at most
- Fixed interactive startup waiting on the managed-settings network request (about 80 ms, 17+ seconds when the network is unreachable) when no MCP servers or plugins are configured
- Fixed a delay of up to two minutes before responding when reading or @-mentioning a PDF larger than 3 MB
- Fixed an interrupted Read of specific PDF pages leaving its page render running for up to two minutes
- Fixed permission dialogs and attachment checks reading a path under macOS's `/.vol`, `/.nofollow` or `/.resolve` (which can reach a network mount) before approval
- Fixed a recursive `rm` whose target is only command-substitution output, such as `rm -rf "$(pwd)"`, running unprompted in auto and `--dangerously-skip-permissions` mode; it now asks even with a Bash allow rule, unless run with `CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT=1`
- Fixed a permission rule containing a NUL byte being expanded into a wildcard match; such a rule now matches nothing
- Fixed sandbox `excludedCommands` entries not matching `git rev-parse --git-dir`, programs named like shell builtins, and commit messages containing `[WIP]` or `#` lines
- Fixed sandboxed Bash commands being unable to write to `$TMPDIR` when `CLAUDE_CODE_TMPDIR` is set
- Fixed `claude --bg` starting a background session, and running its project hooks, in a directory that had not passed the workspace trust prompt; it now asks for trust first, or exits when not run interactively
- Fixed `--setting-sources` (and SDK `settingSources`) not being forwarded to spawned sessions: teammates, `/bg`, `claude agents` sessions and `--worktree --tmux` now start with the parent's restriction
- Fixed Read, Write, Edit and NotebookEdit: a file path containing a null byte now fails that tool call with a clear error instead of ending the whole turn
- Fixed Write refusing a call that gives the file path or content twice under two parameter names with identical values
- Fixed CLAUDE.md and rules files from an `--add-dir` directory inside the working directory being sent to the model twice in headless and SDK sessions
- Fixed remote sessions staying on "needs approval" with a stale prompt after a permission prompt and a sandbox network-access prompt overlapped and both were answered
- Fixed cloud sessions not telling Claude about background agents that finished just before a worker restart
- Fixed scheduled routine and notification turns in remote sessions not receiving turn-start notices (newly available tools, MCP changes, date, todos) until after the first tool call
- Fixed scheduled tasks and `/loop` wakeups being fired again every second when their delivery failed, which could make Claude Code exit at the end of a turn
- Fixed Remote Control reporting "disabled by your organization's policy" when the org policy simply hadn't loaded yet; it now retries the fetch and says it couldn't verify
- Fixed the Artifact tool missing from Remote Control sessions that `claude remote-control` starts for you to open from Claude Desktop, claude.ai or the mobile app
- Fixed macOS credential writes dropping stored MCP OAuth tokens or deleting the keychain entry when the login keychain was locked (e.g. right after wake)
- Fixed `gcpAuthRefresh`/`awsAuthRefresh` login processes being left running (and holding their localhost callback port on Windows) when Claude Code exits or the refresh times out
- Fixed the "Not logged in · Run /login" footer and missing claude.ai connectors persisting in a session after logging in from another Claude Code process
- Fixed `mcp_tool` hooks on blocking events (PreToolUse and similar) being skipped while their MCP server was still connecting; they now wait for it, up to the MCP connect timeout
- Fixed the same MCP server being connected twice when a plugin or claude.ai connector and a configured server spell its URL differently (host letter case, default port, trailing slash)
- Fixed `MCP_CONNECTION_NONBLOCKING=0` giving up on claude.ai connectors after 1s instead of honoring `MCP_CONNECT_TIMEOUT_MS`
- Fixed `--channels` plugin entries being checked against the installed plugin's marketplace alone; the installed plugin's name must now match the entry as well
- Fixed `--plugin-dir` on a folder of plugins that also has a `.claude-plugin/marketplace.json` loading one empty plugin instead of the plugins in it
- Fixed `claude plugin uninstall` refusing to remove a project-scope plugin that isn't enabled, saying it is "enabled at project scope" while `claude plugin disable` says it is already disabled
- Fixed `claude plugin update` failing for project-scoped plugins when `--scope` is omitted — it now resolves the scope the plugin is installed at instead of assuming user
- Fixed `claude plugin validate` reporting `privacyPolicyUrl`, `supportUrl` and other listing metadata keys in plugin.json as unknown fields
- Fixed `known_marketplaces.json` recording a marketplace as refreshed when its remote could not be reached and `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` kept the existing clone
- Fixed the `/plugin` Errors tab showing no confirmation after its last error is resolved
- Fixed `/plugin` starting a second uninstall or update of the same plugin when Enter was pressed again while the first was still running
- Fixed a `y` held while `/plugin` checks a marketplace source adding the marketplace the instant the "Add marketplace?" question appears, before it can be read
- Fixed `1` answering Yes in `/permissions`' delete and remove-directory confirms while the pointer is on No, which let a held `1` remove one workspace directory after another
- Fixed Alt+T and `/config` offering to turn thinking off on models that can't; thinking now stays on there, with a one-line reason in place of the switch
- Fixed `/context` total leaving out messages added since the last response; it now matches its categories and can read higher than the status line
- Fixed `/model` showing the raw API error JSON and request ID when the API refuses the picked model; it now shows the server's message and says the model was not changed
- Fixed API errors from an HTML error page (such as a proxy's 429 or 502 page) printing the page's raw markup or leaving out the HTTP status, and error messages breaking onto a second line when the server's error text ended in a newline
- Fixed /feedback, /bug and /share still sending your report after you cancelled it while it was being sent
- Fixed /feedback, /bug and /share failing every send with "Couldn't send feedback" after a Remote Control Stop arrived while the dialog was open
- Fixed `/ide` showing "No available IDEs detected" while also listing a running IDE
- Fixed the terminal being left in a broken state (crash or garbled input) when `/setup-bedrock` or `/setup-vertex` restarts Claude Code to apply new settings
- Fixed `/config` exiting when `respectGitignore` or `copyFullResponse` in `~/.claude.json` holds `null`
- Fixed the session name from /rename disappearing while Claude asks a multiple-choice question, so side-by-side sessions stay identifiable
- Fixed 