// Runtime boundary for the model-generated upstream update plan.
// The npm registry version is authoritative; model output is untrusted input.

export interface ContentPatch {
  file: string;
  en: string;
  no: string;
}

export interface GlossaryTerm {
  en: string;
  no: string;
  note?: string;
}

export interface UpdatePlan {
  affected_modules: string[];
  content_patches: ContentPatch[];
  changelog_entry: { version: string; en: string; no: string };
  new_glossary_terms: GlossaryTerm[];
  sources: string[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid upstream update plan: ${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid upstream update plan: ${label} must be a non-empty string`);
  }
  return value.trim();
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizePatch(value: unknown, index: number): ContentPatch {
  const patch = record(value, `content_patches[${index}]`);
  return {
    file: requiredString(patch.file, `content_patches[${index}].file`),
    en: requiredString(patch.en, `content_patches[${index}].en`),
    no: requiredString(patch.no, `content_patches[${index}].no`),
  };
}

function normalizeGlossaryTerm(value: unknown, index: number): GlossaryTerm {
  const term = record(value, `new_glossary_terms[${index}]`);
  const note = typeof term.note === "string" && term.note.trim() ? term.note.trim() : undefined;
  return {
    en: requiredString(term.en, `new_glossary_terms[${index}].en`),
    no: requiredString(term.no, `new_glossary_terms[${index}].no`),
    ...(note ? { note } : {}),
  };
}

/**
 * Converts untrusted tool input into the exact structure the publisher uses.
 * The model-provided version is intentionally ignored so a missing, stale, or
 * invented value can never leak into paths, headings, commits, or releases.
 */
export function normalizeUpstreamUpdatePlan(input: unknown, latestVersion: string): UpdatePlan {
  if (!/^\d+\.\d+\.\d+$/.test(latestVersion)) {
    throw new Error(`Invalid authoritative upstream version: "${latestVersion}"`);
  }

  const plan = record(input, "root");
  const changelog = record(plan.changelog_entry, "changelog_entry");
  const contentPatches = array(plan.content_patches).map(normalizePatch);
  const glossaryTerms = array(plan.new_glossary_terms).map(normalizeGlossaryTerm);
  const sources = [...new Set(array(plan.sources).filter((value): value is string => typeof value === "string" && /^https?:\/\//.test(value)))];

  return {
    // Derive this field from the validated patches instead of trusting a
    // second model-authored list that can disagree with them.
    affected_modules: [...new Set(contentPatches.map((patch) => patch.file))],
    content_patches: contentPatches,
    changelog_entry: {
      version: latestVersion,
      en: requiredString(changelog.en, "changelog_entry.en"),
      no: requiredString(changelog.no, "changelog_entry.no"),
    },
    new_glossary_terms: glossaryTerms,
    sources,
  };
}
