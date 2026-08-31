// skills/discover.ts — weekly discovery of new skills from the allowlisted sources.
// BLUEPRINT: autonomous-content-ops-blueprint.md §3.2.
//
// Scans content/sources.yaml, fetches SKILL.md files for sources not yet in the
// catalog, asks Claude (Sonnet) to write a full bilingual skill page, and
// publishes it with maturity forced to "experimental".
//
// Safety limits:
//   - Only repos/paths in content/sources.yaml are read.
//   - Maximum 2 new skills per run (quality > quantity + cost control).
//   - Generated maturity is overwritten to "experimental" regardless of prompt.

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { verifyAndPublish, assertTokenBudget, type TokenUsage } from "../_auto-publish.ts";
import { readVerifiedVersion } from "../audits/_util.ts";
import { rawUrl, skillSlugFromPath, discoverableSources, type SourceEntry } from "./sources.ts";
import { deferOnAnthropicCreditError, isAnthropicCreditError } from "../_anthropic-credit.ts";

const ROOT = process.cwd();
const SKILLS_DIR = join(ROOT, "content/skills");
const SNAPSHOTS_DIR = join(ROOT, "content/snapshots/skills");

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const MAX_SOURCE_CHARS = 30_000;
const MAX_NEW_SKILLS_PER_RUN = 2;

const YAML_STRINGIFY_OPTS = { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" } as const;

const VALID_CATEGORIES = [
  "documents",
  "code-quality",
  "web-frontend",
  "automation",
  "data-research",
  "writing-marketing",
] as const;

interface GeneratedSkill {
  slug: string;
  title_en: string;
  title_no: string;
  summary_en: string;
  summary_no: string;
  categories: string[];
  license: string;
  install_command: string;
  level: "beginner" | "intermediate" | "advanced";
  works_without: boolean;
  permissions: string[];
  related_skills: string[];
  related_modules: string[];
  rubric: { docs: number; safety: number; reliability: number; focus: number };
  en_mdx: string;
  no_mdx: string;
  sources: string[];
}

const RESULT_TOOL = {
  name: "record_discovered_skill",
  description: "Record a complete bilingual skill page generated from an upstream SKILL.md.",
  input_schema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "URL-friendly slug for the skill (e.g. 'docx')." },
      title_en: { type: "string" },
      title_no: { type: "string" },
      summary_en: { type: "string", description: "1-2 sentence English summary." },
      summary_no: { type: "string", description: "1-2 sentence Norwegian summary." },
      categories: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 2 },
      license: { type: "string" },
      install_command: { type: "string", description: "e.g. npx skills add owner/repo/path" },
      level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
      works_without: { type: "boolean", description: "True if the skill needs no external tools." },
      permissions: { type: "array", items: { type: "string" } },
      related_skills: { type: "array", items: { type: "string" }, description: "Existing skill slugs, if any." },
      related_modules: { type: "array", items: { type: "string" }, description: "Module ids like 'getting-started', if any." },
      rubric: {
        type: "object",
        properties: {
          docs: { type: "number", minimum: 1, maximum: 5 },
          safety: { type: "number", minimum: 1, maximum: 5 },
          reliability: { type: "number", minimum: 1, maximum: 5 },
          focus: { type: "number", minimum: 1, maximum: 5 },
        },
        required: ["docs", "safety", "reliability", "focus"],
      },
      en_mdx: { type: "string", description: "The article body only, starting with the H1 heading. Do NOT include any frontmatter or '---' delimiter lines — those are added separately from the title/summary fields above." },
      no_mdx: { type: "string", description: "The article body only, starting with the H1 heading. Do NOT include any frontmatter or '---' delimiter lines — those are added separately from the title/summary fields above." },
      sources: { type: "array", items: { type: "string" }, description: "URLs this skill is based on." },
    },
    required: [
      "slug",
      "title_en",
      "title_no",
      "summary_en",
      "summary_no",
      "categories",
      "license",
      "install_command",
      "level",
      "works_without",
      "permissions",
      "related_skills",
      "related_modules",
      "rubric",
      "en_mdx",
      "no_mdx",
      "sources",
    ],
    additionalProperties: false,
  },
} as const;

function existingSkillSlugs(): string[] {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((name) => statSync(join(SKILLS_DIR, name)).isDirectory())
    .sort();
}

async function fetchText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
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

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function openIssue(title: string, body: string) {
  if (!process.env.GH_TOKEN) {
    console.warn(`[issue] GH_TOKEN not set; would have opened: ${title}`);
    return;
  }
  try {
    const existing = execFileSync("gh", [
      "issue", "list", "--search", title, "--state", "open",
      "--json", "number", "--jq", ".[0].number",
    ], { encoding: "utf-8" }).trim();
    if (existing) {
      execFileSync("gh", ["issue", "comment", existing, "--body", body]);
      console.log(`[issue] commented on #${existing}`);
    } else {
      execFileSync("gh", ["issue", "create", "--title", title, "--label", "automation-failure", "--body", body]);
      console.log(`[issue] created: ${title}`);
    }
  } catch (err) {
    console.error(`[issue] failed to open issue: ${(err as Error).message}`);
  }
}

/**
 * Strips whatever frontmatter the model wrote in en_mdx/no_mdx — the real
 * frontmatter is always rebuilt from code-controlled fields below. Without
 * this, a 2026-07-15 run wrote a stray `slug: "docx"` into BOTH en.mdx and
 * no.mdx's frontmatter; Astro's content-collection loader uses a frontmatter
 * `slug` as the entry id when present, so both locale files collided onto
 * the same id and one silently disappeared from the site until a human
 * happened to find the "missing en.mdx or no.mdx" crash. Same fix already
 * applied to topics/write.ts for the same class of bug.
 */
function bodyOnly(mdx: string): string {
  const match = mdx.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  let body = (match ? match[1] : mdx).trimStart();
  while (/^---\s*\n/.test(body)) {
    body = body.replace(/^---\s*\n/, "").trimStart();
  }
  return body;
}

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Rebuilds a minimal, schema-correct frontmatter (title/description only) around the model's body. */
function buildDocFile(title: string, description: string, mdxBody: string): string {
  return `---\ntitle: ${yamlString(title)}\ndescription: ${yamlString(description)}\n---\n\n${bodyOnly(mdxBody).trimEnd()}\n`;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeEntitiesInValue(value: unknown): unknown {
  if (typeof value === "string") return decodeHtmlEntities(value);
  if (Array.isArray(value)) return value.map(decodeEntitiesInValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, decodeEntitiesInValue(v)]),
    );
  }
  return value;
}

function buildMetaYaml(skill: GeneratedSkill, source: SourceEntry): string {
  const meta = {
    slug: skill.slug,
    title: { en: skill.title_en, no: skill.title_no },
    summary: { en: skill.summary_en, no: skill.summary_no },
    categories: skill.categories.filter((c) => VALID_CATEGORIES.includes(c as typeof VALID_CATEGORIES[number])),
    source: {
      repo: source.repo,
      path: source.path,
      branch: source.branch ?? "main",
      license: skill.license,
    },
    install: { command: skill.install_command },
    maturity: "experimental",
    level: skill.level,
    worksWithout: skill.works_without,
    permissions: skill.permissions,
    relatedSkills: skill.related_skills,
    relatedModules: skill.related_modules,
    lastVerified: today(),
    verifiedVersion: readVerifiedVersion(),
    rubric: skill.rubric,
    archived: false,
  };
  return stringifyYaml(meta, YAML_STRINGIFY_OPTS);
}

function validateSkill(skill: GeneratedSkill, source: SourceEntry): string | undefined {
  if (!bodyOnly(skill.en_mdx).trim() || !bodyOnly(skill.no_mdx).trim()) {
    return "empty mdx body after stripping frontmatter";
  }
  if (!skill.categories.length) return "no categories";
  if (!VALID_CATEGORIES.includes(skill.categories[0] as typeof VALID_CATEGORIES[number])) {
    return `invalid category ${skill.categories[0]}`;
  }
  if (!skill.install_command.includes(source.repo)) {
    return "install command does not reference the source repo";
  }
  return undefined;
}

async function generateSkill(source: SourceEntry, upstream: string): Promise<GeneratedSkill> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const suggestedSlug = skillSlugFromPath(source.path);

  const prompt = `You are building a bilingual (English/Norwegian Bokmål) Claude Code skill page for a learning site.
Generate a complete skill page from the upstream SKILL.md below.

## Upstream SKILL.md
${upstream.slice(0, MAX_SOURCE_CHARS)}

## Required output
1. A URL-friendly slug (suggested: "${suggestedSlug}").
2. meta.yaml fields:
   - title (en + no)
   - summary (en + no), 1-2 sentences
   - categories: pick 1-2 from [${VALID_CATEGORIES.join(", ")}]
   - license: copy from upstream frontmatter
   - install_command: must be "npx skills add ${source.repo}/${suggestedSlug}"
   - level: beginner/intermediate/advanced
   - works_without: true only if the skill needs no external binaries/libraries
   - permissions: list what it executes (bash, file-read, file-write, network, ...)
   - related_skills: existing skill slugs it relates to (empty if none)
   - related_modules: module ids it relates to (empty if none)
   - rubric: score 1-5 for docs, safety, reliability, focus
   - Do NOT return verified_version; the site inserts the current Claude Code version automatically.
3. Full en.mdx and no.mdx BODIES ONLY (no frontmatter, start with the H1). Each MUST contain these sections:
   - What it does and why it exists / Hva den gjør og hvorfor den finnes
   - Try it now — TerminalSim / Prøv den nå — TerminalSim
   - Install / Installasjon
   - Safety and permissions / Sikkerhet og tillatelser
   - Practical use cases / Praktiske bruksområder
   - Limitations / Begrensninger
4. sources: URLs used (include the upstream raw URL).

Rules:
- Do not invent facts not in the SKILL.md.
- Keep prose concise and practical (a field guide, not a copy-paste reference).
- The generated skill will be published with maturity "experimental" regardless of the source.`;

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

  const data = (await res.json()) as {
    content: Array<{ type: string; input?: unknown }>;
    usage: TokenUsage;
  };
  assertTokenBudget(data.usage);
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude API did not return a tool_use block");
  return toolUse.input as GeneratedSkill;
}

async function main() {
  const sources = discoverableSources();
  const existing = new Set(existingSkillSlugs());
  const candidates = sources.filter((s) => !existing.has(skillSlugFromPath(s.path)));

  if (candidates.length === 0) {
    console.log("No new skills to discover.");
    return;
  }

  const created: Array<{ slug: string; title: string; source: string }> = [];
  const failedCandidates: Array<{ slug: string; source: string; reason: string }> = [];
  const touchedPaths: string[] = [];
  let remainingBudget = MAX_NEW_SKILLS_PER_RUN;

  for (const source of candidates) {
    if (remainingBudget <= 0) {
      console.log("Reached max new skills per run; stopping.");
      break;
    }

    const slug = skillSlugFromPath(source.path);
    console.log(`Discovering ${slug} from ${source.repo}/${source.path}…`);

    let upstream: string;
    try {
      upstream = await fetchText(rawUrl(source));
    } catch (err) {
      console.error(`  ✗ failed to fetch ${source.id}: ${(err as Error).message}`);
      failedCandidates.push({ slug, source: source.id, reason: `fetch failed: ${(err as Error).message}` });
      continue;
    }

    let skill: GeneratedSkill;
    try {
      skill = await generateSkill(source, upstream);
    } catch (err) {
      if (isAnthropicCreditError(err)) throw err;
      console.error(`  ✗ failed to generate ${slug}: ${(err as Error).message}`);
      failedCandidates.push({ slug, source: source.id, reason: `Claude API/generation failed: ${(err as Error).message}` });
      continue;
    }

    // The model must never choose the slug: it determines the directory, must
    // be stable, and must match the allowlisted path.
    skill.slug = slug;

    // Decode HTML entities the model may have escaped in any text field.
    skill = decodeEntitiesInValue(skill) as GeneratedSkill;

    // Only keep related skill slugs that actually exist or were generated this run.
    const allowedRelatedSlugs = new Set([...existing, ...created.map((c) => c.slug)]);
    skill.related_skills = skill.related_skills.filter((s) => allowedRelatedSlugs.has(s));

    const validationError = validateSkill(skill, source);
    if (validationError) {
      console.error(`  ✗ generated ${slug} failed validation: ${validationError}`);
      failedCandidates.push({ slug, source: source.id, reason: `validation failed: ${validationError}` });
      continue;
    }

    // Force experimental maturity even if the model ignored the rule.
    const dir = join(SKILLS_DIR, skill.slug);
    mkdirSync(dir, { recursive: true });
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });

    writeFileSync(join(dir, "meta.yaml"), buildMetaYaml(skill, source), "utf-8");
    writeFileSync(join(dir, "en.mdx"), buildDocFile(skill.title_en, skill.summary_en, skill.en_mdx), "utf-8");
    writeFileSync(join(dir, "no.mdx"), buildDocFile(skill.title_no, skill.summary_no, skill.no_mdx), "utf-8");
    writeFileSync(join(SNAPSHOTS_DIR, `${skill.slug}.hash`), `${sha256(upstream)}\n`, "utf-8");

    touchedPaths.push(
      join(dir, "meta.yaml"),
      join(dir, "en.mdx"),
      join(dir, "no.mdx"),
      join(SNAPSHOTS_DIR, `${skill.slug}.hash`),
    );
    created.push({ slug: skill.slug, title: skill.title_en, source: rawUrl(source) });
    remainingBudget--;
    console.log(`  + ${skill.slug}: ${skill.title_en}`);
  }

  if (created.length === 0) {
    console.log("No discoverable skills could be generated.");
    if (failedCandidates.length > 0) {
      openIssue(
        "🔴 Skills discovery failed for all candidates",
        `The weekly skills-discover run could not generate any new skill. Failures:\n\n${failedCandidates
          .map((f) => `- **${f.slug}** (${f.source}): ${f.reason}`)
          .join("\n")}`,
      );
    }
    return;
  }

  const result = await verifyAndPublish({
    commitMessage: `content(skills): discover ${created.map((c) => c.slug).join(", ")}`,
    paths: touchedPaths,
    fallbackBranchPrefix: "auto/skills-discover",
    prTitle: `Skills discovery: ${created.length} new skill(s)`,
    prBody: [
      "Automated skill discovery generated the following new skills as experimental:",
      "",
      ...created.map((c) => `- **${c.slug}**: ${c.title}\n  Source: ${c.source}`),
    ].join("\n"),
  });

  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  if (deferOnAnthropicCreditError(err, "skill discovery")) return;
  console.error("skills/discover failed:", err);
  process.exit(1);
});
