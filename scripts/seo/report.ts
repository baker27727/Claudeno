// seo:report — human-readable summary combining seo:validate + seo:links +
// seo:sitemap, plus basic stats. Does not exit non-zero (that's what the
// individual seo:* scripts and seo:audit are for) — this is for reading.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { walkHtmlFiles, DIST, TITLE_RE, DESCRIPTION_RE, extractTag } from "./_util.ts";
import { run as validateMetadata } from "./validate-metadata.ts";
import { run as validateLinks } from "./validate-links.ts";
import { run as validateSitemap } from "./validate-sitemap.ts";

const pages = walkHtmlFiles().filter((p) => p.urlPath !== "/404.html");
const titleLengths = pages.map((p) => extractTag(p.html, TITLE_RE)?.length ?? 0).filter((n) => n > 0);
const descLengths = pages.map((p) => extractTag(p.html, DESCRIPTION_RE)?.length ?? 0).filter((n) => n > 0);
const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);

const sitemapFiles = readdirSync(DIST).filter((f) => f.startsWith("sitemap") && f.endsWith(".xml") && f !== "sitemap-index.xml");
const sitemapUrlCount = sitemapFiles.reduce((sum, f) => {
  const xml = readFileSync(join(DIST, f), "utf-8");
  return sum + (xml.match(/<loc>/g)?.length ?? 0);
}, 0);

const metadataFindings = validateMetadata();
const linkFindings = validateLinks();
const sitemapFindings = validateSitemap();

console.log("# SEO report — claude.mutaz.no\n");
console.log(`Generated: ${new Date().toISOString()}\n`);
console.log("## Stats\n");
console.log(`- Pages built (excl. 404): ${pages.length}`);
console.log(`- Average title length: ${avg(titleLengths)} chars`);
console.log(`- Average meta description length: ${avg(descLengths)} chars`);
console.log(`- Sitemap URLs: ${sitemapUrlCount}`);
console.log();
console.log("## Validation results\n");
console.log(`- seo:validate (metadata/H1/alt/JSON-LD): ${metadataFindings.length === 0 ? "PASS" : `FAIL (${metadataFindings.length} issue(s))`}`);
console.log(`- seo:links (internal link integrity): ${linkFindings.length === 0 ? "PASS" : `FAIL (${linkFindings.length} issue(s))`}`);
console.log(`- seo:sitemap (sitemap correctness): ${sitemapFindings.length === 0 ? "PASS" : `FAIL (${sitemapFindings.length} issue(s))`}`);
console.log();

const allFindings = [...metadataFindings, ...linkFindings, ...sitemapFindings];
if (allFindings.length > 0) {
  console.log("## Issues\n");
  for (const f of allFindings) {
    console.log(`- **${f.page}**: ${f.issue}`);
  }
} else {
  console.log("No issues found.");
}
