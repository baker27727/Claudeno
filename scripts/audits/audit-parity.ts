// audit-parity — fails if any "en" value lacks its "no" counterpart (or vice
// versa) in any content file, or a module/blog post is missing its en/no
// counterpart file. BLUEPRINT §4 / §8.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_ROOT, fail, listModuleDirs, pass, readYaml, walkBilingualParity } from "./_util.ts";

const BLOG_ROOT = join(CONTENT_ROOT, "blog");

const errors: string[] = [];

for (const mod of listModuleDirs()) {
  const enPath = join(mod.path, "en.mdx");
  const noPath = join(mod.path, "no.mdx");
  if (existsSync(enPath) !== existsSync(noPath)) {
    errors.push(`${mod.slug}: has ${existsSync(enPath) ? "en.mdx" : "no.mdx"} but not its counterpart`);
  }

  for (const file of ["meta.yaml", "terminal.yaml", "quiz.yaml"]) {
    const path = join(mod.path, file);
    if (!existsSync(path)) {
      errors.push(`${mod.slug}: missing ${file}`);
      continue;
    }
    walkBilingualParity(readYaml(path), `${mod.slug}/${file}`, errors);
  }
}

for (const file of ["glossary.yaml", "catalog.yaml", "changelog.yaml"]) {
  const path = join(CONTENT_ROOT, file);
  if (existsSync(path)) {
    walkBilingualParity(readYaml(path), file, errors);
  }
}

// Blog posts: each post directory (content/blog/<slug>/) must have both
// en.md and no.md, the same pattern used for module lessons above — never a
// single bilingual file (that used to render both languages stacked on one
// page, which was a real SEO/readability bug).
if (existsSync(BLOG_ROOT)) {
  const postDirs = readdirSync(BLOG_ROOT).filter((name) => statSync(join(BLOG_ROOT, name)).isDirectory());
  for (const dir of postDirs) {
    const postPath = join(BLOG_ROOT, dir);
    const hasEn = existsSync(join(postPath, "en.md")) || existsSync(join(postPath, "en.mdx"));
    const hasNo = existsSync(join(postPath, "no.md")) || existsSync(join(postPath, "no.mdx"));
    if (hasEn !== hasNo) {
      errors.push(`blog/${dir}: has ${hasEn ? "en" : "no"} but is missing its ${hasEn ? "no" : "en"} counterpart`);
    }
  }
}

if (errors.length > 0) fail("audit-parity", errors);
pass("audit-parity");
