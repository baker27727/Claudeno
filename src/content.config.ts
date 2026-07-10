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
    kind: z.enum(["module", "guide", "reference", "tool", "use-case"]),
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
// نفس نمط دروس الوحدة (moduleDocs أعلاه): ملف en.md/no.mdx منفصل لكل لغة تحت
// content/blog/<slug>/، وليس ملفًا واحدًا يحوي القسمين — حتى لا تُعرض الصفحة
// بلغتين مخلوطتين معًا (كانت هذه مشكلة SEO/وضوح حقيقية قبل هذا التغيير).
// title/description نصّان عاديان هنا (لا bilingual) لأن كل ملف بلغة واحدة أصلًا.
// المسودة الافتراضية draft=true حتى يراجعها محرر بشري قبل النشر.
// -------------------------------------------------------------------------
const blog = defineCollection({
  loader: glob({ base: "./content/blog", pattern: "**/{en,no}.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string().datetime(),
    author: z.string().default("Claude Code Learn"),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.string().url()).default([]),
    draft: z.boolean().default(true),
  }),
});

// -------------------------------------------------------------------------
// guides — صفحات SEO دائمة (evergreen) ثنائية اللغة، بخلاف blog: ليست أخبارًا
// مؤرَّخة (لا pubDate، بل updatedDate)، وترتيبها عبر `order` يدويًا لا زمنيًا.
// نفس نمط الملف-لكل-لغة (content/guides/<slug>/{en,no}.md)، لكن بخلاف blog لا
// نشترط وجود كلا اللغتين معًا — النشر الأول يبدأ بالنرويجية فقط عمدًا، والدليل
// الإنجليزي المقابل قد يُضاف لاحقًا (انظر src/lib/guides.ts).
// -------------------------------------------------------------------------
const guides = defineCollection({
  loader: glob({ base: "./content/guides", pattern: "**/{en,no}.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updatedDate: z.string().datetime(),
    author: z.string().default("Claude Code Learn"),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.string().url()).default([]),
    draft: z.boolean().default(true),
    order: z.number().default(0),
    relatedModules: z.array(z.string()).default([]),
    relatedTools: z.array(z.string()).default([]),
  }),
});

// -------------------------------------------------------------------------
// useCases — حالات استخدام Claude Code في مجالات مهنية (marketing, SEO,
// Excel, statistics, ...). نفس نمط guides: ملف لكل لغة تحت مجلد slug.
// -------------------------------------------------------------------------
const useCases = defineCollection({
  loader: glob({ base: "./content/use-cases", pattern: "**/{en,no}.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updatedDate: z.string().datetime(),
    author: z.string().default("Claude Code Learn"),
    profession: z.string(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    tools: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.string().url()).default([]),
    relatedModules: z.array(z.string()).default([]),
    relatedUseCases: z.array(z.string()).default([]),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        }),
      )
      .default([]),
    draft: z.boolean().default(true),
    order: z.number().default(0),
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
  guides,
  useCases,
};
