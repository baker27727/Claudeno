// sources.ts — allowlist loader for content/topic-sources.yaml.
// BLUEPRINT: ai-topics-discovery-blueprint.md §3.1.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { SourceType } from "./score.ts";

const SOURCES_PATH = join(process.cwd(), "content/topic-sources.yaml");

export interface TopicSourceEntry {
  id: string;
  type: SourceType;
  url: string;
  note?: string;
}

export function loadTopicSources(): TopicSourceEntry[] {
  const text = readFileSync(SOURCES_PATH, "utf-8");
  return (parseYaml(text) as TopicSourceEntry[]).filter(Boolean);
}
