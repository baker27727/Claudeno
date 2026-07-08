// _blog-gen — مساعد لتوليد منشورات مدونة "What's new in vX.Y.Z" (§2 + §9 من
// المخطّط). يُستدعى من scripts/generate-update.ts بعد كل تحديث إصدار upstream.
//
// المنشور يُنشر مباشرة (draft=false) لأن الناشر (scripts/_auto-publish.ts)
// لا يدفعه إلى main إلا بعد اجتياز `npm run check && npm run audit && npm
// run build` كاملة — الفحص الآلي هو شرط النشر، لا مراجعة بشرية. لو فشل أي
// فحص، يفتح generate-update.ts طلب سحب بدل النشر مباشرة.
//
// البنية: content/blog/<slug>/{en,no}.md — ملف منفصل لكل لغة (نفس نمط دروس
// الوحدة)، وليس ملفًا واحدًا يحوي القسمين. الـ slug يستبدل نقاط الإصدار
// بشرطات (2.1.204 -> 2-1-204) لأن Astro يُسقط النقاط عند توليد الـ slug من
// اسم الملف افتراضيًا (كان ينتج "21204" غير مفهوم — مشكلة SEO حقيقية).
//
// هذه الدالة idempotent: لو كان مجلّد المنشور موجودًا مسبقًا، تكتفي بإرجاع
// مساره دون استبدال.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CONTENT_ROOT = join(process.cwd(), "content");
const BLOG_DIR = join(CONTENT_ROOT, "blog");

export function slugForVersion(version: string): string {
  return `v${version.replace(/\./g, "-")}-whats-new`;
}

function frontmatter(opts: {
  title: string;
  description: string;
  pubDate: string;
  sources: string[];
}): string {
  const sourcesYaml = opts.sources.map((s) => `      - "${s.replace(/"/g, '\\"')}"`).join("\n");
  return `---
title: ${JSON.stringify(opts.title)}
description: ${JSON.stringify(opts.description)}
pubDate: "${opts.pubDate}"
author: "Claude Code Learn"
tags:
  - "changelog"
  - "release"
${opts.sources.length > 0 ? `sources:\n${sourcesYaml}\n` : ""}draft: false
---`;
}

/**
 * كتابة مسودة منشور مدونة لـ"What's new in vX.Y.Z" — ملف en.md وملف no.md
 * منفصلان تحت content/blog/<slug>/.
 *
 * @param version  إصدار Claude Code (مثلاً "2.1.0")
 * @param en       فقرة موجزة بالإنجليزية
 * @param no       فقرة موجزة بالنرويجية
 * @param sources  مصادر upstream التي بُنيت عليها الفقرتان
 * @returns        مسار مجلّد المنشور الذي كُتب (أو كان موجودًا)
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

  const slug = slugForVersion(version);
  const postDir = join(BLOG_DIR, slug);

  // idempotency: لا تستبدل مجلّدًا موجودًا (قد يكون حُرِّر لاحقًا).
  if (existsSync(postDir)) {
    console.log(`[blog-gen] ${slug} already exists — skipping`);
    return postDir;
  }

  mkdirSync(postDir, { recursive: true });

  const pubDate = new Date().toISOString();

  const enFile = `${frontmatter({
    title: `What's new in Claude Code v${version}`,
    description: en.trim(),
    pubDate,
    sources,
  })}

${en.trim()}
${sources.length > 0 ? `\n**Sources:**\n${sources.map((s) => `- ${s}`).join("\n")}\n` : ""}`;

  const noFile = `${frontmatter({
    title: `Nytt i Claude Code v${version}`,
    description: no.trim(),
    pubDate,
    sources,
  })}

${no.trim()}
${sources.length > 0 ? `\n**Kilder:**\n${sources.map((s) => `- ${s}`).join("\n")}\n` : ""}`;

  writeFileSync(join(postDir, "en.md"), enFile, "utf-8");
  writeFileSync(join(postDir, "no.md"), noFile, "utf-8");
  console.log(`[blog-gen] wrote draft ${postDir}/{en,no}.md`);
  return postDir;
}
