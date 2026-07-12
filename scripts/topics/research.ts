// research.ts — shared source-fetching used by both discover.ts (Tuesday,
// scoring only) and write.ts (Thursday, re-fetches fresh for grounding the
// actual article). BLUEPRINT: ai-topics-discovery-blueprint.md §3.1-§3.4.

import type { TopicSourceEntry } from "./sources.ts";

const MAX_SOURCE_CHARS = 15_000; // per source, keeps the combined prompt bounded across 4 sources

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchText(url: string, headers: Record<string, string> = {}, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
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

export interface FetchedSource {
  id: string;
  type: TopicSourceEntry["type"];
  summary: string;
}

export async function fetchSource(source: TopicSourceEntry): Promise<FetchedSource | undefined> {
  try {
    if (source.type === "anthropic_changelog") {
      const html = await fetchText(source.url);
      return { id: source.id, type: source.type, summary: stripHtml(html).slice(0, MAX_SOURCE_CHARS) };
    }
    if (source.type === "docs_map") {
      const text = await fetchText(source.url);
      return { id: source.id, type: source.type, summary: text.slice(0, MAX_SOURCE_CHARS) };
    }
    if (source.type === "hn_search") {
      const json = JSON.parse(await fetchText(source.url)) as {
        hits: Array<{ title: string; points: number; num_comments: number; created_at: string; url: string | null }>;
      };
      const lines = json.hits
        .slice(0, 25)
        .map((h) => `- [${h.points}pts, ${h.num_comments}c, ${h.created_at.slice(0, 10)}] ${h.title}${h.url ? ` (${h.url})` : ""}`);
      return { id: source.id, type: source.type, summary: lines.join("\n").slice(0, MAX_SOURCE_CHARS) };
    }
    // github_search
    const headers: Record<string, string> = {
      "User-Agent": "claude-code-learn-bot",
      Accept: "application/vnd.github+json",
    };
    if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
    const json = JSON.parse(await fetchText(source.url, headers)) as {
      items: Array<{ full_name: string; description: string | null; stargazers_count: number; pushed_at: string; html_url: string }>;
    };
    const lines = json.items
      .slice(0, 20)
      .map((it) => `- [${it.stargazers_count}★, updated ${it.pushed_at.slice(0, 10)}] ${it.full_name}: ${it.description ?? ""} (${it.html_url})`);
    return { id: source.id, type: source.type, summary: lines.join("\n").slice(0, MAX_SOURCE_CHARS) };
  } catch (err) {
    console.error(`  ✗ ${source.id} (${source.type}): ${(err as Error).message}`);
    return undefined;
  }
}

export async function fetchAllSources(sources: TopicSourceEntry[]): Promise<FetchedSource[]> {
  return (await Promise.all(sources.map(fetchSource))).filter((s): s is FetchedSource => Boolean(s));
}
