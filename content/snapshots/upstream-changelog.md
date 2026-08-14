# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.232

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

## 2.1.232

- Subagent forking is now on by default: a `subagent_type: "fork"` subagent inherits the full conversation and prompt cache, and non-teammate agent spawns in interactive sessions now run in the background by default
- Type `@` in the prompt to mention another Claude session by name; Claude then uses `SendMessage` to reach that session directly
- `SendMessage` now delivers to a bare name that exactly matches one live session, instead of asking to confirm with a ref first
- Interactive sessions on one machine now keep unique names: starting or renaming a session to a name another live session already uses gives it a `name-word-word` variant and tells you
- Added `/config` rows for "Dialog expiry" and "Messages from your other sessions" (cross-session inbound accept/hold/refuse)
- Added secret redaction for GitLab token families (`glrt-`, `gloas-`, `glptt-`, `glagent-`, `glimt-`, `glsoat-`, `glcbt-`, `glft-`, `glffct-`) and full redaction of routable `glpat-`/`gldt-` tokens; the `glab` CLI config store gets the same sandbox and credential-path protection as `gh`
- Added GitLab support to plugin marketplaces: bare `gitlab.com` repo URLs (including nested subgroups) now clone like `github.com` URLs, and clone auth-failure hints name your actual git host
- Settings: `additionalMarketplaces` and `allowedMarketplaces` are now accepted as friendlier aliases for `extraKnownMarketplaces` and `strictKnownMarketplaces`
- Enterprise policy: a url-typed `blockedMarketplaces` entry for a bare repo URL keeps blocking that URL when the CLI classifies it as a git clone
- Gateway: the `desktop:` overlay now accepts every released Desktop setting (was 11 hand-listed keys), validated at boot against Desktop's own schema; unknown or invalid keys fail boot
- Gateway: empty `managed.policies[].match.groups`/`admin.admin_groups` entries and malformed `email_domain` values (empty, or containing `@`, whitespace, or commas) now fail at boot instead of silently matching no one or granting admin access
- Fable 5 is offered as an advisor in `/advisor` again for organizations with Fable access, with usage-credits consent set up through `/model fable`
- Fixed a PowerShell permission bypass where variable-writing parameters could silently overwrite `$PSDefaultParameterValues` and redirect later commands' file access
- Fixed a Windows permission bypass where Git Bash followed Cygwin-style symlinks that path validation saw as regular files; writes through them now require permission approval
- Fixed nested git repositories inheriting trust from a parent directory; each repository now requires its own trust confirmation
- Fixed MCP connections hanging for the full 30-second connect timeout when a server fails to answer or sends a malformed reply to the protocol-version probe
- Fixed Remote Control sessions hosted by a bridge inside a cloud session inheriting that session's transcript or credentials
- Fixed Remote Control sessions started from Claude Desktop or an IDE appearing as a new claude.ai session each time the local session was resumed; they now reattach to the existing one
- Fixed Remote Control sessions appearing unreachable to newly attached clients while idle
- Fixed Remote Control bridge sessions not restoring conversation history when the session worker restarts
- Remote Control: resuming a conversation whose session was deleted from claude.ai or the app now starts a replacement instead of failing with a message about your login (regressed in v2.1.227)
- Fixed Cloud gateway `/login` exiting silently or leaving an unresponsive terminal after "Press Enter to continue" when managed settings failed to load; the reason is now shown
- Fixed voice mode on native builds getting stuck on "listening…" when the voice service rejected the connection; the rejection is now shown immediately
- Fixed mTLS client certificate rotation requiring a restart; Claude Code now reloads the rotated cert and key automatically on connection errors
- Fixed malformed AWS or Vertex region values being used to build request URLs; they now fall back to the default region
- Fixed stream idle timeout errors failing the request instead of recovering on Bedrock, Vertex, and gateway deployments
- Fixed content-sized overlays containing truncated text rendering one column too wide, and start-truncated text collapsing to an ellipsis
- Fixed a stray garbled character where a long shell-command or agent-description preview was cut off mid-emoji
- Fixed a startup race that could silently unregister a plugin marketplace due to concurrent writes to `known_marketplaces.json`
- Fixed `/update` and `/tui` refusing to restart while work that survives the relaunch was running
- Fixed usage-limit guidance suggesting unavailable slash commands in SDK and remote sessions
- Fixed the consent message for interactive `--advisor fable` launches, which told you to run `/model fable` in an interactive session that had just exited
- Improved fullscreen streaming: long sessions stay responsive because the whole conversation is no longer re-normalized on every update
- Improved the managed settings approval dialog: shows endpoint URLs, uses clearer wording for telemetry-only changes, skips routine OpenTelemetry options, and requires approval for server-managed sandbox binary overrides (`sandbox.bwrapPath`, `sandbox.socatPath`, `sandbox.ripgrep`)
- `/feedback` and `/bug` now open immediately when invoked while Claude is responding, instead of waiting for the turn to finish
- `/plugin install plugin@marketplace` now refreshes the marketplace first, so newly published plugins install without a manual marketplace update
- `/code-review` at high, xhigh, and max effort now runs in a background agent like the other levels
- Pasted and clipboard images are read without blocking the event loop
- Remote Control now keeps reconnecting for about 30 minutes after a network blip and no longer drops after a few blips spread across an hour
- Remote Control: resuming a conversation no longer silently takes Remote Control away from another Claude Code on the same machine that still has it; run `/remote-control` there to move it
- Updated agent panel: completed subagents hide immediately with a `/tasks` footer hint, and the "↓ N more" overflow indicator moved left for visibility
- Remote Control: the terminal now says whether a session was taken over by another device, ended from another app, or deleted, and stops suggesting a reconnect that would undo it
- Bash input redirections (`< file`) are now permission-checked like their argument spellings on all platforms
- Shortened the message shown when resuming a completed background agent
- Cowork sessions no longer inline external @-imports from user-scope memory files
- Hardened the auto-generated cross-session messaging socket directory on shared `/tmp`: a pre-planted symlink or another user's directory is now refused instead of used
- Hardened the Linux filesystem sandbox against a protected-path bypass
- Changed `sandbox.ripgrep` to be honored only from user, managed, and `--settings` settings; project settings can no longer override the sandbox's ripgrep binary
- Removed the startup tip suggesting you create custom subagents, and the matching nudge in the `/powerup` tour

## 2.1.231

- Fixed MCP OAuth sign-in failing with a redirect URI mismatch for servers that use a pre-registered OAuth client, such as Slack

## 2.1.229

- Documented `claude remote-control --continue` for resuming the most recent Remote Control session
- Added server-supplied Claude Code hook support for self-hosted runner sessions, matching managed-environment behavior
- Added SSE keepalive pings to gateway streaming responses during long thinking pauses, preventing idle-timeout disconnects on Vertex and Bedrock upstreams
- Added plugin marketplace `command` sources: a local command (e.g. an IDE) prints the plugin directory, which is re-resolved each session and applied without a restart; `mode: "link"` uses it in place
- `ListAgents` now marks disconnected Remote Control sessions as `offline` and labels your cloud sessions as `cloud`
- Fixed long responses partly disappearing while streaming and being printed twice in the terminal
- Fixed a crash to the error screen (including on `--resume` of the affected session) when a tool call had a non-string `glob`, `file_path`, or `command` value
- Fixed a RangeError crash when a progress bar or markdown table rendered in a very narrow terminal window (could also crash `claude --continue`/`--resume` at startup)
- Fixed a crash on Windows when a tool call or message referenced a file by an extended-length (`\\?\`) or UNC path
- Fixed auto mode failing on every tool call for users who disable the attribution header via `CLAUDE_CODE_ATTRIBUTION_HEADER` (direct Anthropic API connections)
- Fixed `/model` rejecting Sonnet/Opus 1M for claude.ai subscribers using a custom `ANTHROPIC_BASE_URL` gateway
- Fixed MCP OAuth with strict authorization servers by using `127.0.0.1` instead of `localhost` in the redirect URI
- Fixed Remote Control clients showing a stuck working spinner after a slash command typed in the laptop terminal
- Fixed the Claude Code Review workflow generated by `/install-github-app` completing without posting its review on the pull request
- Fixed multi-second UI stalls after editing a file with thousands of IDE diagnostics while the IDE extension is connected
- Fixed one-shot `claude plugin` commands leaving a stray liveness file that could prevent cleanup of outdated plugin versions
- Fixed dynamic workflows inside CPU-limited containers using the host machine's core count instead of the container's CPU limit
- Fixed a file-watcher handle leak after atomic file replacements, and an uncaught error on Windows when the scheduled-tasks watcher failed on a network or virtual filesystem
- Fixed SDK and `--input-format stream-json` sessions getting a 400 API error when a whitespace-only message was submitted
- Fixed conversations whose messages alone exceed the API's 32 MB request limit retrying compaction when no images or documents can be stripped; they now fail once with a clear message
- Fixed OpenTelemetry export from Claude Desktop sessions being rejected by the Desktop-managed gateway when that gateway is also the telemetry endpoint
- Fixed self-hosted runner and other remote sessions exiting at startup when `managed-mcp.json` is deployed and the server delivers MCP servers; those servers are now skipped with a warning
- Fixed self-hosted runner repository preparation hanging on a Git Credential Manager prompt; git now fails fast when credentials are missing
- Improved workflow fan-outs to stagger same-prefix sibling agents so subsequent agents read the cached prompt prefix instead of re-paying it (`CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS=0` disables)
- Improved "prompt is too long" errors to explain why automatic compaction could not recover instead of only suggesting `/compact`
- Improved sandbox: IPv6 literals in network domain lists are now bracketed (`[::1]:443`), and ambiguous spellings are enforced fail-closed and flagged by `/doctor`
- Updated `/login` to repeat the `CLAUDE_CODE_OAUTH_TOKEN` override warning after a successful login
- Changed `/commit-push-pr` so git/gh commands with dangerous flags (`--force`, `--amend`, `--no-verify`, etc.) are no longer auto-approved
- Changed self-hosted runner Windows startup to require an explicit `--base-dir`; there is no default checkout directory on Windows
- [VSCode] "Report a problem" and `/bug` now open the built-in feedback dialog instead of a retired survey link
- [VSCode] Made the `/btw` side-question panel resizable by dragging its boundary, in both side-docked and stacked layouts
- [VSCode] Added session groups in the sidebar — right-click to create, rename, or delete; Cmd/Ctrl- or Shift-click to move several sessions at once

## 2.1.228

- Fixed interactive sessions that could stop redrawing entirely, while the pro