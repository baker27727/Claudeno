---
title: "What's new in Claude Code v2.1.266"
description: "**2.1.266:** Fixed a 2.1.265 regression where the `CLAUDE_CODE_USE_GATEWAY` environment variable forced gateway sign-in on its own, breaking configurations…"
pubDate: "2026-09-09T10:47:10.449Z"
author: "Claude Code Learn"
tags:
  - "changelog"
  - "release"
sources:
      - "https://code.claude.com/docs/en/claude_code_docs_map.md"
draft: false
---

**2.1.266:** Fixed a 2.1.265 regression where the `CLAUDE_CODE_USE_GATEWAY` environment variable forced gateway sign-in on its own, breaking configurations using it with an API key, `apiKeyHelper`, or custom headers. The variable now requires both `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` to take effect; no configuration changes needed.

**Sources:**
- https://code.claude.com/docs/en/claude_code_docs_map.md
