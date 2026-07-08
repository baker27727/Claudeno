// =========================================================================
// i18n — قاموس نصوص واجهة المستخدم + أدوات مساعدة (BLUEPRINT §4)
// التوجيه صريح: /en/... و /no/... — الأفضل لـ SEO.
// =========================================================================

export const LOCALES = ["en", "no"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "no";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "no";
}

/** قاموس نصوص الواجهة الثابتة (وليس محتوى الوحدات). */
export const ui = {
  en: {
    "nav.learn": "Learn",
    "nav.playground": "Playground",
    "nav.build": "Config Builder",
    "nav.reference": "Reference",
    "nav.blog": "Blog",
    "nav.catalog": "Catalog",
    "nav.changelog": "Changelog",
    "nav.quiz": "Level check",
    "nav.feedback": "Feedback",
    "hero.cta": "Start learning",
    "hero.subcta": "Try the terminal below — it's live.",
    "theme.toggle": "Toggle theme",
    "lang.switch": "Norsk",
    "module.duration": "min",
    "module.level.beginner": "Beginner",
    "module.level.intermediate": "Intermediate",
    "module.level.advanced": "Advanced",
    "module.status.not-started": "Not started",
    "module.status.in-progress": "In progress",
    "module.status.completed": "Completed",
    "module.start": "Start module",
    "module.continue": "Continue",
    "module.review": "Review",
    "module.markComplete": "Mark as complete",
    "module.completed": "Completed",
    "module.back": "All modules",
    "terminal.placeholder": "Type a command…",
    "terminal.run": "Run",
    "terminal.reset": "Reset",
    "terminal.showMe": "Show me the command",
    "terminal.hint": "Not quite — try again, or",
    "terminal.done": "Step complete!",
    "terminal.allDone": "All steps complete.",
    "quiz.next": "Next question",
    "quiz.check": "Check answer",
    "quiz.correct": "Correct!",
    "quiz.incorrect": "Not quite.",
    "quiz.score": "Score",
    "quiz.restart": "Restart quiz",
    "quiz.finished": "You finished the quiz!",
    "build.title": "Config Builder",
    "build.copy": "Copy",
    "build.copied": "Copied!",
    "build.download": "Download CLAUDE.md",
    "learn.progress": "Your progress",
    "footer.tagline": "An interactive, bilingual way to learn Claude Code.",
    "footer.nav": "Learn",
    "footer.resources": "Resources",
    "footer.links": "Links",
    "footer.docs": "Official docs",
    "footer.builtWith": "Built with Astro & Svelte.",
  },
  no: {
    "nav.learn": "Lær",
    "nav.playground": "Lekeplass",
    "nav.build": "Konfigbygger",
    "nav.reference": "Referanse",
    "nav.blog": "Blogg",
    "nav.catalog": "Katalog",
    "nav.changelog": "Endringslogg",
    "nav.quiz": "Nivåtest",
    "nav.feedback": "Tilbakemelding",
    "hero.cta": "Begynn å lære",
    "hero.subcta": "Prøv terminalen under — den er live.",
    "theme.toggle": "Bytt tema",
    "lang.switch": "English",
    "module.duration": "min",
    "module.level.beginner": "Nybegynner",
    "module.level.intermediate": "Middels",
    "module.level.advanced": "Avansert",
    "module.status.not-started": "Ikke startet",
    "module.status.in-progress": "Pågår",
    "module.status.completed": "Fullført",
    "module.start": "Start modul",
    "module.continue": "Fortsett",
    "module.review": "Se gjennom",
    "module.markComplete": "Merk som fullført",
    "module.completed": "Fullført",
    "module.back": "Alle moduler",
    "terminal.placeholder": "Skriv en kommando…",
    "terminal.run": "Kjør",
    "terminal.reset": "Nullstill",
    "terminal.showMe": "Vis meg kommandoen",
    "terminal.hint": "Ikke helt riktig — prøv igjen, eller",
    "terminal.done": "Steg fullført!",
    "terminal.allDone": "Alle steg fullført.",
    "quiz.next": "Neste spørsmål",
    "quiz.check": "Sjekk svar",
    "quiz.correct": "Riktig!",
    "quiz.incorrect": "Ikke helt riktig.",
    "quiz.score": "Poengsum",
    "quiz.restart": "Start quiz på nytt",
    "quiz.finished": "Du fullførte quizen!",
    "build.title": "Konfigbygger",
    "build.copy": "Kopier",
    "build.copied": "Kopiert!",
    "build.download": "Last ned CLAUDE.md",
    "learn.progress": "Din fremgang",
    "footer.tagline": "En interaktiv, tospråklig måte å lære Claude Code på.",
    "footer.nav": "Lær",
    "footer.resources": "Ressurser",
    "footer.links": "Lenker",
    "footer.docs": "Offisiell dokumentasjon",
    "footer.builtWith": "Bygget med Astro og Svelte.",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type UiKey = keyof (typeof ui)["en"];

/** يعيد دالة ترجمة مربوطة بلغة معيّنة. */
export function useTranslations(locale: Locale) {
  return (key: UiKey): string => ui[locale][key] ?? ui[DEFAULT_LOCALE][key];
}

/** تنسيق الأرقام/التواريخ حسب اللغة (النرويجية: 06.07.2026). */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "no" ? "nb-NO" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** يبدّل بين مسارَي اللغة مع الحفاظ على بقية المسار (لروابط hreflang). */
export function switchLocalePath(pathname: string, to: Locale): string {
  return pathname.replace(/^\/(en|no)(?=\/|$)/, `/${to}`);
}
