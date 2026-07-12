// ledger.ts — persistent record of every topic candidate ever seen, so the
// weekly discover/write runs never re-propose or re-publish the same topic.
// BLUEPRINT: ai-topics-discovery-blueprint.md §3.2, §6.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScoreBreakdown } from "./score.ts";

export const LEDGER_PATH = join(process.cwd(), "content/snapshots/topics-ledger.json");

export type LedgerStatus = "candidate" | "published" | "rejected";

export interface LedgerEntry {
  topic: string;
  status: LedgerStatus;
  score: ScoreBreakdown;
  /** Source type ids that grounded this candidate, as reported by discover.ts's extraction — kept for the qualification re-check in write.ts and for transparency. */
  matchedSources: string[];
  whyItMatters: string;
  firstSeen: string; // ISO date
  lastSeen: string; // ISO date
  publishedSlug?: string;
}

export function loadLedger(): LedgerEntry[] {
  if (!existsSync(LEDGER_PATH)) return [];
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, "utf-8")) as LedgerEntry[];
  } catch {
    return [];
  }
}

export function saveLedger(entries: LedgerEntry[]): void {
  mkdirSync(join(process.cwd(), "content/snapshots"), { recursive: true });
  const sorted = [...entries].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  writeFileSync(LEDGER_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

/** Case-insensitive, whitespace-normalized match — topics get reworded slightly between runs. */
function normalize(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findLedgerEntry(entries: LedgerEntry[], topic: string): LedgerEntry | undefined {
  const key = normalize(topic);
  return entries.find((e) => normalize(e.topic) === key);
}
