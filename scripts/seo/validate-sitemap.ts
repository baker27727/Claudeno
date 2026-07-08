// seo:sitemap — validates the built sitemap: every <loc> is https, on the
// production domain, resolves to a real built page, has no duplicates, and
// the noindex root "/" is correctly excluded.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DIST, printReport, type Finding } from "./_util.ts";

const SITE_URL = "https://claude.mutaz.no";
const LOC_RE = /<loc>([^<]+)<\/loc>/g;

function resolves(pathname: string): boolean {
  if (pathname === "/") return existsSync(join(DIST, "index.html"));
  if (pathname.endsWith("/")) return existsSync(join(DIST, pathname.slice(1), "index.html"));
  return existsSync(join(DIST, pathname.slice(1)));
}

export function run(): Finding[] {
  const findings: Finding[] = [];

  // sitemap-index.xml's <loc> entries point at other sitemap*.xml files, not
  // pages — only validate the actual page-listing sitemap(s).
  const sitemapFiles = readdirSync(DIST).filter(
    (f) => f.startsWith("sitemap") && f.endsWith(".xml") && f !== "sitemap-index.xml",
  );
  if (sitemapFiles.length === 0) {
    return [{ page: "sitemap", issue: "no sitemap-*.xml found in dist/ — check @astrojs/sitemap ran" }];
  }

  const seen = new Map<string, string>(); // loc -> which sitemap file

  for (const file of sitemapFiles) {
    const xml = readFileSync(join(DIST, file), "utf-8");
    const locs = [...xml.matchAll(LOC_RE)].map((m) => m[1]);

    for (const loc of locs) {
      if (loc.startsWith("http://")) {
        findings.push({ page: file, issue: `sitemap entry uses http:// instead of https://: ${loc}` });
      } else if (!loc.startsWith(SITE_URL)) {
        findings.push({ page: file, issue: `sitemap entry not on ${SITE_URL}: ${loc}` });
      }

      const pathname = loc.startsWith(SITE_URL) ? loc.slice(SITE_URL.length) || "/" : loc;
      if (pathname === "/") {
        findings.push({ page: file, issue: `noindex root "/" must not appear in sitemap: ${loc}` });
      } else if (!resolves(pathname)) {
        findings.push({ page: file, issue: `sitemap entry has no matching built page: ${loc}` });
      }

      if (seen.has(loc)) {
        findings.push({ page: file, issue: `duplicate sitemap entry (also in ${seen.get(loc)}): ${loc}` });
      } else {
        seen.set(loc, file);
      }
    }
  }

  return findings;
}

const findings = run();
printReport("seo:sitemap", findings);
if (findings.length > 0) process.exit(1);
