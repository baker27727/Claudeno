// @ts-check
import { defineConfig, envField } from "astro/config";
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import pagefind from "./src/integrations/pagefind.ts";
import ogImages from "./src/integrations/og-images.ts";

// https://astro.build/config
export default defineConfig({
  site: "https://claude.mutaz.no",
  // صريح بدل الافتراضي "ignore": مخرجات البناء الثابت دومًا على شكل
  // page/index.html (شكل الشرطة المائلة الختامية) — "ignore" كان يترك كل
  // رابط داخلي بلا شرطة مائلة يتعارض ضمنيًا مع ذلك ومع صفحة SITEMAP نفسها،
  // مما يخلق احتمال محتوى مكرر (نفس الصفحة على رابطين مختلفين لمحرك البحث).
  trailingSlash: "always",
  integrations: [
    mdx(),
    svelte(),
    sitemap({
      i18n: {
        defaultLocale: "no",
        locales: { en: "en", no: "no" },
      },
      // الجذر `/` هو صفحة إعادة توجيه noindex فقط (src/pages/index.astro) —
      // إدراجها في sitemap.xml يناقض وسم robots الخاص بها.
      filter: (page) => new URL(page).pathname !== "/",
    }),
    pagefind(),
    ogImages(),
  ],
  i18n: {
    defaultLocale: "no",
    locales: ["en", "no"],
    routing: {
      prefixDefaultLocale: true,
      // بدون هذا، يتجاهل Astro أي src/pages/index.astro مخصّص ويولّد صفحة
      // إعادة توجيه عامة خاصة به (النص الذي ظهر: "Redirecting to: /en/").
      redirectToDefaultLocale: false,
    },
  },
  // متغيرات البيئة العامة (PUBLIC_*) المتاحة في `import.meta.env` على العميل
  // (BLUEPRINT §10 + quality-ci):
  //  - PUBLIC_PLAUSIBLE_DOMAIN: نطاق Plausible المُتتبَّع (مثال: "claudecode.no").
  //    إن كان فارغًا، لا يُحمَّل السكربت (خصوصية أولاً).
  //  - PUBLIC_PLAUSIBLE_HOST: رابط مثيل Plausible للاستضافة الذاتية. الافتراضي plausible.io.
  env: {
    schema: {
      PUBLIC_PLAUSIBLE_DOMAIN: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "",
      }),
      PUBLIC_PLAUSIBLE_HOST: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "https://plausible.io",
        url: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        // pagefind.js يُنشأ فقط بعد البناء في dist/pagefind/ — external حتى لا يحاول Vite حله.
        external: ["/pagefind/pagefind.js"],
      },
    },
  },
});
