// =========================================================================
// Guide aggregation — joins the per-locale "guides" collection entries by
// folder slug, same base pattern as lib/blog.ts. Two real differences from
// blog:
//   1. Sorted by `order` (manual, evergreen) — never by date, guides aren't
//      news and shouldn't reorder themselves as time passes.
//   2. A guide is allowed to exist in only one locale (NO-first rollout is
//      intentional — see content/guides/). `en`/`no` are therefore optional,
//      unlike blog's hard requirement that both exist.
// =========================================================================

import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";

export interface GuideData {
  slug: string; // folder slug, e.g. "hva-er-claude-code"
  en?: CollectionEntry<"guides">;
  no?: CollectionEntry<"guides">;
}

function folderOf(entryId: string): string {
  return entryId.replace(/\/[^/]+$/, "");
}

export async function getAllGuides(): Promise<GuideData[]> {
  const docs = await getCollection("guides");
  const slugs = [...new Set(docs.map((d) => folderOf(d.id)))];

  const guides = slugs.map((slug): GuideData => {
    const en = docs.find((d) => d.id === `${slug}/en`);
    const no = docs.find((d) => d.id === `${slug}/no`);
    return { slug, en, no };
  });

  return guides.sort((a, b) => {
    const orderA = (a.no ?? a.en)?.data.order ?? 0;
    const orderB = (b.no ?? b.en)?.data.order ?? 0;
    return orderA - orderB;
  });
}

/** The entry for a given locale, or undefined if that guide hasn't been translated yet. */
export function guideForLocale(guide: GuideData, lang: Locale): CollectionEntry<"guides"> | undefined {
  return lang === "no" ? guide.no : guide.en;
}

const GUIDE_SEGMENT: Record<Locale, string> = { no: "guider", en: "guides" };

/** "/no/guider/" or "/en/guides/" — the guide index path for a locale. */
export function guideIndexPath(lang: Locale): string {
  return `/${lang}/${GUIDE_SEGMENT[lang]}/`;
}

/** "/no/guider/<slug>/" or "/en/guides/<slug>/". */
export function guidePath(slug: string, lang: Locale): string {
  return `/${lang}/${GUIDE_SEGMENT[lang]}/${slug}/`;
}
