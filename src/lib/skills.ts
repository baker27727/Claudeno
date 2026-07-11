// =========================================================================
// Skills content aggregation — joins skillMeta and skillDocs by folder slug.
// Mirrors src/lib/modules.ts for the new skills section.
// =========================================================================

import { getCollection, type CollectionEntry } from "astro:content";

export interface SkillData {
  slug: string; // folder slug, e.g. "pdf"
  meta: CollectionEntry<"skillMeta">["data"];
  doc: { en: CollectionEntry<"skillDocs">; no: CollectionEntry<"skillDocs"> };
}

export const SKILL_CATEGORIES = [
  "documents",
  "code-quality",
  "web-frontend",
  "automation",
  "data-research",
  "writing-marketing",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SkillCategory, { en: string; no: string }> = {
  documents: { en: "Documents & Files", no: "Dokumenter og filer" },
  "code-quality": { en: "Code Quality & Review", no: "Kodekvalitet" },
  "web-frontend": { en: "Web & Frontend", no: "Web og frontend" },
  automation: { en: "Automation & Agents", no: "Automatisering og agenter" },
  "data-research": { en: "Data & Research", no: "Data og research" },
  "writing-marketing": { en: "Writing & Marketing", no: "Skriving og markedsføring" },
};

function folderOf(entryId: string): string {
  return entryId.replace(/\/[^/]+$/, "");
}

export async function getAllSkills(): Promise<SkillData[]> {
  const [metas, docs] = await Promise.all([
    getCollection("skillMeta"),
    getCollection("skillDocs"),
  ]);

  const skills = metas.map((meta): SkillData => {
    const slug = folderOf(meta.id);
    const en = docs.find((d) => d.id === `${slug}/en`);
    const no = docs.find((d) => d.id === `${slug}/no`);
    if (!en || !no) {
      throw new Error(`Skill "${slug}" is missing en.mdx or no.mdx`);
    }
    return { slug, meta: meta.data, doc: { en, no } };
  });

  return skills.sort((a, b) => a.meta.title.en.localeCompare(b.meta.title.en));
}

export function getSkillBySlug(slug: string, skills: SkillData[]): SkillData | undefined {
  return skills.find((s) => s.slug === slug);
}

export function skillsByCategory(skills: SkillData[], category: SkillCategory): SkillData[] {
  return skills.filter((s) => s.meta.categories.includes(category));
}

export function isSkillCategory(value: string): value is SkillCategory {
  return (SKILL_CATEGORIES as readonly string[]).includes(value);
}
