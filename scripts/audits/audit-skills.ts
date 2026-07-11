// audit-skills — checks that every skill has both locales, required sections,
// valid cross-references, and a fresh `lastVerified`.
// BLUEPRINT: skills-section-blueprint.md §3.4, §6.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { listModuleDirs, readYaml, fail, pass } from "./_util.ts";

const SKILLS_ROOT = join(process.cwd(), "content/skills");
const SNAPSHOTS_ROOT = join(process.cwd(), "content/snapshots/skills");

const REQUIRED_HEADINGS: Record<string, string[]> = {
  en: [
    "what it does",
    "try it now",
    "install",
    "safety and permissions",
    "practical use cases",
    "limitations",
  ],
  no: [
    "hva den gjør",
    "prøv den nå",
    "installasjon",
    "sikkerhet og tillatelser",
    "praktiske bruksområder",
    "begrensninger",
  ],
};

interface SkillMeta {
  slug: string;
  relatedSkills?: string[];
  relatedModules?: string[];
  lastVerified?: string;
  archived?: boolean;
}

function listSkillSlugs(): string[] {
  if (!existsSync(SKILLS_ROOT)) return [];
  return readdirSync(SKILLS_ROOT)
    .filter((name) => statSync(join(SKILLS_ROOT, name)).isDirectory())
    .sort();
}

function loadModuleIds(): string[] {
  return listModuleDirs().map((dir) => {
    const meta = readYaml<{ id: string }>(join(dir.path, "meta.yaml"));
    return meta.id;
  });
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
  const headings = extractHeadings(source);
  const text = headings.join("\n");
  return REQUIRED_HEADINGS[locale].filter((phrase) => !text.includes(phrase));
}

function daysSince(dateString: string): number {
  const verified = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24));
}

function main() {
  const slugs = listSkillSlugs();
  const moduleIds = loadModuleIds();
  const errors: string[] = [];
  const warnings: string[] = [];
  let skillCount = 0;

  for (const slug of slugs) {
    const dir = join(SKILLS_ROOT, slug);
    const enPath = join(dir, "en.mdx");
    const noPath = join(dir, "no.mdx");
    const metaPath = join(dir, "meta.yaml");

    if (!existsSync(metaPath)) {
      errors.push(`${slug}: missing meta.yaml`);
      continue;
    }

    const meta = readYaml<SkillMeta>(metaPath);

    const hasEn = existsSync(enPath) && statSync(enPath).isFile();
    const hasNo = existsSync(noPath) && statSync(noPath).isFile();
    if (!hasEn || !hasNo) {
      errors.push(`${slug}: missing locale(s) — en=${hasEn}, no=${hasNo}`);
      continue;
    }

    skillCount++;

    if (meta.slug !== slug) {
      errors.push(`${slug}: meta.slug "${meta.slug}" does not match directory`);
    }

    for (const related of meta.relatedSkills ?? []) {
      if (!slugs.includes(related)) {
        errors.push(`${slug}: relatedSkill "${related}" does not exist`);
      }
    }

    for (const related of meta.relatedModules ?? []) {
      if (!moduleIds.includes(related)) {
        errors.push(`${slug}: relatedModule "${related}" is not a known module id`);
      }
    }

    for (const [path, locale] of [[enPath, "en"] as const, [noPath, "no"] as const]) {
      const source = readFileSync(path, "utf-8");
      const missing = missingRequiredHeadings(source, locale);
      if (missing.length > 0) {
        errors.push(`${slug}/${locale}.mdx: missing required sections — ${missing.join(", ")}`);
      }
    }

    if (!meta.archived && meta.lastVerified) {
      const age = daysSince(meta.lastVerified);
      if (age > 180) {
        errors.push(`${slug}: lastVerified "${meta.lastVerified}" is older than 180 days (${age})`);
      } else if (age > 90) {
        warnings.push(`${slug}: lastVerified "${meta.lastVerified}" is older than 90 days (${age})`);
      }
    }

    const snapshotPath = join(SNAPSHOTS_ROOT, `${slug}.hash`);
    if (!existsSync(snapshotPath)) {
      warnings.push(`${slug}: no upstream snapshot at content/snapshots/skills/${slug}.hash`);
    }
  }

  if (warnings.length > 0) {
    console.warn(`\n⚠ audit-skills warnings (${warnings.length}):\n`);
    for (const w of warnings) console.warn(`  - ${w}`);
    console.warn("");
  }

  if (errors.length > 0) fail("audit-skills", errors);
  pass(`audit-skills (${skillCount} skill${skillCount === 1 ? "" : "s"})`);
}

main();
