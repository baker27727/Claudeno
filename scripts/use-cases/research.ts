// research.ts — fetches the curated sources for each tracked profession and
// stores a local snapshot so generate.ts can compare it against existing
// use-case content.

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { USE_CASE_SOURCES, urlsForProfession } from "./sources.ts";

const ROOT = process.cwd();
const SNAPSHOT_DIR = join(ROOT, "content/snapshots/use-cases");

async function fetchText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        console.warn(`Attempt ${attempt}/${attempts} for ${url} failed: ${(err as Error).message}. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  throw lastError;
}

export interface ResearchResult {
  profession: string;
  url: string;
  text: string;
  cached: boolean;
}

function snapshotPath(profession: string, url: string): string {
  const slug = url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 80);
  return join(SNAPSHOT_DIR, `${profession}__${slug}.txt`);
}

/**
 * Fetches (or reads from cache) all sources for a profession.
 * `useCache=true` returns cached snapshots when available instead of hitting
 * the network — useful in CI when research.ts already ran in a previous step.
 */
export async function researchProfession(profession: string, useCache = false): Promise<ResearchResult[]> {
  const urls = urlsForProfession(profession);
  const results: ResearchResult[] = [];

  for (const url of urls) {
    const path = snapshotPath(profession, url);

    if (useCache && existsSync(path)) {
      results.push({ profession, url, text: readFileSync(path, "utf-8"), cached: true });
      continue;
    }

    try {
      const text = await fetchText(url);
      mkdirSync(SNAPSHOT_DIR, { recursive: true });
      writeFileSync(path, text, "utf-8");
      results.push({ profession, url, text, cached: false });
    } catch (err) {
      // One flaky source (a transient 503, a timeout) shouldn't take down
      // the whole weekly run for every profession — fall back to the last
      // good snapshot if one exists, otherwise skip this URL and keep going
      // with whatever other sources this profession has.
      console.error(`Failed to fetch ${url} after retries: ${(err as Error).message}`);
      if (existsSync(path)) {
        console.warn(`Falling back to the last cached snapshot for ${url}.`);
        results.push({ profession, url, text: readFileSync(path, "utf-8"), cached: true });
      } else {
        console.warn(`No cached snapshot for ${url} either — skipping this source for now.`);
      }
    }
  }

  return results;
}

/** Fetches all tracked professions. */
export async function researchAll(useCache = false): Promise<Record<string, ResearchResult[]>> {
  const out: Record<string, ResearchResult[]> = {};
  for (const profession of Object.keys(USE_CASE_SOURCES)) {
    console.log(`Researching ${profession}...`);
    out[profession] = await researchProfession(profession, useCache);
  }
  return out;
}

// Allow direct execution: npx tsx scripts/use-cases/research.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  researchAll().catch((err) => {
    console.error("research failed:", err);
    process.exit(1);
  });
}
