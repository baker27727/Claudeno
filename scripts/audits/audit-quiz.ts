// audit-quiz — fails if `correct` doesn't match an option id, a question has
// fewer than 3 options, or option/question ids are duplicated.
// BLUEPRINT §3.3 / §8.

import { join } from "node:path";
import { existsSync } from "node:fs";
import { fail, listModuleDirs, pass, readYaml } from "./_util.ts";

interface QuizOption {
  id: string;
}
interface QuizQuestion {
  id: string;
  options: QuizOption[];
  correct: string;
}
interface QuizFile {
  questions: QuizQuestion[];
}

const errors: string[] = [];

for (const mod of listModuleDirs()) {
  const path = join(mod.path, "quiz.yaml");
  if (!existsSync(path)) continue;

  const quiz = readYaml<QuizFile>(path);
  const seenQuestionIds = new Set<string>();

  for (const q of quiz.questions ?? []) {
    if (seenQuestionIds.has(q.id)) {
      errors.push(`${mod.slug}/quiz.yaml: duplicate question id "${q.id}"`);
    }
    seenQuestionIds.add(q.id);

    if ((q.options ?? []).length < 3) {
      errors.push(`${mod.slug}/quiz.yaml: question "${q.id}" has fewer than 3 options`);
    }

    const optionIds = (q.options ?? []).map((o) => o.id);
    const seenOptionIds = new Set<string>();
    for (const id of optionIds) {
      if (seenOptionIds.has(id)) {
        errors.push(`${mod.slug}/quiz.yaml: question "${q.id}" has duplicate option id "${id}"`);
      }
      seenOptionIds.add(id);
    }

    if (!optionIds.includes(q.correct)) {
      errors.push(`${mod.slug}/quiz.yaml: question "${q.id}" has correct="${q.correct}" matching no option`);
    }
  }
}

if (errors.length > 0) fail("audit-quiz", errors);
pass("audit-quiz");
