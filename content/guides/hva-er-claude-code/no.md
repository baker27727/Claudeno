---
title: "Hva er Claude Code? Enkel forklaring på norsk"
description: "Claude Code er Anthropics offisielle CLI for agentisk koding. Her er hva det er, hvordan det fungerer, og hvordan du kommer i gang."
updatedDate: "2026-07-08T20:00:00.000Z"
author: "Claude Code Learn"
tags:
  - "guide"
  - "introduksjon"
sources:
  - "https://code.claude.com/docs/en/quickstart.md"
  - "https://docs.claude.com/en/docs/claude-code/overview"
draft: false
order: 1
relatedModules:
  - "getting-started"
relatedTools:
  - "quiz"
  - "playground"
---

Claude Code er Anthropics offisielle CLI (kommandolinjeverktøy) for agentisk
koding. Du installerer det på din egen maskin, kjører det i terminalen fra
mappen til et prosjekt, og gir det oppgaver på vanlig språk — "forklar denne
funksjonen", "fiks denne feilen", "legg til et endepunkt for innlogging". Claude
leser filene i prosjektet ditt, foreslår eller gjør endringer, kjører
kommandoer, og forklarer hva den gjør underveis.

## Hva gjør Claude Code annerledes enn en vanlig chatbot?

En vanlig chatbot svarer med tekst du selv må kopiere inn i koden din. Claude
Code er *agentisk*: den kan lese og skrive filer direkte i prosjektet ditt,
kjøre terminalkommandoer (som tester eller bygge-skript), og jobbe gjennom
flere steg i en oppgave uten at du limer inn kode manuelt for hånd mellom hvert
steg. Du er fortsatt den som bestemmer — Claude spør om lov før den gjør noe
som kan påvirke systemet ditt, avhengig av hvilke tillatelser du har satt opp.

## Hva kan du bruke Claude Code til?

Typiske oppgaver er å forklare ukjent kode, feilsøke, skrive og refaktorere
funksjoner, sette opp tester, og automatisere flerstegs kodeoppgaver. Fordi det
kjører i terminalen din, fungerer det i ethvert prosjekt og enhver kodebase du
allerede jobber i — det er ikke bundet til én bestemt editor.

## Må jeg installere noe?

Ja — Claude Code selv er et verktøy du installerer lokalt for å bruke på dine
egne prosjekter. Denne siden (Claude Code Learn) er derimot en gratis,
nettleserbasert måte å *lære* det på først: du kan prøve kommandoer i en
simulert terminal uten å installere noe, ta en nivåtest, og bygge en
CLAUDE.md-fil — alt i nettleseren. Når du er klar til å bruke Claude Code på et
ekte prosjekt, følger du
[installasjonsstegene i den fullstendige guiden](/no/learn/getting-started/).

## Er Claude Code gratis?

Claude Code følger med Claude-abonnementene til Anthropic, og har også et
pay-as-you-go-alternativ via API-et. Nøyaktige priser endrer seg, så vi
oppgir dem ikke her — se
[Anthropics offisielle dokumentasjon](https://docs.claude.com/en/docs/claude-code/overview)
for oppdatert informasjon.

## Støtter Claude Code norsk?

Claude Code forstår og svarer på norsk hvis du skriver forespørslene dine på
norsk — det er ikke begrenset til engelsk. Selve verktøyets kommandoer og
flagg (som `claude` eller `--print`) er derimot alltid på engelsk, uansett
hvilket språk du bruker i samtalen.

## Neste steg

- [Kom i gang med Claude Code](/no/learn/getting-started/) — full
  installasjonsguide og din første økt, steg for steg.
- [Claude Code på norsk: komplett startguide](/no/guider/claude-code-pa-norsk/)
  — oversikt over alt du kan lære videre på denne siden.
- [Ta nivåtesten](/no/quiz/) for en anbefaling om hvor du bør starte.
- [Prøv kommandoer i lekeplassen](/no/playground/) — uten installasjon.
