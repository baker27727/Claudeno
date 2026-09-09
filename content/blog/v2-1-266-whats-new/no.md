---
title: "Nytt i Claude Code v2.1.266"
description: "**2.1.266:** Fikset en regresjons-feil fra 2.1.265 der miljøvariabelen `CLAUDE_CODE_USE_GATEWAY` tvang gateway-pålogging på egen hånd, noe som brøt…"
pubDate: "2026-09-09T10:47:10.449Z"
author: "Claude Code Learn"
tags:
  - "changelog"
  - "release"
sources:
      - "https://code.claude.com/docs/en/claude_code_docs_map.md"
draft: false
---

**2.1.266:** Fikset en regresjons-feil fra 2.1.265 der miljøvariabelen `CLAUDE_CODE_USE_GATEWAY` tvang gateway-pålogging på egen hånd, noe som brøt konfigurasjoner som bruker den med en API-nøkkel, `apiKeyHelper` eller tilpassede overskrifter. Variabelen krever nå både `ANTHROPIC_BASE_URL` og `ANTHROPIC_AUTH_TOKEN` for å tre i kraft; ingen konfigurasjonsendringer nødvendig.

**Kilder:**
- https://code.claude.com/docs/en/claude_code_docs_map.md
