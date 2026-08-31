// discover.ts — weekly discovery + deterministic scoring of AI/Claude topics.
// BLUEPRINT: ai-topics-discovery-blueprint.md §3.2, §3.3.
//
// This script does NOT write any article. It only:
//   1. Fetches the allowlisted sources (content/topic-sources.yaml).
//   2. Asks Claude (Haiku) to extract topic candidates grounded in that text
//      — which sources mention each one, when, how popular. The model
//      reports observed facts; it never assigns the final score.
//   3. Scores each candidate with the deterministic formula in score.ts.
//   4. Updates the ledger and opens/updates one report issue listing
//      qualifying candidates (score >= 0.6, >= 2 independent sources).
// write.ts (Thursday) reads the ledger and does the actual writing/publishing.

import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { verifyAndPublish, assertTokenBudget, type TokenUsage } from "../_auto-publish.ts";
import { loadTopicSources } from "./sources.ts";
import { fetchAllSources, type FetchedSource } from "./research.ts";
import { scoreCandidate, qualifiesForWriting, type Candidate, type SourceMention } from "./score.ts";
import { loadLedger, saveLedger, findLedgerEntry, type LedgerEntry } from "./ledger.ts";
import { deferOnAnthropicCreditError } from "../_anthropic-credit.ts";

const ROOT = process.cwd();
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

function today(): string {
  return new Date().toISOString();
}

interface RawCandidate {
  topic: string;
  why_it_matters: string;
  matched_sources: string[];
  most_recent_mention_iso: string | null;
  representative_engagement: number | null;
}

const CANDIDATE_TOOL = {
  name: "record_topic_candidates",
  description:
    "Record AI/Claude topic candidates grounded in the provided source excerpts — topics worth a technical article about how to use Claude/AI for them more effectively.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            topic: { type: "string", description: "Concise topic name, e.g. 'Claude Code plugin marketplaces'." },
            why_it_matters: { type: "string", description: "1-2 sentences: why this is worth writing about now." },
            matched_sources: {
              type: "array",
              items: { type: "string", enum: ["anthropic_changelog", "docs_map", "hn_search", "github_search"] },
              description: "Only sources whose excerpt actually grounds this topic — do not guess.",
            },
            most_recent_mention_iso: {
              type: ["string", "null"],
              description: "ISO date (YYYY-MM-DD) of the most recent mention you can determine, or null if undated.",
            },
            representative_engagement: {
              type: ["number", "null"],
              description: "Best HN (points+comments) or GitHub star count you found for this topic, or null.",
            },
          },
          required: ["topic", "why_it_matters", "matched_sources", "most_recent_mention_iso", "representative_engagement"],
        },
      },
    },
    required: ["candidates"],
  },
} as const;

async function extractCandidates(sources: FetchedSource[], knownTopics: string[]): Promise<RawCandidate[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const sourceBlocks = sources
    .map((s) => `## Source: ${s.id} (${s.type})\n${s.summary || "(empty/unreachable this run)"}`)
    .join("\n\n");

  const prompt = `You are scanning sources for topics worth writing a technical article about: "how to use Claude / Claude Code / AI more effectively for X". Extract concrete, specific topics — not vague ones like "AI is changing everything".

${sourceBlocks}

## Topics already tracked (do not repropose unless something materially new happened)
${knownTopics.length > 0 ? knownTopics.map((t) => `- ${t}`).join("\n") : "(none yet)"}

Rules:
1. Only extract topics you can ground in the text above — cite matched_sources honestly, don't pad the list.
2. Prefer topics specific enough to write a precise "how it works" article about (a feature, a technique, a workflow pattern) over generic industry commentary.
3. most_recent_mention_iso and representative_engagement: report what's actually in the text, or null — never invent a number.
4. Return at most 8 candidates.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      tools: [CANDIDATE_TOOL],
      tool_choice: { type: "tool", name: CANDIDATE_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: HTTP ${res.status} — ${await res.text()}`);

  const data = (await res.json()) as { content: Array<{ type: string; input?: unknown }>; usage: TokenUsage };
  assertTokenBudget(data.usage);
  const toolUse = data.content.find((b) => b.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude API did not return a tool_use block");
  return (toolUse.input as { candidates: RawCandidate[] }).candidates ?? [];
}

function toCandidate(raw: RawCandidate, ledger: LedgerEntry[]): Candidate {
  const isRankedSource = (t: string) => t === "hn_search" || t === "github_search";
  const mentions: SourceMention[] = raw.matched_sources.map((sourceType) => ({
    sourceType: sourceType as SourceMention["sourceType"],
    publishedAt: raw.most_recent_mention_iso ?? undefined,
    engagementRaw: isRankedSource(sourceType) && raw.representative_engagement != null ? raw.representative_engagement : undefined,
  }));
  const existing = findLedgerEntry(ledger, raw.topic);
  return {
    topic: raw.topic,
    mentions,
    alreadyCoveredRecently: existing?.status === "published",
  };
}

function existingUseCaseSlugs(): string[] {
  const dir = join(ROOT, "content/use-cases");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

function openOrUpdateIssue(title: string, body: string) {
  if (!process.env.GH_TOKEN) {
    console.warn(`[issue] GH_TOKEN not set; would have opened/updated: ${title}`);
    return;
  }
  try {
    const existing = execFileSync("gh", [
      "issue", "list", "--search", title, "--state", "open",
      "--json", "number", "--jq", ".[0].number",
    ], { encoding: "utf-8" }).trim();
    if (existing) {
      execFileSync("gh", ["issue", "comment", existing, "--body", body]);
      console.log(`[issue] commented on #${existing}`);
    } else {
      execFileSync("gh", ["issue", "create", "--title", title, "--label", "topic-discovery", "--body", body]);
      console.log(`[issue] created: ${title}`);
    }
  } catch (err) {
    console.error(`[issue] failed: ${(err as Error).message}`);
  }
}

async function main() {
  const sourceEntries = loadTopicSources();
  console.log(`Fetching ${sourceEntries.length} allowlisted source(s)...`);
  const fetched = await fetchAllSources(sourceEntries);

  if (fetched.length === 0) {
    throw new Error("All allowlisted sources failed to fetch — nothing to discover from.");
  }

  const ledger = loadLedger();
  const knownTopics = ledger.map((e) => e.topic);

  console.log("Extracting candidates...");
  const raw = await extractCandidates(fetched, knownTopics);
  console.log(`  ${raw.length} raw candidate(s) extracted.`);

  const now = new Date();
  const scored = raw.map((r) => {
    const candidate = toCandidate(r, ledger);
    const breakdown = scoreCandidate(candidate, now);
    return { raw: r, candidate, breakdown, qualifies: qualifiesForWriting(candidate, breakdown) };
  });

  // Update the ledger: new candidates get added, known ones get lastSeen/score refreshed.
  // Anything already "published" keeps that status regardless of this run's score.
  let ledgerChanged = false;
  for (const { raw: r, breakdown } of scored) {
    const nowIso = today();
    const existingEntry = findLedgerEntry(ledger, r.topic);
    if (existingEntry) {
      if (existingEntry.status !== "published") {
        existingEntry.score = breakdown;
        existingEntry.matchedSources = r.matched_sources;
        existingEntry.whyItMatters = r.why_it_matters;
        existingEntry.lastSeen = nowIso;
      }
      ledgerChanged = true;
    } else {
      ledger.push({
        topic: r.topic,
        status: "candidate",
        score: breakdown,
        matchedSources: r.matched_sources,
        whyItMatters: r.why_it_matters,
        firstSeen: nowIso,
        lastSeen: nowIso,
      });
      ledgerChanged = true;
    }
  }

  const qualifying = scored.filter((s) => s.qualifies && findLedgerEntry(ledger, s.raw.topic)?.status !== "published");

  const usedExistingSlugs = existingUseCaseSlugs();
  console.log(`\n${qualifying.length} candidate(s) qualify for writing (score >= 0.6, >= 2 sources):`);
  for (const q of qualifying) {
    console.log(`  • ${q.raw.topic} — score ${q.breakdown.total} (freq ${q.breakdown.frequency}, recency ${q.breakdown.recency}, engagement ${q.breakdown.engagement}, gap ${q.breakdown.gap})`);
  }

  const reportBody = [
    `Discovery run: ${today()}`,
    "",
    `Sources fetched: ${fetched.map((f) => f.id).join(", ")} (${sourceEntries.length - fetched.length} failed)`,
    `Existing use-case domains (unaffected by this pipeline): ${usedExistingSlugs.join(", ")}`,
    "",
    qualifying.length > 0
      ? "**Qualifying candidates** (write.ts will pick up to 2 of these on Thursday):\n" +
        qualifying
          .map((q) => `- **${q.raw.topic}** — score ${q.breakdown.total}\n  ${q.raw.why_it_matters}\n  Sources: ${q.raw.matched_sources.join(", ")}`)
          .join("\n")
      : "No candidates qualified this week (need score ≥ 0.6 and ≥ 2 independent sources).",
  ].join("\n");

  if (!ledgerChanged) {
    console.log("\nLedger unchanged — nothing to commit.");
    openOrUpdateIssue("🔎 Weekly AI topic candidates", reportBody);
    return;
  }

  if (process.env.SKIP_PUBLISH === "1") {
    console.log("\nSKIP_PUBLISH=1 — ledger written to disk but not committed. Issue not posted (dry run).");
    saveLedger(ledger);
    return;
  }

  saveLedger(ledger);

  // Ledger-only change, same as skills/verify.ts's missing-sources.json commit —
  // still goes through the full check+audit+build gate, never a bare git push.
  const result = await verifyAndPublish({
    commitMessage: `content(topics): discovery run ${today().slice(0, 10)}`,
    paths: ["content/snapshots/topics-ledger.json"],
    fallbackBranchPrefix: "auto/topics-discover",
    prTitle: `Topics discovery: ${qualifying.length} qualifying candidate(s)`,
    prBody: reportBody,
  });
  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);

  // The issue is informational and independent of publish success/failure —
  // post it either way so the candidate list is never silently lost.
  openOrUpdateIssue("🔎 Weekly AI topic candidates", reportBody);

  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  if (deferOnAnthropicCreditError(err, "topic discovery")) return;
  console.error("topics/discover failed:", err);
  process.exit(1);
});
