// _blog-gen — مساعد لتوليد منشورات مدونة "What's new in vX.Y.Z" (§2 + §9 من
// المخطّط). يُستدعى من scripts/generate-update.ts بعد كل تحديث إصدار upstream.
//
// المنشور يُنشر مباشرة (draft=false) لأن الناشر (scripts/_auto-publish.ts)
// لا يدفعه إلى main إلا بعد اجتياز `npm run check && npm run audit && npm
// run build` كاملة — الفحص الآلي هو شرط النشر، لا مراجعة بشرية. لو فشل أي
// فحص، يفتح generate-update.ts طلب سحب بدل النشر مباشرة.
//
// الملف:
//   - في content/blog/${version}-whats-new.md
//   - frontmatter: title/description ثنائي اللغة، pubDate=الآن ISO، tags، sources
//   - الجسم يحتوي قسمين لكل لغة (## English / ## Norsk)
//
// هذه الدالة idempotent: لو كان الملف موجودًا مسبقًا (مثلًا حرّره أحد لاحقًا)،
// تكتفي بإرجاع مساره دون استبدال.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CONTENT_ROOT = join(process.cwd(), "content");
const BLOG_DIR = join(CONTENT_ROOT, "blog");

/**
 * كتابة مسودة منشور مدونة لـ"What's new in vX.Y.Z".
 *
 * @param version  إصدار Claude Code (مثلاً "2.1.0")
 * @param en       فقرة موجزة بالإنجليزية
 * @param no       فقرة موجزة بالنرويجية
 * @param sources  مصادر upstream التي بُنيت عليها الفقرتان
 * @returns        المسار الكامل للملف الذي كُتب (أو كان موجودًا)
 */
export async function generateWhatsNewPost(
  version: string,
  en: string,
  no: string,
  sources: string[] = [],
): Promise<string> {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`generateWhatsNewPost: invalid semver version "${version}"`);
  }

  const filename = `${version}-whats-new.md`;
  const fullPath = join(BLOG_DIR, filename);

  if (!existsSync(BLOG_DIR)) {
    mkdirSync(BLOG_DIR, { recursive: true });
  }

  // idempotency: لا تستبدل ملفًا موجودًا (قد يكون حُرِّر لاحقًا).
  if (existsSync(fullPath)) {
    console.log(`[blog-gen] ${filename} already exists — skipping`);
    return fullPath;
  }

  const pubDate = new Date().toISOString();
  const sourcesYaml = sources
    .map((s) => `      - "${s.replace(/"/g, '\\"')}"`)
    .join("\n");

  // ترويسة YAML تُحترم المخطط في src/content.config.ts:
  // title/description bilingual، draft=true افتراضيًا، pubDate ISO datetime.
  const body = `---
title:
  en: "What's new in Claude Code v${version}"
  no: "Nytt i Claude Code v${version}"
description:
  en: ${JSON.stringify(en)}
  no: ${JSON.stringify(no)}
pubDate: "${pubDate}"
author: "Claude Code Learn"
tags:
  - "changelog"
  - "release"
${sources.length > 0 ? `sources:\n${sourcesYaml}\n` : ""}draft: false
---

## English

${en.trim()}

${sources.length > 0 ? `**Sources:**\n${sources.map((s) => `- ${s}`).join("\n")}\n` : ""}
## Norsk

${no.trim()}

${sources.length > 0 ? `**Kilder:**\n${sources.map((s) => `- ${s}`).join("\n")}\n` : ""}
`;

  writeFileSync(fullPath, body, "utf-8");
  console.log(`[blog-gen] wrote draft ${fullPath}`);
  return fullPath;
}