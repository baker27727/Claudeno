// =========================================================================
// OG images integration — يُولِّد صور OG عند انتهاء `astro build`.
//
// يضمن BLUEPRINT §9 وجود /og/<id>-<lang>.png لكل وحدة في dist/
// بدون الاعتماد على خطوة shell-script إضافية في deploy.yml.
//
// ملاحظة: هوك `astro:build:done` في Astro 5 لا يمرّر `config`، لذا
// نقرأ `site` من astro.config.mjs عبر استيراد dynamic.
//
// يدوِّن في logger تعداد/حجوم الصور الناتجة، ويتجاهل البناء حين تكون
// الصور محدَّثة (يستخدم متغيّر بيئة SKIP_OG=1 للتطوير المحلي عند الحاجة).
// =========================================================================

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { AstroIntegrationLogger } from "astro";
import { runBuildOg } from "../../scripts/build-og";

const INTEGRATION_NAME = "og-images";

interface OgImagesOptions {
  /** تجاوز مجلد الإخراج. الافتراضي `<dist>/og/`. */
  outDir?: string;
  /** تعطيل التوليد (للاختبارات المحلية السريعة). */
  skip?: boolean;
  /** Override the site URL (otherwise pulled from astro.config.mjs). */
  siteUrl?: string;
}

/**
 * يحاول قراءة `site` من astro.config.mjs عبر استيراد ESM dynamic.
 * يفشل بهدوء ويعود إلى الافتراضي إن لم يستطع (config غير موجود أو
 * قيمته غير معروفة في وقت الـ hook).
 */
async function detectSiteUrl(): Promise<string> {
  try {
    const mod = (await import("../../astro.config.mjs")) as { default?: { site?: string } };
    const cfg = mod.default ?? (mod as unknown as { site?: string });
    return (cfg.site ?? "https://claude.mutaz.no").replace(/\/$/, "");
  } catch {
    return "https://claude.mutaz.no";
  }
}

export default function ogImagesIntegration(options: OgImagesOptions = {}) {
  return {
    name: INTEGRATION_NAME,
    hooks: {
      "astro:build:done": async ({
        dir,
        logger,
      }: {
        dir: URL;
        logger: AstroIntegrationLogger;
      }) => {
        if (options.skip || process.env.SKIP_OG === "1") {
          logger.info(`[${INTEGRATION_NAME}] skipped (SKIP_OG=1).`);
          return;
        }

        const distAbs = fileURLToPath(dir);
        const outDir = options.outDir ?? join(distAbs, "og");
        const siteUrl = options.siteUrl ?? (await detectSiteUrl());

        logger.info(`[${INTEGRATION_NAME}] generating OG images → ${outDir}`);
        const t0 = Date.now();
        try {
          const result = await runBuildOg({ outDir, siteUrl });
          const dt = Date.now() - t0;
          logger.info(
            `[${INTEGRATION_NAME}] built ${result.images.length} PNG(s) in ${dt}ms (1200×630).`,
          );
        } catch (err) {
          logger.error(
            `[${INTEGRATION_NAME}] generation failed: ${(err as Error).message}`,
          );
          throw err;
        }
      },
    },
  };
}