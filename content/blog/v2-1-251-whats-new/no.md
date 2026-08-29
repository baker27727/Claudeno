---
title: "Nytt i Claude Code v2.1.251"
description: "La til hook-hendelser PreModelSwitch og PostModelSwitch for å kontrollere modellbytting; SessionStart resume-hooks mottar nå økt-staleness og…"
pubDate: "2026-08-29T12:18:37.952Z"
author: "Claude Code Learn"
tags:
  - "changelog"
  - "release"
sources:
      - "https://code.claude.com/docs/en/claude_code_docs_map.md"
draft: false
---

La til hook-hendelser PreModelSwitch og PostModelSwitch for å kontrollere modellbytting; SessionStart resume-hooks mottar nå økt-staleness og gjenopphentelse av cache-kostnad. La til per-økt prompt-cache-linje i /cost som viser treffratio, misser og token som ble gjenopphente. Forbedret tillatelseskontroller for filoperasjoner med symlinker, plugin-kommandoer og MCP-tjenere. Fikset underagent-meldinger i bakgrunn og håndtering av auto-modus-økt.

**Kilder:**
- https://code.claude.com/docs/en/claude_code_docs_map.md
