# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.289

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.289

- Fixed a deny or ask rule on a nested part of a compound shell command not holding over a user-installed mod's approval on managed machines
- Fixed the terminal freezing on short code blocks with many unclosed `<script>` tags or deeply nested `${` substitutions
- Fixed `Read` deny rules not applying to files @-mentioned, changed, or selected in the IDE through a symlink
- [VSCode] Reverted a 2.1.288 change to `claude auth status` that may have made sign-outs more frequent
- Improved how quickly large files open in a plugin code pane by laying the highlighted view out once at its final width
- Fixed `plugin list`, `plugin eval` and `plugin update` showing a stale copy of a plugin installed from a local folder marketplace, and hot reload for a symlinked `--plugin-dir`
- Fixed installed mods not loading in the first session after an upgrade
- Fixed a plugin's rows above the prompt showing a stale row while the Background tasks dialog was open in fullscreen
- Fixed plugin panes drawing nothing when a link used a localhost address, an `@` in its path, an uppercase host or a `file:` path
- Fixed a user-installed plugin being able to rewrite the descriptions of an organization-managed MCP server's sign-in tools
- Fixed a freeze or forced quit at launch when a plugin drew a Box with a border style the terminal does not know
- Fixed supervised and background sessions ending when a plugin's on-screen handler threw asynchronously
- Fixed sessions ending with an interface error when a plugin region with no height kept growing
- Fixed Bash deny and ask rules missing a command behind an environment variable prefix with an expanded value (e.g. `TZ="$HOME" rm -rf build`) when the sandbox auto-allows commands
- Fixed a Bash deny or ask rule being skipped under sandbox auto-allow when a bare variable assignment came before the command
- Fixed `claude plugin validate` skipping the plugin when the folder also holds a marketplace manifest
- Added `agent.spawn` for teammates, one agent id across plugin hook events, and idle and waiting states in `$.agent.list()`
- Fixed sessions ending with "unrecoverable interface error" when a value a mod's `ui.render` hook wrote made a row throw while drawn; the engine now draws its own row instead
- Fixed text with a tab, a stray escape and a C1 control, or a short text with a tab and CRLF line endings, drawing over the rows below it
- Fixed right-aligned content in a mod's pane or band drawing under the close mark or `[-]`, which now also keep one column in from the terminal's edge
- Fixed a mod's `Client` that fails while drawn taking down everything the mod drew around it; it now fails alone and raises `ui.fault`
- Fixed `claude plugin validate` failing an Anthropic marketplace's own plugin and listing a clean `plugin.json` in `--json`
- Fixed a mod's band that fails to draw briefly telling the cards under it to step aside
- Fixed a failed plugin component showing `Error` or nothing as its reason when the failure carried no message
- Improved the line a mod's author sees when its band or pane fails to draw: it names the mod and says nothing was drawn
- Fixed published artifact pages freezing or crashing the reader's browser tab on short code blocks with many unclosed `<script>` tags
- Fixed a mod's Client region staying failed for the whole session after the terminal threw while drawing it

## 2.1.288

- Added `$.ui.selection()` for mods: returns the text you last selected in fullscreen mode and, when the selection lies within one transcript row, that row
- Added a built-in `gh api` to cloud sessions whose image has no GitHub CLI, and fixed the built-in sending control characters from file names, jq filters or GitHub errors to the terminal
- Added recovery for a prompt cleared with Ctrl+C: pressing Up on the empty prompt brings the draft back, including pasted text and images
- Added a re-authenticate prompt when an MCP server asks for more OAuth scope during a tool call
- Added `--max-findings <n>|all` to /code-review to report more or fewer findings than the usual limit; the choice is reused until you pass `--max-findings default`
- Added Ctrl+F to find a session by name and Alt+↑/↓ to jump between groups in the agents view; both, and rename, can be rebound in keybindings.json
- Added a screen reader mode announcement of the new permission mode when you approve a plan, including with Shift+Tab
- Fixed mid-response API timeouts failing the turn: non-interactive sessions and subagents now continue from the partial response, and thinking-only responses are retried
- Fixed long conversations failing with "Prompt is too long" instead of auto-compacting when the last reply reported zero token usage
- Fixed `--resume` sometimes dropping files and other context that a compaction had just restored
- Fixed a resumed session sometimes not saving the last response of a turn, so that the next `--resume` showed the prompt unanswered
- Fixed resume occasionally loading a transcript cut short when the same session rewrote the file during the load
- Fixed resuming a conversation started on 2.1.286 or earlier dropping the model's earlier thinking
- Fixed session titles, memory recall and prompt hooks failing on Mantle or behind gateways that reject structured outputs; added `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS` to turn structured outputs off
- Fixed auto mode denials pointing Claude at a Bash permission rule when the blocked tool was not Bash
- Fixed auto mode on Bedrock and Mantle switching to the local classifier for the rest of the session after a request to an older model, such as a WebFetch summary or a `sonnet` subagent
- Fixed cloud sessions that restarted on a newly picked model replying with that model after the server refused it
- Fixed Cowork cloud sessions staying marked as waiting for input after a WebFetch permission prompt for an unapproved URL went unanswered for five minutes
- Fixed prompt suggestions not appearing on a phone that joins a Cowork cloud session started on another device
- Fixed a mod's button sometimes running a different button's action when pressed on a view drawn before Claude Code restarted
- Fixed a plugin's pane showing nothing when one `Code` element held a diff that does not parse; it now draws as plain code
- Fixed plugin LSP servers receiving literal `${user_config.*}` and `${CLAUDE_PLUGIN_ROOT}` placeholders in `initializationOptions` and `settings` instead of substituted values or manifest defaults
- Fixed a plugin's `tool.call` hook making Bash fail and file searches read the wrong folder in subagents that run in a worktree
- Fixed `git-subdir` plugin installs failing, or caching an incomplete plugin, on older git (before 2.39, e.g. Ubuntu 22.04's 2.34)
- Fixed plugins loaded with `--plugin-dir` not showing "Configure options" in `/plugin`
- Fixed background sessions ending when a plugin was reloaded or disabled while one of its timers or reads was still running
- Fixed sandboxed heredocs with an unquoted delimiter (`python3 <<EOF`) asking for approval on every run under sandbox auto-allow when the body holds only plain text and simple `$VAR` references
- Fixed Bash tool permission check to prompt before a `BASHPID` assignment whose value the shell would evaluate as arithmetic, instead of allowing it silently
- Fixed fullscreen sessions exiting with "unrecoverable interface error" when opening the background tasks dialog while a plugin or mod showed rows above the prompt
- Fixed Claude reporting a message to another session as delivered when that session held it: the notice now says it wasn't delivered and names the session, and in SDK sessions Claude can now learn of it mid-turn
- Fixed OpenTelemetry `claude_code.tool.blocked_on_user` spans reporting `unknown` source or decision in `-p` and SDK sessions and for PreToolUse hook approvals
- Fixed permission asks that ended unanswered, in `-p` or on an interrupted turn, emitting no `tool_decision` event
- Fixed Edit and Retry in Cowork cloud sessions refusing a message sent before `/compact` even though its history was still saved
- Fixed unattended sessions (`CLAUDE_CODE_RETRY_WATCHDOG`) retrying for hours after a very long response stream failed; Claude Code now streams again, and gives up after three timeouts
- Fixed `/login` reporting "Login successful" when credentials could not be saved to secure storage; it now shows the failure, and offers a retry when the new login didn't take effect (anthropics/claude-code#73861)
- Fixed a Stop during Bedrock credential lookup sometimes moving the session to a fallback model instead of ending the request
- Fixed a second `gcpAuthRefresh`/`awsAuthRefresh` browser sign-in opening when a laptop wakes from sleep while another Claude Code process is signing in
- Fixed agent teams: a plugin-defined agent spawned by name now runs with its own prompt, tools, disallowedTools and effort instead of the defaults
- Fixed headless (`-p` / SDK) sessions occasionally ignoring SIGTERM when a supervisor such as `timeout` or systemd sends SIGCONT alongside it
- Fixed restarted cloud sessions restoring a model that the organization's enforced model list refuses
- Fixed MCP tool calls sometimes running twice when a remote server's result was over 16 MB or could not be parsed
- Fixed subagents in Claude Desktop's Code tab getting none of the tools of a user-configured MCP server named `memory`
- Fixed Claude in Chrome asking before every screenshot and page read on a site you allowed when auto mode is unavailable (such as with `disableAutoMode` or an older model); typing, navigation and JavaScript still ask
- Fixed `claude plugin install` failing for GitHub-source plugins on macOS and Linux machines with no GitHub SSH key: the clone now falls back to HTTPS and prints a notice
- Fixed `sandbox.credentials.files` entries on git config files not taking effect while `permissions.blockReadsOutsideWorkingDirectories` is on
- Fixed Claude leaving out your organization's design systems when starting slides or a design with the Artifact tool on Team and Enterprise plans or machines with managed settings
- Fixed the keyboard not working on Windows after Claude Code restarts itself (first sign-in to a Claude apps gateway, provider setup, `/tui`)
- Fixed a stall when launching an agent whose `tools:` lists very many `Agent(...)` entries
- Fixed sessions on Claude 3 Opus and Claude 3 Sonnet failing on every turn after a whole PDF entered the conversation
- Fixed the npm auto-updater reporting success when the platform-native binary failed to download and only the placeholder `claude` stub was installed
- Fixed Remote Control cleanup archiving a session that is still connected or was just re-attached by another Claude Code process
- Fixed `owner/repo` plugin marketplaces showing only the second attempt's error when both the SSH and HTTPS fetch fail; both errors are now shown, with the transport tried first on top
- Fixed path-scoped `.claude/rules` and nested CLAUDE.md files not loading when Write or Edit creates or changes a file in their scope (previously only Read loaded them)
- Fixed a dangerous `rm` (such as one on `/` or the home directory) inside a `bash -c` or `sh -c` script running without a prompt in bypassPermissions mode or under a shell allow rule (anthropics/claude-code#96300)
- Fixed LSP tool calls hanging indefinitely when a language server uses dynamic capability registration or stops responding; requests now time out after 60s (per-server `requestTimeout`)
- Fixed `idle_prompt` notification hooks firing while background agents are still running (anthropics/claude-code#93672)
- Fixed PreToolUse and PermissionRequest hooks being skipped when matching them failed or the tool's input could not be serialized to JSON; the call is now blocked
- Fixed the first request in a fresh environment or after a model switch using the built-in output limit and auto-compact window, not the server's; that request may now wait up to 1.5 seco