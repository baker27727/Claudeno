// generate-update — reads the upstream diff detected by watch-upstream.ts,
// asks the Claude API for a structured content update, applies it to
// content/, and publishes it. BLUEPRINT §7.2, updated for full autonomy:
// if `npm run check && npm run audit && npm run build` all pass against the
// applied patch, it's pushed straight to main — no PR, no waiting. If
// verification fails, it falls back to a PR so a human sees exactly what
// broke instead of broken content going live silently.
//
// Requires ANTHROPIC_API_KEY. Git steps only run when the working tree is a
// git repository, so this is safe to dry-run locally (it will still write
// the content patches to disk for inspection).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { listModuleDirs, readYaml } from "./audits/_util.ts";
import { generateWhatsNewPost } from "./_blog-gen.ts";
import { verifyAndPublish } from "./_auto-publish.ts";
import { deferOnAnthropicCreditError } from "./_anthropic-credit.ts";
import {
  normalizeUpstreamUpdatePlan,
  type GlossaryTerm,
  type UpdatePlan,
} from "./_upstream-update-plan.ts";

const ROOT = process.cwd();
const DIFF_PATH = join(ROOT, ".upstream-diff.md");
const GLOSSARY_PATH = join(ROOT, "content/glossary.yaml");
const CHANGELOG_PATH = join(ROOT, "content/changelog.yaml");
const SNAPSHOT_VERSION_PATH = join(ROOT, "content/snapshots/upstream-version.txt");
const SNAPSHOT_CHANGELOG_PATH = join(ROOT, "content/snapshots/upstream-changelog.md");

// Haiku 4.5 is plenty for this: bounded structured extraction (a short diff
// in, a few bilingual sentences + JSON out) — not a task that needs a
// flagship model, and running daily makes the price difference compound.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const DOCS_MAP_URL = "https://code.claude.com/docs/en/claude_code_docs_map.md";

// Force every string scalar to be double-quoted on write. Without this, a
// plain value like `date: 2026-07-08` round-trips as a YAML timestamp (not a
// string) when re-parsed by Astro's content loader, breaking the `date:
// z.string()` schema. Quoting everything sidesteps the whole class of
// implicit-type-resolution bugs (dates, numeric-looking ids/versions, etc).
const YAML_STRINGIFY_OPTS = { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" } as const;

const RESULT_TOOL = {
  name: "record_content_update",
  description: "Record the structured content update derived from the upstream diff.",
  input_schema: {
    type: "object",
    properties: {
      affected_modules: { type: "array", items: { type: "string" } },
      content_patches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            file: { type: "string", description: "Module slug, e.g. cli-basics" },
            en: { type: "string" },
            no: { type: "string" },
          },
          required: ["file", "en", "no"],
        },
      },
      changelog_entry: {
        type: "object",
        properties: {
          version: { type: "string" },
          en: { type: "string" },
          no: { type: "string" },
        },
        required: ["version", "en", "no"],
      },
      new_glossary_terms: {
        type: "array",
        items: {
          type: "object",
          properties: { en: { type: "string" }, no: { type: "string" }, note: { type: "string" } },
          required: ["en", "no"],
        },
      },
      sources: { type: "array", items: { type: "string" } },
    },
    required: ["affected_modules", "content_patches", "changelog_entry", "new_glossary_terms", "sources"],
  },
} as const;

async function callClaude(diff: string, latestVersion: string, glossary: GlossaryTerm[]): Promise<UpdatePlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const modules = listModuleDirs().map((m) => {
    const meta = readYaml<{ id: string; title: { en: string; no: string } }>(join(m.path, "meta.yaml"));
    return `- ${meta.id}: ${meta.title.en} / ${meta.title.no}`;
  });

  const prompt = `You maintain a bilingual (English/Norwegian Bokmål) learning site for Claude Code.
A new upstream release was detected. Propose the minimal content update needed.

## Upstream CHANGELOG diff (new version: ${latestVersion})
${diff}

## Canonical docs map (fetch if you need more detail)
${DOCS_MAP_URL}

## Existing modules (slug: title)
${modules.join("\n")}

## Glossary — required EN/NO term consistency
${glossary.map((g) => `- ${g.en} -> ${g.no}${g.note ? ` (${g.note})` : ""}`).join("\n")}

Only propose changes backed by the CHANGELOG diff above or the docs map. For each
affected module, write a short bilingual "what's new" addition (a few sentences),
not a full lesson rewrite. Every technical claim must be traceable to a source URL
listed in "sources". If nothing in the diff affects existing modules, return an
empty content_patches array — do not invent unrelated changes.`;

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
      tools: [RESULT_TOOL],
      tool_choice: { type: "tool", name: RESULT_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: HTTP ${res.status} — ${await res.text()}`);

  const data = (await res.json()) as {
    content: Array<{ type: string; input?: unknown }>;
  };
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude API did not return a tool_use block");
  return normalizeUpstreamUpdatePlan(toolUse.input, latestVersion);
}

function appendWhatsNew(modulePath: string, locale: "en" | "no", version: string, text: string) {
  const file = join(modulePath, `${locale}.mdx`);
  if (!existsSync(file)) {
    console.warn(`Skipping ${file}: module doc not found`);
    return;
  }
  const heading = locale === "en" ? `## What's new in v${version}` : `## Nytt i v${version}`;
  const current = readFileSync(file, "utf-8").trimEnd();
  // watch-upstream.ts flags a run as "changed" whenever the fetched CHANGELOG
  // text differs at all, which can happen without the latest version bumping
  // (e.g. upstream edits/backfills older entries). Without this guard, a
  // second run for a version already documented here would append a second,
  // slightly-reworded "What's new in vX" section instead of a no-op.
  if (current.includes(heading)) {
    console.warn(`Skipping ${file}: already has a "${heading}" section`);
    return;
  }
  writeFileSync(file, `${current}\n\n${heading}\n\n${text.trim()}\n`, "utf-8");
}

function applyChangelogEntry(entry: UpdatePlan["changelog_entry"]) {
  const entries = readYaml<Array<{ id: string; version: string; date: string; entry: { en: string; no: string }; sources: string[] }>>(
    CHANGELOG_PATH,
  );
  if (entries.some((e) => e.version === entry.version)) return;
  entries.unshift({
    id: entry.version,
    version: entry.version,
    date: new Date().toISOString().slice(0, 10),
    entry: { en: entry.en, no: entry.no },
    sources: [],
  });
  writeFileSync(CHANGELOG_PATH, stringifyYaml(entries, YAML_STRINGIFY_OPTS), "utf-8");
}

function applyGlossaryTerms(terms: GlossaryTerm[]) {
  if (terms.length === 0) return;
  const existing = readYaml<Array<{ id: string; en: string; no: string; note?: string }>>(GLOSSARY_PATH);
  const known = new Set(existing.map((e) => e.en.toLowerCase()));
  for (const term of terms) {
    if (known.has(term.en.toLowerCase())) continue;
    existing.push({ id: term.en.toLowerCase().replace(/\s+/g, "-"), en: term.en, no: term.no, note: term.note });
  }
  writeFileSync(GLOSSARY_PATH, stringifyYaml(existing, YAML_STRINGIFY_OPTS), "utf-8");
}

async function main() {
  if (!existsSync(DIFF_PATH)) {
    console.log("No .upstream-diff.md found — nothing to do (run watch-upstream.ts first).");
    return;
  }

  const diff = readFileSync(DIFF_PATH, "utf-8");
  const latestVersion = process.env.LATEST_VERSION ?? readFileSync(SNAPSHOT_VERSION_PATH, "utf-8").trim();
  const glossary = readYaml<GlossaryTerm[]>(GLOSSARY_PATH);

  const plan = await callClaude(diff, latestVersion, glossary);

  for (const patch of plan.content_patches) {
    const mod = listModuleDirs().find((m) => readYaml<{ id: string }>(join(m.path, "meta.yaml")).id === patch.file);
    if (!mod) {
      console.warn(`Skipping patch for unknown module "${patch.file}"`);
      continue;
    }
    appendWhatsNew(mod.path, "en", plan.changelog_entry.version, patch.en);
    appendWhatsNew(mod.path, "no", plan.changelog_entry.version, patch.no);
  }

  applyChangelogEntry(plan.changelog_entry);
  // §2 + §9: بعد كل تحديث إصدار، نُولّد مسودة مدونة "What's new in vX.Y.Z"
  // ثنائية اللغة. الـ helper نفسه يتأكد من idempotency.
  await generateWhatsNewPost(
    plan.changelog_entry.version,
    plan.changelog_entry.en,
    plan.changelog_entry.no,
    plan.sources,
  );
  applyGlossaryTerms(plan.new_glossary_terms);

  writeFileSync(SNAPSHOT_VERSION_PATH, `${latestVersion}\n`, "utf-8");
  writeFileSync(
    SNAPSHOT_CHANGELOG_PATH,
    `# Upstream snapshot — Claude Code CHANGELOG\n\nLast observed version: ${latestVersion}\n\n> This file is maintained automatically by \`scripts/watch-upstream.ts\`.\n> It stores the last-seen upstream CHANGELOG so daily diffs can be computed.\n\n${diff}`,
    "utf-8",
  );

  console.log(`Applied update plan for v${plan.changelog_entry.version}:`);
  console.log(`  Affected modules: ${plan.affected_modules.join(", ") || "(none)"}`);
  console.log(`  Content patches: ${plan.content_patches.length}`);
  console.log(`  New glossary terms: ${plan.new_glossary_terms.length}`);

  const result = await verifyAndPublish({
    commitMessage: `content: update for Claude Code v${plan.changelog_entry.version}`,
    paths: ["content/"],
    fallbackBranchPrefix: `auto/update-v${plan.changelog_entry.version}`,
    prTitle: `Update for Claude Code v${plan.changelog_entry.version}`,
    prBody: [
      `Automated content update for Claude Code v${plan.changelog_entry.version}.`,
      "",
      "**Sources:**",
      ...plan.sources.map((s) => `- ${s}`),
    ].join("\n"),
  });
  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  // A publish that didn't actually trigger a deploy is a failure, not a
  // success with a footnote — see PublishResult.deployTriggered.
  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  if (deferOnAnthropicCreditError(err, "upstream content generation")) return;
  console.error("generate-update failed:", err);
  process.exit(1);
});
