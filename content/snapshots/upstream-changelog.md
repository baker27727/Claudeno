# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.267

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.267

- Added `maxEffortLevel` setting (top-level or per model under `modelSettings`): caps the effort level on every provider, including Bedrock, Vertex and Foundry; users can still pick a lower level
- Added `--system-prompt-snapshot off` to render the system prompt fresh on every request instead of reusing the conversation's recorded prompt (for iterating on prompt text)
- Fixed Cowork scheduled tasks in the cloud failing at startup for organizations whose managed settings require sandboxing
- Fixed `/context` and other local command output rendering blank on mobile clients
- Fixed shift+enter and option+backspace not working after reconnecting to a tmux or ssh session inside an agent view
- Fixed the dim last-prompt header not appearing at the top of the conversation when scrolling up in fullscreen mode
- Fixed Workflow `agent()` calls with large output schemas being refused in auto mode instead of being checked by the safety classifier
- Fixed a case where a marketplace entry path containing a backslash could bypass the containment check for fetched marketplaces on macOS and Linux
- Fixed expired AWS or Google Cloud credentials under a host app such as Claude Desktop retrying ten times with a generic "request failed" before the re-authenticate error appeared
- Fixed resuming a session after `/compact` or another slash command ran via `-p --resume`: a spurious "Continue from where you left off." turn is no longer inserted
- Fixed resuming a large session (transcript over 5 MB): parallel tool calls and their hook output are no longer dropped from the reloaded conversation
- Fixed managed `allowedHttpHookUrls`, `httpHookAllowedEnvVars` and `allowedChannelPlugins` to admit nothing, not everything, when unreadable
- Fixed `/login` on machines whose managed settings require Claude apps gateway sign-in: Esc now closes the dialog instead of doing nothing
- Fixed artifact publishes cut off by a dropped connection mid-upload: they now retry once when Claude Code can tell the upload never completed, instead of reporting an unknown outcome
- Fixed `effort:` frontmatter on custom commands, skills, and subagents being ignored on models whose default effort is still pinned (Opus 4.7, Opus 4.8, Fable 5)
- Fixed artifact publish failing with an unhelpful error when the page file isn't valid UTF-8 or contains a replacement character (U+FFFD); the error now names the line and column to fix
- Fixed `claude agents` `@` directory menu not listing repositories created after the session started
- Fixed Remote Control clients that join a Claude Desktop or VS Code session showing a stale permission mode until it was changed again
- Fixed `claude remote-control` exiting and dropping every attached session when its server credential expires (about 30 days after start); the host now re-registers and keeps going
- Fixed the usage-limit warning flickering on and off during a session when requests for different models or modes report different limit windows
- Fixed earlier reasoning being dropped when an MCP server re-sends, or a built-in tool re-renders, a tool the model already loaded
- Fixed a tool that disappears mid-conversation, from a disconnected MCP server or an upgrade, rewriting the tool list and discarding earlier thinking
- Fixed a background worker forked from a conversation adding EnterWorktree to the conversation's tool block mid-session, which broke prompt-cache reuse
- Fixed mid-session MCP and plugin tools being added to the tool list in sessions without ToolSearch, which broke prompt-cache reuse; supported models now receive them as deferred definitions
- Fixed switching models with /model re-sending every tool definition (a prompt-cache miss); commit and PR attribution text now arrives as a conversation note that updates on model changes
- Fixed resumed sessions rewriting the inline tool set when an MCP connector reconnects at a different moment than before
- Fixed resumed sessions re-rendering tool descriptions instead of replaying the recorded ones when the first turn ran a tool
- Fixed prompt-cache misses and dropped extended thinking when a claude.ai connector's tools change between a session and its resume
- Fixed resumed sessions rewriting earlier MCP tool announcements (and dropping extended thinking) before their connectors reconnect
- Fixed a prompt-cache break when a print-mode (`-p`) conversation is resumed interactively: the system prompt prefix no longer changes
- Improved the `/diff` panel: it no longer flashes "0 files changed" and a spinner before settling, and its empty state is centered in the panel
- Improved the Bash tool's description guidance so Claude describes what a command does in plain words instead of echoing the command
- Improved sandbox guidance so Claude suggests `/copy` when clipboard commands such as `pbcopy` fail inside the sandbox
- Improved `--resume` first-render time for sessions with many Bash tool calls
- Improved prompt input responsiveness: keystrokes no longer occasionally wait a frame behind spinner or streaming repaints
- Improved prompt-cache stability: subagents and sessions started with `--system-prompt` or `--append-system-prompt` now record the system prompt and tool definitions once instead of re-rendering them
- Improved Artifact tool publish errors: when a publish is refused, the message now says why and what to do about it
- Self-hosted runner: Changed `--use-anthropic-git-proxy` to be reported to the server at registration and to print a warning for each session that still clones through the legacy git proxy
- Gateway: Changed `forward_user_identity` upstreams to return a 429 as-is to a developer whose email was forwarded, instead of failing over to the next upstream, so the proxy's per-user limits hold
- [VSCode] Fixed the extension host hanging at 100% CPU when forking, editing an earlier message, or rewinding in a conversation whose saved transcript contains a cyclic parent link
- [VSCode] Fixed pasting a screenshot on WSL2/WSLg inserting raw image bytes into the chat input; the image is now attached when the clipboard provides it, otherwise the paste is ignored
- [VSCode] Fixed chat diff blocks always rendering with a dark editor theme; they now follow the active VS Code color theme, including high contrast
- [VSCode] Fixed mixed right-to-left and English text rendering in the wrong order while typing in the message input
- [VSCode] Fixed accepting an edit in the diff view on a file with Windows (CRLF) line endings failing with "String not found in file"
- [VSCode] Fixed @-mentions dropping files whose paths contain spaces
- [VSCode] Fixed the sessions list view failing to load in windows connected over Remote-SSH when the workspace folder exists only on the remote host
- [VSCode] Fixed runaway ripgrep processes when viewing files in large or symlink-heavy workspaces
- [Claude Code on the web] Fixed GitHub Enterprise Server sessions showing your GitHub account as disconnected once its token expired; PR and issue operations now refresh it automatically
- [Claude Code on the web] Fixed `gh` and GitHub API calls failing in organizations without the Claude GitHub App; they now use your connected GitHub account and say so when none is connected
- [Claude Tag] Added a "Use a custom connector" link to the preset connection forms in Claude Tag admin settings, so you can switch to a custom connection without starting over
- [Claude Tag] Fixed Claude replying "The API rejected the request as invalid" when the organization has run out of usage credits; the reply now says so and explains how to add more
- [Claude Tag] Fixed thread requests to edit or delete a message Claude posted at the channel's top level being answered with a correction instead of reaching the session that posted it
- [Claude Tag] Fixed **Connect** on Tool access requests under Admin settings > Review requests failing with "Authorization failed" or showing the requested access bundle as deleted

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
- Fixed `/login` showing "no gateway URL