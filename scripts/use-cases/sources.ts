// sources.ts — curated source URLs for each professional use-case domain.
//
// These URLs are fetched by research.ts and fed to the generation prompt.
// Only authoritative or highly relevant sources should be listed here; this
// is the guardrail that prevents the AI from inventing facts from unreliable
// places.

export interface SourceSet {
  /** Primary upstream / vendor documentation. */
  docs: string[];
  /** Optional supplementary reading (blogs, guides, changelogs). */
  refs: string[];
}

export const USE_CASE_SOURCES: Record<string, SourceSet> = {
  "marketing-with-claude": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: ["https://www.anthropic.com/news"],
  },
  "seo-workflow-with-claude": {
    docs: [
      "https://docs.anthropic.com/en/docs/claude-code/overview",
      "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
    ],
    refs: ["https://www.anthropic.com/news"],
  },
  "excel-and-data-analysis": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: [
      "https://support.microsoft.com/en-us/excel",
      "https://pandas.pydata.org/docs/",
    ],
  },
  "statistics-and-reporting": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: [
      "https://docs.scipy.org/doc/scipy/",
      "https://pandas.pydata.org/docs/",
    ],
  },
  "project-management-with-claude": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: ["https://www.anthropic.com/news"],
  },
  "writing-with-claude": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: ["https://www.anthropic.com/news"],
  },
  "customer-support-with-claude": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: ["https://www.anthropic.com/news"],
  },
  "social-media-with-claude": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: ["https://www.anthropic.com/news"],
  },
  "research-and-summarization-with-claude": {
    docs: ["https://docs.anthropic.com/en/docs/claude-code/overview"],
    refs: ["https://www.anthropic.com/news"],
  },
};

/** All professions currently tracked by the automation pipeline. */
export const TRACKED_PROFESSIONS = Object.keys(USE_CASE_SOURCES);

/** Flat list of every URL we will fetch for a given profession. */
export function urlsForProfession(profession: string): string[] {
  const set = USE_CASE_SOURCES[profession];
  if (!set) return [];
  return [...set.docs, ...set.refs];
}
