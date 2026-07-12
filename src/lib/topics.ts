// =========================================================================
// Topic aggregation — joins per-locale "topics" collection entries by folder
// slug. Same pattern as lib/use-cases.ts, but topics are discovered/scored
// rather than hand-picked, so the natural sort is trendScore (desc) then
// discoveredAt (desc) instead of a manual `order` field.
// BLUEPRINT: ai-topics-discovery-blueprint.md §2, §4.
// =========================================================================

import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";

export interface TopicData {
  slug: string;
  en?: CollectionEntry<"topics">;
  no?: CollectionEntry<"topics">;
}

function folderOf(entryId: string): string {
  return entryId.replace(/\/[^/]+$/, "");
}

export async function getAllTopics(): Promise<TopicData[]> {
  const docs = await getCollection("topics");
  const slugs = [...new Set(docs.map((d) => folderOf(d.id)))];

  const topics = slugs.map((slug): TopicData => {
    const en = docs.find((d) => d.id === `${slug}/en`);
    const no = docs.find((d) => d.id === `${slug}/no`);
    return { slug, en, no };
  });

  return topics.sort((a, b) => {
    const scoreA = (a.no ?? a.en)?.data.trendScore ?? 0;
    const scoreB = (b.no ?? b.en)?.data.trendScore ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const dateA = (a.no ?? a.en)?.data.discoveredAt ?? "";
    const dateB = (b.no ?? b.en)?.data.discoveredAt ?? "";
    return dateB.localeCompare(dateA);
  });
}

/** The entry for a given locale, or undefined if that topic hasn't been translated yet. */
export function topicForLocale(topic: TopicData, lang: Locale): CollectionEntry<"topics"> | undefined {
  return lang === "no" ? topic.no : topic.en;
}

const TOPIC_SEGMENT: Record<Locale, string> = { no: "innsikt", en: "insights" };

/** "/no/fagomrader/innsikt/" or "/en/use-cases/insights/" — the topics index path for a locale. */
export function topicIndexPath(lang: Locale): string {
  const useCaseSegment: Record<Locale, string> = { no: "fagomrader", en: "use-cases" };
  return `/${lang}/${useCaseSegment[lang]}/${TOPIC_SEGMENT[lang]}/`;
}

/** "/no/fagomrader/innsikt/<slug>/" or "/en/use-cases/insights/<slug>/". */
export function topicPath(slug: string, lang: Locale): string {
  return `${topicIndexPath(lang)}${slug}/`;
}

/** Coarse trend label for badges — score bands are intentionally wide so a single source's noise can't flip the label. */
export function trendLabel(score: number, lang: Locale): string {
  if (score >= 0.8) return lang === "no" ? "Sterk trend" : "Strong trend";
  if (score >= 0.6) return lang === "no" ? "Voksende" : "Emerging";
  return lang === "no" ? "Ny" : "New";
}
