// =========================================================================
// quiz-rec — منطق توصية الوحدة الأولى بناءً على نتيجة Placement quiz.
//
// يُستهلك من Astro page (/[lang]/quiz.astro) بعد انتهاء الـ quiz.
// الفكرة: نُجمّع نسبة الإجابات الصحيحة لكل مستوى (beginner / intermediate
// / advanced)، ثم نُقرّر:
//   - إذا كان المستوى المبتدئ ضعيفًا → نوصي بـ Getting Started.
//   - إذا كان متوسطًا → نوصي بـ CLI Basics أو Permissions & Settings.
//   - إذا كان متقدمًا قويًا → نوصي بـ Subagents أو MCP Servers.
//
// العتبات قابلة للضبط عبر THRESHOLDS أدناه.
// =========================================================================

export type QuizLevel = "beginner" | "intermediate" | "advanced";

export interface LevelBreakdown {
  level: QuizLevel;
  /** الإجابات الصحيحة في أسئلة هذا المستوى */
  correct: number;
  /** إجمالي أسئلة هذا المستوى */
  total: number;
  /** النسبة 0..1 (0 إذا total === 0) */
  pct: number;
}

export interface QuizBreakdown {
  /** تفصيل حسب المستوى */
  byLevel: Record<QuizLevel, LevelBreakdown>;
  /** إجمالي عبر كل المستويات */
  totalCorrect: number;
  totalQuestions: number;
}

export interface QuizQuestionMeta {
  /** أي مستوى تنتمي إليه هذه السؤال */
  level: QuizLevel;
  /** هل أُجيب عنها إجابة صحيحة */
  correct: boolean;
}

export interface QuizRecommendation {
  /** المستوى الأقوى الذي يناسب المتعلّم */
  level: QuizLevel;
  /** slug الوحدة الموصى بها (مثلاً "getting-started") */
  moduleId: string;
  /** عنوان الوحدة حسب اللغة */
  moduleTitle: string;
  /** رابط الـ CTA داخل الموقع */
  href: string;
  /** نصّ قصير يُفسّر لماذا هذه الوحدة */
  reason: string;
}

// -------------------------------------------------------------------------
// عتبات التصنيف — قابلة للضبط.
// النسبة تُحسب من الإجابات الصحيحة في كل مستوى.
// beginner_weak  = ≤40%   → ابدأ من الصفر
// intermediate  = 40–70% → طبقة وسطى
// advanced_strong = ≥70% → تجاوز الأساسيات
// -------------------------------------------------------------------------
const WEAK_PCT = 0.4;
const STRONG_PCT = 0.7;

// -------------------------------------------------------------------------
// يقرأ تفصيل الـ breakdown من الأسئلة المُجابة.
// -------------------------------------------------------------------------
export function computeBreakdown(answered: QuizQuestionMeta[]): QuizBreakdown {
  const counts: Record<QuizLevel, { correct: number; total: number }> = {
    beginner: { correct: 0, total: 0 },
    intermediate: { correct: 0, total: 0 },
    advanced: { correct: 0, total: 0 },
  };

  for (const q of answered) {
    counts[q.level].total += 1;
    if (q.correct) counts[q.level].correct += 1;
  }

  const byLevel: Record<QuizLevel, LevelBreakdown> = {
    beginner: pct(counts.beginner),
    intermediate: pct(counts.intermediate),
    advanced: pct(counts.advanced),
  };

  const totalCorrect = answered.filter((q) => q.correct).length;
  return { byLevel, totalCorrect, totalQuestions: answered.length };
}

function pct(c: { correct: number; total: number }): LevelBreakdown {
  return {
    level: "beginner", // يُكتب لاحقًا في حلقة التحويل
    correct: c.correct,
    total: c.total,
    pct: c.total === 0 ? 0 : c.correct / c.total,
  };
}

// -------------------------------------------------------------------------
// يختار الوحدة الموصى بها بناءً على الـ breakdown.
// إذا كان المستوى المبتدئ ضعيفًا أبدًا من البداية.
// غير ذلك نقفز إلى المستوى الأقوى الذي بلغت نسبته ≥ STRONG_PCT.
// -------------------------------------------------------------------------
export function recommendModule(
  breakdown: QuizBreakdown,
  lang: "en" | "no",
): QuizRecommendation {
  const reason =
    lang === "no"
      ? {
          beginner_weak: "Begynn med det grunnleggende — du får et solid fundament før du går videre.",
          beginner_strong: "Grunnleggende sitter — gå videre til kommandolinjen og innstillinger.",
          intermediate_strong: "Mellomnivået er solid — utforsk mer avanserte emner.",
          advanced_strong: "Du behersker det meste — prøv de avanserte modulene.",
          fallback: "Start med den første modulen for å bygge et solid grunnlag.",
        }
      : {
          beginner_weak: "Start with the fundamentals — build a solid base before moving on.",
          beginner_strong: "Basics are solid — move on to the CLI and settings.",
          intermediate_strong: "Intermediate is solid — explore more advanced topics.",
          advanced_strong: "You've got this — try the advanced modules.",
          fallback: "Start with the first module to build a solid foundation.",
        };

  // قاعدة 1: إذا لم تتجاوز الإجابات في مستوى المبتدئين WEAK_PCT → ابدأ من الصفر.
  const beginner = breakdown.byLevel.beginner;
  if (beginner.total > 0 && beginner.pct < WEAK_PCT) {
    return {
      level: "beginner",
      moduleId: "getting-started",
      moduleTitle: titleFor("getting-started", lang),
      href: `/${lang}/learn/getting-started`,
      reason: reason.beginner_weak,
    };
  }

  // قاعدة 2: إذا كان المبتدئ ≥ STRONG_PCT، انتقل إلى المستوى التالي.
  // نختار cli-basics بشكل افتراضي، و permissions-and-settings كبديل إذا
  // كانت إجابات المستوى المتوسط تميل نحو permissions.
  if (beginner.pct >= STRONG_PCT) {
    const intermediate = breakdown.byLevel.intermediate;
    if (intermediate.pct >= STRONG_PCT) {
      // قوي في الاثنين → تقدّم مباشرة إلى المستوى المتقدم.
      return advancedPick(breakdown, lang, reason);
    }
    // اختر بين cli-basics و permissions-and-settings بناءً على نسبة الـ intermediate
    // (إذا كانت منخفضة جدًا قد يحتاج مراجعة أساسيات CLI أولًا).
    if (intermediate.total > 0 && intermediate.pct < WEAK_PCT) {
      return {
        level: "beginner",
        moduleId: "cli-basics",
        moduleTitle: titleFor("cli-basics", lang),
        href: `/${lang}/learn/cli-basics`,
        reason: reason.beginner_strong,
      };
    }
    return {
      level: "intermediate",
      moduleId: "permissions-and-settings",
      moduleTitle: titleFor("permissions-and-settings", lang),
      href: `/${lang}/learn/permissions-and-settings`,
      reason: reason.intermediate_strong,
    };
  }

  // قاعدة 3: في المنطقة الوسطى (40–70% للمبتدئين) → ابدأ بالـ CLI كجسر طبيعي.
  return {
    level: "beginner",
    moduleId: "cli-basics",
    moduleTitle: titleFor("cli-basics", lang),
    href: `/${lang}/learn/cli-basics`,
    reason: reason.beginner_strong,
  };
}

function advancedPick(
  breakdown: QuizBreakdown,
  lang: "en" | "no",
  reason: Record<string, string>,
): QuizRecommendation {
  const subagents = breakdown.byLevel.advanced;
  // إذا كان advanced قويًا جدًا (≥ 90%) نرشّح mcp-servers كذروة.
  // غير ذلك نرشّح subagents أولًا (مقدمة قبل MCP).
  if (subagents.pct >= 0.9) {
    return {
      level: "advanced",
      moduleId: "mcp-servers",
      moduleTitle: titleFor("mcp-servers", lang),
      href: `/${lang}/learn/mcp-servers`,
      reason: reason.advanced_strong,
    };
  }
  return {
    level: "advanced",
    moduleId: "subagents",
    moduleTitle: titleFor("subagents", lang),
    href: `/${lang}/learn/subagents`,
    reason: reason.advanced_strong,
  };
}

function titleFor(slug: string, lang: "en" | "no"): string {
  const titles: Record<string, { en: string; no: string }> = {
    "getting-started": {
      en: "Getting Started with Claude Code",
      no: "Kom i gang med Claude Code",
    },
    "cli-basics": { en: "CLI Basics", no: "CLI-grunnleggende" },
    "permissions-and-settings": {
      en: "Permissions & Settings",
      no: "Tillatelser og innstillinger",
    },
    "slash-commands": { en: "Slash Commands", no: "Slash-kommandoer" },
    subagents: { en: "Subagents", no: "Underagenter" },
    "mcp-servers": { en: "MCP Servers", no: "MCP-tjenere" },
  };
  return titles[slug]?.[lang] ?? slug;
}

// -------------------------------------------------------------------------
// وسم المستوى لكل سؤال — يُمرَّر من quiz.astro حيث تُسحب الـ level من
// الوحدة الأصلية (meta.yaml.level). هذا يضمن أن الأسئلة المنسوخة من
// quiz.yaml تُسند إلى المستوى الصحيح.
// -------------------------------------------------------------------------
export function levelLabel(level: QuizLevel, lang: "en" | "no"): string {
  return lang === "no"
    ? level === "beginner"
      ? "Nybegynner"
      : level === "intermediate"
        ? "Middels"
        : "Avansert"
    : level === "beginner"
      ? "Beginner"
      : level === "intermediate"
        ? "Intermediate"
        : "Advanced";
}