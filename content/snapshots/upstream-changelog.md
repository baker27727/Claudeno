# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.272

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.272

- Bug fixes and reliability improvements

## 2.1.271

- Added fast mode in Claude Code Remote sessions (cloud and self-hosted runners): the host's fast-mode setting or `/fast` typed in the session applies where your organization allows it
- Added mouse support to the `/config` panel in fullscreen mode: the wheel scrolls the settings list, a click on a setting's value changes it, and the row under the pointer is highlighted
- Added `claude self-hosted-runner --drain-marker-file <path>`: when that file exists at a SIGTERM drain, the runner reports its exit to the server as a host drain (telemetry only)
- Added per-command `allowed_domains` to Bash, PowerShell and Monitor in auto mode with sandboxing: the hosts a command needs are reviewed with it and opened for it alone; other hosts are refused
- Added `omitClaudeMd` to agent frontmatter and `--agents` JSON, letting custom and plugin subagents run without user, project and local CLAUDE.md files; managed policy files still load
- Added `--accept-command <sha256>` to `claude plugin install` and `claude plugin update` to accept exactly the command a previous `--json` run displayed, instead of `-y`
- Added support for a `multiplier` above 1, up to 10, in the `modelPricing` managed setting and the Claude apps gateway `pricing` block, for marked-up internal chargeback rates
- Added a spinner tip pointing Bedrock, Vertex AI, Foundry and LLM gateway users to the Claude desktop app; the claude.ai desktop app tip now suggests `/desktop`, which offers to download the app
- Fixed a cached organization policy being reused after switching accounts, organizations, or API keys, and the policy not refreshing until the hourly check when the credential changes mid-session
- Fixed the tool and command lists not updating when the organization policy finishes loading after startup or changes mid-session
- Fixed an enterprise `managed-mcp.json` that can't be read or parsed being ignored: it now keeps exclusive MCP control (user, project and plugin servers don't load) and warns at startup
- Fixed org policy being fetched through, and rejected by, third-party local proxies set via `ANTHROPIC_UNIX_SOCKET`; they are again treated like other custom gateways, including for Remote Control
- Fixed cloud sessions rejecting every subagent tool call ("updatedInput … failed schema validation") when a workflow or agent approval was applied after the session's worker restarted
- Fixed `/fast off` answering "Fast mode unavailable" instead of turning fast mode off when the organization has fast mode disabled
- Fixed sessions started with `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` re-sending fast requests every turn after the API rejected fast mode; the rejection now stands and its reason is shown
- Fixed fast mode under `CLAUDE_CODE_RETRY_WATCHDOG` failing the turn on a usage-credits limit, or retrying an overload at fast speed, instead of falling back to standard speed
- Fixed Bash permission checks missing the file that `fmt`, `column` and similar commands read when it follows an option the checker doesn't recognize
- Fixed Bash permission checks skipping files a wildcard expands to when the wildcard sits in a command's pattern or option value (for example `grep -v dir/* file`)
- Fixed Bash permission checks so that shell variable declaration flags cannot misrepresent the command being run
- Fixed Bash commands with two directory changes, a subshell, or a `cd`+`git` chain skipping the prompt under `permissions.blockReadsOutsideWorkingDirectories` in bypass and auto mode
- Fixed a stale `.git/config.lock` breaking `git checkout -b`, `git push -u` and `git config` for the rest of a session after a sandboxed command failed to start (Linux)
- Fixed settings file changes made outside the session going unnoticed on macOS machines whose system file-event service is saturated; the watcher now falls back to polling
- Fixed resumed `claude -p` sessions whose tools all come from MCP servers failing with "At least one tool must have defer_loading=false"
- Fixed turns failing with "API returned an empty or malformed response" when an LLM gateway returns the non-streaming reply as `text/plain`
- Fixed sustained high CPU usage and repeated tool-list requests when an MCP server sends `list_changed` notifications in a tight loop
- Fixed MCP OAuth mishandling client registrations: denying consent forced a new one, one for another redirect URI was reused, and a concurrent write could delete a valid one or keep a mismatched one
- Fixed tool search returning no match when Claude selects an MCP tool by its bare name instead of its full `mcp__server__tool` name
- Fixed Ctrl+O cancelling pending MCP server reconnects, and `/mcp` sent from Remote Control failing while the transcript view is open
- Fixed the Claude in Chrome prompt telling the model to load tools through ToolSearch when ToolSearch is unavailable
- Fixed cross-session messages held by the receiving session's permission-mode policy leaving no trace: headless senders now get a delivery notice, and `SendMessage` results no longer imply it was read
- Fixed Claude starting a second copy of a background command (such as a watch task or dev server) that was still running after the conversation was compacted
- Fixed `/model` warning about losing the conversation cache when switching back to the model the conversation actually ran on
- Fixed `/reload-skills` reporting a skill count that disagreed with the slash menu after `/cd`
- Fixed `/resume` and `/continue` showing only 1-2 sessions in fullscreen mode on short terminals
- Fixed `/resume` and `/teleport` keeping the previous conversation's file-read tracking, so Claude could edit files the resumed conversation had never read
- Fixed `--resume` dropping the 1M context window (`[1m]`) when the resumed session's model family differs from the configured default model
- Fixed artifacts attached with `/artifacts` disappearing from the session after `--resume`
- Fixed background sessions (`claude --bg`, `claude agents`) not watching the artifacts they publish for republishes made elsewhere
- Fixed custom agents, slash commands and output styles beyond the first not loading from a virtual drive that reports inode 0, such as an encrypted vault mounted as a Windows drive
- Fixed self-hosted runner sessions silently losing all host config (settings, skills, plugins, MCP servers) when the host config directory exceeds 64 MiB; added `--host-config-snapshot disk|memory`
- Fixed skills synced from claude.ai staying on disk indefinitely after signing out; copies not refreshed within `cleanupPeriodDays` now move to the recoverable trash at the next launch
- Fixed spinner tips suggesting commands that aren't available for your account type or are disabled in your session
- Fixed the `/add-dir` path input: the left and right arrow keys now move the cursor, and Enter adds only the typed path instead of also adding the highlighted completion
- Fixed text fields outside the main prompt moving a leading `!` to the end of what you typed (`!foo` came out as `foo!`)
- Fixed the interactive `/hooks` menu crashing when a hook matcher is named after an inherited object property such as `__proto__` or `constructor`
- Fixed a fullscreen rendering glitch where text kept a stale background color after the box around it lost its background
- Fixed Delete in st and Alt+arrow keys in rxvt-unicode not working in attached background sessions
- Fixed the terminal's replies to capability queries (`^[[?1;2c`) appearing at the shell prompt or in an editor when Claude Code exits, is suspended, or opens an editor right after starting
- Improved terminal rendering performance: large diffs and long transcripts render faster, with fewer slow frames
- Improved startup time slightly by skipping a redundant validation of built-in model data on every launch
- Improved hook feedback: while a SessionStart, UserPromptSubmit, PreToolUse or SessionEnd hook runs, the spinner says so with elapsed time, and Esc cancels a prompt waiting on a SessionStart hook
- Improved the spinner status during long thinking: it now reads "deep in thought" after 45s, and shows "picking the thought back up" while recovering from the output-token limit
- Improved dynamic workflows to pause when you hit your usage limit and continue automatically when it resets, instead of dropping the affected agents
- Improved Remote Control to leave fewer empty sessions on claude.ai when setup fails on a flaky network
- Improved the Claude in Chrome message in cloud sessions when the browser can't be reached: it now says the computer may be asleep before it suggests an install
- Improved `claude mcp serve`: a running tool call now sends a progress update every 30 seconds, so clients show it is still running and idle timeouts don't abort a long command that prints nothing
- Improved Foundry and Claude Platform on AWS sessions: an `alwaysLoad` MCP server that finishes connecting mid-conversation is usable on the next turn without a tool-search round trip
- Improved Markdown files published as artifacts: they now render as styled document pages (title header, document typography, syntax-highlighted code)
- Improved Artifact tool publish errors: a publish with no file now says to write the page to a file first, and an unsupported file type is reported before a missing favicon
- Improved the Artifact tool's error when a page declares a capability its contract version lacks: it now lists every supported capability and notes when a newer contract version has it
- Improved artifact watching: a session can now watch up to 10 published artifacts at once for republishes made elsewhere, up from 5
- Improved PDF @-mentions to say "page count unknown" instead of a page count guessed from the file size when pdfinfo cannot count the pages
- Improved `/mobile` to show a single QR code for claude.ai/mobile, which opens the right app store for your phone
- Changed auto mode so that a skill's or slash command's inline `!` shell commands follow default-mode permission rules instead of the classifier; a command no rule decides runs as a reviewed tool call
- Changed auto mode so a subagent reports back to its caller through a dedicated hand-back call that the safety classifier reviews, instead of its last message being reviewed after the fact
- Changed Monitor watches to always have a deadline (at most 30 minutes; 10 in single-prompt `-p` runs) and notify Claude to re-arm, replacing the no-timeout `persistent` option
- Changed the IDE selection indicator in the prompt to a `[⧉ …]` pill that wraps with the text instead of squeezing multi-line prompts; delete it with Backspace to leave the selection out
- Changed the default dynamic workflow size to small on Pro plans and lowered the medium size guideline from 15 to 10 agents
- Changed Claude apps gateway, Bedrock, Vertex AI, and Foundry sessions so that they no longer refresh a leftover claude.ai login that the session does not use
- Updated the bundled `claude-api` skill to enable `eager_input_streaming` on streaming custom tools, and to start deliverable-shaped Managed Agents work with `user.define_outcome`
- [VSCode] Added an Attach Open File setting that, when turned off, stops the open file from being added to messages; selected text is still attached
- [VSCode] Fixed the Hooks and Permission rules dialogs reporting a save that landed as failed, and the Hooks dialog going blank under a plugin-only policy lock or showing color codes in save errors
- [VSCode] Fixed Hooks dialog saves: no duplicate hook on replace, a header name retyped in other capitals keeps its secret, and settings.local.json is gitignored before the save returns
- [VSCode] Fixed session history showing only the current session when the workspace is on a Windows mapped network drive or SUBST drive
- [VSCode] Fixed the session list's Active filter hiding open idle sessions when Open is also checked in the filter menu
- [VSCode] Fixed a new chat sw