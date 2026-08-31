// Graceful handling for an exhausted Anthropic API credit balance.
//
// Credit exhaustion is an external, recoverable availability condition rather
// than a content/code defect. Model-backed jobs should leave their pending
// inputs untouched, emit a visible workflow warning, and retry on the next
// scheduled/manual run instead of opening one failure issue per pipeline.

import { appendFileSync } from "node:fs";

export interface CreditDeferralOptions {
  warn?: (message: string) => void;
  writeSummary?: (markdown: string) => void;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause === undefined ? error.message : `${error.message}\n${errorText(cause)}`;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Matches Anthropic's current message plus stable variants of its error code. */
export function isAnthropicCreditError(error: unknown): boolean {
  const text = errorText(error);
  return (
    /credit balance is too low/i.test(text) ||
    /credit[_\s-]*balance[_\s-]*too[_\s-]*low/i.test(text) ||
    /insufficient[_\s-]*credits?/i.test(text)
  );
}

function appendWorkflowSummary(markdown: string): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  try {
    appendFileSync(summaryPath, markdown, "utf-8");
  } catch (error) {
    console.warn(`Could not write the Anthropic credit deferral summary: ${errorText(error)}`);
  }
}

function escapeWorkflowCommand(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

/**
 * Returns true only for credit exhaustion. Callers should return normally in
 * that case and preserve their existing fatal-error path for every other error.
 */
export function deferOnAnthropicCreditError(
  error: unknown,
  task: string,
  options: CreditDeferralOptions = {},
): boolean {
  if (!isAnthropicCreditError(error)) return false;

  const message =
    `Deferred ${task}: the Anthropic API credit balance is exhausted. ` +
    "No partial output was published; the next scheduled or manual run will retry automatically after credits are restored.";
  const warn = options.warn ?? ((text: string) => console.warn(`::warning title=Anthropic API credits exhausted::${escapeWorkflowCommand(text)}`));
  const writeSummary = options.writeSummary ?? appendWorkflowSummary;

  warn(message);
  writeSummary(
    [
      "### ⏸ Anthropic-backed task deferred",
      "",
      `- Task: ${task}`,
      "- Reason: Anthropic API credit balance exhausted",
      "- Safety: no partial generated output was published",
      "- Recovery: restore API credits, then wait for the next schedule or dispatch this workflow manually",
      "",
    ].join("\n"),
  );
  return true;
}
