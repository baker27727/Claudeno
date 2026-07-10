// =========================================================================
// Use-case aggregation — joins per-locale "useCases" collection entries by
// folder slug, same pattern as lib/guides.ts and lib/blog.ts.
//
// Use-cases are evergreen, ordered by `order`, and grouped by profession.
// A use-case may exist in only one locale (NO-first rollout is allowed).
// =========================================================================

import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";

export interface UseCaseData {
  slug: string; // folder slug, e.g. "marketing-with-claude"
  en?: CollectionEntry<"useCases">;
  no?: CollectionEntry<"useCases">;
}

export const PROFESSION_LABELS: Record<string, Record<Locale, string>> = {
  marketing: { en: "Marketing", no: "Markedsføring" },
  seo: { en: "SEO", no: "SEO" },
  "data-analysis": { en: "Data analysis", no: "Dataanalyse" },
  statistics: { en: "Statistics", no: "Statistikk" },
  "project-management": { en: "Project management", no: "Prosjektledelse" },
  writing: { en: "Writing", no: "Skriving" },
  "customer-support": { en: "Customer support", no: "Kundesupport" },
  "social-media": { en: "Social media", no: "Sosiale medier" },
  research: { en: "Research", no: "Forskning" },
};

function folderOf(entryId: string): string {
  return entryId.replace(/\/[^/]+$/, "");
}

export async function getAllUseCases(): Promise<UseCaseData[]> {
  const docs = await getCollection("useCases");
  const slugs = [...new Set(docs.map((d) => folderOf(d.id)))];

  const useCases = slugs.map((slug): UseCaseData => {
    const en = docs.find((d) => d.id === `${slug}/en`);
    const no = docs.find((d) => d.id === `${slug}/no`);
    return { slug, en, no };
  });

  return useCases.sort((a, b) => {
    const orderA = (a.no ?? a.en)?.data.order ?? 0;
    const orderB = (b.no ?? b.en)?.data.order ?? 0;
    return orderA - orderB;
  });
}

/** The entry for a given locale, or undefined if that use-case hasn't been translated yet. */
export function useCaseForLocale(useCase: UseCaseData, lang: Locale): CollectionEntry<"useCases"> | undefined {
  return lang === "no" ? useCase.no : useCase.en;
}

const USE_CASE_SEGMENT: Record<Locale, string> = { no: "fagomrader", en: "use-cases" };

/** "/no/fagomrader/" or "/en/use-cases/" — the use-case index path for a locale. */
export function useCaseIndexPath(lang: Locale): string {
  return `/${lang}/${USE_CASE_SEGMENT[lang]}/`;
}

/** "/no/fagomrader/<slug>/" or "/en/use-cases/<slug>/". */
export function useCasePath(slug: string, lang: Locale): string {
  return `/${lang}/${USE_CASE_SEGMENT[lang]}/${slug}/`;
}

/** Localized display label for a profession key. */
export function professionLabel(profession: string, lang: Locale): string {
  return PROFESSION_LABELS[profession]?.[lang] ?? profession;
}

/** Group use-cases that exist in the given locale by their profession key. */
export function useCasesByProfession(
  useCases: UseCaseData[],
  lang: Locale,
): Record<string, UseCaseData[]> {
  const grouped: Record<string, UseCaseData[]> = {};
  for (const uc of useCases) {
    const entry = useCaseForLocale(uc, lang);
    if (!entry) continue;
    const profession = entry.data.profession;
    if (!grouped[profession]) grouped[profession] = [];
    grouped[profession].push(uc);
  }
  return grouped;
}
