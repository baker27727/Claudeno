// link-rot — external link guardian.
// BLUEPRINT: autonomous-content-ops-blueprint.md §3.3.
//
// Checks every external link in the content. A link must fail in two
// consecutive runs before it is declared dead (snapshot prevents false alarms).
// Confirmed dead links are either auto-replaced via Claude (if an official
// redirect exists) or escalated via a GitHub issue.
//
// Dry-run safe: without GH_TOKEN it reports what it would do but does not
// create issues; without a git repo it writes file fixes to disk but does not
// commit.

import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { verifyAndPublish, assertTokenBudget, type TokenUsage } from "../_auto-publish.ts";
import { CONTENT_ROOT } from "./_util.ts";

const SNAPSHOT_PATH = join(process.cwd(), "content/snapshots/link-rot-failures.json");
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const EXCEPTIONS = [
  /^https:\/\/claudecode\.no/,
  /^https:\/\/learnclaude\.dev/,
  /^https:\/\/mcp\.notion\.com\/mcp/,
  /^https:\/\/mcp\.stripe\.com/,
  /^https:\/\/example\.com/,
];

const URL_RE = /\bhttps?:\/\/[^\s)\]"'>]+/g;

interface FailureRecord {
  url: string;
  firstFailed: string;
  lastFailed: string;
}

interface ReplacementResult {
  replacement: string | null;
  reasoning: string;
}

const REPLACEMENT_TOOL = {
  name: "record_link_replacement",
  description: "Suggest an official replacement URL for a dead external link, or null if none is known.",
  input_schema: {
    type: "object",
    properties: {
      replacement: { type: ["string", "null"], description: "The new official URL, or null if no replacement is known." },
      reasoning: { type: "string" },
    },
    required: ["replacement", "reasoning"],
  },
} as const;

function isExempt(url: string): boolean {
  return EXCEPTIONS.some((re) => re.test(url));
}

const SKIP_DIRS = new Set(["snapshots"]);

function walkFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkFiles(path, exts));
    else if (exts.includes(extname(name))) out.push(path);
  }
  return out;
}

function collectLinks(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const file of walkFiles(CONTENT_ROOT, [".mdx", ".md"])) {
    const text = readFileSync(file, "utf-8");
    for (const m of text.matchAll(URL_RE)) {
      const url = m[0];
      if (isExempt(url)) continue;
      if (!map.has(url)) map.set(url, []);
      map.get(url)!.push(file);
    }
  }
  return map;
}

async function checkUrl(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    if (res.status >= 400) return `${url}: HTTP ${res.status}`;
    return undefined;
  } catch (err) {
    return `${url}: ${(err as Error).message}`;
  } finally {
    clearTimeout(timeout);
  }
}

function loadFailures(): FailureRecord[] {
  if (!existsSync(SNAPSHOT_PATH)) return [];
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as FailureRecord[];
  } catch {
    return [];
  }
}

function saveFailures(failures: FailureRecord[]) {
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(failures, null, 2) + "\n", "utf-8");
}

async function resolveRedirectChain(url: string, maxHops = 10): Promise<string | undefined> {
  let current = url;
  for (let hop = 0; hop < maxHops; hop++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      let res = await fetch(current, { method: "HEAD", redirect: "manual", signal: controller.signal });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(current, { method: "GET", redirect: "manual", signal: controller.signal });
      }
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return undefined;
        current = new URL(location, current).toString();
        continue;
      }
      return current === url ? undefined : current;
    } catch {
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }
  return undefined;
}

async function findReplacement(url: string, files: string[]): Promise<ReplacementResult> {
  // 1. Follow the real HTTP redirect chain first (deterministic and free).
  const redirectTarget = await resolveRedirectChain(url);
  if (redirectTarget) {
    const verified = await checkUrl(redirectTarget);
    if (!verified) {
      return { replacement: redirectTarget, reasoning: "followed actual HTTP redirect chain" };
    }
    console.log(`    redirect chain for ${url} ended at ${redirectTarget}, but target still fails: ${verified}`);
  }

  // 2. Fall back to the model only when there is no deterministic redirect.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { replacement: null, reasoning: "ANTHROPIC_API_KEY not set" };

  const prompt = `A link on a Claude Code learning site is dead. Suggest the official replacement if one exists.

Dead URL: ${url}
Appears in files: ${files.join(", ")}

Return the new URL only if you are confident it is the official redirect or moved documentation. If unsure, return null.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      tools: [REPLACEMENT_TOOL],
      tool_choice: { type: "tool", name: REPLACEMENT_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    console.warn(`Claude API error for link replacement: HTTP ${res.status}`);
    return { replacement: null, reasoning: "API error" };
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; input?: unknown }>;
    usage: TokenUsage;
  };
  assertTokenBudget(data.usage);
  const toolUse = data.content.find((block) => block.type === "tool_use");
  if (!toolUse?.input) return { replacement: null, reasoning: "No tool_use block" };
  const candidate = toolUse.input as ReplacementResult;

  // 3. Every replacement — deterministic or model-suggested — must be live-checked.
  if (candidate.replacement) {
    const verified = await checkUrl(candidate.replacement);
    if (verified) {
      console.log(`    suggested replacement ${candidate.replacement} failed live check: ${verified}`);
      return { replacement: null, reasoning: `suggested replacement failed live check: ${verified}` };
    }
  }

  return candidate;
}

function replaceUrlInFiles(oldUrl: string, newUrl: string, files: string[]) {
  for (const file of files) {
    const text = readFileSync(file, "utf-8");
    const updated = text.replaceAll(oldUrl, newUrl);
    if (updated !== text) writeFileSync(file, updated, "utf-8");
  }
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
      execFileSync("gh", ["issue", "create", "--title", title, "--label", "automation-failure,link-rot", "--body", body]);
      console.log(`[issue] created: ${title}`);
    }
  } catch (err) {
    console.error(`[issue] failed: ${(err as Error).message}`);
  }
}

async function main() {
  const linkMap = collectLinks();
  const urls = [...linkMap.keys()];
  console.log(`Checking ${urls.length} external link(s)…`);

  const results = await Promise.all(urls.map((url) => checkUrl(url)));
  const failedNow = new Set<string>();
  for (let i = 0; i < urls.length; i++) {
    if (results[i]) {
      console.warn(`  ✗ ${results[i]}`);
      failedNow.add(urls[i]);
    }
  }

  const previousFailures = loadFailures();
  const previousByUrl = new Map(previousFailures.map((f) => [f.url, f]));
  const nextFailures: FailureRecord[] = [];
  const replacements: Array<{ oldUrl: string; newUrl: string; files: string[]; reasoning: string }> = [];
  const unresolved: Array<{ url: string; files: string[] }> = [];

  for (const url of urls) {
    if (failedNow.has(url)) {
      const prev = previousByUrl.get(url);
      const today = new Date().toISOString().slice(0, 10);
      if (prev) {
        // Confirmed dead in two consecutive runs.
        console.log(`  ⚠ confirmed dead (2 runs): ${url}`);
        const result = await findReplacement(url, linkMap.get(url)!);
        if (result.replacement) {
          console.log(`    → auto-replacing with ${result.replacement}`);
          replaceUrlInFiles(url, result.replacement, linkMap.get(url)!);
          replacements.push({ oldUrl: url, newUrl: result.replacement, files: linkMap.get(url)!, reasoning: result.reasoning });
        } else {
          unresolved.push({ url, files: linkMap.get(url)! });
          nextFailures.push({ ...prev, lastFailed: today });
        }
      } else {
        // First failure — record but do not act yet.
        nextFailures.push({ url, firstFailed: today, lastFailed: today });
      }
    }
  }

  // Keep records for URLs that failed previously but are now passing? No,
  // a passing URL resets the counter. We only persist currently-failing URLs.
  let stateChanged = false;
  if (nextFailures.length > 0) {
    saveFailures(nextFailures);
    stateChanged = true;
  } else if (existsSync(SNAPSHOT_PATH)) {
    // Clean up an empty snapshot so it doesn't linger as untracked noise.
    unlinkSync(SNAPSHOT_PATH);
    stateChanged = true;
  }

  if (replacements.length === 0 && unresolved.length === 0 && !stateChanged) {
    console.log("No confirmed dead links to fix.");
    return;
  }

  for (const { url, files } of unresolved) {
    openIssue(
      `🔴 Dead external link: ${url}`,
      `The link \`${url}\` failed in two consecutive link-rot runs and no official replacement was found.\n\nFiles:\n${files.map((f) => `- ${f}`).join("\n")}`,
    );
  }

  const touchedPaths: string[] = [];
  if (stateChanged) touchedPaths.push(SNAPSHOT_PATH);

  if (replacements.length > 0) {
    touchedPaths.push(...replacements.flatMap((r) => r.files));
    const uniquePaths = [...new Set(touchedPaths)];
    const result = await verifyAndPublish({
      commitMessage: `content: replace ${replacements.length} dead external link(s)`,
      paths: uniquePaths,
      fallbackBranchPrefix: "auto/link-rot",
      prTitle: `Link rot: ${replacements.length} auto-replaced link(s)`,
      prBody: replacements
        .map((r) => `- \`${r.oldUrl}\` → \`${r.newUrl}\`\n  Files: ${r.files.join(", ")}\n  Reasoning: ${r.reasoning}`)
        .join("\n\n"),
    });
    console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
    if (result.published && !result.deployTriggered) process.exit(1);
  } else if (stateChanged) {
    // The snapshot changed (first failures recorded, or all failures recovered).
    const result = await verifyAndPublish({
      commitMessage: "content: update link-rot failure tracking",
      paths: touchedPaths,
      fallbackBranchPrefix: "auto/link-rot",
      prTitle: "Link rot: update failure-tracking snapshot",
      prBody: `Updated \`${SNAPSHOT_PATH}\` with the latest external-link check results.`,
    });
    console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  }
}

main().catch((err) => {
  console.error("link-rot failed:", err);
  process.exit(1);
});
