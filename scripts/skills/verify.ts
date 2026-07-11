// skills/verify.ts — daily verification of curated skills against upstream SKILL.md.
// BLUEPRINT: autonomous-content-ops-blueprint.md §3.1.
//
// For each skill:
//   1. Fetch upstream SKILL.md from the allowlisted source repo.
//   2. Compare sha256 with content/snapshots/skills/<slug>.hash.
//   3. No change        -> update lastVerified to today (cheap, batched commit).
//   4. Change detected  -> ask Claude (Haiku) for a minimal patch and publish.
//   5. Source gone      -> mark archived + open an informational issue.
//
// Dry-run safe: outside a git repo it writes to disk but does not commit.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { stringify as stringifyYaml } from "yaml";
import { verifyAndPublish, assertTokenBudget, type TokenUsage } from "../_auto-publish.ts";
import { readYaml, readVerifiedVersion } from "../audits/_util.ts";
import { rawUrl } from "./sources.ts";

const ROOT = process.cwd();
const SKILLS_DIR = join(ROOT, "content/skills");
const SNAPSHOTS_DIR = join(ROOT, "content/snapshots/skills");

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const MAX_SOURCE_CHARS = 20_000;

const YAML_STRINGIFY_OPTS = { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" } as const;

interface SkillMeta {
  slug: string;
  title: { en: string; no: string };
  summary: { en: string; no: string };
  source: { repo: string; path: string; branch?: string; license: string };
  install: { command: string };
  maturity: string;
  level: string;
  worksWithout: boolean;
  permissions: string[];
  relatedSkills: string[];
  relatedModules: string[];
  lastVerified: string;
  verifiedVersion: string;
  rubric: { docs: number; safety: number; reliability: number; focus: number };
  archived?: boolean;
}

interface SkillPatch {
  summary: string;
  meta_patch: Partial<SkillMeta>;
  en_addition: string;
  no_addition: string;
}

const PATCH_TOOL = {
  name: "record_skill_patch",
  description: "Record the minimal patch needed to bring a skill page in sync with an upstream SKILL.md change.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "One-sentence description of what changed in the upstream SKILL.md." },
      meta_patch: {
        type: "object",
        description: "Only the meta.yaml fields that need to change. Leave empty if nothing in meta changed.",
        properties: {
          summary: { type: "object", properties: { en: { type: "string" }, no: { type: "string" } } },
          install: { type: "object", properties: { command: { type: "string" } } },
          permissions: { type: "array", items: { type: "string" } },
          source: { type: "object", properties: { license: { type: "string" } } },
        },
        additionalProperties: false,
      },
      en_addition: { type: "string", description: "Short English paragraph to append under a '## Source update' heading. Empty if no doc change." },
      no_addition: { type: "string", description: "Short Norwegian paragraph to append under a '## Oppdatering fra kilde' heading. Empty if no doc change." },
    },
    required: ["summary", "meta_patch", "en_addition", "no_addition"],
    additionalProperties: false,
  },
} as const;

function listSkillSlugs(): string[] {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((name) => statSync(join(SKILLS_DIR, name)).isDirectory())
    .sort();
}

function readSkillMeta(slug: string): SkillMeta {
  return readYaml<SkillMeta>(join(SKILLS_DIR, slug, "meta.yaml"));
}

function readSkillDoc(slug: string, locale: "en" | "no"): string {
  return readFileSync(join(SKILLS_DIR, slug, `${locale}.mdx`), "utf-8");
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

function snapshotPath(slug: string): string {
  return join(SNAPSHOTS_DIR, `${slug}.hash`);
}

const MISSING_SNAPSHOT_PATH = join(SNAPSHOTS_DIR, "missing-sources.json");

function loadMissingSources(): Record<string, { firstMissing: string }> {
  if (!existsSync(MISSING_SNAPSHOT_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MISSING_SNAPSHOT_PATH, "utf-8")) as Record<string, { firstMissing: string }>;
  } catch {
    return {};
  }
}

function saveMissingSources(sources: Record<string, { firstMissing: string }>) {
  if (Object.keys(sources).length === 0) {
    if (existsSync(MISSING_SNAPSHOT_PATH)) {
      unlinkSync(MISSING_SNAPSHOT_PATH);
    }
    return;
  }
  writeFileSync(MISSING_SNAPSHOT_PATH, JSON.stringify(sources, null, 2) + "\n", "utf-8");
}

async function fetchText(url: string, attempts = 3): Promise<{ text: string; status?: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (res.status === 404) return { text: "", status: 404 };
      if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
      return { text: await res.text(), status: res.status };
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function callClaudeForPatch(
  meta: SkillMeta,
  upstream: string,
  en: string,
  no: string,
): Promise<SkillPatch> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const prompt = `You maintain a bilingual (English/Norwegian Bokmål) Claude Code skill page. The upstream SKILL.md changed; propose the minimal patch to keep the page accurate.

## Upstream SKILL.md (truncated if long)
${upstream.slice(0, MAX_SOURCE_CHARS)}

## Current meta.yaml
${stringifyYaml(meta, YAML_STRINGIFY_OPTS)}

## Current en.mdx
${en}

## Current no.mdx
${no}

Rules:
1. Only patch fields that actually changed. Do not invent unrelated content.
2. Keep additions short (1-2 paragraphs). Append them under a heading the user can add.
3. Do not include verifiedVersion; the site inserts the current Claude Code version automatically.
4. Do not change maturity, slug, rubric scores, repo, path, or branch.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      tools: [PATCH_TOOL],
      tool_choice: { type: "tool", name: PATCH_TOOL.name },
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
  return toolUse.input as SkillPatch;
}

const ALLOWED_META_PATCH_KEYS = new Set(["summary", "install", "permissions", "source"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merges a whitelist of meta.yaml fields returned by the model.
 * Maturity, slug, rubric, level, worksWithout, relatedSkills/Modules, repo,
 * path, and branch can never be altered by an upstream patch.
 */
function mergeMeta(meta: SkillMeta, patch: Partial<SkillMeta>): SkillMeta {
  const updated: SkillMeta = { ...meta };

  for (const key of Object.keys(patch)) {
    if (!ALLOWED_META_PATCH_KEYS.has(key)) continue;
    const value = patch[key as keyof SkillMeta];

    if (key === "summary" && isObject(value)) {
      const v = value as Record<string, unknown>;
      updated.summary = {
        en: typeof v.en === "string" ? v.en : meta.summary.en,
        no: typeof v.no === "string" ? v.no : meta.summary.no,
      };
    } else if (key === "install" && isObject(value)) {
      const v = value as Record<string, unknown>;
      updated.install = {
        command: typeof v.command === "string" ? v.command : meta.install.command,
      };
    } else if (key === "permissions" && Array.isArray(value)) {
      updated.permissions = value.filter((item): item is string => typeof item === "string");
    } else if (key === "source" && isObject(value)) {
      const v = value as Record<string, unknown>;
      if (typeof v.license === "string") {
        updated.source = { ...meta.source, license: v.license };
      }
    }
  }

  updated.lastVerified = today();
  updated.verifiedVersion = readVerifiedVersion();
  return updated;
}

function appendUpdateSection(doc: string, locale: "en" | "no", addition: string): string {
  if (!addition.trim()) return doc;
  const heading = locale === "en" ? "## Source update" : "## Oppdatering fra kilde";
  const trimmed = doc.trimEnd();
  const separator = trimmed.endsWith("\n") ? "" : "\n";
  return `${trimmed}${separator}\n${heading}\n\n${addition.trim()}\n`;
}

function writeMeta(slug: string, meta: SkillMeta) {
  writeFileSync(join(SKILLS_DIR, slug, "meta.yaml"), stringifyYaml(meta, YAML_STRINGIFY_OPTS), "utf-8");
}

function writeSnapshot(slug: string, hash: string) {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  writeFileSync(snapshotPath(slug), `${hash}\n`, "utf-8");
}

function openIssue(title: string, body: string) {
  if (!process.env.GH_TOKEN) {
    console.warn(`[issue] GH_TOKEN not set; would have opened issue: ${title}`);
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

async function main() {
  const slugs = listSkillSlugs();
  if (slugs.length === 0) {
    console.log("No skills to verify.");
    return;
  }

  const verifiedToday: string[] = [];
  const changed: string[] = [];
  const archived: string[] = [];
  const touchedPaths: string[] = [];
  let missingSources = loadMissingSources();

  for (const slug of slugs) {
    const meta = readSkillMeta(slug);
    if (meta.archived) {
      console.log(`  ⊘ ${slug}: archived — skipping`);
      continue;
    }

    const url = rawUrl({ repo: meta.source.repo, path: meta.source.path, branch: meta.source.branch });
    console.log(`Checking ${slug} against ${url}…`);

    let upstream: string;
    try {
      const result = await fetchText(url);
      if (result.status === 404) {
        if (missingSources[slug]) {
          // Second consecutive 404 — archive and notify.
          console.warn(`  ⚠ ${slug}: upstream source returned 404 in two consecutive runs — marking archived`);
          meta.archived = true;
          writeMeta(slug, meta);
          touchedPaths.push(join(SKILLS_DIR, slug, "meta.yaml"), MISSING_SNAPSHOT_PATH);
          archived.push(slug);
          delete missingSources[slug];
          openIssue(
            `🔴 Skill source missing: ${slug}`,
            `The upstream source for \`${slug}\` (${meta.source.repo}/${meta.source.path}) returned 404 during two consecutive daily skills-verify runs.\n\nThe skill has been marked "archived" automatically. A human should decide whether to remove the skill, update its source path/branch, or point it to a new source.`,
          );
        } else {
          // First failure — record but wait one more run before archiving.
          console.warn(`  ⚠ ${slug}: upstream source returned 404 — recording first failure`);
          missingSources[slug] = { firstMissing: today() };
          touchedPaths.push(MISSING_SNAPSHOT_PATH);
        }
        continue;
      }
      // Source is reachable again — clear any previous first-failure record.
      if (missingSources[slug]) {
        delete missingSources[slug];
        touchedPaths.push(MISSING_SNAPSHOT_PATH);
      }
      upstream = result.text;
    } catch (err) {
      console.error(`  ✗ ${slug}: failed to fetch upstream — ${(err as Error).message}`);
      // Surface as a workflow failure; do not mark archived on transient errors.
      throw err;
    }

    const hash = sha256(upstream);
    const knownHash = existsSync(snapshotPath(slug)) ? readFileSync(snapshotPath(slug), "utf-8").trim() : "";

    if (hash === knownHash) {
      console.log(`  ✓ ${slug}: unchanged`);
      if (meta.lastVerified !== today()) {
        meta.lastVerified = today();
        writeMeta(slug, meta);
        writeSnapshot(slug, hash);
        touchedPaths.push(join(SKILLS_DIR, slug, "meta.yaml"), snapshotPath(slug));
        verifiedToday.push(slug);
      }
      continue;
    }

    console.log(`  ✎ ${slug}: upstream changed — generating patch`);
    const en = readSkillDoc(slug, "en");
    const no = readSkillDoc(slug, "no");
    const patch = await callClaudeForPatch(meta, upstream, en, no);

    const updatedMeta = mergeMeta(meta, patch.meta_patch);

    writeMeta(slug, updatedMeta);
    writeFileSync(join(SKILLS_DIR, slug, "en.mdx"), appendUpdateSection(en, "en", patch.en_addition), "utf-8");
    writeFileSync(join(SKILLS_DIR, slug, "no.mdx"), appendUpdateSection(no, "no", patch.no_addition), "utf-8");
    writeSnapshot(slug, hash);

    touchedPaths.push(
      join(SKILLS_DIR, slug, "meta.yaml"),
      join(SKILLS_DIR, slug, "en.mdx"),
      join(SKILLS_DIR, slug, "no.mdx"),
      snapshotPath(slug),
    );
    changed.push(slug);
    console.log(`    ${patch.summary}`);
  }

  saveMissingSources(missingSources);

  if (touchedPaths.length === 0) {
    console.log("No skill changes to publish.");
    return;
  }

  const subjects = [...verifiedToday, ...changed, ...archived];
  const stateOnly = subjects.length === 0 && touchedPaths.includes(MISSING_SNAPSHOT_PATH);
  const commitMessage = stateOnly
    ? "content(skills): update source-missing tracking"
    : `content(skills): verify ${subjects.join(", ")}`;
  const prTitle = stateOnly
    ? "Skills verification: update source-missing tracking"
    : `Skills verification: ${verifiedToday.length} verified, ${changed.length} changed, ${archived.length} archived`;

  const result = await verifyAndPublish({
    commitMessage,
    paths: touchedPaths,
    fallbackBranchPrefix: "auto/skills-verify",
    prTitle,
    prBody: [
      "Automated skill verification results:",
      "",
      ...(verifiedToday.length > 0 ? [`- Verified today: ${verifiedToday.join(", ")}`] : []),
      ...(changed.length > 0 ? [`- Changed and patched: ${changed.join(", ")}`] : []),
      ...(archived.length > 0 ? [`- Source missing, marked archived: ${archived.join(", ")}`] : []),
      ...(stateOnly ? ["- Updated source-missing tracking snapshot."] : []),
    ].join("\n"),
  });

  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  console.error("skills/verify failed:", err);
  process.exit(1);
});
