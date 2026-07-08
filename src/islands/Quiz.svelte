<script lang="ts">
  // Bilingual quiz island (BLUEPRINT §3.3 / §5). Used both for per-module
  // quizzes and the standalone placement quiz on /quiz.
  //
  // للـ placement quiz: يمرّر الصفحة مستويات كل سؤال عبر prop `levels`.
  // عند الانتهاء يحسب breakdown عبر src/lib/quiz-rec.ts ويعرض بطاقة النتيجة
  // + توصية أول وحدة ينقر عليها المتعلم.
  //
  // لكويزات الوحدات داخل الدرس: تُمرَّر دون `levels`/`onFinish`، فيعمل
  // كنسخة بسيطة (Score + Restart) كما في السابق.
  import { computeBreakdown, recommendModule, levelLabel, type QuizLevel } from "../lib/quiz-rec";

  interface Option {
    id: string;
    en: string;
    no: string;
  }
  interface Question {
    id: string;
    prompt: { en: string; no: string };
    options: Option[];
    correct: string;
    explain: { en: string; no: string };
  }

  let {
    questions,
    locale = "en",
    levels = [],
    onFinish,
  }: {
    questions: Question[];
    locale?: "en" | "no";
    /** مستوى كل سؤال (index-based). اختياري — إذا غاب، يبقى breakdown فارغًا. */
    levels?: QuizLevel[];
    onFinish?: (result: {
      score: number;
      total: number;
      byLevel: Record<QuizLevel, { correct: number; total: number }>;
    }) => void;
  } = $props();

  const strings = {
    en: { check: "Check answer", next: "Next question", score: "Score", restart: "Restart quiz", finished: "You finished the quiz!", correct: "Correct!", incorrect: "Not quite.", recommended: "We recommend starting with", viewModule: "Start module", breakdownTitle: "Your score by level" },
    no: { check: "Sjekk svar", next: "Neste spørsmål", score: "Poengsum", restart: "Start quiz på nytt", finished: "Du fullførte quizen!", correct: "Riktig!", incorrect: "Ikke helt riktig.", recommended: "Vi anbefaler å starte med", viewModule: "Start modulen", breakdownTitle: "Din poengsum per nivå" },
  } as const;

  const t = $derived(strings[locale]);

  let index = $state(0);
  let selected = $state<string | null>(null);
  let checked = $state(false);
  let score = $state(0);
  let done = $state(false);

  // تتبع الإجابات الصحيحة لكل سؤال، لأن done=true يمسح state السؤال الحالي.
  let perQuestionWasCorrect: boolean[] = $state([]);

  const question = $derived(questions[index]);
  const isCorrect = $derived(checked && selected === question?.correct);

  function select(id: string) {
    if (checked) return;
    selected = id;
  }

  function check() {
    if (!selected || checked) return;
    checked = true;
    if (selected === question.correct) score += 1;
  }

  function next() {
    // سجّل حالة السؤال الحالي قبل الانتقال.
    perQuestionWasCorrect[index] = isCorrect;

    if (index + 1 >= questions.length) {
      done = true;
      const byLevel: Record<QuizLevel, { correct: number; total: number }> = {
        beginner: { correct: 0, total: 0 },
        intermediate: { correct: 0, total: 0 },
        advanced: { correct: 0, total: 0 },
      };
      for (let i = 0; i < questions.length; i++) {
        const lvl = levels[i];
        const ok = perQuestionWasCorrect[i] ?? false;
        if (lvl) {
          byLevel[lvl].total += 1;
          if (ok) byLevel[lvl].correct += 1;
        }
      }
      onFinish?.({ score, total: questions.length, byLevel });
      return;
    }
    index += 1;
    selected = null;
    checked = false;
  }

  function restart() {
    index = 0;
    selected = null;
    checked = false;
    score = 0;
    done = false;
    perQuestionWasCorrect = [];
  }

  // breakdown للتوصية — يُحسب فقط بعد done=true للـ placement quiz
  // (أي عندما levels ليست فارغة). نعتمد على derived يعتمد على score
  // و perQuestionWasCorrect لإعادة الحساب عند restart ثم إنهاء جديد.
  const answeredMeta = $derived(
    questions.map((q, i) => ({
      level: (levels[i] ?? "beginner") as QuizLevel,
      correct: perQuestionWasCorrect[i] ?? false,
    })),
  );
  const breakdown = $derived.by(() => {
    if (!done || levels.length === 0) return null;
    return computeBreakdown(answeredMeta);
  });
  const recommendation = $derived.by(() => {
    if (!breakdown) return null;
    return recommendModule(breakdown, locale);
  });
</script>

<div class="quiz">
  {#if done}
    <p class="quiz__finished">{t.finished}</p>
    <p class="quiz__score">{t.score}: {score} / {questions.length}</p>

    {#if breakdown && recommendation}
      <section class="quiz__result" aria-label={t.breakdownTitle}>
        <h3 class="quiz__breakdown-title">{t.breakdownTitle}</h3>
        <ul class="quiz__levels">
          {#each ["beginner", "intermediate", "advanced"] as QuizLevel[] as lvl}
            {@const stat = breakdown.byLevel[lvl]}
            <li class="quiz__level quiz__level--{lvl}">
              <span class="quiz__level-name">{levelLabel(lvl, locale)}</span>
              <span class="quiz__level-bar" aria-hidden="true">
                <span
                  class="quiz__level-fill"
                  style="width: {Math.round(stat.pct * 100)}%"
                ></span>
              </span>
              <span class="quiz__level-numbers">
                {stat.correct}/{stat.total}
              </span>
            </li>
          {/each}
        </ul>

        <div class="quiz__rec">
          <p class="quiz__rec-label">{t.recommended}</p>
          <a class="quiz__rec-cta" href={recommendation.href}>
            <span class="quiz__rec-title">{recommendation.moduleTitle}</span>
            <span class="quiz__rec-arrow" aria-hidden="true">→</span>
          </a>
          <p class="quiz__rec-reason">{recommendation.reason}</p>
        </div>
      </section>
    {/if}

    <button type="button" class="quiz__primary" onclick={restart}>{t.restart}</button>
  {:else if question}
    <p class="quiz__meta">{index + 1} / {questions.length}</p>
    <p class="quiz__prompt">{question.prompt[locale]}</p>
    <div class="quiz__options" role="radiogroup">
      {#each question.options as option (option.id)}
        <button
          type="button"
          class="quiz__option"
          class:quiz__option--selected={selected === option.id}
          class:quiz__option--correct={checked && option.id === question.correct}
          class:quiz__option--wrong={checked && selected === option.id && option.id !== question.correct}
          role="radio"
          aria-checked={selected === option.id}
          disabled={checked}
          onclick={() => select(option.id)}
        >
          {option[locale]}
        </button>
      {/each}
    </div>

    {#if checked}
      <p class="quiz__feedback" class:quiz__feedback--ok={isCorrect} aria-live="polite">
        {isCorrect ? t.correct : t.incorrect}
        {question.explain[locale]}
      </p>
      <button type="button" class="quiz__primary" onclick={next}>{t.next}</button>
    {:else}
      <button type="button" class="quiz__primary" onclick={check} disabled={!selected}>{t.check}</button>
    {/if}
  {/if}
</div>

<style>
  .quiz {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .quiz__meta {
    margin: 0 0 var(--space-2);
    color: var(--fg-muted);
    font-size: 0.8125rem;
  }
  .quiz__prompt {
    margin: 0 0 var(--space-4);
    font-size: 1.0625rem;
    font-weight: 600;
  }
  .quiz__options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .quiz__option {
    text-align: left;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
    cursor: pointer;
    font: inherit;
  }
  .quiz__option:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .quiz__option--selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .quiz__option--correct {
    border-color: var(--ok);
    box-shadow: 0 0 0 1px var(--ok);
  }
  .quiz__option--wrong {
    border-color: var(--err);
    box-shadow: 0 0 0 1px var(--err);
  }
  .quiz__option:disabled {
    cursor: default;
  }
  .quiz__feedback {
    margin: 0 0 var(--space-4);
    color: var(--err);
    font-size: 0.9375rem;
  }
  .quiz__feedback--ok {
    color: var(--ok);
  }
  .quiz__primary {
    background: var(--accent);
    color: var(--accent-fg);
    border: none;
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-5);
    font-weight: 600;
    cursor: pointer;
    font: inherit;
  }
  .quiz__primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .quiz__finished {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 var(--space-2);
  }
  .quiz__score {
    color: var(--fg-muted);
    margin: 0 0 var(--space-6);
  }
  .quiz__result {
    margin: 0 0 var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--accent);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--accent) 8%, var(--bg-elev));
  }
  .quiz__breakdown-title {
    margin: 0 0 var(--space-4);
    font-size: 0.9375rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fg-muted);
  }
  .quiz__levels {
    list-style: none;
    margin: 0 0 var(--space-6);
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .quiz__level {
    display: grid;
    grid-template-columns: 8rem 1fr 3rem;
    align-items: center;
    gap: var(--space-3);
    font-size: 0.875rem;
  }
  .quiz__level-name {
    color: var(--fg-muted);
  }
  .quiz__level-bar {
    height: 0.5rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    overflow: hidden;
    position: relative;
  }
  .quiz__level-fill {
    display: block;
    height: 100%;
    background: var(--accent);
    border-radius: var(--radius-full);
    transition: width var(--dur) var(--ease);
  }
  .quiz__level--beginner .quiz__level-fill {
    background: var(--ok);
  }
  .quiz__level--intermediate .quiz__level-fill {
    background: var(--warn);
  }
  .quiz__level--advanced .quiz__level-fill {
    background: var(--err);
  }
  .quiz__level-numbers {
    text-align: right;
    color: var(--fg-muted);
    font-variant-numeric: tabular-nums;
  }
  .quiz__rec {
    border-top: 1px solid var(--border);
    padding-top: var(--space-5);
  }
  .quiz__rec-label {
    margin: 0 0 var(--space-2);
    color: var(--fg-muted);
    font-size: 0.875rem;
  }
  .quiz__rec-cta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--accent);
    color: var(--accent-fg);
    border-radius: var(--radius);
    text-decoration: none;
    font-weight: 600;
    margin-bottom: var(--space-3);
    transition: transform var(--dur-fast) var(--ease);
  }
  .quiz__rec-cta:hover {
    transform: translateY(-1px);
  }
  .quiz__rec-title {
    flex: 1;
  }
  .quiz__rec-arrow {
    font-size: 1.125rem;
  }
  .quiz__rec-reason {
    margin: 0;
    color: var(--fg-muted);
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  @media (max-width: 480px) {
    .quiz__level {
      grid-template-columns: 6rem 1fr 2.5rem;
    }
  }
</style>