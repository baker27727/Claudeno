// =========================================================================
// Content collections + Zod validation
// Source of truth: BLUEPRINT §3 (مخططات المحتوى)
//
// أي ملف YAML مخالف للمخطط ⇒ فشل الـ Build قبل النشر. هذه أول طبقة حماية.
//
// ملاحظة: المحتوى يعيش في `content/` بجذر المستودع (خارج src/)، لذا نستخدم
// طبقة المحتوى في Astro 5 (loaders) بدل مجموعات المحتوى القديمة، مع الإبقاء
// على مخطط §3.5 كما هو حرفيًا.
// =========================================================================

import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

// أي حقل نصّي يجب أن يوجد بكلتا اللغتين — أساس قاعدة التكافؤ EN/NO (§4).
const bilingual = z.object({ en: z.string().min(1), no: z.string().min(1) });

// -------------------------------------------------------------------------
// §3.5 — meta.yaml (بيانات الوحدة). المخطط مطابق حرفيًا لِما ورد في المخطط.
// -------------------------------------------------------------------------
const moduleMeta = defineCollection({
  loader: glob({ base: "./content/modules", pattern: "**/meta.yaml" }),
  schema: z.object({
    id: z.string(),
    order: z.number().int().positive(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    duration_min: z.number().positive(),
    covers_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: bilingual,
    description: bilingual,
    tags: z.array(z.string()),
  }),
});

// -------------------------------------------------------------------------
// §3.2 — terminal.yaml (خطوات المحاكي)
// -------------------------------------------------------------------------
const moduleTerminal = defineCollection({
  loader: glob({ base: "./content/modules", pattern: "**/terminal.yaml" }),
  schema: z.object({
    steps: z
      .array(
        z.object({
          id: z.string(),
          command: z.string().min(1),
          output: z.string(),
          explain: bilingual,
          accepts_also: z.array(z.string()).optional().default([]),
        }),
      )
      .min(1),
  }),
});

// -------------------------------------------------------------------------
// §3.3 — quiz.yaml (أسئلة ثنائية اللغة بمفاتيح مشتركة)
// audit-quiz يتحقق لاحقًا أن correct يطابق أحد الخيارات وأن الخيارات ≥ 3.
// -------------------------------------------------------------------------
const quizOption = z.object({
  id: z.string(),
  en: z.string().min(1),
  no: z.string().min(1),
});

const moduleQuiz = defineCollection({
  loader: glob({ base: "./content/modules", pattern: "**/quiz.yaml" }),
  schema: z.object({
    questions: z
      .array(
        z
          .object({
            id: z.string(),
            prompt: bilingual,
            options: z.array(quizOption).min(3),
            correct: z.string(),
            explain: bilingual,
          })
          // فحص سلامة على مستوى المخطط: correct يجب أن يطابق أحد الخيارات.
          .refine((q) => q.options.some((o) => o.id === q.correct), {
            message: "`correct` must match one of the option ids",
            path: ["correct"],
          }),
      )
      .min(1),
  }),
});

// -------------------------------------------------------------------------
// دروس الوحدة (en.mdx / no.mdx). المحتوى نصّي؛ الميتاداتا في moduleMeta.
// -------------------------------------------------------------------------
const moduleDocs = defineCollection({
  loader: glob({ base: "./content/modules", pattern: "**/{en,no}.mdx" }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

// -------------------------------------------------------------------------
// §3.4 — glossary.yaml (اتساق الترجمة النرويجية)
// -------------------------------------------------------------------------
const glossary = defineCollection({
  loader: file("./content/glossary.yaml"),
  schema: z.object({
    en: z.string().min(1),
    no: z.string().min(1),
    note: z.string().optional(),
  }),
});

// -------------------------------------------------------------------------
// catalog.yaml — فهرس الوحدات/الموارد المعروضة
// -------------------------------------------------------------------------
const catalog = defineCollection({
  loader: file("./content/catalog.yaml"),
  schema: z.object({
    id: z.string(),
    kind: z.enum(["module", "guide", "reference", "tool"]),
    title: bilingual,
    href: z.string(),
  }),
});

// -------------------------------------------------------------------------
// changelog.yaml — سجل التحديثات ثنائي اللغة (يولّده خط الأتمتة §7)
// -------------------------------------------------------------------------
const changelog = defineCollection({
  loader: file("./content/changelog.yaml"),
  schema: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    date: z.string(),
    entry: bilingual,
    sources: z.array(z.string().url()).default([]),
  }),
});

// -------------------------------------------------------------------------
// blog — منشورات مدونة ثنائية اللغة (§2 + §9: تتبع كل تحديث لإصدار Claude Code).
// title/description مفتوحان لـ MDX فيكتبهما الكاتب بأي شكل، لذا لا نقصرهما
// على bilingual هنا — parity البصري يُفرض في صفحة الـ post نفسها (يختار القارئ
// lang من [lang] param، والـ slug موحّد لكلا اللغتين).
// المسودة الافتراضية draft=true حتى يراجعها محرر بشري قبل النشر.
// -------------------------------------------------------------------------
const blog = defineCollection({
  loader: glob({ base: "./content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: bilingual,
    description: bilingual,
    pubDate: z.string().datetime(),
    author: z.string().default("Claude Code Learn"),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.string().url()).default([]),
    draft: z.boolean().default(true),
  }),
});

export const collections = {
  moduleMeta,
  moduleTerminal,
  moduleQuiz,
  moduleDocs,
  glossary,
  catalog,
  changelog,
  blog,
};
