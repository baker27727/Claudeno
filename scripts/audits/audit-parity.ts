// audit-parity — fails if any "en" value lacks its "no" counterpart (or vice
// versa) in any content file, or a module is missing en.mdx/no.mdx.
// BLUEPRINT §4 / §8.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
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

// §9: منشورات المدونة frontmatter ثنائي اللغة (title/description). نستخرج
// الـ frontmatter (ما بين أول سطرين "---") ونمرّره عبر نفس قواعد التكافؤ.
if (existsSync(BLOG_ROOT)) {
  const posts = readdirSync(BLOG_ROOT).filter(
    (name) => name.endsWith(".md") || name.endsWith(".mdx"),
  );
  for (const name of posts) {
    const path = join(BLOG_ROOT, name);
    if (!statSync(path).isFile()) continue;
    const source = readFileSync(path, "utf-8");
    const fm = extractFrontmatter(source);
    if (!fm) {
      errors.push(`blog/${name}: missing or malformed frontmatter (expected leading "---" block)`);
      continue;
    }
    let parsed: unknown;
    try {
      parsed = parseYaml(fm);
    } catch (err) {
      errors.push(`blog/${name}: frontmatter is not valid YAML (${(err as Error).message})`);
      continue;
    }
    walkBilingualParity(parsed, `blog/${name}`, errors);
  }
}

if (errors.length > 0) fail("audit-parity", errors);
pass("audit-parity");

/**
 * يستخرج كتلة YAML frontmatter (ما بين أول سطرين "---" في بداية الملف).
 * يعيد `null` لو لم يبدأ الملف بـ "---".
 */
function extractFrontmatter(source: string): string | null {
  // تقليم BOM أو مسافات بيضاء بادئة.
  const trimmed = source.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---")) return null;
  const rest = trimmed.slice(3);
  // السطر التالي يجب أن يكون newline ثم محتوى ثم "---" على سطر مستقل.
  if (!rest.startsWith("\n") && !rest.startsWith("\r")) return null;
  const closeRe = /\r?\n---\r?\n/;
  const match = rest.match(closeRe);
  if (!match || match.index === undefined) return null;
  return rest.slice(0, match.index);
}
