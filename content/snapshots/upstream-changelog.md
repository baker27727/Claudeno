# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.285

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.285

- Added `CLAUDE_CODE_DISABLE_WEB_FETCH` environment variable to turn off the WebFetch tool
- Added `claude --desktop` to open the Claude desktop app on the current directory, or on a session with `--continue` / `--resume <id>`
- Added `claude plugin configure <plugin>` to show a plugin's options and which are unset, or save new values read from stdin with `--values-stdin`
- Added `<server>.<key>=<value>` to `claude plugin install --config`, so a bundled `.mcpb` MCP server's own settings can be set at install time and it starts without visiting `/plugin` → Configure
- Added `allowedProviders` managed setting to limit which API providers a machine may use (Anthropic API, a custom endpoint, Bedrock, Mantle, Vertex AI, Foundry, Claude Platform on AWS, or a Cloud gateway)
- Added `CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES` environment variable to cap re-sends of a non-streaming fallback request that timed out
- Fixed `claude -p` with `CLAUDE_CODE_FORK_SUBAGENT=1`: a subagent's own Agent call now runs in the foreground, so the subagent gets the child's result
- Fixed plugin and marketplace installs and updates over SSH ignoring the ssh program set in `GIT_SSH` or in your git config's `core.sshCommand`
- Fixed Claude Code refusing to start when the OS denies reading the managed settings file; it now warns and starts without that file's policies. Other read errors and unparseable files stop every session
- Fixed cloud sessions that restarted after their conversation was compacted refusing the next update to an artifact the session had already read or published
- Fixed `claude plugin disable` and `enable` with a full `name@marketplace` id changing a settings entry in another letter case instead of the installed plugin's own
- Fixed files attached to a message sent over Remote Control being left out after a single failed download; a network error, timeout or server error is now retried up to twice
- Fixed switching models mid-session with a `set_model` request (such as the Agent SDK's `setModel`) leaving the new model on the built-in output-token limit and auto-compact window until restart
- Fixed redacted logs and transcripts showing part of a URL password that contains `@`, or all of it when the URL writes its `@` as `%40`
- Fixed SSH passphrase and new-host prompts from worktree and `/teleport` fetches taking over the terminal; these fetches now fail fast instead of asking
- Fixed switching off an MCP server added mid-session in SDK and `-p` sessions leaving its tools available
- Fixed `claude -p --permission-prompt-tool`: a background subagent's permission request now goes to the prompt tool instead of being auto-denied
- Fixed `claude mcp list` and `claude mcp get`, and the not-found error of `claude mcp remove`, `login` and `logout`, printing line breaks and terminal escape sequences from MCP server names and values
- Fixed sandbox auto-allow asking for approval on every run of many inline scripts (`python3 -c`, `node -e`) just because they contain `=`
- Fixed fork subagents not keeping the session's plan mode or `dontAsk` mode: a fork now runs under its parent's permission mode and cannot exit plan mode
- Fixed `claude remote-control --help` saying `--[no-]chrome` defaults to the machine's `/chrome` setting; spawned sessions keep Claude in Chrome off unless `--chrome` is passed
- Fixed background subagents in auto mode prompting a second, redundant reply after each report
- Fixed cloud session creation and `/remote-env` reading only the newest 20 of an account's environments
- Fixed Remote Control marking a message as read as soon as it arrived instead of when Claude started on it, and losing a message still queued when the terminal quit (it now arrives on the next resume)
- Fixed installing a plugin with `claude plugin install` or `/plugin` putting it into an installed plugin's cache or data folder when their ids differ only in `.`, `-`, `@` or (macOS, Windows) capitals; the install is now refused
- Fixed hooks and SDK permission callbacks seeing a missing or outdated plan on ExitPlanMode when the plan was written in the same response
- Fixed the first reply in cloud sessions arriving tens of milliseconds late, a regression in 2.1.283
- Fixed sessions that authenticate with `ANTHROPIC_AUTH_TOKEN` against the Anthropic API never loading the organization's policy
- Fixed a failed `agent()`, `parallel()` or `pipeline()` call that a workflow script awaits later, or not at all, being treated as an unhandled promise rejection, which could end a background session
- Fixed synchronous hooks hanging Claude Code while a background process the hook started (for example `some-daemon &`) kept its output open; the hook now finishes shortly after its own process exits
- Fixed WebFetch reporting a rate-limited domain safety check as a network or enterprise policy block
- Fixed the fullscreen ctrl+o transcript freezing briefly when opened on turns with hundreds of file reads or searches; tool calls still running when the transcript opens now show their results when they finish
- Fixed Amazon Bedrock mid-stream `modelTimeoutException` and `serviceUnavailableException` errors showing a raw JSON body instead of the error message
- Fixed `/autofix-pr` and `/schedule` saying the Claude GitHub App is not installed on a repository whose install status had not been checked yet
- Fixed dismissing a row (x) in `/artifacts` unlinking its file from the artifact, so publishing the same file again created a new artifact instead of updating it
- Fixed Artifact tool publishes after a conversation rewind (Esc Esc) overwriting a file's newer content that Claude had read only in the rewound turns; the publish is now refused until Claude re-reads the file
- Fixed an `Artifact` allow rule ("don't ask again") letting the Artifact tool publish a file outside the working directories without asking; add the file's folder with `--add-dir` for the rule to cover it
- Fixed `/cost` and SDK `modelUsage` reporting a turn under the wrong model when the server answered a refusal with a different fallback model than the client expected
- Fixed the Artifact tool so that publishing a page no longer lets Claude overwrite its source file without re-reading it when Claude's earlier read was cut short or the file had changed since
- Fixed auto mode skipping its classifier for Artifact tool asset uploads and reads of someone else's artifact when you had approved that artifact earlier in another permission mode
- Fixed a misleading "core.worktree is set" error from `/ultrareview` when the project folder briefly could not be read
- Fixed `/ultrareview` on macOS and Linux failing to upload the working tree from a git worktree whose per-worktree config sets `core.longpaths`
- Fixed the Artifact tool sometimes reporting a publish as a conflict with another session after retrying a temporary server error, when the first attempt had actually succeeded
- Fixed `/ultrareview` uploads including uncommitted changes to credential files whose name has a colon before the extension, such as `server:8443.key`
- Fixed a rare auth failure when two sessions recover a login refresh lock left by a crashed process at the same time
- Fixed the PowerShell tool's permission check skipping deny and ask rules, and caching that failure for later checks, when its command parser failed to start (for example when the machine was out of memory)
- Fixed `/ultrareview` uploads on macOS and Linux running slowly on some unusual file names, and their credential-file check missing file or folder names with many backup or editor marks
- Fixed a cancelled shell command or hook still starting, and running to its end, when the cancel arrived while it was being set up
- Fixed vim mode: after editing in the external editor (Ctrl+G), `x` or `r` in NORMAL mode no longer breaks a pasted-text placeholder at the end of the prompt
- Fixed responses blocked by the API's output content filter being re-sent and retried, sometimes for minutes, instead of showing the filter's error right away
- Fixed plugins silently skipping a bundled `.mcpb` MCP server that still needs configuration: `/plugin`, the install message and `claude plugin install` now say so and point to Configure
- Fixed compacting or resuming a session failing, opening without its history, or crashing when its saved transcript holds a compaction marker or loop wakeup entry with missing or malformed fields
- WSL: Fixed `/ultrareview` refusing to upload a checkout on a Linux volume when a changed file's name has a colon or ends in a dot or space
- Fixed `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` re-running a turn that had ended at `--max-turns`
- Fixed sign-in that could wait forever after the browser showed success
- Windows: Fixed `/ultrareview` uploading a linked worktree of a repository rooted at your home folder in some cases
- Fixed cloud sessions reporting the uploads folder as missing before any file had been uploaded
- Fixed a reply sent from `claude agents` to a background session waiting on a permission prompt sometimes approving the pending command
- Fixed `claude attach`, `logs`, `stop`, `respawn` and `rm` starting a new session with the command name as its prompt when options came before it, such as from a shell alias
- Fixed `claude mcp list` leaving out WebSocket (`ws`) MCP servers; each is now listed with its URL and health status
- Fixed `claude mcp get` showing no Type, Command, Args, or Environment for stdio servers whose config entry omits the `type` field
- Fixed `.claude/settings.local.json` allow rules being held back outside a git repository when git's trace2 output is configured
- Fixed the `/claude-api` eval runner scaffold and report builder writing through a symlink or hard link planted at an output file
- Fixed the `/claude-api` eval runner scaffold counting responses cut off at `max_tokens` in the score averages; they are now marked truncated and counted separately
- Fixed `&nbsp;` showing as literal text in the terminal when a reply uses it to indent text, such as row labels in a markdown table
- Fixed a brief freeze (up to a second) partway through long sessions outside fullscreen mode, which came back after `/clear` or `/compact`
- Fixed an approved Edit never going through when its target is a device, such as a file symlinked to /dev/null, and the approval came from the IDE diff view or changed the edit
- Fixed a failing API request being retried up to 21 times when streaming kept failing; the non-streaming fallback now shares the request's retry budget instead of getting a fresh set of retries
- Improved Claude in Chrome: the native host now reports your computer's name, so connected browsers can be labeled by computer instead of "Browser 1" / "Browser 2"
- Improved Bedrock and Vertex AI sessions to switch to an older available model of the same tier, instead of failing, when an admin removes access to the default model; session titles and summaries now fall back with it
- Improved plugin marketplace errors to name why a git address is refused instead of citing enterprise policy
- Improved validation of git URLs for plugins, marketplaces and the current repository's remote
- Improved Artifact tool results: they now suggest publishing in the same step as writing or editing the page, which can save a round trip
- Improved Remote Control: a `/btw` side question asked of a session hosted by an app such as Claude Desktop now sees the turn in progress, not only the last finished one
- Improved pictures Claude sends as BMP, HEIC, HEIF, AVIF or TIFF files: the Claude apps now show a preview where Claude Code can convert them
- Improved subagents in auto mode: a subagent's run now ends as soon as it hands its report back to its caller, instead of taking extra turns that reach no one
- Improved Bedrock and Vertex start-up model checks: models your account cannot use are now remembered for up to a day instead of being re-checked on every launch
- Improved Artifact tool publish