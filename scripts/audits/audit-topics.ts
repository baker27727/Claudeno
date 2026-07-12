// audit-topics — checks that every discovered topic has both locales, all 6
// required sections, valid cross-references, a sane trendScore, and at
// least one source. Same shape as audit-skills.ts / audit-use-cases.ts.
// BLUEPRINT: ai-topics-discovery-blueprint.md §4.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { listModuleDirs, readYaml, fail, pass } from "./_util.ts";

const TOPICS_ROOT = join(process.cwd(), "content/topics");

const REQUIRED_HEADINGS: Record<string, string[]> = {
  en: ["quick summary", "what's new", "how it works", "hands-on example", "when to use it", "sources"],
  no: ["kort oppsummert", "hva er nytt", "slik fungerer det", "prøv det selv", "når du bør bruke det", "kilder"],
};

interface TopicFrontmatter {
  title?: string;
  description?: string;
  trendScore?: number;
  scoreBreakdown?: { frequency: number; recency: number; engagement: number; gap: number };
  sources?: string[];
  relatedModules?: string[];
  relatedUseCases?: string[];
  relatedSkills?: string[];
}

function listTopicSlugs(): string[] {
  if (!existsSync(TOPICS_ROOT)) return [];
  return readdirSync(TOPICS_ROOT)
    .filter((name) => statSync(join(TOPICS_ROOT, name)).isDirectory())
    .sort();
}

function loadModuleIds(): string[] {
  return listModuleDirs().map((dir) => readYaml<{ id: string }>(join(dir.path, "meta.yaml")).id);
}

function listUseCaseSlugs(): string[] {
  const dir = join(process.cwd(), "content/use-cases");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

function listSkillSlugs(): string[] {
  const dir = join(process.cwd(), "content/skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

function parseFrontmatter(path: string): TopicFrontmatter | undefined {
  const content = readFileSync(path, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return undefined;
  try {
    return parseYaml(match[1]) as TopicFrontmatter;
  } catch {
    return undefined;
  }
}

function extractHeadings(source: string): string[] {
  const headings: string[] = [];
  const frontmatterMatch = source.match(/^---\n[\s\S]*?\n---/);
  const body = frontmatterMatch ? source.slice(frontmatterMatch[0].length) : source;
  for (const line of body.split("\n")) {
    const m = line.match(/^#{2,3}\s+(.+)$/);
    if (m) headings.push(m[1].trim().toLowerCase());
  }
  return headings;
}

function missingRequiredHeadings(source: string, locale: "en" | "no"): string[] {
  const text = extractHeadings(source).join("\n");
  return REQUIRED_HEADINGS[locale].filter((phrase) => !text.includes(phrase));
}

function main() {
  const slugs = listTopicSlugs();
  const moduleIds = loadModuleIds();
  const useCaseSlugs = listUseCaseSlugs();
  const skillSlugs = listSkillSlugs();
  const errors: string[] = [];
  let topicCount = 0;

  for (const slug of slugs) {
    const dir = join(TOPICS_ROOT, slug);
    const enPath = join(dir, "en.mdx");
    const noPath = join(dir, "no.mdx");

    const hasEn = existsSync(enPath) && statSync(enPath).isFile();
    const hasNo = existsSync(noPath) && statSync(noPath).isFile();
    if (!hasEn || !hasNo) {
      errors.push(`${slug}: missing locale(s) — en=${hasEn}, no=${hasNo}`);
      continue;
    }

    topicCount++;

    for (const [path, locale] of [[enPath, "en"] as const, [noPath, "no"] as const]) {
      const fm = parseFrontmatter(path);
      if (!fm) {
        errors.push(`${slug}/${locale}.mdx: missing or invalid frontmatter`);
        continue;
      }
      if (!fm.title?.trim()) errors.push(`${slug}/${locale}.mdx: missing title`);
      if (!fm.description?.trim()) errors.push(`${slug}/${locale}.mdx: missing description`);
      if (typeof fm.trendScore !== "number" || fm.trendScore < 0 || fm.trendScore > 1) {
        errors.push(`${slug}/${locale}.mdx: trendScore must be a number in [0,1], got ${fm.trendScore}`);
      }
      if (!fm.sources || fm.sources.length === 0) {
        errors.push(`${slug}/${locale}.mdx: no sources listed`);
      } else {
        for (const src of fm.sources) {
          try {
            new URL(src);
          } catch {
            errors.push(`${slug}/${locale}.mdx: invalid source URL "${src}"`);
          }
        }
      }
      for (const id of fm.relatedModules ?? []) {
        if (!moduleIds.includes(id)) errors.push(`${slug}/${locale}.mdx: relatedModule "${id}" is not a known module id`);
      }
      for (const s of fm.relatedUseCases ?? []) {
        if (!useCaseSlugs.includes(s)) errors.push(`${slug}/${locale}.mdx: relatedUseCase "${s}" does not exist`);
      }
      for (const s of fm.relatedSkills ?? []) {
        if (!skillSlugs.includes(s)) errors.push(`${slug}/${locale}.mdx: relatedSkill "${s}" does not exist`);
      }

      const source = readFileSync(path, "utf-8");
      const missing = missingRequiredHeadings(source, locale);
      if (missing.length > 0) {
        errors.push(`${slug}/${locale}.mdx: missing required sections — ${missing.join(", ")}`);
      }
    }
  }

  if (errors.length > 0) fail("audit-topics", errors);
  pass(`audit-topics (${topicCount} topic${topicCount === 1 ? "" : "s"})`);
}

main();
