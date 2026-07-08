// seo:links — every internal href in the built site must resolve to a real
// page (catches broken links AND trailing-slash mismatches, since with
// trailingSlash:"always" only the slash form maps to a real dist/ file).
// Also flags any internal link that's accidentally http:// instead of https.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { walkHtmlFiles, HREF_RE, DIST, printReport, type Finding } from "./_util.ts";

const SITE_URL = "https://claude.mutaz.no";

function isInternal(href: string): boolean {
  if (href.startsWith(SITE_URL)) return true;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  return false;
}

function toPathname(href: string): string {
  return href.startsWith(SITE_URL) ? href.slice(SITE_URL.length) || "/" : href;
}

/** Does a URL path resolve to a real file in dist/? */
function resolves(pathname: string): boolean {
  const clean = pathname.split("#")[0].split("?")[0];
  if (clean === "/") return existsSync(join(DIST, "index.html"));
  if (clean.endsWith("/")) return existsSync(join(DIST, clean.slice(1), "index.html"));
  // Non-slash internal paths are only valid for real static files (favicon, robots.txt, og images).
  return existsSync(join(DIST, clean.slice(1)));
}

const NOINDEX_RE = /<meta\s+name="robots"\s+content="[^"]*noindex/;

export function run(): Finding[] {
  // The 404 page self-references a synthetic (non-routable) "/404/" URL in
  // its own canonical/hreflang tags — harmless since it's noindex, not a
  // link a visitor could click. Same exclusion as validate-metadata.ts.
  const pages = walkHtmlFiles().filter((p) => !NOINDEX_RE.test(p.html));
  const findings: Finding[] = [];

  for (const { html, urlPath } of pages) {
    const hrefs = [...html.matchAll(HREF_RE)].map((m) => m[1]);
    for (const href of hrefs) {
      if (href.startsWith(`http://${new URL(SITE_URL).host}`)) {
        findings.push({ page: urlPath, issue: `internal link uses http:// instead of https://: ${href}` });
        continue;
      }
      if (!isInternal(href)) continue;
      const pathname = toPathname(href);
      if (!resolves(pathname)) {
        findings.push({ page: urlPath, issue: `broken internal link: ${href}` });
      }
    }
  }

  return findings;
}

const findings = run();
printReport("seo:links", findings);
if (findings.length > 0) process.exit(1);
