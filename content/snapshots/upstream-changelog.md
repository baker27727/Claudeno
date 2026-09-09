# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.266

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.266

- Fixed a 2.1.265 regression affecting LLM-gateway and proxy setups: the undocumented `CLAUDE_CODE_USE_GATEWAY` environment variable, previously ignored unless `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` were both set, began forcing Cloud-gateway sign-in on its own in 2.1.265, so configurations that set it alongside an API key, `apiKeyHelper`, or custom auth headers failed every request with "Not signed in to the Cloud gateway". The variable on its own is ignored again; no configuration change is needed

## 2.1.265

- Added `user.email` and `user.groups` to the telemetry Claude Desktop and Cowork send through a Claude apps gateway, matching terminal sessions
- Added support for pointing `--plugin-dir` at a folder of plugins: each child folder with a manifest loads, and children added or removed while running are picked up
- Added a 1 GB cap on tool results saved to disk; the in-conversation preview says when a saved file was truncated
- Fixed resuming a foreground-spawned subagent changing its tool list and system prompt prefix, which broke prompt-cache reuse for that agent
- Fixed agent teammates and resumed subagents moving SubagentStart hook context and preloaded skills out of the prompt prefix on later turns, which broke prompt-cache reuse
- Fixed resume after the previous process died while a tool was running: the last prompt is no longer rewritten, and the interrupted tool call is kept and marked interrupted
- Fixed `/model opusplan[1m]` being rejected with "Model not found"
- Fixed syntax-highlighted code in permission prompts and messages sometimes omitting a character after a Ruby `?`, Erlang `$`, or Perl `$` sigil
- Fixed the fullscreen transcript jumping by one row whenever the slash-command or @-file suggestion list opened or closed
- Fixed a plugin path containing a backslash bypassing the symlink containment check on macOS and Linux
- Fixed plugin directories whose names begin with two dots being wrongly refused as outside the plugin root
- Fixed VS Code and SDK sessions occasionally requiring re-login when a session was closed while refreshing its token
- Fixed Remote Control sessions sending the end-of-turn signal before the reply's last message, which could show a reply as finished in the Claude app before its last part arrived
- Fixed background (`--bg`) sessions occasionally being retired mid-turn when a message arrived just before the idle timeout
- Fixed Claude Code's own git status and diff probes running clean filters configured by a nested repository inside the working tree
- Fixed the advisor tool and its instructions being re-decided per request from the request's model; the decision is now made once and announced in the conversation when it changes
- Fixed artifact publish accepting connector tool names the connector doesn't expose; the publish is now refused when none of the declared tools exist, and warned when only some don't
- Fixed `/add-dir <subdirectory>` refusing to load a subdirectory's agents when managed settings lock only skills to plugins, and promising agents when only agents are locked
- Fixed two-key keyboard shortcuts cancelling silently when the second key arrived more than a second later, as happens inside tmux; they now wait 3 seconds and show a notice when they time out
- Fixed forked skills (`context: fork`) not streaming their kickoff prompt and, with `--forward-subagent-text`, their text turns as progress events in stream-json
- Fixed a plugin's default component folder that the OS cannot check, such as a symlink loop, being silently skipped; it is now reported in `/plugin` with the error code
- Fixed the Claude apps gateway's OTLP telemetry relay pausing all forwarding to a collector for 30 seconds after it rejected a few payloads as malformed or too large
- Fixed `/plugin` Discover/Browse and `claude plugin list --json --available` showing no description or display name for marketplace plugins whose metadata lives only in their `plugin.json`
- Fixed `/login` showing "no gateway URL is configured" when re-run in a session that signed in to a Claude apps gateway set by managed settings
- Fixed `/model` claiming a model was "saved as your default" when the settings file couldn't be written; it now says the save failed and why
- Fixed `/clear` from Remote Control waiting on SessionStart hooks and on open terminal dialogs before completing
- Fixed the `/config` dialog changing height when switching between its tabs
- Fixed resuming a workflow run after its container restarted; a resume whose run journal is missing now fails with a clear error instead of rerunning every agent
- Fixed the `claude-api` skill's error-code reference: model access failures return 404 and unavailable beta headers return 400, not 403
- Fixed non-interactive sessions (`-p` with stream-json input, Agent SDK, cloud sessions) resetting the shell working directory at each new user message; a `cd` now persists across turns
- Fixed MCP servers configured as `http` that only speak the legacy HTTP+SSE transport never connecting; Claude Code now falls back to SSE as the MCP spec describes
- Fixed some claude.ai connectors in cloud sessions showing as needing authentication even though they are connected in claude.ai (servers that answer an unsupported request with HTTP 401)
- Fixed remote sessions keeping their sandbox container alive while a connector approval or sign-in link waits for you
- Fixed resumed sessions showing long model-facing recovery instructions in "background task didn't finish" notices instead of a short status line
- Windows: Fixed Read, Write and Edit refusing every file ("symlink resolution changed after permission was checked") when running inside an AppContainer or restricted-token sandbox
- Improved `--worktree` startup on large repositories: the new worktree is now checked out in parallel (git 2.32+)
- Improved `/workflows` agent detail: tool calls are marked running, failed or done, the subagent's task list is shown when it has one, and Enter unfolds the listed calls with their inputs and results
- Improved slash commands typed mid-prompt: matches now show in a list (Tab opens it outside fullscreen) instead of a single suggestion, and a plugin skill is now found by its bare name
- Improved remote MCP servers that need sign-in: Claude Code no longer registers an OAuth client with them until you actually authenticate
- Improved the time to resume long sessions that read many files
- Improved the error shown when an image over the size limits cannot be decoded: it now names the cause and how to fix it instead of only citing the limit
- Improved the Artifact tool's read of an artifact someone else wrote: the summary now treats the page as untrusted content and flags embedded instructions rather than relaying them
- Updated the `.claude` folder permission option to say what it actually allows: editing files in the project's `.claude` folder (or `~/.claude`) for the session
- Changed machines with `forceLoginGatewayUrl` in managed settings to be Claude apps gateway sessions from startup, like `forceLoginMethod: "gateway"`; a leftover claude.ai login or API key is not used
- Changed image processing to use the runtime's built-in image support; the CLI no longer extracts a native image module to the temp directory
- Changed plugin display metadata to prefer the marketplace entry over `plugin.json` on the Installed tab and `claude plugin details`, filling gaps from `plugin.json`
- Changed Claude apps gateway sessions to export OpenTelemetry directly to a collector the gateway's managed settings name in `OTEL_EXPORTER_OTLP_ENDPOINT`, instead of through the gateway's relay; sessions without a named collector still use the relay
- [VSCode] Added automatic archiving of sessions inactive for a set period (new "Archive inactive sessions" setting, default 14 days)
- [VSCode] Fixed the sidebar chat coming back blank after Reload Window or a restart when the conversation had been open for more than 10 minutes
- [VSCode] Fixed the timeline dot sitting below the text on the "Remote Control is active" message

## 2.1.263

- Bug fixes and reliability improvements

## 2.1.261

- Added an "Organization policy" line to `/status` and `claude doctor` that says why your organization's policy could not be loaded, such as a proxy not passing the endpoint through
- Added `bashOutputMaxChars` and `taskOutputMaxChars` settings to raise how much command and background-task output Claude receives inline before it is saved to a file, up to 128K characters
- Added `--append-subagent-system-prompt-file` to read the subagent system prompt from a file, for prompts too large to pass on the command line
- Added `/skill-doctor` to show which loaded skills go unused and what they cost in context, so you can prune them
- Fixed typed or pasted characters occasionally landing out of order or being dropped during fast input or key repeat
- Fixed `/add-dir <subdirectory>` printing a false "couldn't be resolved" error when the working directory is on a `/net` automount
- Fixed the Bedrock setup wizard hanging when AWS or an AWS credential helper never responds (it now times out with a clear error), and its model checks failing behind a TLS-inspecting proxy
- Fixed cloud sessions discarding a plugin synced from claude.ai when managed settings force-enable it in `enabledPlugins`, then falling back to a marketplace clone that could fail
- Fixed being unable to delete the character immediately before an inline `[Image #N]` chip in the prompt input
- Fixed resuming a session losing hook output and other context around parallel tool calls, which changed the resumed request
- Fixed Remote Control showing a stale permission mode when a phone, browser, or claude.ai app attaches to a terminal session or after the mode changes in the terminal
- Fixed Remote Control sessions showing as still working (stuck spinner and Stop button) after stopping a turn from a connected phone or browser, or after a local slash command like `/clear`
- Fixed SDK and cloud sessions ignoring a Stop or interrupt sent just after the first prompt, before the turn had started; the turn now stops instead of running to completion
- Fixed Remote Control uploading a session pulled with `/teleport` into the connected session, which appeared appended to the original on phone and web
- Fixed Remote Control's inbound event stream failing behind TLS-inspecting corporate proxies on native Windows
- Fixed Remote Control sessions showing the default effort level on claude.ai when the effort comes from settings
- Fixed `gcpAuthRefresh` opening a browser at startup when the Google credential check was slow, even though the credential was still valid
- Fixed claude.ai connectors staying absent for the whole session when the startup connector fetch timed out — the CLI now retries in the background
- Fixed sustained high CPU usage when a background agent could not be resumed and its wake-up was retried in a tight loop
- Fixed feature flags gated to a newer version occasionally applying to an older Claude Code version running on the same machine
- Fixed `/usage` and the VS Code usage panel dropping a model-specific weekly limit row when the usage endpoint is rate limited or when opened right after startup
- Fixed `claude -p --resume <file>` adopting a malformed session ID recorded in the transcript; it now resumes under a fresh session ID instead
- Fixed the terminal progress indicator (iTerm2, Ghostty, ConEmu) showing the session as finished while a background workflow or agent was still running
- Fixed a rare layout glitch where a box could render with the wrong height after its container switched between row and column direction
- Fixed Claude apps gateway client IP when a trusted proxy appends a port to `X-Forwarded-For`; with an access list set, an unreadable entry now gets 403
- Fixed Claude apps gateway telling Claude Desktop to export OpenTelemetry as JSON even when the terminal CLI uses protobuf, 