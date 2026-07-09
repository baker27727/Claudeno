// seo:validate — checks every built page's on-page SEO fundamentals:
// unique title/description, canonical correctness, hreflang completeness,
// exactly one H1, no images missing alt, and valid JSON-LD syntax.
// Runs against dist/ (post-build), since that's what a crawler actually sees.

import {
  walkHtmlFiles,
  extractTag,
  extractAllTags,
  resolvesToPage,
  TITLE_RE,
  DESCRIPTION_RE,
  CANONICAL_RE,
  HREFLANG_RE,
  H1_RE,
  IMG_RE,
  JSONLD_RE,
  printReport,
  type Finding,
} from "./_util.ts";

const SITE_URL = "https://claude.mutaz.no";
const TITLE_MAX = 65; // Google typically truncates well before 70 chars.
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 160;

const NOINDEX_RE = /<meta\s+name="robots"\s+content="[^"]*noindex/;

export function run(): Finding[] {
  // 404 and noindex pages (e.g. the "/" language-detect redirect stub) are
  // intentionally excluded from search results — checking their title/H1/
  // duplicate-content status would just be noise, not a real SEO problem.
  const pages = walkHtmlFiles().filter((p) => p.urlPath !== "/404.html" && !NOINDEX_RE.test(p.html));
  const findings: Finding[] = [];

  const titles = new Map<string, string[]>(); // title -> pages
  const descriptions = new Map<string, string[]>();

  for (const page of pages) {
    const { html, urlPath } = page;

    // --- title ---
    const title = extractTag(html, TITLE_RE);
    if (!title) {
      findings.push({ page: urlPath, issue: "missing <title>" });
    } else {
      if (title.length > TITLE_MAX) {
        findings.push({ page: urlPath, issue: `title is ${title.length} chars (recommended ≤${TITLE_MAX}): "${title}"` });
      }
      titles.set(title, [...(titles.get(title) ?? []), urlPath]);
    }

    // --- description ---
    const description = extractTag(html, DESCRIPTION_RE);
    if (!description) {
      findings.push({ page: urlPath, issue: "missing meta description" });
    } else {
      if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
        findings.push({
          page: urlPath,
          issue: `description is ${description.length} chars (recommended ${DESCRIPTION_MIN}-${DESCRIPTION_MAX})`,
        });
      }
      descriptions.set(description, [...(descriptions.get(description) ?? []), urlPath]);
    }

    // --- canonical ---
    const canonical = extractTag(html, CANONICAL_RE);
    if (!canonical) {
      findings.push({ page: urlPath, issue: "missing canonical link" });
    } else if (!canonical.startsWith(SITE_URL)) {
      findings.push({ page: urlPath, issue: `canonical does not start with ${SITE_URL}: ${canonical}` });
    } else if (canonical.startsWith("http://")) {
      findings.push({ page: urlPath, issue: `canonical uses http://, not https://: ${canonical}` });
    }

    // --- hreflang (only for locale-prefixed pages) ---
    // Not a strict "en+no+x-default always present" check: a page (e.g. a
    // guide not yet translated) may legitimately exist in only one locale —
    // Base.astro's availableLocales prop omits the untranslated tag rather
    // than pointing hreflang at a page that doesn't exist. So instead this
    // requires x-default plus at least one locale, and — more rigorously
    // than before — verifies every hreflang tag actually present resolves to
    // a real built page, which the old all-three-required check never did.
    if (/^\/(en|no)\//.test(urlPath)) {
      const pairs = [...html.matchAll(HREFLANG_RE)].map((m) => ({ lang: m[1], href: m[2] }));
      if (!pairs.some((p) => p.lang === "x-default")) {
        findings.push({ page: urlPath, issue: 'missing hreflang="x-default"' });
      }
      if (!pairs.some((p) => p.lang === "en" || p.lang === "no")) {
        findings.push({ page: urlPath, issue: "no locale hreflang tags found (expected en and/or no)" });
      }
      for (const p of pairs) {
        if (p.href.startsWith("http://")) {
          findings.push({ page: urlPath, issue: `hreflang="${p.lang}" uses http://: ${p.href}` });
        } else if (!resolvesToPage(p.href, SITE_URL)) {
          findings.push({ page: urlPath, issue: `hreflang="${p.lang}" points to a page that doesn't exist: ${p.href}` });
        }
      }
    }

    // --- exactly one H1 ---
    const h1Count = [...html.matchAll(H1_RE)].length;
    if (h1Count === 0) {
      findings.push({ page: urlPath, issue: "no <h1> found" });
    } else if (h1Count > 1) {
      findings.push({ page: urlPath, issue: `${h1Count} <h1> tags found (expected 1)` });
    }

    // --- images missing alt entirely (alt="" for decorative is fine) ---
    for (const imgTag of extractAllTags(html, IMG_RE)) {
      if (!/\salt=/.test(imgTag)) {
        findings.push({ page: urlPath, issue: `<img> missing alt attribute: ${imgTag.slice(0, 80)}` });
      }
    }

    // --- JSON-LD syntax ---
    for (const block of [...html.matchAll(JSONLD_RE)].map((m) => m[1])) {
      try {
        JSON.parse(block);
      } catch (err) {
        findings.push({ page: urlPath, issue: `invalid JSON-LD: ${(err as Error).message}` });
      }
    }
  }

  // --- duplicate titles/descriptions across pages ---
  for (const [title, urls] of titles) {
    if (urls.length > 1) {
      findings.push({ page: urls.join(", "), issue: `duplicate title across ${urls.length} pages: "${title}"` });
    }
  }
  for (const [desc, urls] of descriptions) {
    if (urls.length > 1) {
      findings.push({
        page: urls.join(", "),
        issue: `duplicate meta description across ${urls.length} pages: "${desc.slice(0, 60)}..."`,
      });
    }
  }

  return findings;
}

const findings = run();
printReport("seo:validate", findings);
if (findings.length > 0) process.exit(1);
