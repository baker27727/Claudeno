# Upstream snapshot — Claude Code CHANGELOG

Last observed version: 2.1.234

> This file is maintained automatically by `scripts/watch-upstream.ts`.
> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.

# Changelog

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
- Fixed: after `/login` while `CLAUDE_CODE_OAUTH_TOKEN` is set, the stale-token reminder no longer leaks into Claude's automatically resumed turn — it now appears only to you
- Fixed: permission previews now relay only to channel servers admitted by the inbound trust gate, and a server's explicit permission-capability opt-out is honored
- Fixed: credential masking on relayed permission previews can no longer hide commands, paths, or destinations from the approver; oversized private-key blocks now redact under full-strength redaction
- Fixed: provider API tokens that mask on permission previews now mask even when directly followed by shell delimiters
- Fixed Claude Desktop inter-session messages being silently dropped by the recipient session when cross-session messaging read as disabled, which left the sender's query "thinking" for many minutes
- Remote Control: signing this computer in to a different claude.ai account or organization now stops the running session within seconds and says why, instead of a misleading HTTP 404 hours later
- Remote Control sessions started from Claude Code Desktop or VS Code now keep phones and claude.ai/code updated on the session's permission mode (and claude.ai/code on the model) as they change
- Remote Control: effort picks made on a phone or on claude.ai/code now apply to terminal- and Desktop/VS Code-hosted sessions, and the session publishes its effort level to connected clients
- `SendMessage` and `ListAgents` now say when your account's session list was too long to check completely, instead of treating unseen sessions as absent
- Expired Anthropic profile credential now points you at `/login` when a claude.ai login would take precedence
- Improved the transcript: your own prompts now render markdown (highlighted code blocks, inline code, lists) the same way replies do
- Improved the "API returned an empty or malformed response" error to say what came back (content type, body kind, size, request ID) and why the original streaming request failed
- Improved auto-generated session titles to read as short, specific names (e.g. "Login button bug") rather than sentences restating your request (e.g. "Fix the login button on mobile")
- Reduced the context cost of loading the built-in `claude-api` skill from ~200k+ tokens to ~25k by loading reference docs on demand
- `/permissions` can now be opened while Claude is working — rule changes apply to the rest of the current turn
- `/add-dir <path>` can now be used while Claude is working; `/add-dir`, `/autocompact`, `/theme`, `/help`, `/config` and `/advisor` dialogs open mid-turn in the fullscreen TUI
- `/goal` now clears itself with a notice when a turn dies on an unrecoverable error (e.g. revoked auth, an exhausted credit balance, or a context overflow) instead of staying armed
- `/goal`: when background tasks keep a goal waiting for 30+ minutes, Claude now checks in on them instead of waiting indefinitely (set `CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0` to opt out)
- `claude setup-token` now rejects unexpected extra arguments instead of silently ignoring them
- Changed Esc in fullscreen mode to no longer clear a mouse text selection: it interrupts or dismisses as usual and the selection stays highlighted
- Removed the redundant "Allowed by auto mode classifier" line that auto mode showed under every Agent tool call
- Removed the "Default teammate model" setting from `/config`; agent-team teammates now use the leader's model unless the spawn names one
- Dimmed the elapsed-time counter on the running tool header so it no longer competes with the bold counts
- Background task notifications delivered between turns are now sent to the model inside `<system-reminder>` tags, matching mid-turn delivery
- Mantle: skip the admin-pin availability probe at startup when a main-loop model is already picked
- Windows: startup no longer stalls on repeated rename retries when `~/.claude.json` is read-only

## 2.1.233

- Added GitLab merge request URL support to the `--worktree` flag and the `claude agents` view (where MRs display as `!N`)
- Added an opt-in `forward_user_identity` apps gateway setting on Anthropic upstreams that sends the signed-in user's identity as headers, so a proxy behind the gateway can attribute spend per user
- Added opt-in memory cgroup support for Bash tool commands on Linux (`CLAUDE_CODE_TOOL_MEMORY_LIMIT`) so a runaway build can't stall the session
- Added `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS` environment variable to configure the WebFetch session URL cache TTL (default unchanged: 15 minutes)
- Fixed cloud sessions occasionally being marked as lost when the environment shut down while Claude was waiting on a permission prompt
- Fixed MCP v2 connections endlessly reopening the subscriptions/listen stream against servers that terminate long-held streams on a fixed timeout (e.g. serverless hosts)
- Fixed Notification hooks not firing for permission prompts when running under Claude Desktop or VS Code
- Fixed idle sessions on Linux sometimes keeping one CPU core at 100% when sandboxing is enabled
- Fixed bundled skill aliases like `/checkup` and `/review` reporting "Unknown command" in `-p` mode or with plugins/MCP loaded when a user or project skill shadows the bundled skill
- Fixed skill/command argument substitution to prevent argument values from being re-expanded as template markers
- Fixed Windows paths spelled with the NT `\??\` device prefix bypassing UNC path validation, closing an NTLM credential-leak vector
- Improved `claude self-hosted-runner` session start time: the session branch is now created without rewriting the working tree, and two server round trips no longer block the agent's launch
- Improved apps gateway error forwarding: 400/413 errors from Vertex, Foundry, and Claude Platform on AWS upstreams now carry the upstream's own message; fixes a bug with auto-compact on apps gateway
- Improved `claude plugin validate` to check a bare `.claude/skills` directory, reporting SKILL.md files whose frontmatter fails to parse
- Improved screen reader mode: the `/effort` selector renders as a numbered list with a typed-number prompt, and hint and dialog text is no longer clipped
- Improved print mode diagnostics: a `[claude-code:unrecognized_model]` line is written to stderr when a request goes out for a model ID Claude Code doesn't recognize; map it with `modelOverrides` to silence
- Changed the GitHub app setup tip to no longer appear in repositories whose origin remote is on gitlab.com or bitbucket.org; the enterprise marketplace tip now covers non-GitHub internal git hosts
- Todo/task-tracking tools (TaskCreate/Get/Update/List, TodoWrite) are no longer available on Opus 4.8, Sonnet 5, Fable 5, Mythos 5, and newer models; set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` to bring them back
- Windows: fixed auto mode repeatedly stopping for manual approval on ordinary `cd <dir> && <command> > file` Bash commands (a 2.1.232 regression)
- Reverted the 2.1.232 Bash permission changes for Cygwin-style symlinks on Windows and for input redirections (`< file`); a narrower version will return in a later release

## 2.1.232

- Subagent forking is now on by default: a `subagent_type: "fork"` subagent inherits the full conversation and prompt cache, and non-teammate agent spawns in interactive sessions now run in the background by default
- Type `@` in the prompt to mention another Claude session by name; Claude then uses `SendMessage` to reach that session directly
- `SendMessage` now delivers to a bare name that exactly matches one live session, instead of asking to confirm with a ref first
- Interactive sessions on one machine now keep unique names: starting or renaming a session to a name another live session already uses gives it a `name-word-word` variant and tells you
- Added `/config` rows for "Dialog expiry" and "Messages from your other sessions" (cross-session inbound accept/hold/refuse)
- Added secret redaction for GitLab token families (`glrt-`, `gloas-`, `glptt-`, `glagent-`, `glimt-`, `glsoat-`, `glcbt-`, `glft-`, `glffct-`) and full redaction of routable `glpat-`/`gldt-` tokens; the `glab` CLI config store gets