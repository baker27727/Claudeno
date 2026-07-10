// audit-freshness — monthly deep accuracy check. Unlike watch-upstream.ts
// (which only reacts to a version bump in the CHANGELOG), this re-fetches
// the actual docs pages our modules teach from and asks Claude to compare
// them against our current lesson content, independent of whether a new
// version shipped. This is what catches drift a version diff can't see —
// e.g. a recommended install method changing without a CHANGELOG entry
// calling it out by name.
//
// For each module with a mapped doc source: fetch the live doc, ask Claude
// for a corrected full replacement of en.mdx/no.mdx if (and only if) it
// finds a factual discrepancy, then publish through the same
// verify-or-fall-back-to-PR gate as generate-update.ts. Nothing goes live
// unless `npm run check && npm run audit && npm run build` all pass.
//
// Requires ANTHROPIC_API_KEY. Safe to dry-run locally (writes to disk,
// skips git steps outside a repo).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listModuleDirs } from "./audits/_util.ts";
import { verifyAndPublish } from "./_auto-publish.ts";

// Haiku 4.5 is plenty for this: bounded drift-detection against live docs,
// not a task that needs a flagship model — see generate-update.ts for why.
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

const RESULT_TOOL = {
  name: "record_freshness_check",
  description: "Record whether the lesson has factual drift vs. the current docs, and the corrected content if so.",
  input_schema: {
    type: "object",
    properties: {
      has_drift: { type: "boolean", description: "True only if something in the lesson is now factually wrong or outdated." },
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

async function checkModule(slug: string, docUrls: string[], currentEn: string, currentNo: string): Promise<FreshnessResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const docs = await Promise.all(docUrls.map(fetchDoc));

  const prompt = `You audit a bilingual (English/Norwegian Bokmål) Claude Code lesson for factual
accuracy against the current official docs. Be conservative: only flag drift you can
point to directly in the docs below — do not rewrite for style, and do not invent
claims the docs don't support.

## Current official docs (source of truth)
${docUrls.map((u, i) => `### ${u}\n${docs[i].slice(0, 60000)}`).join("\n\n")}

## Current lesson — en.mdx
${currentEn}

## Current lesson — no.mdx
${currentNo}

If everything in the lesson still matches the docs, set has_drift=false and leave
corrected_en/corrected_no empty. If you find something outdated or wrong (like a
deprecated command, a changed default, a renamed flag), set has_drift=true and return
the FULL corrected file content for both en.mdx and no.mdx — same structure and voice
as the original, fixing only what's actually wrong. Keep the MDX imports at the top
(e.g. "import Callout from ...") if the original had them. List the doc URLs you
relied on in "sources".`;

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

  const data = (await res.json()) as { content: Array<{ type: string; input?: unknown }> };
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse?.input) throw new Error(`Claude API did not return a tool_use block for ${slug}`);
  return toolUse.input as FreshnessResult;
}

async function main() {
  const modules = listModuleDirs();
  const findings: Array<{ slug: string; summary: string; sources: string[] }> = [];
  const touchedPaths: string[] = [];

  for (const mod of modules) {
    const docUrls = DOC_SOURCES[mod.slug];
    if (!docUrls) continue; // no mapped doc source — nothing to audit against

    const enPath = join(mod.path, "en.mdx");
    const noPath = join(mod.path, "no.mdx");
    if (!existsSync(enPath) || !existsSync(noPath)) continue;

    console.log(`Checking ${mod.slug} against ${docUrls.join(", ")}…`);
    let result: FreshnessResult;
    try {
      result = await checkModule(mod.slug, docUrls, readFileSync(enPath, "utf-8"), readFileSync(noPath, "utf-8"));
    } catch (err) {
      // One module's docs being briefly unreachable shouldn't cancel the
      // audit for every other module — skip it, this runs again next month.
      console.error(`  ✗ skipping ${mod.slug}: ${(err as Error).message}`);
      continue;
    }

    if (!result.has_drift) {
      console.log(`  ✓ up to date`);
      continue;
    }

    console.log(`  ⚠ drift found: ${result.summary}`);
    if (!result.corrected_en.trim().startsWith("---") || !result.corrected_no.trim().startsWith("---")) {
      console.warn(`  skipping ${mod.slug}: corrected content missing frontmatter, refusing to write`);
      continue;
    }

    writeFileSync(enPath, result.corrected_en.trimEnd() + "\n", "utf-8");
    writeFileSync(noPath, result.corrected_no.trimEnd() + "\n", "utf-8");
    touchedPaths.push(enPath, noPath);
    findings.push({ slug: mod.slug, summary: result.summary, sources: result.sources });
  }

  if (findings.length === 0) {
    console.log("No drift found across any module. Nothing to publish.");
    return;
  }

  const result = await verifyAndPublish({
    commitMessage: `content: freshness audit fixes (${findings.map((f) => f.slug).join(", ")})`,
    paths: touchedPaths,
    fallbackBranchPrefix: "auto/freshness",
    prTitle: `Freshness audit: ${findings.length} module(s) updated`,
    prBody: [
      "Monthly freshness audit found drift versus the current official docs:",
      "",
      ...findings.map((f) => `- **${f.slug}**: ${f.summary}\n  Sources: ${f.sources.join(", ")}`),
    ].join("\n"),
  });
  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  // A publish that didn't actually trigger a deploy is a failure, not a
  // success with a footnote — see PublishResult.deployTriggered.
  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  console.error("audit-freshness failed:", err);
  process.exit(1);
});
