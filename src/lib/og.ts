// =========================================================================
// og.ts — Open Graph image resolution helpers (BLUEPRINT §9)
//
// `scripts/build-og.ts` (via the `ogImages` Astro integration) emits the
// following PNGs into `dist/og/` at build time:
//
//   - default-<lang>.png       لكل اللغتين
//   - <module-id>-<lang>.png   لكل وحدة وكل لغة
//
// كل صفحة Astro تحتاج لإصدار og:image واحد. القاعدة:
//   - /<lang>/learn/<id>/       →  /og/<id>-<lang>.png
//   - أي مسار آخر لـ <lang>/    →  /og/default-<lang>.png
//   - صفحات بلا locale (مثل /)  →  /og/default-en.png
//
// تُستعمل `resolveOgImage()` من Base.astro لإصدار og:image الديناميكي
// دون الحاجة لتمرير `ogImage` من كل صفحة يدويًا.
//
// `loadOgManifest()` يقرأ dist/og/manifest.json — مفيد للصفحات التي
// تريد التحقق من وجود صورة قبل الرجوع للافتراضي.
// =========================================================================

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isLocale, DEFAULT_LOCALE, type Locale } from "./i18n";

// -------------------------------------------------------------------------
// ثوابت على مستوى الـ OG
// -------------------------------------------------------------------------

/** اسم مجلد OG داخل dist. */
export const OG_DIR_NAME = "og";

/** Default fallback عند غياب اللغة (مثل الصفحة الجذر /). */
export const DEFAULT_OG_FALLBACK = "/og/default-en.png";

/** نمط المسار لوحدة.Groups a path like /en/learn/getting-started into
 *  { lang: "en", moduleId: "getting-started" } or null. */
const MODULE_PATH_RE = /^\/(en|no)\/learn\/([a-z0-9][a-z0-9-]*)\/?$/i;

/** نمط المسار للغة — يلتقط أي شيء تحت /<lang>/...  */
const LOCALE_PATH_RE = /^\/(en|no)(?:\/|$)/;

/** نمط المسار لصفحة مهارة: /en/skills/pdf/ */
const SKILL_PATH_RE = /^\/(en|no)\/skills\/([a-z0-9][a-z0-9-]*)\/?$/i;

// -------------------------------------------------------------------------
// واجهات
// -------------------------------------------------------------------------

/** المسار العام لصورة OG (يبدأ بـ "/og/…"). */
export type OgImagePath = string;

/** نتيجة تحليل المسار — مفيدة لتجنب تكرار regex داخل Base.astro. */
export interface ResolvedOgImage {
  /** مسار صورة OG النهائي (يبدأ بـ /og/…) — جاهز للاستخدام في og:image. */
  image: OgImagePath;
  /** هل اشتُق من المسار أم رجع للافتراضي؟ */
  source: "module" | "skill" | "default" | "fallback" | "explicit";
}

// -------------------------------------------------------------------------
// أدوات منخفضة المستوى
// -------------------------------------------------------------------------

/** يبني مسار صورة OG للوحدة. */
export function moduleOgImage(moduleId: string, lang: Locale): OgImagePath {
  return `/og/${moduleId}-${lang}.png`;
}

/** يبني مسار صورة OG الافتراضية للغة. */
export function defaultOgImage(lang: Locale): OgImagePath {
  return `/og/default-${lang}.png`;
}

/** يبني مسار صورة OG لصفحة مهارة. */
export function skillOgImage(slug: string, lang: Locale): OgImagePath {
  return `/og/skill-${slug}-${lang}.png`;
}

// -------------------------------------------------------------------------
// محلل المسار → صورة OG
// -------------------------------------------------------------------------

/**
 * يُحوّل مسار صفحة (Astro.url.pathname) إلى مسار صورة OG.
 *
 * القاعدة:
 *   - /<lang>/learn/<id>/       →  /og/<id>-<lang>.png  (module)
 *   - /<lang>/...               →  /og/default-<lang>.png  (default)
 *   - أي شيء آخر (يشمل "/")    →  /og/default-en.png  (fallback)
 *
 * يقبل صراحة `override` لتجاوز الاشتقاق — مثلًا حين تكون الصفحة
 * مرتبطة بمدوّنة تريد صورة مختلفة.
 */
export function resolveOgImage(
  pathname: string,
  override?: OgImagePath,
): ResolvedOgImage {
  if (override) {
    return { image: override, source: "explicit" };
  }

  // 1) مسار وحدة: /en/learn/getting-started/
  const moduleMatch = MODULE_PATH_RE.exec(pathname);
  if (moduleMatch) {
    const lang = moduleMatch[1].toLowerCase() as Locale;
    const moduleId = moduleMatch[2].toLowerCase();
    return { image: moduleOgImage(moduleId, lang), source: "module" };
  }

  // 2) مسار مهارة: /en/skills/pdf/
  const skillMatch = SKILL_PATH_RE.exec(pathname);
  if (skillMatch) {
    const lang = skillMatch[1].toLowerCase() as Locale;
    const slug = skillMatch[2].toLowerCase();
    return { image: skillOgImage(slug, lang), source: "skill" };
  }

  // 3) أي مسار تحت لغة معروفة: /en/... أو /no/...
  const localeMatch = LOCALE_PATH_RE.exec(pathname);
  if (localeMatch) {
    const lang = localeMatch[1].toLowerCase() as Locale;
    return { image: defaultOgImage(lang), source: "default" };
  }

  // 3) fallback (مسار الجذر / أو ما لا ينتمي للغة)
  return { image: DEFAULT_OG_FALLBACK, source: "fallback" };
}

// -------------------------------------------------------------------------
// قراءة manifest (اختياري — مفيد للصفحات التي تحتاج التحقق)
// -------------------------------------------------------------------------

/**
 * شكل manifest.json كما يكتبه scripts/build-og.ts.
 *
 * لاحظ أن manifest ليس ضروريًا لعمل og:image — Base.astro يستعمل
 * `resolveOgImage()` مباشرة. هذا الملف مفيد لـ:
 *   - debugging داخل صفحات الـ debug
 *   - التأكد أن صور الوحدات المتوقعة كلها موجودة قبل النشر
 *   - اختبارات CI (تأكد أن كل meta.yaml له PNG مقابل)
 */
export interface OgManifest {
  generatedAt: string;
  width: number;
  height: number;
  defaultImage: Record<Locale, string>;
  moduleImages: Record<string, Record<Locale, string>>;
  skillImages: Record<string, Record<Locale, string>>;
}

/**
 * يقرأ manifest.json من dist/og/ إن وُجد — يعود بـ null عند غيابه
 * (مثلًا قبل أول بناء). لا يُلقي خطأ.
 */
export function loadOgManifest(distRoot = "dist"): OgManifest | null {
  const manifestPath = resolve(process.cwd(), distRoot, OG_DIR_NAME, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as OgManifest;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------------
// مساعد للاختبار
// -------------------------------------------------------------------------

/** re-export لتجنب استيراد isLocale مرتين. */
export { isLocale, DEFAULT_LOCALE };
export type { Locale };