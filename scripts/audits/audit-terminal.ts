// audit-terminal — fails if a command shown in a lesson's code blocks is
// missing from terminal.yaml, or a terminal.yaml step is never mentioned in
// either the en.mdx or no.mdx lesson body. BLUEPRINT §8.

import { join } from "node:path";
import { existsSync } from "node:fs";
import { extractCommandsFromMdx, fail, listModuleDirs, normalizeCommand, pass, readYaml, tryReadFile } from "./_util.ts";

interface TerminalStep {
  id: string;
  command: string;
  accepts_also?: string[];
}
interface TerminalFile {
  steps: TerminalStep[];
}

const errors: string[] = [];

for (const mod of listModuleDirs()) {
  const terminalPath = join(mod.path, "terminal.yaml");
  if (!existsSync(terminalPath)) continue;

  const terminal = readYaml<TerminalFile>(terminalPath);
  const knownCommands = new Set<string>();
  for (const step of terminal.steps ?? []) {
    knownCommands.add(normalizeCommand(step.command));
    for (const alt of step.accepts_also ?? []) knownCommands.add(normalizeCommand(alt));
  }

  const en = tryReadFile(join(mod.path, "en.mdx")) ?? "";
  const no = tryReadFile(join(mod.path, "no.mdx")) ?? "";
  const mentioned = new Set([...extractCommandsFromMdx(en), ...extractCommandsFromMdx(no)]);

  for (const cmd of mentioned) {
    if (!knownCommands.has(cmd)) {
      errors.push(`${mod.slug}: lesson shows "${cmd}" but it is not in terminal.yaml (command or accepts_also)`);
    }
  }

  for (const step of terminal.steps ?? []) {
    const normalized = normalizeCommand(step.command);
    if (!mentioned.has(normalized)) {
      errors.push(`${mod.slug}/terminal.yaml: step "${step.id}" ("${step.command}") is not shown in en.mdx or no.mdx`);
    }
  }
}

if (errors.length > 0) fail("audit-terminal", errors);
pass("audit-terminal");
