// =========================================================================
// Module content aggregation — joins the per-module collections
// (moduleMeta / moduleTerminal / moduleQuiz / moduleDocs) by folder slug.
// Collections are loaded via astro:content glob loaders (content.config.ts);
// their generated `id` is the file path relative to content/modules, e.g.
// "01-getting-started/meta". `data.id` (from meta.yaml) is the human slug
// used in URLs, e.g. "getting-started".
// =========================================================================

import { getCollection, type CollectionEntry } from "astro:content";

export interface ModuleData {
  slug: string; // folder slug, e.g. "01-getting-started"
  id: string; // human id from meta.yaml, e.g. "getting-started"
  meta: CollectionEntry<"moduleMeta">["data"];
  terminal: CollectionEntry<"moduleTerminal">["data"];
  quiz: CollectionEntry<"moduleQuiz">["data"];
  doc: { en: CollectionEntry<"moduleDocs">; no: CollectionEntry<"moduleDocs"> };
}

function folderOf(entryId: string): string {
  return entryId.replace(/\/[^/]+$/, "");
}

export async function getAllModules(): Promise<ModuleData[]> {
  const [metas, terminals, quizzes, docs] = await Promise.all([
    getCollection("moduleMeta"),
    getCollection("moduleTerminal"),
    getCollection("moduleQuiz"),
    getCollection("moduleDocs"),
  ]);

  const modules = metas.map((meta): ModuleData => {
    const slug = folderOf(meta.id);
    const terminal = terminals.find((t) => folderOf(t.id) === slug);
    const quiz = quizzes.find((q) => folderOf(q.id) === slug);
    const en = docs.find((d) => d.id === `${slug}/en`);
    const no = docs.find((d) => d.id === `${slug}/no`);
    if (!terminal || !quiz || !en || !no) {
      throw new Error(`Module "${slug}" is missing one of terminal.yaml/quiz.yaml/en.mdx/no.mdx`);
    }
    return { slug, id: meta.data.id, meta: meta.data, terminal: terminal.data, quiz: quiz.data, doc: { en, no } };
  });

  return modules.sort((a, b) => a.meta.order - b.meta.order);
}

export async function getModuleById(id: string): Promise<ModuleData | undefined> {
  const modules = await getAllModules();
  return modules.find((m) => m.id === id);
}
