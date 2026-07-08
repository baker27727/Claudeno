// =========================================================================
// Pagefind integration — indexes dist/ after the Astro build completes.
//
// Why programmatic (not the CLI)?
//   - Zero shell-spawn overhead in CI.
//   - One source of truth for output path / language (this file).
//   - Easy to attach `data-pagefind-body` excludes later via `excludeSelectors`.
//
// Output:
//   - dist/pagefind/  → pagefind.js + the binary index.
//   - dist/pagefind/pagefind-entry.json consumed by the SearchPalette island.
// =========================================================================

import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { createIndex } from "pagefind";
import type { AstroIntegrationLogger } from "astro";

// اسم الـ Astro integration (يظهر في رسائل `astro build`).
const INTEGRATION_NAME = "pagefind";

interface PagefindOptions {
  /** المجلد الناتج للبناء (افتراضي dist). */
  buildDir?: string;
}

export default function pagefindIntegration(options: PagefindOptions = {}) {
  // موجود لتمرير الافتراضي إن أراد المتصل تخصيص المخرج؛ لا يُستخدم داخليًا
  // لأن Astro hook يمرّر `dir` نفسه وهو المرجع الموثوق.
  const _buildDir = options.buildDir ?? "dist";
  void _buildDir;

  return {
    name: INTEGRATION_NAME,
    hooks: {
      "astro:build:done": async ({ dir, logger }: { dir: URL; logger: AstroIntegrationLogger }) => {
        const distAbs = fileURLToPath(dir);
        if (!existsSync(distAbs) || !statSync(distAbs).isDirectory()) {
          logger.warn(`[${INTEGRATION_NAME}] build dir not found: ${distAbs} — skipping index.`);
          return;
        }

        logger.info(`[${INTEGRATION_NAME}] indexing ${distAbs} …`);

        const { index, errors } = await createIndex({
          // Code fences, خلايا الـ terminal demo، إلخ — أبقها قابلة للبحث.
          excludeSelectors: ["script", "style", "noscript", ".no-pagefind"],
          // نريد كتابة الـ playground فقط في وضع التطوير (لا نُسرّبه للإنتاج).
          writePlayground: process.env.NODE_ENV !== "production",
        });

        if (errors.length) {
          logger.error(`[${INTEGRATION_NAME}] createIndex errors: ${errors.join("; ")}`);
          return;
        }
        if (!index) {
          logger.error(`[${INTEGRATION_NAME}] no index returned.`);
          return;
        }

        const result = await index.addDirectory({ path: distAbs });
        if (result.errors.length) {
          logger.error(`[${INTEGRATION_NAME}] indexing errors: ${result.errors.join("; ")}`);
          return;
        }

        // `writeFiles` يكتب ملفات الـ index إلى disk ويعيد المسار الناتج.
        // للحصول على قائمة الملفات للعدّ، نستخدم `getFiles` في الذاكرة.
        const writeResult = await index.writeFiles({ outputPath: path.join(distAbs, "pagefind") });
        if (writeResult.errors.length) {
          logger.error(`[${INTEGRATION_NAME}] writeFiles errors: ${writeResult.errors.join("; ")}`);
          return;
        }
        const { files } = await index.getFiles();

        logger.info(
          `[${INTEGRATION_NAME}] indexed ${result.page_count} page(s); wrote ${files.length} file(s) to ${path.join(
            distAbs,
            "pagefind",
          )}/.`,
        );

        await index.deleteIndex();
      },
    },
  };
}

// نقطة دخول صغيرة للاستخدام اليدوي (Node 20+):
//   node --experimental-strip-types src/integrations/pagefind.ts
if (import.meta.url === `file://${process.argv[1]}` && process.argv[1]?.endsWith("pagefind.ts")) {
  const target = process.argv[2] ?? "dist";
  const abs = path.resolve(target);
  console.log(`[pagefind] manual run against ${abs}`);
  // الـ hot-path مدفوع عبر Astro hook — هذا فقط للتطوير السريع.
}