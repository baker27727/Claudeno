// skills/sources.ts — allowlist loader for external skill repositories.
// BLUEPRINT: autonomous-content-ops-blueprint.md §2.3, §5.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const SOURCES_PATH = join(process.cwd(), "content/sources.yaml");

export interface SourceEntry {
  id: string;
  repo: string;
  path: string;
  branch?: string;
  categories?: string[];
  discovery: boolean;
  note?: string;
}

export function loadSources(): SourceEntry[] {
  const text = readFileSync(SOURCES_PATH, "utf-8");
  return (parseYaml(text) as SourceEntry[]).filter(Boolean);
}

export function rawUrl(source: Pick<SourceEntry, "repo" | "path" | "branch">, branch = source.branch ?? "main"): string {
  return `https://raw.githubusercontent.com/${source.repo}/${branch}/${source.path}`;
}

export function skillSlugFromPath(path: string): string {
  // e.g. "skills/pdf/SKILL.md" -> "pdf"
  const parts = path.split("/").filter(Boolean);
  const file = parts[parts.length - 1] ?? "";
  if (file.toLowerCase() === "skill.md") {
    return parts[parts.length - 2] ?? parts[0];
  }
  return file.replace(/\.md$/i, "");
}

export function discoverableSources(sources = loadSources()): SourceEntry[] {
  return sources.filter((s) => s.discovery);
}
