// =========================================================================
// SEO & Schema.org JSON-LD helpers — BLUEPRINT §9
//
// كل المولّدات pure TypeScript (لا حزم npm خارجية). تستقبل كل صفحة أنواع
// الإشارة المعرّفة في BLUEPRINT (ModuleData, QuizQuestion) لإنتاج مخططات
// Schema.org متوافقة مع Google Rich Results.
//
// التواقيع تطابق حرفيًا ما ورد في موجز المهمة:
//   • websiteJsonLd(lang)
//   • organizationJsonLd()
//   • courseJsonLd(module, lang)
//   • faqJsonLd(questions, lang)
// =========================================================================

import type { Locale } from "./i18n";
import { guideIndexPath } from "./guides";
import { useCaseIndexPath } from "./use-cases";

// -------------------------------------------------------------------------
// ثوابت على مستوى الوحدة — مصدر حقيقة واحد لكل ثوابت SEO
// -------------------------------------------------------------------------

export const SITE_URL = "https://claude.mutaz.no";
export const SITE_NAME = "Claude Code Learn";
export const SITE_LOGO_URL = "https://claude.mutaz.no/favicon.svg";
export const SITE_SOCIAL: ReadonlyArray<string> = [
  "https://github.com/anthropics/claude-code",
  "https://docs.claude.com/en/docs/claude-code/overview",
];

/**
 * صورة OG الافتراضية للغة ما. تستعمل أنماط Track 2 (OG images satori):
 * `/og/default-<lang>.png`. عند غياب اللغة -> الإنجليزية.
 */
export function defaultOgImage(lang: Locale): string {
  const safe: Locale = lang === "no" ? "no" : "en";
  return `/og/default-${safe}.png`;
}

/** روابط المسار الجذري للغة. */
export function localeRoot(lang: Locale): string {
  return `${SITE_URL}/${lang}`;
}

/** يبني رابطًا مطلقًا من base + path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** تسمية "الصفحة الرئيسية" حسب اللغة. */
function homeLabel(lang: Locale): string {
  return lang === "no" ? "Hjem" : "Home";
}

/** خرائط المستوى التعليمي لقيم Schema.org المقبولة. */
const LEVEL_TO_SCHEMA: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Locale الجذر لـ OG (en_US / nb_NO).
 */
const OG_LOCALES: Record<Locale, string> = {
  en: "en_US",
  no: "nb_NO",
};

// -------------------------------------------------------------------------
// واجهات (Types)
// -------------------------------------------------------------------------

/** هيكل Schema.org/JSON-LD node (لاستخدام Schema.org Context ثابت). */
export interface JsonLdObject {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

/** يُطابق شكل quiz.yaml المُعرَّف في `src/content.config.ts`. */
export interface QuizQuestion {
  id: string;
  prompt: { en: string; no: string };
  options: Array<{ id: string; en: string; no: string }>;
  correct: string;
  explain: { en: string; no: string };
}

/** يُطابق شكل meta.yaml للوحدة. */
export interface ModuleMeta {
  id: string;
  order: number;
  level: "beginner" | "intermediate" | "advanced";
  duration_min: number;
  covers_version: string;
  title: { en: string; no: string };
  description: { en: string; no: string };
  tags: string[];
}

/**
 * الواجهة المجمّعة للوحدة. يُمرَّر فقط الجزء الذي نحتاجه إلى
 * `courseJsonLd` (لا نهتم بمحتوى الدرس هنا).
 */
export interface ModuleLike {
  id: string;
  meta: ModuleMeta;
}

/** بند قائمة للأرض الخبز (BreadcrumbList). */
export interface Crumb {
  name: string;
  path: string; // path-only، سيُغلّف بـ absoluteUrl
}

/** بند سجل تغييرات لإخراجه كـ ListItem في ItemList.
 *  مطابق لِمخطط `changelog` في `src/content.config.ts`. */
export interface ChangelogEntry {
  version: string;
  date: string; // ISO yyyy-mm-dd
  entry: { en: string; no: string };
  sources?: string[];
}

/** مدخل WebPage.mainEntity (مطلوب للصفحات Reference و Catalog). */
export interface WebPageMainEntity {
  /** مثل "ItemList" أو "TechArticle". */
  type: string;
  /** كائن JSON-LD صالح (سيُسلسل ويُغلّف داخل mainEntity). */
  data: JsonLdObject;
}

/** مدخلات WebPage المُحدَّدة. */
export interface WebPageArgs {
  name: string;
  description: string;
  lang: Locale;
  path: string; // path-only
  mainEntity?: WebPageMainEntity;
}

// -------------------------------------------------------------------------
// JSON-LD script markup — آمن عبر escape لِـ `</script>`
// -------------------------------------------------------------------------

/**
 * يُغلّف كائن (أو مصفوفة) JSON-LD في وسم `<script type="application/ld+json">`
 * صالح للتضمين في Astro عبر `set:html`. يُهرّب الأحرف الحساسة
 * (`<`, `>`, `&`) إلى صيغ Unicode JSON لمنع إغلاق الوسم مبكرًا.
 */
export function jsonLdScript(data: JsonLdObject | JsonLdObject[]): string {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return `<script type="application/ld+json">${json}</script>`;
}

// -------------------------------------------------------------------------
// 1) WebSite — BLUEPRINT §9 + Section 1 (الصفحة الرئيسية)
// -------------------------------------------------------------------------

/**
 * schema.org/WebSite — يُصدَّر مرة واحدة على الصفحة الرئيسية.
 *
 * لا `potentialAction`/SearchAction هنا عمدًا: البحث في هذا الموقع نافذة
 * Pagefind من جهة العميل فقط (src/islands/SearchPalette.svelte) — لا توجد
 * صفحة نتائج بحث حقيقية على مسار قابل للزحف يمكن لـ Google استخدامه، وادّعاء
 * SearchAction بدون ذلك يعطي بيانات منظّمة كاذبة. إن أُضيفت صفحة `/search`
 * فعلية لاحقًا، يمكن إعادة `potentialAction` هنا.
 */
export function websiteJsonLd(lang: Locale): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: lang,
    alternateName: "claude.mutaz.no",
  };
}

// -------------------------------------------------------------------------
// 2) Organization — BLUEPRINT §9 + Section 1 (الصفحة الرئيسية)
// -------------------------------------------------------------------------

/**
 * schema.org/Organization — مصدر الحقيقة الوحيد لـ `provider` في Course.
 * لا يحتاج إلى معطيات إضافية لأن الثوابت مكتفية.
 */
export function organizationJsonLd(): JsonLdObject {
  const node: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO_URL,
    sameAs: [...SITE_SOCIAL],
  };
  return node;
}

// -------------------------------------------------------------------------
// 3) Course — BLUEPRINT §9 + Section 2 (صفحة الوحدة)
// -------------------------------------------------------------------------

/**
 * schema.org/Course — provider = Organization ثابتي، hasCourseInstance،
 * inLanguage، description، about (tags)، educationalLevel، ويذكر نسخة
 * Claude Code في about لمزيد من السياق.
 */
export function courseJsonLd(module: ModuleLike, lang: Locale): JsonLdObject {
  const m = module.meta;
  const about = [...m.tags];
  if (m.covers_version) about.push(`Claude Code ${m.covers_version}`);

  const course: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: m.title[lang],
    description: m.description[lang],
    provider: organizationJsonLd(),
    url: absoluteUrl(`/${lang}/learn/${module.id}/`),
    inLanguage: lang,
    about,
    educationalLevel: LEVEL_TO_SCHEMA[m.level] ?? m.level,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${m.duration_min}M`,
      inLanguage: lang,
      location: {
        "@type": "VirtualLocation",
        url: absoluteUrl(`/${lang}/learn/${module.id}/`),
      },
    },
  };
  return course;
}

// -------------------------------------------------------------------------
// 4) FAQPage — BLUEPRINT §9 + Section 2 (صفحة الوحدة)
// -------------------------------------------------------------------------

/**
 * schema.org/FAQPage — كل سؤال في `questions` يصبح `Question` وإجابته
 * الصحيحة (مأخوذة من `correct`) تصبح `acceptedAnswer` مع دمج شرح
 * `explain` داخل نص الإجابة لمزيد من السياق.
 */
export function faqJsonLd(questions: QuizQuestion[], lang: Locale): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: lang === "no" ? "Ofte stilte spørsmål" : "Frequently Asked Questions",
    inLanguage: lang,
    mainEntity: questions.map((q) => {
      const correct = q.options.find((o) => o.id === q.correct);
      const answerText = correct
        ? q.explain[lang]
          ? `${correct[lang]} — ${q.explain[lang]}`
          : correct[lang]
        : "";
      return {
        "@type": "Question",
        name: q.prompt[lang],
        acceptedAnswer: {
          "@type": "Answer",
          text: answerText,
        },
      };
    }),
  };
}

// -------------------------------------------------------------------------
// 5) BreadcrumbList — BLUEPRINT §9 + Section 2 (ملاحة)
// -------------------------------------------------------------------------

/**
 * schema.org/BreadcrumbList — عناصر فتات الخبز. الترتيب تصاعدي.
 */
export function breadcrumbListJsonLd(crumbs: Crumb[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * راحة: يولّد BreadcrumbList لصفحة المهارات: Home → Skills.
 */
export function skillsIndexBreadcrumbs(lang: Locale): Crumb[] {
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name: lang === "no" ? "Skills" : "Skills", path: `/${lang}/skills/` },
  ];
}

/**
 * راحة: يولّد BreadcrumbList لصفحة تصنيف مهارات: Home → Skills → Category.
 */
export function skillsCategoryBreadcrumbs(categoryName: string, categorySlug: string, lang: Locale): Crumb[] {
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name: lang === "no" ? "Skills" : "Skills", path: `/${lang}/skills/` },
    { name: categoryName, path: `/${lang}/skills/category/${categorySlug}/` },
  ];
}

/**
 * راحة: يولّد BreadcrumbList لصفحة مهارة: Home → Skills → Skill.
 */
export function skillBreadcrumbs(skillTitle: string, skillSlug: string, lang: Locale): Crumb[] {
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name: lang === "no" ? "Skills" : "Skills", path: `/${lang}/skills/` },
    { name: skillTitle, path: `/${lang}/skills/${skillSlug}/` },
  ];
}

export interface SkillMetaLike {
  slug: string;
  title: { en: string; no: string };
  summary: { en: string; no: string };
  categories: string[];
  lastVerified: string;
  verifiedVersion: string;
  rubric: { docs: number; safety: number; reliability: number; focus: number };
}

/**
 * schema.org/TechArticle لصفحة مهارة — يعرضها كدرس مصغّر.
 * يستخدم lastVerified كـ dateModified ويضيف درجات rubric كـ reviewRating.
 */
export function skillArticleJsonLd(skill: SkillMetaLike, lang: Locale): JsonLdObject {
  const url = absoluteUrl(`/${lang}/skills/${skill.slug}/`);
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: skill.title[lang],
    description: skill.summary[lang],
    inLanguage: lang,
    url,
    dateModified: skill.lastVerified,
    author: organizationJsonLd(),
    publisher: organizationJsonLd(),
    image: absoluteUrl(defaultOgImage(lang)),
    keywords: skill.categories.join(", "),
    about: [`Claude Code ${skill.verifiedVersion}`, ...skill.categories],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

/**
 * راحة: يولّد BreadcrumbList موحد لصفحة وحدة: Home → Learn → Module.
 */
export function moduleBreadcrumbs(
  moduleId: string,
  moduleTitle: string,
  lang: Locale,
): Crumb[] {
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name: lang === "no" ? "Lær" : "Learn", path: `/${lang}/learn/` },
    { name: moduleTitle, path: `/${lang}/learn/${moduleId}/` },
  ];
}

/**
 * راحة: BreadcrumbList لصفحة فرعية: Home → page.
 */
export function pageBreadcrumbs(name: string, path: string, lang: Locale): Crumb[] {
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name, path },
  ];
}

/**
 * راحة: يولّد BreadcrumbList موحد لمنشور مدونة: Home → Blog → Post.
 */
export function blogPostBreadcrumbs(postTitle: string, path: string, lang: Locale): Crumb[] {
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name: lang === "no" ? "Bloggen" : "Blog", path: `/${lang}/blog/` },
    { name: postTitle, path },
  ];
}

// -------------------------------------------------------------------------
// 6) ItemList — BLUEPRINT §9 + Section 3 (Changelog)
// -------------------------------------------------------------------------

/**
 * schema.org/ItemList — سجل التغييرات بترتيب تنازلي زمنيًّا.
 */
export function itemListJsonLd(
  entries: ChangelogEntry[],
  lang: Locale,
  name?: string,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: name ?? (lang === "no" ? "Endringslogg" : "Changelog"),
    url: absoluteUrl(`/${lang}/changelog/`),
    inLanguage: lang,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `v${entry.version}`,
      url: absoluteUrl(`/${lang}/changelog/`),
      description: entry.entry[lang],
      dateCreated: entry.date,
      version: entry.version,
    })),
  };
}

// -------------------------------------------------------------------------
// 7) WebPage — BLUEPRINT §9 + Section 4 (Reference و Catalog)
// -------------------------------------------------------------------------

/**
 * schema.org/WebPage — للصفحات العامة. يدعم mainEntity اختياري بنوع
 * مناسب (مثل "ItemList" للـ Catalog، أو "TechArticle" للـ Reference).
 */
export function webPageJsonLd(args: WebPageArgs): JsonLdObject {
  const node: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: args.name,
    description: args.description,
    url: absoluteUrl(args.path),
    inLanguage: args.lang,
  };
  if (args.mainEntity) {
    const inner = args.mainEntity.data;
    // ضمان أن @type هو النوع الذي حدده المتصل (يفوز على أي @type داخلي).
    node.mainEntity = {
      ...inner,
      "@type": args.mainEntity.type,
    };
  }
  return node;
}

// -------------------------------------------------------------------------
// 8) BlogPosting — منشورات المدونة
// -------------------------------------------------------------------------

export interface BlogPostingArgs {
  title: string;
  description: string;
  lang: Locale;
  path: string; // path-only, مثل /no/blog/v2-1-204-whats-new/
  datePublished: string; // ISO datetime
  author?: string;
  tags?: string[];
  image?: string; // path-only، اختياري — الافتراضي defaultOgImage(lang)
}

/**
 * schema.org/BlogPosting — لكل منشور مدونة. `publisher` يشير إلى نفس
 * Organization الثابت المستخدم في courseJsonLd.
 */
export function blogPostingJsonLd(args: BlogPostingArgs): JsonLdObject {
  const url = absoluteUrl(args.path);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: args.title,
    description: args.description,
    inLanguage: args.lang,
    url,
    datePublished: args.datePublished,
    dateModified: args.datePublished,
    author: {
      "@type": "Organization",
      name: args.author ?? SITE_NAME,
    },
    publisher: organizationJsonLd(),
    image: absoluteUrl(args.image ?? defaultOgImage(args.lang)),
    ...(args.tags && args.tags.length > 0 ? { keywords: args.tags.join(", ") } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

// -------------------------------------------------------------------------
// 9) TechArticle — أدلة SEO الدائمة (guides)
// -------------------------------------------------------------------------

export interface GuideArticleArgs {
  title: string;
  description: string;
  lang: Locale;
  path: string; // path-only, مثل /no/guider/hva-er-claude-code/
  updatedDate: string; // ISO datetime — لا datePublished منفصل (BLUEPRINT: ليست أخبارًا مؤرَّخة)
  author?: string;
  tags?: string[];
  image?: string;
}

/**
 * schema.org/TechArticle — لأدلة SEO الدائمة (guides)، بخلاف BlogPosting:
 * لا `datePublished` منفصل (الدليل دائم التحديث وليس منشورًا مؤرَّخًا)، فقط
 * `dateModified` من `updatedDate`.
 */
export function guideArticleJsonLd(args: GuideArticleArgs): JsonLdObject {
  const url = absoluteUrl(args.path);
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: args.title,
    description: args.description,
    inLanguage: args.lang,
    url,
    dateModified: args.updatedDate,
    author: {
      "@type": "Organization",
      name: args.author ?? SITE_NAME,
    },
    publisher: organizationJsonLd(),
    image: absoluteUrl(args.image ?? defaultOgImage(args.lang)),
    ...(args.tags && args.tags.length > 0 ? { keywords: args.tags.join(", ") } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

/**
 * راحة: يولّد BreadcrumbList موحد لصفحة دليل: Home → Guider/Guides → Guide.
 */
export function guideBreadcrumbs(guideTitle: string, path: string, lang: Locale): Crumb[] {
  const guidesLabel = lang === "no" ? "Guider" : "Guides";
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name: guidesLabel, path: guideIndexPath(lang) },
    { name: guideTitle, path },
  ];
}

/**
 * راحة: يولّد BreadcrumbList موحد لصفحة حالة استخدام مهنية:
 * Home → Fagområder/Use cases → Use case.
 */
export function useCaseBreadcrumbs(useCaseTitle: string, path: string, lang: Locale): Crumb[] {
  const indexLabel = lang === "no" ? "Fagområder" : "Use cases";
  return [
    { name: homeLabel(lang), path: `/${lang}/` },
    { name: indexLabel, path: useCaseIndexPath(lang) },
    { name: useCaseTitle, path },
  ];
}

// -------------------------------------------------------------------------
// 10) OG / Twitter meta
// -------------------------------------------------------------------------

/** قيم OpenGraph المدعومة هنا. */
export type OgType = "website" | "article" | "profile";

export interface OpenGraphMeta {
  ogType: OgType;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogLocale: string;
  ogSiteName: string;
  ogImage: string;
  twitterCard: "summary" | "summary_large_image";
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

/**
 * يبني قيم OG/Twitter. الافتراضي يستخدم `/og/default-<lang>.png` المُولَّد
 * من قِبَل مهمة Track 2 (OG images via satori).
 *   • الصفحات العامة → `defaultOgImage(lang)`
 *   • صفحات الوحدات  → `/og/<moduleId>-<lang>.png` (يُمرَّر يدويًا)
 */
export function openGraphMeta(args: {
  type?: OgType;
  title: string;
  description: string;
  url: string;
  lang: Locale;
  image?: string;
}): OpenGraphMeta {
  const image = args.image ?? defaultOgImage(args.lang);
  return {
    ogType: args.type ?? "website",
    ogTitle: args.title,
    ogDescription: args.description,
    ogUrl: args.url,
    ogLocale: OG_LOCALES[args.lang],
    ogSiteName: SITE_NAME,
    ogImage: image,
    twitterCard: "summary_large_image",
    twitterTitle: args.title,
    twitterDescription: args.description,
    twitterImage: image,
  };
}
