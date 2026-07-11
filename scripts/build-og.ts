// =========================================================================
// build-og — توليد صور OG (1200×630 PNG) لكل وحدة وكل لغة، وقت البناء
// BLUEPRINT §9 — "صور OG آلية لكل وحدة (satori/vercel-og وقت البناء)
//                  بكلتا اللغتين".
//
// المولّد: satori (HTML/CSS → SVG) + @resvg/resvg-js (SVG → PNG).
// الخط: Inter Regular + Bold TTF، مخزّن ذاتيًا في scripts/assets/.
//
// المخرجات (إلى dist/og/):
//   - default-en.png
//   - default-no.png
//   - <module-id>-en.png   لكل meta.yaml تحت content/modules/*/
//   - <module-id>-no.png
//
// الاستخدام:
//   tsx scripts/build-og.ts [--out=dir] [--site=URL] [--manifest-only]
//
// يستطيع هذا السكربت أيضًا العمل من داخل Astro integration عبر
// src/integrations/og-images.ts التي تستدعي `runBuildOg()`.
// =========================================================================

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import satori from "satori";
import { html as toReact } from "satori-html";
import { Resvg } from "@resvg/resvg-js";

// -------------------------------------------------------------------------
// ثوابت التصميم — مأخوذة من src/styles/tokens.css (BLUEPRINT §6)
// الإبقاء عليها متطابقة: كل تغيير هنا يجب أن يُنقل إلى tokens.css أو
// يُبرّر في deliverable.
// -------------------------------------------------------------------------
const COLORS = {
  bg: "#0b0e14",
  bgElev: "#12161f",
  fg: "#e6e9ef",
  fgMuted: "#9aa4b2",
  accent: "#d97757",
  border: "#232a37",
} as const;

const SITE_NAME = "Claude Code Learn";
const OG_W = 1200;
const OG_H = 630;
const MODULES_ROOT = resolve(process.cwd(), "content/modules");
const SKILLS_ROOT = resolve(process.cwd(), "content/skills");
const FONTS_DIR = resolve(process.cwd(), "scripts/assets");

// -------------------------------------------------------------------------
// وسوم بيانات الوحدة (نفس مخطط Zod في src/content.config.ts §3.5)
// -------------------------------------------------------------------------
interface BilingualText {
  en: string;
  no: string;
}
interface ModuleMetaYaml {
  id: string;
  order: number;
  level: "beginner" | "intermediate" | "advanced";
  duration_min: number;
  covers_version: string;
  title: BilingualText;
  description: BilingualText;
  tags: string[];
}

interface LocaleMap<T> { en: T; no: T }

const LOCALE_HTML_LANG: LocaleMap<string> = { en: "en", no: "no" };
const LOCALE_LEVEL_LABEL: LocaleMap<Record<ModuleMetaYaml["level"], string>> = {
  en: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
  no: { beginner: "Nybegynner", intermediate: "Middels", advanced: "Avansert" },
};
const LOCALE_BRAND_LABEL: LocaleMap<string> = { en: "An interactive", no: "Et interaktivt" };
const LOCALE_BRAND_TAGLINE: LocaleMap<string> = {
  en: "Claude Code learning platform",
  no: "Claude Code læringsplattform",
};
const LOCALE_PAGE_KIND: LocaleMap<string> = { en: "Module", no: "Modul" };
const LOCALE_SKILL_KIND: LocaleMap<string> = { en: "Skill", no: "Skill" };
const LOCALE_DEFAULT_TITLE: LocaleMap<string> = {
  en: "Learn Claude Code, one module at a time",
  no: "Lær Claude Code, en modul om gangen",
};
const LOCALE_DEFAULT_DESC: LocaleMap<string> = {
  en: "Hands-on bilingual lessons covering Claude Code CLI, slash commands, subagents, MCP servers, and more.",
  no: "Praktiske, tospråklige leksjoner om Claude Code CLI, slash-kommandoer, underagenter, MCP-tjenere og mer.",
};

interface SkillMetaYaml {
  slug: string;
  title: BilingualText;
  summary: BilingualText;
}

interface BuildOptions {
  outDir: string;
  siteUrl: string;
  manifestOnly: boolean;
}

function parseArgs(argv: string[]): Partial<BuildOptions> {
  const out: Partial<BuildOptions> = {};
  for (const arg of argv.slice(2)) {
    if (arg === "--manifest-only") out.manifestOnly = true;
    else if (arg.startsWith("--out=")) out.outDir = resolve(process.cwd(), arg.slice("--out=".length));
    else if (arg.startsWith("--site=")) out.siteUrl = arg.slice("--site=".length);
  }
  return out;
}

function readInterFont(weight: 400 | 700): Buffer {
  const file = weight === 400 ? "Inter-Regular.ttf" : "Inter-Bold.ttf";
  const p = join(FONTS_DIR, file);
  if (!existsSync(p)) {
    throw new Error(
      `Missing font at ${p}. Ensure scripts/assets/${file} is committed to the repo.`,
    );
  }
  return readFileSync(p);
}

function listModuleMetas(): ModuleMetaYaml[] {
  if (!existsSync(MODULES_ROOT)) {
    throw new Error(`Modules root not found at ${MODULES_ROOT}`);
  }
  const dirs = readdirSync(MODULES_ROOT)
    .filter((name) => statSync(join(MODULES_ROOT, name)).isDirectory())
    .sort();
  const out: ModuleMetaYaml[] = [];
  for (const dir of dirs) {
    const yaml = join(MODULES_ROOT, dir, "meta.yaml");
    if (!existsSync(yaml)) continue;
    const data = parseYaml(readFileSync(yaml, "utf-8")) as ModuleMetaYaml;
    out.push(data);
  }
  return out.sort((a, b) => a.order - b.order);
}

function listSkillMetas(): SkillMetaYaml[] {
  if (!existsSync(SKILLS_ROOT)) return [];
  const dirs = readdirSync(SKILLS_ROOT)
    .filter((name) => statSync(join(SKILLS_ROOT, name)).isDirectory())
    .sort();
  const out: SkillMetaYaml[] = [];
  for (const dir of dirs) {
    const yaml = join(SKILLS_ROOT, dir, "meta.yaml");
    if (!existsSync(yaml)) continue;
    const data = parseYaml(readFileSync(yaml, "utf-8")) as SkillMetaYaml;
    out.push(data);
  }
  return out.sort((a, b) => a.title.en.localeCompare(b.title.en));
}

// يقطع أي نص طويل جدًا بحد أقصى معقول (OG description) — يحافظ على كلمات كاملة.
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.replace(/[,.;:!?]+$/, "")}…`;
}

interface OgImageInput {
  siteName: string;
  title: string;
  description: string;
  kindLabel: string;      // "Module" / "Modul" أو "Site" / "Side"
  levelLabel?: string;    // "Beginner" | …
  url: string;            // canonical full URL
  siteUrl: string;
  brandKicker: string;    // سطر فرعي تحت الشعار
}

// -------------------------------------------------------------------------
// قالب Satori — 1200×630 ، العمود الأيسر يحوي الشعار+شريط الفصل،
// العمود الأيمن يحوي العنوان والوصف.
// ملاحظة: كل <div> يحتاج display:flex صراحة (قاعدة satori).
// ملاحظة مهمة: `satori-html` template tag يحلّل الـ string مرة واحدة —
// لا يَفهم عناصر HTML مُدمجة عبر متغيّرات JS، فيُخرجها كنص.
// لذا نبني القالب الكامل في template literal واحد ولا نُدخل متغيّرات
// إلا في قيم نصية داخل عناصر <div> (مثل العنوان والوصف).
// -------------------------------------------------------------------------
// ملاحظة: satori-html v0.3.2 يُرجع VNode بينما satori v0.26 يتوقع ReactNode
// من types/react. الفرق شكلي في وقت التشغيل (satori يقبل شجرة شبيهة بـ React)؛
// نُسكِت فحص TS هنا في الحد الفاصل بدلًا من cast في كل استدعاء.
function templateMarkup(input: OgImageInput): any {
  const levelPart = input.levelLabel ? ` · ${escapeHtml(input.levelLabel)}` : "";
  const siteName = escapeHtml(input.siteName);
  const kindLabel = escapeHtml(input.kindLabel);
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const brandKicker = escapeHtml(input.brandKicker);
  const url = escapeHtml(stripScheme(input.url));
  const accent = COLORS.accent;
  const fg = COLORS.fg;
  const fgMuted = COLORS.fgMuted;
  const bg = COLORS.bg;

  return toReact(`<div style="display:flex; width:${OG_W}px; height:${OG_H}px; background:${bg}; font-family:Inter; padding:80px 100px;"><div style="display:flex; flex-direction:column; justify-content:space-between; width:380px;"><div style="display:flex; flex-direction:column; gap:32px;"><div style="display:flex; align-items:center; gap:20px;"><div style="display:flex; width:6px; height:280px; background:${accent}; border-radius:3px;"></div><div style="display:flex; align-items:center; gap:14px;"><div style="display:flex; width:36px; height:36px; background:${accent}; border-radius:8px;"></div><div style="display:flex; font-size:22px; font-weight:700; color:${fg}; letter-spacing:-0.01em;">${siteName}</div></div></div><div style="display:flex; font-size:18px; color:${fgMuted}; margin-top:auto;">${brandKicker}</div></div></div><div style="display:flex; width:60px;"></div><div style="display:flex; flex-direction:column; justify-content:center; flex:1;"><div style="display:flex; flex-direction:column;"><div style="display:flex; font-size:18px; color:${fgMuted}; letter-spacing:0.04em; text-transform:uppercase;">${kindLabel}${levelPart}</div><div style="display:flex; height:24px;"></div><div style="display:flex; font-size:64px; font-weight:700; color:${fg}; line-height:1.1; letter-spacing:-0.02em;">${title}</div><div style="display:flex; font-size:26px; color:${fgMuted}; line-height:1.4; margin-top:24px;">${description}</div></div><div style="display:flex; flex:1;"></div><div style="display:flex; flex-direction:column;"><div style="display:flex; font-size:18px; color:${accent}; margin-top:8px;">${url}</div></div></div></div>`);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

// -------------------------------------------------------------------------
// تحويل SVG → PNG عبر resvg (تحافظ على 1200×630).
// -------------------------------------------------------------------------
function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    background: COLORS.bg,
    fitTo: { mode: "width", value: OG_W },
    font: {
      // حماية ضد عرض لو فُقدت الخطوط لأي سبب — يستخدم الخط البديل.
      loadSystemFonts: true,
      defaultFontFamily: "Inter",
    },
  });
  return Buffer.from(resvg.render().asPng());
}

// -------------------------------------------------------------------------
// ينشئ صورة واحدة — يكتبها على القرص.
// -------------------------------------------------------------------------
async function renderOne(
  outDir: string,
  filename: string,
  svg: string,
): Promise<{ filename: string; bytes: number; dims: { w: number; h: number } }> {
  const png = svgToPng(svg);
  const target = join(outDir, filename);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, png);
  return { filename, bytes: png.length, dims: { w: OG_W, h: OG_H } };
}

// -------------------------------------------------------------------------
// يُنفّذ البناء الفعلي — يُستدعى من السكربت ومن Astro integration.
// -------------------------------------------------------------------------
export interface BuiltImage {
  filename: string;       // foo-en.png
  publicPath: string;     // /og/foo-en.png (يستخدم في <meta og:image>)
  bytes: number;
}

export interface BuildOgResult {
  images: BuiltImage[];
  defaultImage: Record<"en" | "no", string>; // publicPath لكل لغة
  moduleImages: Record<string, Record<"en" | "no", string>>; // id → publicPath
  skillImages: Record<string, Record<"en" | "no", string>>; // slug → publicPath
}

export interface BuildOgInput {
  outDir: string;          // المجلد الوجهة (dist/og)
  siteUrl?: string;        // افتراضي https://claudecode.no
  /** تجاهل كتابة الملفات — يُستخدم حين يريد المستدعي نتائج فحسب (manifest). */
  manifestOnly?: boolean;
}

export async function runBuildOg(input: BuildOgInput): Promise<BuildOgResult> {
  const siteUrl = (input.siteUrl ?? "https://claudecode.no").replace(/\/$/, "");
  const outDir = input.outDir;
  const manifestOnly = input.manifestOnly ?? false;
  await mkdir(outDir, { recursive: true });

  const regular = readInterFont(400);
  const bold = readInterFont(700);

  const metas = listModuleMetas();
  const skillMetas = listSkillMetas();
  const images: BuiltImage[] = [];
  const defaultImage: Record<"en" | "no", string> = { en: "/og/default-en.png", no: "/og/default-no.png" };
  const moduleImages: Record<string, Record<"en" | "no", string>> = {};
  const skillImages: Record<string, Record<"en" | "no", string>> = {};

  // صور افتراضية — لكل لغة.
  for (const lang of ["en", "no"] as const) {
    const svg = await satori(
      templateMarkup({
        siteName: SITE_NAME,
        title: LOCALE_DEFAULT_TITLE[lang],
        description: LOCALE_DEFAULT_DESC[lang],
        kindLabel: lang === "no" ? "Side" : "Site",
        url: `${siteUrl}/${lang}/`,
        siteUrl,
        brandKicker: LOCALE_BRAND_TAGLINE[lang],
      }),
      {
        width: OG_W,
        height: OG_H,
        fonts: [
          { name: "Inter", data: regular, weight: 400, style: "normal" },
          { name: "Inter", data: bold, weight: 700, style: "normal" },
        ],
      },
    );
    const file = `default-${lang}.png`;
    if (!manifestOnly) {
      const r = await renderOne(outDir, file, svg);
      console.log(`  ✓ ${file}  ${r.bytes}B  ${r.dims.w}×${r.dims.h}`);
    }
    images.push({ filename: file, publicPath: `/og/${file}`, bytes: svgToPng(svg).length });
  }

  // صور الوحدات — لكل meta.yaml ولغتيها.
  for (const meta of metas) {
    moduleImages[meta.id] = { en: "", no: "" };
    for (const lang of ["en", "no"] as const) {
      const kindLabel = LOCALE_PAGE_KIND[lang];
      const level = LOCALE_LEVEL_LABEL[lang][meta.level];
      const svg = await satori(
        templateMarkup({
          siteName: SITE_NAME,
          title: meta.title[lang],
          description: truncate(meta.description[lang], 140),
          kindLabel,
          levelLabel: level,
          url: `${siteUrl}/${lang}/learn/${meta.id}`,
          siteUrl,
          brandKicker: LOCALE_BRAND_LABEL[lang],
        }),
        {
          width: OG_W,
          height: OG_H,
          fonts: [
            { name: "Inter", data: regular, weight: 400, style: "normal" },
            { name: "Inter", data: bold, weight: 700, style: "normal" },
          ],
        },
      );
      const file = `${meta.id}-${lang}.png`;
      if (!manifestOnly) {
        const r = await renderOne(outDir, file, svg);
        console.log(`  ✓ ${file}  ${r.bytes}B  ${r.dims.w}×${r.dims.h}`);
      }
      const publicPath = `/og/${file}`;
      images.push({ filename: file, publicPath, bytes: svgToPng(svg).length });
      moduleImages[meta.id][lang] = publicPath;
    }
  }

  // صور المهارات — لكل meta.yaml ولغتيها.
  for (const meta of skillMetas) {
    skillImages[meta.slug] = { en: "", no: "" };
    for (const lang of ["en", "no"] as const) {
      const kindLabel = LOCALE_SKILL_KIND[lang];
      const svg = await satori(
        templateMarkup({
          siteName: SITE_NAME,
          title: meta.title[lang],
          description: truncate(meta.summary[lang], 140),
          kindLabel,
          url: `${siteUrl}/${lang}/skills/${meta.slug}`,
          siteUrl,
          brandKicker: LOCALE_BRAND_TAGLINE[lang],
        }),
        {
          width: OG_W,
          height: OG_H,
          fonts: [
            { name: "Inter", data: regular, weight: 400, style: "normal" },
            { name: "Inter", data: bold, weight: 700, style: "normal" },
          ],
        },
      );
      const file = `skill-${meta.slug}-${lang}.png`;
      if (!manifestOnly) {
        const r = await renderOne(outDir, file, svg);
        console.log(`  ✓ ${file}  ${r.bytes}B  ${r.dims.w}×${r.dims.h}`);
      }
      const publicPath = `/og/${file}`;
      images.push({ filename: file, publicPath, bytes: svgToPng(svg).length });
      skillImages[meta.slug][lang] = publicPath;
    }
  }

  return { images, defaultImage, moduleImages, skillImages };
}

// -------------------------------------------------------------------------
// نقطة الدخول: تعمل فقط عند تشغيل السكربت مباشرةً (ليس من integration).
// -------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);
  const outDir = args.outDir ?? resolve(process.cwd(), "dist/og");
  const siteUrl = args.siteUrl ?? "https://claudecode.no";

  console.log(`▶ build-og → ${outDir}`);
  const t0 = Date.now();
  const result = await runBuildOg({ outDir, siteUrl, manifestOnly: args.manifestOnly });
  const dt = Date.now() - t0;
  console.log(`✓ Built ${result.images.length} images in ${dt}ms`);

  // اكتب manifest.json مفيد لصفحات الـ debug و لـ integration.
  const manifestPath = join(outDir, "manifest.json");
  if (!args.manifestOnly) {
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          width: OG_W,
          height: OG_H,
          defaultImage: result.defaultImage,
          moduleImages: result.moduleImages,
          skillImages: result.skillImages,
        },
        null,
        2,
      ),
    );
    console.log(`  • manifest: ${manifestPath}`);
  }
}

const isDirectRun = (() => {
  // ESM: استدعاؤه مباشرة يحمل argv[1] === path to this script.
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
})();

if (isDirectRun) {
  main().catch((err) => {
    console.error("build-og failed:", err);
    process.exit(1);
  });
}
