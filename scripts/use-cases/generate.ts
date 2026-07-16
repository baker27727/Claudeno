// generate.ts — compares existing use-case guides against curated sources and
// uses the Claude API to propose updates or new guides. Inspired by
// scripts/audit-freshness.ts but focused on professional-domain use-cases.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { verifyAndPublish } from "../_auto-publish.ts";
import { USE_CASE_SOURCES, type SourceSet } from "./sources.ts";
import type { ResearchResult } from "./research.ts";

const ROOT = process.cwd();
const USE_CASES_DIR = join(ROOT, "content/use-cases");
const CATALOG_PATH = join(ROOT, "content/catalog.yaml");

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const MAX_SOURCE_CHARS = 60_000;

interface UseCaseUpdate {
  slug: string;
  profession: string;
  has_new_info: boolean;
  summary: string;
  corrected_en: string; // full en.mdx content
  corrected_no: string; // full no.mdx content
  sources: string[];
}

interface NewUseCase {
  slug: string;
  profession: string;
  en: string;
  no: string;
  sources: string[];
}

interface GenerationPlan {
  updates: UseCaseUpdate[];
  new_use_cases: NewUseCase[];
}

const RESULT_TOOL = {
  name: "record_use_case_update",
  description: "Record the structured content update plan derived from the researched sources.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      updates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slug: { type: "string" },
            profession: { type: "string" },
            has_new_info: { type: "boolean" },
            summary: { type: "string" },
            corrected_en: { type: "string", description: "Full en.mdx content including frontmatter ---" },
            corrected_no: { type: "string", description: "Full no.mdx content including frontmatter ---" },
            sources: { type: "array", items: { type: "string" } },
          },
          required: ["slug", "profession", "has_new_info", "summary", "corrected_en", "corrected_no", "sources"],
        },
      },
      new_use_cases: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slug: { type: "string" },
            profession: { type: "string" },
            en: { type: "string" },
            no: { type: "string" },
            sources: { type: "array", items: { type: "string" } },
          },
          required: ["slug", "profession", "en", "no", "sources"],
        },
      },
    },
    required: ["updates", "new_use_cases"],
  },
} as const;

async function callClaude(prompt: string): Promise<GenerationPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      tools: [RESULT_TOOL],
      tool_choice: { type: "tool", name: RESULT_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: HTTP ${res.status} — ${await res.text()}`);

  const data = (await res.json()) as { content: Array<{ type: string; input?: unknown }> };
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude API did not return a tool_use block");
  return normalizePlan(toolUse.input);
}

/**
 * The tool schema marks fields as required, but tool schema `required` is
 * not strictly enforced on the returned JSON — two separate crashes
 * (2026-07-13: "plan.new_use_cases is not iterable"; 2026-07-13 again,
 * post-fix: "Cannot read properties of undefined (reading 'join')" on
 * `f.sources` inside publishUseCases) both came from trusting individual
 * fields inside array items, not just the arrays' own shape. Normalize
 * every field defensively — top-level arrays AND each item's fields —
 * instead of patching one crash site at a time.
 */
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function bool(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}

function normalizeUpdate(raw: unknown): UseCaseUpdate {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<UseCaseUpdate>;
  return {
    slug: str(o.slug),
    profession: str(o.profession),
    has_new_info: bool(o.has_new_info),
    summary: str(o.summary),
    corrected_en: str(o.corrected_en),
    corrected_no: str(o.corrected_no),
    sources: strArr(o.sources),
  };
}

function normalizeNewCase(raw: unknown): NewUseCase {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<NewUseCase>;
  return {
    slug: str(o.slug),
    profession: str(o.profession),
    en: str(o.en),
    no: str(o.no),
    sources: strArr(o.sources),
  };
}

function normalizePlan(raw: unknown): GenerationPlan {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<GenerationPlan>;
  const updates = Array.isArray(obj.updates) ? obj.updates : [];
  const newCases = Array.isArray(obj.new_use_cases) ? obj.new_use_cases : [];
  return {
    updates: updates.map(normalizeUpdate),
    new_use_cases: newCases.map(normalizeNewCase),
  };
}

function buildPrompt(
  profession: string,
  _sourceSet: SourceSet,
  research: ResearchResult[],
  _existingSlug?: string,
  existingEn?: string,
  existingNo?: string,
): string {
  const sourcesText = research
    .map((r) => `### ${r.url}\n${r.text.slice(0, MAX_SOURCE_CHARS)}`)
    .join("\n\n");

  const hasExisting = existingEn && existingNo;

  return `You maintain a bilingual (English/Norwegian Bokmål) learning site for Claude Code.
You are updating the professional use-case section for the domain: ${profession}.

## Curated sources
${sourcesText}

## Existing use-case docs${hasExisting ? `

### en.mdx
${existingEn}

### no.mdx
${existingNo}` : "\nNo existing guide for this domain yet."}

## Instructions

1. Compare the existing guide (if any) against the sources above.
2. If there is new, source-backed information that would improve the guide, set has_new_info=true and return FULL corrected en.mdx and no.mdx files. Preserve frontmatter and only change factual content, examples, or tips.
3. If nothing material has changed, set has_new_info=false and return the existing files unchanged.
4. If the domain is missing a guide entirely, propose a new one under "new_use_cases" with full en.mdx and no.mdx content (including frontmatter).
5. Do not invent facts not supported by the sources.
6. Keep the same voice: practical, concise, and beginner-friendly.
7. Every technical claim must be traceable to a source URL listed in "sources".

Available frontmatter fields:
title, description, updatedDate (ISO datetime), author (default "Claude Code Learn"), profession ("${profession}"), difficulty (beginner/intermediate/advanced), tools (string array), tags (string array), sources (URL array), relatedModules (module ids), relatedUseCases (slugs), faq (array of {question, answer}), draft (boolean), order (number).

For new use-cases, pick a URL-friendly slug and a sensible order. Set draft=false only if the content is high quality and complete.`;
}

function loadExistingUseCase(slug: string): { en?: string; no?: string } {
  const dir = join(USE_CASES_DIR, slug);
  const enPath = join(dir, "en.mdx");
  const noPath = join(dir, "no.mdx");
  return {
    en: existsSync(enPath) ? readFileSync(enPath, "utf-8") : undefined,
    no: existsSync(noPath) ? readFileSync(noPath, "utf-8") : undefined,
  };
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

function writeUseCase(slug: string, en: string, no: string) {
  const dir = join(USE_CASES_DIR, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "en.mdx"), en.trimEnd() + "\n", "utf-8");
  writeFileSync(join(dir, "no.mdx"), no.trimEnd() + "\n", "utf-8");
}

function updateCatalog(slug: string, titleEn: string, titleNo: string) {
  if (!existsSync(CATALOG_PATH)) return;
  const catalog = readFileSync(CATALOG_PATH, "utf-8");
  if (catalog.includes(`id: ${slug}`)) return;

  const entries = readFileSync(CATALOG_PATH, "utf-8");
  const newEntry = `\n- id: ${slug}\n  kind: use-case\n  title:\n    en: ${JSON.stringify(titleEn)}\n    no: ${JSON.stringify(titleNo)}\n  href: "/use-cases/${slug}/"\n`;
  writeFileSync(CATALOG_PATH, entries.trimEnd() + newEntry + "\n", "utf-8");
}

function extractTitle(content: string): string | undefined {
  const match = content.match(/^title:\s*"([^"]+)"/m);
  return match?.[1];
}

function findExistingSlugForProfession(profession: string): string | undefined {
  if (!existsSync(USE_CASES_DIR)) return undefined;
  for (const slug of readdirSync(USE_CASES_DIR)) {
    const dir = join(USE_CASES_DIR, slug);
    if (!statSync(dir).isDirectory()) continue;
    const enPath = join(dir, "en.mdx");
    const noPath = join(dir, "no.mdx");
    for (const path of [enPath, noPath]) {
      if (!existsSync(path)) continue;
      const data = parseFrontmatter(path);
      if (data?.profession === profession) return slug;
    }
  }
  return undefined;
}

export async function generateUseCases(researchByProfession: Record<string, ResearchResult[]>) {
  const touchedPaths: string[] = [];
  const findings: Array<{ slug: string; action: "updated" | "created"; summary: string; sources: string[] }> = [];

  for (const [profession, sourceSet] of Object.entries(USE_CASE_SOURCES)) {
    const research = researchByProfession[profession] ?? [];

    const primarySlug = findExistingSlugForProfession(profession);
    const existing = primarySlug ? loadExistingUseCase(primarySlug) : { en: undefined, no: undefined };

    const prompt = buildPrompt(profession, sourceSet, research, primarySlug, existing.en, existing.no);
    const plan = await callClaude(prompt);

    for (const update of plan.updates) {
      if (!update.has_new_info) {
        console.log(`  ✓ ${update.slug}: no new info`);
        continue;
      }
      if (!update.corrected_en.trim().startsWith("---") || !update.corrected_no.trim().startsWith("---")) {
        console.warn(`  skipping ${update.slug}: corrected content missing frontmatter`);
        continue;
      }
      writeUseCase(update.slug, update.corrected_en, update.corrected_no);
      touchedPaths.push(join(USE_CASES_DIR, update.slug, "en.mdx"), join(USE_CASES_DIR, update.slug, "no.mdx"));
      findings.push({ slug: update.slug, action: "updated", summary: update.summary, sources: update.sources });
      console.log(`  ✎ ${update.slug}: ${update.summary}`);
    }

    for (const newCase of plan.new_use_cases) {
      if (!newCase.en.trim().startsWith("---") || !newCase.no.trim().startsWith("---")) {
        console.warn(`  skipping new ${newCase.slug}: missing frontmatter`);
        continue;
      }
      writeUseCase(newCase.slug, newCase.en, newCase.no);
      touchedPaths.push(join(USE_CASES_DIR, newCase.slug, "en.mdx"), join(USE_CASES_DIR, newCase.slug, "no.mdx"));

      const titleEn = extractTitle(newCase.en) ?? newCase.slug;
      const titleNo = extractTitle(newCase.no) ?? newCase.slug;
      updateCatalog(newCase.slug, titleEn, titleNo);
      touchedPaths.push(CATALOG_PATH);

      findings.push({ slug: newCase.slug, action: "created", summary: `New use-case for ${newCase.profession}`, sources: newCase.sources });
      console.log(`  + ${newCase.slug}: new use-case`);
    }
  }

  return { touchedPaths, findings };
}

export async function publishUseCases(touchedPaths: string[], findings: Array<{ slug: string; action: string; summary: string; sources: string[] }>) {
  if (touchedPaths.length === 0) {
    console.log("No use-case changes to publish.");
    return { published: false, deployTriggered: false, reason: "No changes." };
  }

  return verifyAndPublish({
    commitMessage: `content(use-cases): ${findings.map((f) => `${f.action} ${f.slug}`).join(", ")}`,
    paths: touchedPaths,
    fallbackBranchPrefix: "auto/use-cases",
    prTitle: `Use-case update: ${findings.length} change(s)`,
    prBody: [
      "Automated use-case update from curated sources:",
      "",
      ...findings.map((f) => `- **${f.slug}** (${f.action}): ${f.summary}\n  Sources: ${f.sources.join(", ")}`),
    ].join("\n"),
  });
}

// Allow direct execution: npx tsx scripts/use-cases/generate.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  import("./research.ts")
    .then((m) => m.researchAll(true))
    .then(generateUseCases)
    .then(({ touchedPaths, findings }) => publishUseCases(touchedPaths, findings))
    .then((result) => {
      console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
      if (result.published && !result.deployTriggered) process.exit(1);
    })
    .catch((err) => {
      console.error("generate failed:", err);
      process.exit(1);
    });
}
