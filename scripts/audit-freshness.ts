// audit-freshness — monthly deep accuracy check with auto-healing.
// BLUEPRINT: autonomous-content-ops-blueprint.md §3.4.
//
// Re-fetches the canonical sources modules/guides/use-cases are built from and
// asks Claude to fix factual drift. Modules use a hardcoded doc map;
// guides/use-cases use their own frontmatter `sources` once they are older than
// 90 days. Nothing goes live unless `npm run check && npm run audit && npm run
// build` all pass.
//
// Requires ANTHROPIC_API_KEY. Safe to dry-run locally (writes to disk, skips
// git steps outside a repo).

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { listModuleDirs } from "./audits/_util.ts";
import { verifyAndPublish, assertTokenBudget, type TokenUsage } from "./_auto-publish.ts";
import { normalizeGeneratedContent } from "./_content-safety.ts";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

// module slug (folder name under content/modules/) -> canonical doc source(s)
const DOC_SOURCES: Record<string, string[]> = {
  "01-getting-started": ["https://code.claude.com/docs/en/quickstart.md"],
  "02-cli-basics": ["https://code.claude.com/docs/en/cli-reference.md"],
  "03-permissions-and-settings": ["https://code.claude.com/docs/en/settings.md"],
  "04-slash-commands": ["https://code.claude.com/docs/en/commands.md"],
  "05-subagents": ["https://code.claude.com/docs/en/sub-agents.md"],
  "06-mcp-servers": ["https://code.claude.com/docs/en/mcp.md"],
};

const MAX_SOURCE_CHARS = 60_000;
const MAX_EVERGREEN_SOURCE_CHARS = 30_000;
const STALE_DAYS = 90;

const YAML_STRINGIFY_OPTS = { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" } as const;

const RESULT_TOOL = {
  name: "record_freshness_check",
  description: "Record whether the content has factual drift vs. the current docs, and the corrected content if so.",
  input_schema: {
    type: "object",
    properties: {
      has_drift: { type: "boolean", description: "True only if something is now factually wrong or outdated." },
      summary: { type: "string", description: "One sentence describing the drift found, empty string if none." },
      corrected_en: { type: "string", description: "Full corrected en.mdx content (frontmatter + body). Empty if no drift." },
      corrected_no: { type: "string", description: "Full corrected no.mdx content (frontmatter + body). Empty if no drift." },
      sources: { type: "array", items: { type: "string" } },
    },
    required: ["has_drift", "summary", "corrected_en", "corrected_no", "sources"],
  },
} as const;

interface FreshnessResult {
  has_drift: boolean;
  summary: string;
  corrected_en: string;
  corrected_no: string;
  sources: string[];
}

interface Finding {
  slug: string;
  summary: string;
  sources: string[];
}

async function fetchDoc(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
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

function daysOld(dateString: string): number {
  const updated = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function updateFrontmatterDate(path: string) {
  const content = readFileSync(path, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return;
  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  if (frontmatter.updatedDate) {
    frontmatter.updatedDate = `${today()}T00:00:00Z`;
    const updatedFm = stringifyYaml(frontmatter, YAML_STRINGIFY_OPTS).trimEnd();
    writeFileSync(path, `---\n${updatedFm}\n---${content.slice(match[0].length)}`, "utf-8");
  }
}

async function checkContent(
  slug: string,
  docUrls: string[],
  currentEn: string,
  currentNo: string,
  contentKind: "module" | "evergreen",
): Promise<FreshnessResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const docs = await Promise.all(docUrls.map(fetchDoc));
  const maxChars = contentKind === "module" ? MAX_SOURCE_CHARS : MAX_EVERGREEN_SOURCE_CHARS;

  const prompt = `You audit a bilingual (English/Norwegian Bokmål) Claude Code ${contentKind} page for factual
accuracy against the current official sources. Be conservative: only flag drift you can
point to directly in the sources below — do not rewrite for style, and do not invent
claims the sources don't support.

## Current official sources
${docUrls.map((u, i) => `### ${u}\n${docs[i].slice(0, maxChars)}`).join("\n\n")}

## Current content — en.mdx
${currentEn}

## Current content — no.mdx
${currentNo}

If everything still matches the sources, set has_drift=false and leave corrected_en/corrected_no empty.
If you find something outdated or wrong, set has_drift=true and return the FULL corrected file content
for both en.mdx and no.mdx — same structure and voice as the original, fixing only what's actually wrong.
Keep the MDX imports at the top if the original had them. List the source URLs you relied on in "sources".`;

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

  if (!res.ok) throw new Error(`Claude API error for ${slug}: HTTP ${res.status} — ${await res.text()}`);

  const data = (await res.json()) as {
    content: Array<{ type: string; input?: unknown }>;
    usage: TokenUsage;
  };
  assertTokenBudget(data.usage);
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse?.input) throw new Error(`Claude API did not return a tool_use block for ${slug}`);
  return toolUse.input as FreshnessResult;
}

function listEvergreenSlugs(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .sort();
}

async function auditModules(findings: Finding[], touchedPaths: string[]) {
  const modules = listModuleDirs();
  for (const mod of modules) {
    const docUrls = DOC_SOURCES[mod.slug];
    if (!docUrls) continue;

    const enPath = join(mod.path, "en.mdx");
    const noPath = join(mod.path, "no.mdx");
    if (!existsSync(enPath) || !existsSync(noPath)) continue;

    console.log(`Checking module ${mod.slug} against ${docUrls.join(", ")}…`);
    let result: FreshnessResult;
    try {
      result = await checkContent(mod.slug, docUrls, readFileSync(enPath, "utf-8"), readFileSync(noPath, "utf-8"), "module");
    } catch (err) {
      console.error(`  ✗ skipping ${mod.slug}: ${(err as Error).message}`);
      continue;
    }

    if (!result.has_drift) {
      console.log(`  ✓ up to date`);
      continue;
    }

    console.log(`  ⚠ drift found: ${result.summary}`);
    if (!result.corrected_en.trim().startsWith("---") || !result.corrected_no.trim().startsWith("---")) {
      console.warn(`  skipping ${mod.slug}: corrected content missing frontmatter`);
      continue;
    }

    writeFileSync(enPath, normalizeGeneratedContent(result.corrected_en), "utf-8");
    writeFileSync(noPath, normalizeGeneratedContent(result.corrected_no), "utf-8");
    touchedPaths.push(enPath, noPath);
    findings.push({ slug: mod.slug, summary: result.summary, sources: result.sources });
  }
}

async function auditEvergreen(
  kind: "guides" | "use-cases",
  findings: Finding[],
  touchedPaths: string[],
) {
  const root = join(process.cwd(), `content/${kind}`);
  const slugs = listEvergreenSlugs(root);

  for (const slug of slugs) {
    const dir = join(root, slug);
    const enPath = join(dir, "en.mdx");
    const noPath = join(dir, "no.mdx");
    if (!existsSync(enPath) || !existsSync(noPath)) continue;

    const enFm = parseFrontmatter(enPath);
    const updatedDate = enFm?.updatedDate as string | undefined;
    const sources = Array.isArray(enFm?.sources) ? (enFm.sources as string[]) : [];

    if (!updatedDate || daysOld(updatedDate) < STALE_DAYS || sources.length === 0) continue;

    console.log(`Checking ${kind}/${slug} against ${sources.join(", ")}…`);
    let result: FreshnessResult;
    try {
      result = await checkContent(`${kind}/${slug}`, sources, readFileSync(enPath, "utf-8"), readFileSync(noPath, "utf-8"), "evergreen");
    } catch (err) {
      console.error(`  ✗ skipping ${kind}/${slug}: ${(err as Error).message}`);
      continue;
    }

    if (!result.has_drift) {
      console.log(`  ✓ up to date`);
      continue;
    }

    console.log(`  ⚠ drift found: ${result.summary}`);
    if (!result.corrected_en.trim().startsWith("---") || !result.corrected_no.trim().startsWith("---")) {
      console.warn(`  skipping ${kind}/${slug}: corrected content missing frontmatter`);
      continue;
    }

    writeFileSync(enPath, normalizeGeneratedContent(result.corrected_en), "utf-8");
    writeFileSync(noPath, normalizeGeneratedContent(result.corrected_no), "utf-8");
    updateFrontmatterDate(enPath);
    updateFrontmatterDate(noPath);
    touchedPaths.push(enPath, noPath);
    findings.push({ slug: `${kind}/${slug}`, summary: result.summary, sources: result.sources });
  }
}

async function main() {
  const findings: Finding[] = [];
  const touchedPaths: string[] = [];

  await auditModules(findings, touchedPaths);
  await auditEvergreen("guides", findings, touchedPaths);
  await auditEvergreen("use-cases", findings, touchedPaths);

  if (findings.length === 0) {
    console.log("No drift found. Nothing to publish.");
    return;
  }

  const result = await verifyAndPublish({
    commitMessage: `content: freshness audit fixes (${findings.map((f) => f.slug).join(", ")})`,
    paths: touchedPaths,
    fallbackBranchPrefix: "auto/freshness",
    prTitle: `Freshness audit: ${findings.length} page(s) updated`,
    prBody: [
      "Monthly freshness audit found drift versus the current official sources:",
      "",
      ...findings.map((f) => `- **${f.slug}**: ${f.summary}\n  Sources: ${f.sources.join(", ")}`),
    ].join("\n"),
  });
  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  console.error("audit-freshness failed:", err);
  process.exit(1);
});
