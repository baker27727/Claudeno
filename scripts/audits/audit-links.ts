// audit-links — fails if any external link referenced from content/ returns
// a 4xx/5xx status (with an exceptions list for known-flaky hosts).
// BLUEPRINT §8.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { CONTENT_ROOT, fail, pass, readYaml } from "./_util.ts";

// Hosts that are known to block bots / rate-limit CI, or are intentionally
// non-resolvable placeholders. Extend as needed — keep entries justified.
const EXCEPTIONS = [
  /^https:\/\/claudecode\.no/, // production domain, not live yet
  /^https:\/\/learnclaude\.dev/, // alternate domain candidate, not live
  /^https:\/\/mcp\.notion\.com\/mcp/, // authenticated MCP endpoint, 401s without a token (expected, not a dead link)
  /^https:\/\/mcp\.stripe\.com/, // authenticated MCP endpoint, 404s on plain GET/HEAD without an MCP client (expected, not a dead link)
];

const URL_RE = /\bhttps?:\/\/[^\s)\]"'>]+/g;

function isExempt(url: string): boolean {
  return EXCEPTIONS.some((re) => re.test(url));
}

// content/snapshots/ is an internal diff-cache — a raw mirror of upstream's
// own changelog text used by watch-upstream.ts to detect changes. It's never
// published, so links inside it (which can include Anthropic's own stale or
// bot-gated historical release URLs) shouldn't gate our publish pipeline.
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

function collectUrls(): Set<string> {
  const urls = new Set<string>();

  for (const file of walkFiles(CONTENT_ROOT, [".mdx", ".md"])) {
    const text = readFileSync(file, "utf-8");
    for (const m of text.matchAll(URL_RE)) urls.add(m[0]);
  }

  const changelogPath = join(CONTENT_ROOT, "changelog.yaml");
  try {
    const changelog = readYaml<Array<{ sources?: string[] }>>(changelogPath);
    for (const entry of changelog) {
      for (const src of entry.sources ?? []) urls.add(src);
    }
  } catch {
    // no changelog.yaml — nothing to add
  }

  return urls;
}

async function checkUrl(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
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

const urls = [...collectUrls()].filter((u) => !isExempt(u));
const results = await Promise.all(urls.map(checkUrl));
const errors = results.filter((r): r is string => Boolean(r));

if (errors.length > 0) fail("audit-links", errors);
pass(`audit-links (checked ${urls.length} links)`);
