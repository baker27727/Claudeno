// score.ts — deterministic trend/need scoring for discovered AI topics.
// BLUEPRINT: ai-topics-discovery-blueprint.md §3.3.
//
// This is the ONE part of the pipeline the model never controls: discover.ts
// asks Claude to *extract* which sources mentioned a topic, when, and how
// popular it was (a semantic-matching task an LLM is suited for, since the
// same topic is worded differently across a changelog paragraph vs. an HN
// title) — but this file turns those extracted facts into the final number
// with a fixed, auditable formula. Same "model proposes, code decides"
// split used to force `maturity: experimental` in skills/discover.ts.

export const SOURCE_TYPES = ["anthropic_changelog", "docs_map", "hn_search", "github_search"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface SourceMention {
  sourceType: SourceType;
  /** ISO date the mention was published/updated, if the source carries one. */
  publishedAt?: string;
  /** Raw popularity signal: HN points+comments, or GitHub stars. Undefined for undated/unranked sources (e.g. docs). */
  engagementRaw?: number;
}

export interface Candidate {
  topic: string;
  mentions: SourceMention[];
  /** True if an existing skill/topic/use-case already covers this well (checked against the ledger + content dirs). */
  alreadyCoveredRecently: boolean;
}

export interface ScoreBreakdown {
  frequency: number;
  recency: number;
  engagement: number;
  gap: number;
  total: number;
}

export const WEIGHTS = { frequency: 0.35, recency: 0.25, engagement: 0.25, gap: 0.15 } as const;
export const RECENCY_WINDOW_DAYS = 14;
export const ENGAGEMENT_CAP = 500; // raw score (HN points+comments, or GitHub stars) that maps to engagement=1

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Distinct source types that mentioned this candidate, normalized to 0-1 against the 4 tracked source types. */
function scoreFrequency(mentions: SourceMention[]): number {
  const distinct = new Set(mentions.map((m) => m.sourceType));
  return clamp01(distinct.size / SOURCE_TYPES.length);
}

/**
 * Freshest dated mention wins (max, not average) — one very recent mention
 * should not be diluted by older ones of the same topic. Undated mentions
 * (e.g. static docs pages with no timestamp) are treated as neutral (0.5)
 * rather than penalized, since "undated" isn't evidence of staleness.
 */
function scoreRecency(mentions: SourceMention[], now: Date): number {
  const dated = mentions.filter((m) => m.publishedAt);
  if (dated.length === 0) return 0.5;
  const scores = dated.map((m) => {
    const days = (now.getTime() - new Date(m.publishedAt!).getTime()) / 86_400_000;
    return clamp01(1 - days / RECENCY_WINDOW_DAYS);
  });
  return Math.max(...scores);
}

/**
 * Log-scaled so one viral HN post doesn't blow the score to the ceiling and
 * a handful of real signals still register meaningfully above zero.
 * Undated/unranked sources (docs, changelog) are neutral (0.5), same
 * reasoning as recency.
 */
function scoreEngagement(mentions: SourceMention[]): number {
  const ranked = mentions.filter((m) => typeof m.engagementRaw === "number");
  if (ranked.length === 0) return 0.5;
  const best = Math.max(...ranked.map((m) => m.engagementRaw!));
  return clamp01(Math.log10(1 + best) / Math.log10(1 + ENGAGEMENT_CAP));
}

function scoreGap(alreadyCoveredRecently: boolean): number {
  return alreadyCoveredRecently ? 0 : 1;
}

export function scoreCandidate(candidate: Candidate, now = new Date()): ScoreBreakdown {
  const frequency = round3(scoreFrequency(candidate.mentions));
  const recency = round3(scoreRecency(candidate.mentions, now));
  const engagement = round3(scoreEngagement(candidate.mentions));
  const gap = scoreGap(candidate.alreadyCoveredRecently);
  const total = round3(
    frequency * WEIGHTS.frequency + recency * WEIGHTS.recency + engagement * WEIGHTS.engagement + gap * WEIGHTS.gap,
  );
  return { frequency, recency, engagement, gap, total };
}

/** Publish gate: BLUEPRINT §3.3 — score high enough AND corroborated by more than one source. */
export function qualifiesForWriting(candidate: Candidate, breakdown: ScoreBreakdown): boolean {
  const distinctSources = new Set(candidate.mentions.map((m) => m.sourceType)).size;
  return breakdown.total >= 0.6 && distinctSources >= 2;
}
