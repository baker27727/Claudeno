// audit-use-cases — checks that every use-case has both locales, valid
// profession/difficulty values, unique slugs, and at least one source.
// Runs independently from Astro's content layer so it can run before build.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { fail, pass } from "./_util.ts";

// Keep in sync with src/lib/use-cases.ts — duplicated here so the audit stays
// independent from Astro's content layer.
const PROFESSION_LABELS: Record<string, Record<string, string>> = {
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

const USE_CASES_ROOT = join(process.cwd(), "content/use-cases");
const VALID_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);

function listUseCaseSlugs(): string[] {
  return readdirSync(USE_CASES_ROOT)
    .filter((name) => statSync(join(USE_CASES_ROOT, name)).isDirectory())
    .sort();
}

function parseFrontmatter(path: string): Record<string, unknown> | undefined {
  const content = readFileSync(path, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return undefined;
  try {
    return parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function main() {
  const slugs = listUseCaseSlugs();
  const errors: string[] = [];
  let useCaseCount = 0;

  for (const slug of slugs) {
    const dir = join(USE_CASES_ROOT, slug);
    const enPath = join(dir, "en.mdx");
    const noPath = join(dir, "no.mdx");

    const hasEn = statSync(enPath).isFile();
    const hasNo = statSync(noPath).isFile();

    if (!hasEn || !hasNo) {
      errors.push(`${slug}: missing locale(s) — en=${hasEn}, no=${hasNo}`);
      continue;
    }

    useCaseCount++;

    for (const [path, locale] of [[enPath, "en"] as const, [noPath, "no"] as const]) {
      const data = parseFrontmatter(path);
      if (!data) {
        errors.push(`${slug}/${locale}.mdx: missing or invalid frontmatter`);
        continue;
      }

      if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
        errors.push(`${slug}/${locale}.mdx: missing title`);
      }
      if (!data.description || typeof data.description !== "string" || data.description.trim().length === 0) {
        errors.push(`${slug}/${locale}.mdx: missing description`);
      }
      if (!data.profession || typeof data.profession !== "string" || data.profession.trim().length === 0) {
        errors.push(`${slug}/${locale}.mdx: missing profession`);
      } else if (!PROFESSION_LABELS[data.profession]) {
        errors.push(`${slug}/${locale}.mdx: unknown profession "${data.profession}" — add it to src/lib/use-cases.ts`);
      }
      if (!VALID_DIFFICULTIES.has(data.difficulty as string)) {
        errors.push(`${slug}/${locale}.mdx: invalid difficulty "${data.difficulty}"`);
      }

      const sources = Array.isArray(data.sources) ? data.sources : [];
      if (sources.length === 0) {
        errors.push(`${slug}/${locale}.mdx: no sources listed`);
      }
      for (const source of sources) {
        if (typeof source !== "string") {
          errors.push(`${slug}/${locale}.mdx: non-string source`);
          continue;
        }
        try {
          new URL(source);
        } catch {
          errors.push(`${slug}/${locale}.mdx: invalid source URL "${source}"`);
        }
      }
    }
  }

  if (errors.length > 0) fail("audit-use-cases", errors);
  pass(`audit-use-cases (${useCaseCount} use-cases)`);
}

main();
