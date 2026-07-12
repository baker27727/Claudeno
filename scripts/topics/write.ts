// write.ts — weekly writing + publishing of discovered AI/Claude topics.
// BLUEPRINT: ai-topics-discovery-blueprint.md §3.4, §3.5.
//
// Reads the ledger (populated by discover.ts on Tuesday), picks up to
// MAX_NEW_TOPICS_PER_RUN qualifying candidates, re-fetches fresh sources for
// grounding, and asks Claude (Sonnet) to write a full bilingual article
// following the mandatory 6-section template that explicitly splits
// beginner-depth from professional-depth content. trendScore and
// scoreBreakdown are written from the ledger (code), never from the model.
//
// Safety limits:
//   - Only topics that already passed discover.ts's deterministic gate
//     (score >= 0.6, >= 2 independent sources) are eligible.
//   - Maximum 2 new topics per run.
//   - relatedModules/relatedUseCases/relatedSkills are filtered against
//     what actually exists — the model's suggestions are never trusted
//     wholesale (same fix applied to skills/discover.ts).

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verifyAndPublish, assertTokenBudget, type TokenUsage } from "../_auto-publish.ts";
import { loadTopicSources } from "./sources.ts";
import { fetchAllSources } from "./research.ts";
import { loadLedger, saveLedger, findLedgerEntry, type LedgerEntry } from "./ledger.ts";
import { listModuleDirs, readYaml, readVerifiedVersion } from "../audits/_util.ts";

const ROOT = process.cwd();
const TOPICS_DIR = join(ROOT, "content/topics");
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const MAX_NEW_TOPICS_PER_RUN = 2;

const REQUIRED_HEADINGS = {
  en: ["quick summary", "what's new", "how it works", "hands-on example", "when to use it", "sources"],
  no: ["kort oppsummert", "hva er nytt", "slik fungerer det", "prøv det selv", "når du bør bruke det", "kilder"],
} as const;

function today(): string {
  return new Date().toISOString();
}

function slugify(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function existingSlugs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
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

/** Strips whatever frontmatter the model produced — the real one is always rebuilt from code-controlled data. */
function bodyOnly(mdx: string): string {
  const match = mdx.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return (match ? match[1] : mdx).trimStart();
}

interface GeneratedArticle {
  slug: string;
  title_en: string;
  title_no: string;
  description_en: string;
  description_no: string;
  tags: string[];
  related_modules: string[];
  related_use_cases: string[];
  related_skills: string[];
  sources: string[];
  en_mdx: string;
  no_mdx: string;
}

const ARTICLE_TOOL = {
  name: "record_topic_article",
  description: "Record a complete bilingual technical article about an AI/Claude topic, written for both beginners and professionals.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      slug: { type: "string", description: "URL-friendly slug, e.g. 'claude-code-plugin-marketplaces'." },
      title_en: { type: "string" },
      title_no: { type: "string" },
      description_en: { type: "string", description: "1-2 sentence English summary." },
      description_no: { type: "string", description: "1-2 sentence Norwegian summary." },
      tags: { type: "array", items: { type: "string" } },
      related_modules: { type: "array", items: { type: "string" }, description: "Existing learn module ids this relates to, empty if none." },
      related_use_cases: { type: "array", items: { type: "string" }, description: "Existing use-case slugs this relates to, empty if none." },
      related_skills: { type: "array", items: { type: "string" }, description: "Existing skill slugs this relates to, empty if none." },
      sources: { type: "array", items: { type: "string" }, description: "URLs actually used/cited while writing, from the provided source excerpts only." },
      en_mdx: { type: "string", description: "Full en.mdx content including frontmatter --- and all 6 required sections." },
      no_mdx: { type: "string", description: "Full no.mdx content including frontmatter --- and all 6 required sections." },
    },
    required: [
      "slug", "title_en", "title_no", "description_en", "description_no", "tags",
      "related_modules", "related_use_cases", "related_skills", "sources", "en_mdx", "no_mdx",
    ],
  },
} as const;

async function writeArticle(
  entry: LedgerEntry,
  sourceExcerpts: string,
  existingModuleIds: string[],
  existingUseCaseSlugsList: string[],
  existingSkillSlugsList: string[],
): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const prompt = `Write a technical article about this AI/Claude topic for a bilingual (English/Norwegian Bokmål) learning site:

## Topic
${entry.topic}

## Why it's worth writing about now
${entry.whyItMatters}

## Source excerpts (only cite facts grounded here)
${sourceExcerpts}

## Existing content you may cross-reference (only use ids/slugs from these lists — never invent one)
Learn modules: ${existingModuleIds.join(", ") || "(none)"}
Use-case guides: ${existingUseCaseSlugsList.join(", ") || "(none)"}
Skills: ${existingSkillSlugsList.join(", ") || "(none)"}

## Required structure — EVERY section below is mandatory, in this order, in BOTH languages.
This is the core requirement: the article must work for a beginner skimming AND a
professional who wants precision. Do not blend the two into one vague paragraph —
give each its own section.

1. "## Quick summary" (EN) / "## Kort oppsummert" (NO) — 2-3 sentences. What this is, why it matters, right now. A beginner scanning should get the point without reading further.
2. "## What's new" (EN) / "## Hva er nytt" (NO) — the concrete context: what changed, shipped, or trended, grounded in the source excerpts.
3. "## How it works" (EN) / "## Slik fungerer det" (NO) — the precise technical mechanism, step by step. This section is for the professional: no marketing language, explain the actual mechanics.
4. "## Hands-on example" (EN) / "## Prøv det selv" (NO) — a concrete example: a real prompt/command and the kind of result it produces. Use a fenced code block.
5. "## When to use it (and when not to)" (EN) / "## Når du bør bruke det (og når ikke)" (NO) — honest limits, not just upsides.
6. "## Sources" (EN) / "## Kilder" (NO) — list the source URLs actually used, as a bullet list of links.

Rules:
- Only state facts you can ground in the source excerpts above. Do not invent version numbers, dates, or statistics.
- Keep prose concise and precise — this is a technical explainer, not marketing copy.
- The MDX frontmatter you write is discarded and rebuilt from your title_en/title_no/description_en/description_no fields — just start en_mdx/no_mdx with an H1 matching the title, then the 6 sections.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      tools: [ARTICLE_TOOL],
      tool_choice: { type: "tool", name: ARTICLE_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: HTTP ${res.status} — ${await res.text()}`);

  const data = (await res.json()) as { content: Array<{ type: string; input?: unknown }>; usage: TokenUsage };
  assertTokenBudget(data.usage);
  const toolUse = data.content.find((b) => b.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude API did not return a tool_use block");
  return toolUse.input as GeneratedArticle;
}

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlArray(key: string, values: string[]): string {
  if (values.length === 0) return `${key}: []`;
  return `${key}:\n${values.map((v) => `  - ${yamlString(v)}`).join("\n")}`;
}

/** Builds the complete file: code-controlled frontmatter (never the model's) + the model's body only. */
function buildArticleFile(
  title: string,
  description: string,
  entry: LedgerEntry,
  article: GeneratedArticle,
  verifiedVersion: string,
  mdxBody: string,
): string {
  const frontmatter = [
    "---",
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `discoveredAt: ${yamlString(entry.firstSeen)}`,
    `updatedDate: ${yamlString(today())}`,
    `author: "Claude Code Learn"`,
    `trendScore: ${entry.score.total}`,
    "scoreBreakdown:",
    `  frequency: ${entry.score.frequency}`,
    `  recency: ${entry.score.recency}`,
    `  engagement: ${entry.score.engagement}`,
    `  gap: ${entry.score.gap}`,
    yamlArray("tags", article.tags),
    yamlArray("sources", article.sources),
    yamlArray("relatedModules", article.related_modules),
    yamlArray("relatedUseCases", article.related_use_cases),
    yamlArray("relatedSkills", article.related_skills),
    "draft: false",
    `# Verified against Claude Code ${verifiedVersion}`,
    "---",
    "",
  ].join("\n");
  return frontmatter + bodyOnly(mdxBody).trimEnd() + "\n";
}

async function main() {
  const ledger = loadLedger();
  const qualifying = ledger
    .filter((e) => e.status === "candidate" && e.score.total >= 0.6 && e.matchedSources.length >= 2)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, MAX_NEW_TOPICS_PER_RUN);

  if (qualifying.length === 0) {
    console.log("No qualifying topic candidates this week (need discover.ts to have found score >= 0.6, >= 2 sources).");
    return;
  }

  const sourceEntries = loadTopicSources();
  const fetched = await fetchAllSources(sourceEntries);
  const sourceExcerpts = fetched.map((s) => `### ${s.id} (${s.type})\n${s.summary || "(unreachable this run)"}`).join("\n\n");

  const existingModuleIds = listModuleDirs().map((dir) => readYaml<{ id: string }>(join(dir.path, "meta.yaml")).id);
  const existingUseCaseSlugsList = existingSlugs(join(ROOT, "content/use-cases"));
  const existingSkillSlugsList = existingSlugs(join(ROOT, "content/skills"));
  const takenTopicSlugs = new Set(existingSlugs(TOPICS_DIR));

  const verifiedVersion = readVerifiedVersion();
  const published: Array<{ slug: string; title: string; score: number }> = [];
  const failed: Array<{ topic: string; reason: string }> = [];
  const touchedPaths: string[] = [];

  for (const entry of qualifying) {
    console.log(`Writing article for "${entry.topic}" (score ${entry.score.total})...`);
    let article: GeneratedArticle;
    try {
      article = await writeArticle(entry, sourceExcerpts, existingModuleIds, existingUseCaseSlugsList, existingSkillSlugsList);
    } catch (err) {
      console.error(`  ✗ generation failed: ${(err as Error).message}`);
      failed.push({ topic: entry.topic, reason: `generation failed: ${(err as Error).message}` });
      continue;
    }

    const slug = uniqueSlug(article.slug ? slugify(article.slug) : slugify(entry.topic), takenTopicSlugs);

    // Never trust the model's cross-reference lists wholesale — filter to what actually exists.
    article.related_modules = article.related_modules.filter((id) => existingModuleIds.includes(id));
    article.related_use_cases = article.related_use_cases.filter((s) => existingUseCaseSlugsList.includes(s));
    article.related_skills = article.related_skills.filter((s) => existingSkillSlugsList.includes(s));

    const enFile = buildArticleFile(article.title_en, article.description_en, entry, article, verifiedVersion, article.en_mdx);
    const noFile = buildArticleFile(article.title_no, article.description_no, entry, article, verifiedVersion, article.no_mdx);

    const missingEn = missingRequiredHeadings(enFile, "en");
    const missingNo = missingRequiredHeadings(noFile, "no");
    if (missingEn.length > 0 || missingNo.length > 0 || article.sources.length === 0) {
      const reason = [
        missingEn.length > 0 ? `en missing sections: ${missingEn.join(", ")}` : "",
        missingNo.length > 0 ? `no missing sections: ${missingNo.join(", ")}` : "",
        article.sources.length === 0 ? "no sources listed" : "",
      ].filter(Boolean).join("; ");
      console.error(`  ✗ validation failed: ${reason}`);
      failed.push({ topic: entry.topic, reason: `validation failed: ${reason}` });
      continue;
    }

    const dir = join(TOPICS_DIR, slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "en.mdx"), enFile, "utf-8");
    writeFileSync(join(dir, "no.mdx"), noFile, "utf-8");
    touchedPaths.push(join(dir, "en.mdx"), join(dir, "no.mdx"));

    takenTopicSlugs.add(slug);
    published.push({ slug, title: article.title_en, score: entry.score.total });

    const ledgerEntry = findLedgerEntry(ledger, entry.topic);
    if (ledgerEntry) {
      ledgerEntry.status = "published";
      ledgerEntry.publishedSlug = slug;
      ledgerEntry.lastSeen = today();
    }
    console.log(`  + ${slug}: ${article.title_en}`);
  }

  if (published.length === 0) {
    console.log("No articles were successfully written this run.");
    if (failed.length > 0) console.log("Failures:", JSON.stringify(failed, null, 2));
    return;
  }

  saveLedger(ledger);
  touchedPaths.push("content/snapshots/topics-ledger.json");

  if (process.env.SKIP_PUBLISH === "1") {
    console.log("\nSKIP_PUBLISH=1 — articles written to disk, ledger not committed (dry run).");
    return;
  }

  const prBody = [
    "Automated topic articles generated this run:",
    "",
    ...published.map((p) => `- **${p.slug}**: ${p.title} (score ${p.score})`),
    ...(failed.length > 0 ? ["", "Failed candidates:", ...failed.map((f) => `- ${f.topic}: ${f.reason}`)] : []),
  ].join("\n");

  const result = await verifyAndPublish({
    commitMessage: `content(topics): publish ${published.map((p) => p.slug).join(", ")}`,
    paths: touchedPaths,
    fallbackBranchPrefix: "auto/topics-write",
    prTitle: `Topics: ${published.length} new article(s)`,
    prBody,
  });
  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  console.error("topics/write failed:", err);
  process.exit(1);
});
