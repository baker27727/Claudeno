// Shared helpers for the audit scripts (BLUEPRINT §8).
// Deliberately dependency-light and independent from the Astro content
// layer so audits can run before `astro build` in CI.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export const CONTENT_ROOT = join(process.cwd(), "content");
export const MODULES_ROOT = join(CONTENT_ROOT, "modules");

export interface ModuleDir {
  slug: string;
  path: string;
}

export function listModuleDirs(): ModuleDir[] {
  return readdirSync(MODULES_ROOT)
    .filter((name) => statSync(join(MODULES_ROOT, name)).isDirectory())
    .map((slug) => ({ slug, path: join(MODULES_ROOT, slug) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function readYaml<T = unknown>(path: string): T {
  return parseYaml(readFileSync(path, "utf-8")) as T;
}

export function tryReadFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Recursively walks a parsed YAML/JSON value and flags any object that has
 * an "en" key without a matching "no" key (or vice versa) — the core EN/NO
 * parity rule (BLUEPRINT §4).
 */
export function walkBilingualParity(node: unknown, path: string, errors: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkBilingualParity(item, `${path}[${i}]`, errors));
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const keys = Object.keys(obj);
    const hasEn = keys.includes("en");
    const hasNo = keys.includes("no");
    if (hasEn !== hasNo) {
      errors.push(`${path}: has "${hasEn ? "en" : "no"}" but is missing its "${hasEn ? "no" : "en"}" counterpart`);
    } else if (hasEn && hasNo) {
      if (typeof obj.en === "string" && obj.en.trim() === "") errors.push(`${path}.en: empty string`);
      if (typeof obj.no === "string" && obj.no.trim() === "") errors.push(`${path}.no: empty string`);
    }
    for (const [key, value] of Object.entries(obj)) {
      walkBilingualParity(value, path ? `${path}.${key}` : key, errors);
    }
  }
}

export function normalizeCommand(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Extracts command-like strings from fenced code blocks in an .mdx lesson:
 * - ```bash / ```sh blocks: every non-empty, non-comment line.
 * - untagged blocks whose (single-line) content starts with "/": slash commands.
 */
export function extractCommandsFromMdx(source: string): string[] {
  const commands: string[] = [];
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(source))) {
    const [, lang, body] = match;
    if (lang === "bash" || lang === "sh") {
      for (const line of body.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) commands.push(normalizeCommand(trimmed));
      }
    } else if (lang === "") {
      const trimmed = body.trim();
      if (trimmed.startsWith("/")) commands.push(normalizeCommand(trimmed));
    }
  }
  return commands;
}

export function fail(scriptName: string, errors: string[]): never {
  console.error(`\n✗ ${scriptName} found ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}

export function pass(scriptName: string): void {
  console.log(`✓ ${scriptName} passed`);
}
