// Shared helpers for the SEO validation scripts (npm run seo:*).
// Operate on the built dist/ output (the actual ground truth a crawler
// sees), not source .astro files — deliberately dependency-light (regex over
// raw HTML) to match scripts/audits/_util.ts's philosophy: no new parser
// dependency for a handful of well-known, simple tag shapes.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT = process.cwd();
export const DIST = join(ROOT, "dist");

export interface PageDoc {
  /** Path to the .html file, relative to dist/. */
  relPath: string;
  /** URL path this file is served at, e.g. "/no/learn/". */
  urlPath: string;
  html: string;
}

/** Directories under dist/ that aren't page routes (assets, search index). */
const SKIP_DIRS = new Set(["pagefind", "og", "_astro"]);

export function walkHtmlFiles(dir: string = DIST): PageDoc[] {
  if (!existsSync(dir)) {
    throw new Error(`dist/ not found at ${dir} — run \`npm run build\` first`);
  }
  const out: PageDoc[] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (current === DIST && SKIP_DIRS.has(name)) continue;
        walk(full);
      } else if (name.endsWith(".html")) {
        const relPath = relative(DIST, full);
        const urlPath = htmlPathToUrl(relPath);
        out.push({ relPath, urlPath, html: readFileSync(full, "utf-8") });
      }
    }
  };
  walk(dir);
  return out;
}

/** "no/learn/index.html" -> "/no/learn/"; "404.html" -> "/404.html" (kept as-is, not a route). */
function htmlPathToUrl(relPath: string): string {
  if (relPath === "404.html") return "/404.html";
  if (relPath.endsWith("/index.html")) return `/${relPath.slice(0, -"index.html".length)}`;
  if (relPath === "index.html") return "/";
  return `/${relPath}`;
}

export function extractTag(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m?.[1];
}

export function extractAllTags(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => m[1]);
}

/** Does a site-relative URL path (or a full https://SITE_URL/... URL) resolve to a real file in dist/? */
export function resolvesToPage(pathnameOrUrl: string, siteUrl = "https://claude.mutaz.no"): boolean {
  const pathname = pathnameOrUrl.startsWith(siteUrl) ? pathnameOrUrl.slice(siteUrl.length) || "/" : pathnameOrUrl;
  const clean = pathname.split("#")[0].split("?")[0];
  if (clean === "/") return existsSync(join(DIST, "index.html"));
  if (clean.endsWith("/")) return existsSync(join(DIST, clean.slice(1), "index.html"));
  return existsSync(join(DIST, clean.slice(1)));
}

export const TITLE_RE = /<title>([^<]*)<\/title>/;
export const DESCRIPTION_RE = /<meta\s+name="description"\s+content="([^"]*)"/;
export const CANONICAL_RE = /<link\s+rel="canonical"\s+href="([^"]*)"/;
export const HREFLANG_RE = /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]*)"/g;
export const H1_RE = /<h1[\s>]/g;
export const IMG_RE = /(<img\b[^>]*>)/g;
export const JSONLD_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
export const HREF_RE = /\shref="([^"]+)"/g;

export interface Finding {
  page: string; // urlPath
  issue: string;
}

export function printReport(scriptName: string, findings: Finding[]): void {
  if (findings.length === 0) {
    console.log(`✓ ${scriptName} passed`);
    return;
  }
  console.error(`\n✗ ${scriptName} found ${findings.length} problem(s):\n`);
  for (const f of findings) {
    console.error(`  - ${f.page}: ${f.issue}`);
  }
  console.error("");
}
