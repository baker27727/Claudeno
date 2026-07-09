---
title: "Claude Code på norsk: komplett startguide"
description: "En norsk startguide til Claude Code — installasjon, første kommandoer, og en oversikt over alt du kan lære videre på siden."
updatedDate: "2026-07-08T20:00:00.000Z"
author: "Claude Code Learn"
tags:
  - "guide"
  - "startguide"
sources:
  - "https://code.claude.com/docs/en/quickstart.md"
draft: false
order: 2
relatedModules:
  - "getting-started"
  - "cli-basics"
  - "permissions-and-settings"
  - "slash-commands"
  - "subagents"
  - "mcp-servers"
relatedTools:
  - "playground"
  - "build"
  - "reference"
  - "quiz"
---

Denne guiden er kartet over hele Claude Code Learn — en kort vei gjennom
installasjon og din første økt, og en oversikt over kjernebegrepene, med
lenker videre til hver dybdemodul. Nytt av Claude Code helt?
[Les "Hva er Claude Code?" først](/no/guider/hva-er-claude-code/).

## Kom i gang på fem minutter

Full installasjon og din første økt er dekket steg for steg i
[Kom i gang-modulen](/no/learn/getting-started/) — inkludert den native
installereren, alternativer for Windows og Homebrew, og hva du bør spørre
Claude om i din aller første forespørsel. Denne guiden dupliserer ikke de
stegene; følg lenken når du er klar til å installere.

Vil du prøve kommandoer *før* du installerer noe? [Lekeplassen](/no/playground/)
er en simulert terminal rett i nettleseren.

## Kjernebegrepene, kort forklart

Hvert avsnitt her er en kort oppsummering — følg lenken for full modul med
øvelser og en sjekk på forståelsen.

**CLI-en** er selve kommandolinjeverktøyet: `claude` for en interaktiv økt,
`claude -p` for skript og pipelines, `-c`/`-r` for å fortsette en tidligere
økt. [Full CLI-modul →](/no/learn/cli-basics/)

**Slash-kommandoer** er kommandoer du skriver inni en økt, som `/help` eller
`/model` — ikke å forveksle med CLI-flagg du skriver i terminalen før økten
starter. [Full modul om slash-kommandoer →](/no/learn/slash-commands/)

**Tillatelser og CLAUDE.md** styrer hva Claude Code kan gjøre uten å spørre
deg først, og hvilken kontekst om prosjektet ditt den leser automatisk ved
hver økt. `settings.json` styrer *hva* Claude kan gjøre; `CLAUDE.md` forteller
den hva den bør *vite*. [Full modul om tillatelser og innstillinger →](/no/learn/permissions-and-settings/)

**Underagenter (subagents)** er avgrensede hjelpe-agenter du kan sette Claude
Code til å opprette for spesifikke oppgaver — de kjører i sitt eget
kontekstvindu og rapporterer bare et sammendrag tilbake, noe som holder
hovedsamtalen din ryddig. [Full modul om underagenter →](/no/learn/subagents/)

**MCP-tjenere** lar Claude Code koble seg til eksterne verktøy og datakilder
utover det som er innebygd — for eksempel prosjektstyringsverktøy eller
databaser. [Full modul om MCP-tjenere →](/no/learn/mcp-servers/)

## Verktøyene på denne siden

- [Lekeplass](/no/playground/) — prøv kommandoer fritt, uten installasjon.
- [Konfigbygger](/no/build/) — bygg en ekte CLAUDE.md, agent, hook eller
  MCP-kommando ved å fylle ut et skjema.
- [Jukselapp](/no/reference/) — kommandoene og flaggene du faktisk bruker,
  samlet på én side.
- [Nivåtest](/no/quiz/) — 12 spørsmål, én anbefaling om hvor du bør starte.

## Neste steg

Ta [nivåtesten](/no/quiz/) hvis du er usikker på hvor du bør begynne, eller gå
rett til [Kom i gang-modulen](/no/learn/getting-started/) hvis du allerede vet
at du vil installere Claude Code nå.
