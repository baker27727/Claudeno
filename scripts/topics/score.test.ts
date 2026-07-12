// score.test.ts — standalone sanity checks for the deterministic scoring
// formula (no test framework in this repo — same self-checking pattern as
// the audit scripts: assert, log, exit non-zero on failure).
// Run: npx tsx scripts/topics/score.test.ts

import { scoreCandidate, qualifiesForWriting, type Candidate } from "./score.ts";

const NOW = new Date("2026-07-15T00:00:00Z");
let failures = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failures++;
  }
}

// 1. Strong candidate: all 4 sources, fresh, popular, uncovered — should qualify.
{
  const c: Candidate = {
    topic: "Claude Code plugin marketplaces",
    mentions: [
      { sourceType: "anthropic_changelog", publishedAt: "2026-07-14T00:00:00Z" },
      { sourceType: "docs_map" },
      { sourceType: "hn_search", publishedAt: "2026-07-13T00:00:00Z", engagementRaw: 420 },
      { sourceType: "github_search", publishedAt: "2026-07-10T00:00:00Z", engagementRaw: 300 },
    ],
    alreadyCoveredRecently: false,
  };
  const b = scoreCandidate(c, NOW);
  check("strong candidate: frequency = 1 (4/4 sources)", b.frequency === 1);
  check("strong candidate: gap = 1 (uncovered)", b.gap === 1);
  check("strong candidate: total >= 0.6 (qualifies)", b.total >= 0.6);
  check("strong candidate: qualifiesForWriting() true", qualifiesForWriting(c, b));
}

// 2. Weak candidate: single source, old, no engagement data — should NOT qualify.
{
  const c: Candidate = {
    topic: "A niche one-off mention",
    mentions: [{ sourceType: "hn_search", publishedAt: "2026-05-01T00:00:00Z" }],
    alreadyCoveredRecently: false,
  };
  const b = scoreCandidate(c, NOW);
  check("weak candidate: frequency = 0.25 (1/4 sources)", b.frequency === 0.25);
  check("weak candidate: recency near 0 (75 days old)", b.recency === 0);
  check("weak candidate: qualifiesForWriting() false (only 1 source)", !qualifiesForWriting(c, b));
}

// 3. Already-covered topic should be gated out even with strong signals.
{
  const c: Candidate = {
    topic: "Something we already wrote about last week",
    mentions: [
      { sourceType: "anthropic_changelog", publishedAt: "2026-07-14T00:00:00Z" },
      { sourceType: "hn_search", publishedAt: "2026-07-14T00:00:00Z", engagementRaw: 500 },
    ],
    alreadyCoveredRecently: true,
  };
  const b = scoreCandidate(c, NOW);
  check("covered topic: gap = 0", b.gap === 0);
  check("covered topic: total is lower than the uncovered strong case", b.total < 0.9);
}

// 4. Engagement is log-scaled, not linear — 2000 raw shouldn't dwarf 500 raw disproportionately.
{
  const base: Omit<Candidate, "mentions"> = { topic: "x", alreadyCoveredRecently: false };
  const low = scoreCandidate({ ...base, mentions: [{ sourceType: "hn_search", engagementRaw: 50 }] }, NOW);
  const high = scoreCandidate({ ...base, mentions: [{ sourceType: "hn_search", engagementRaw: 5000 }] }, NOW);
  check("engagement: capped at 1.0 for very high raw values", high.engagement === 1);
  check("engagement: low raw value still produces a non-zero score", low.engagement > 0 && low.engagement < 1);
}

// 5. Undated/unranked-only mention (e.g. docs_map alone) gets neutral, not punished, recency/engagement.
{
  const c: Candidate = {
    topic: "Documented but not dated anywhere",
    mentions: [{ sourceType: "docs_map" }],
    alreadyCoveredRecently: false,
  };
  const b = scoreCandidate(c, NOW);
  check("undated-only: recency is neutral 0.5, not 0", b.recency === 0.5);
  check("undated-only: engagement is neutral 0.5, not 0", b.engagement === 0.5);
}

if (failures > 0) {
  console.error(`\n✗ score.test.ts: ${failures} check(s) failed\n`);
  process.exit(1);
}
console.log("\n✓ score.test.ts: all checks passed\n");
