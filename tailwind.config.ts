import type { Config } from "tailwindcss";

// Tailwind v4 is CSS-first (see src/styles/global.css `@import "tailwindcss"`).
// This file is kept for editor tooling and explicit content globs; theme values
// live as CSS custom properties in src/styles/tokens.css (BLUEPRINT §6).
export default {
  content: ["./src/**/*.{astro,html,js,ts,jsx,tsx,svelte,md,mdx}"],
} satisfies Config;
