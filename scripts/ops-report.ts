// ops-report — monthly self-monitoring report.
// BLUEPRINT: autonomous-content-ops-blueprint.md §3.6.
//
// Gathers stats from the past month and writes one issue + one blog draft.
// No human approval needed; the blog draft stays unpublished (draft: true) and
// the issue is purely informational.
//
// Dry-run safe: without GH_TOKEN it prints the report instead of opening an issue.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { verifyAndPublish } from "./_auto-publish.ts";

const SKILLS_DIR = join(process.cwd(), "content/skills");
const BLOG_DIR = join(process.cwd(), "content/blog");

interface MonthRange {
  label: string;
  firstDay: string;
  lastDay: string;
}

function previousMonthRange(now = new Date()): MonthRange {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setDate(d.getDate() - 1); // last day of previous month
  const lastDay = d.toISOString().slice(0, 10);
  const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const monthName = d.toLocaleString("en-GB", { month: "long", year: "numeric" });
  return { label: monthName, firstDay, lastDay };
}

function ghJson(args: string[]): unknown[] {
  try {
    const out = execFileSync("gh", args, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
    return JSON.parse(out || "[]") as unknown[];
  } catch {
    return [];
  }
}

function countWorkflowRuns(range: MonthRange): { success: number; failure: number } {
  const runs = ghJson([
    "run", "list",
    "--created", `${range.firstDay}..${range.lastDay}`,
    "--limit", "1000",
    "--json", "conclusion",
  ]) as Array<{ conclusion: string }>;
  return {
    success: runs.filter((r) => r.conclusion === "success").length,
    failure: runs.filter((r) => r.conclusion === "failure").length,
  };
}

function countIssues(range: MonthRange, labels?: string): { opened: number; closed: number } {
  const search = `created:${range.firstDay}..${range.lastDay}${labels ? ` label:${labels}` : ""}`;
  const open = ghJson(["issue", "list", "--search", search, "--state", "open", "--json", "number"]) as Array<unknown>;
  const closed = ghJson(["issue", "list", "--search", search, "--state", "closed", "--json", "number"]) as Array<unknown>;
  return { opened: open.length + closed.length, closed: closed.length };
}

function countBotPRs(range: MonthRange): number {
  const search = `created:${range.firstDay}..${range.lastDay} author:claude-code-learn-bot`;
  const prs = ghJson(["pr", "list", "--search", search, "--state", "all", "--json", "number"]) as Array<unknown>;
  return prs.length;
}

function skillStats(range: MonthRange): { discovered: number; archived: number; verified: number } {
  if (!existsSync(SKILLS_DIR)) return { discovered: 0, archived: 0, verified: 0 };
  const slugs = readdirSync(SKILLS_DIR).filter((n) => statSync(join(SKILLS_DIR, n)).isDirectory());
  let discovered = 0;
  let archived = 0;
  let verified = 0;
  for (const slug of slugs) {
    const fm = parseYamlFrontmatter(join(SKILLS_DIR, slug, "meta.yaml"));
    if (fm?.archived) archived++;
    if (fm?.lastVerified && fm.lastVerified >= range.firstDay && fm.lastVerified <= range.lastDay) {
      verified++;
      // A skill whose meta.yaml was created during the range and isn't the
      // sample is considered "discovered". We approximate by checking whether
      // its first snapshot was written in the same period.
      const snap = join(process.cwd(), "content/snapshots/skills", `${slug}.hash`);
      if (existsSync(snap)) {
        const mtime = statSync(snap).mtime.toISOString().slice(0, 10);
        if (mtime >= range.firstDay && mtime <= range.lastDay) discovered++;
      }
    }
  }
  return { discovered, archived, verified };
}

function parseYamlFrontmatter(path: string): Record<string, unknown> | undefined {
  try {
    return parseYaml(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function buildReport(range: MonthRange): string {
  const runs = countWorkflowRuns(range);
  const automationIssues = countIssues(range, "automation-failure");
  const productionIssues = countIssues(range, "production");
  const botPRs = countBotPRs(range);
  const skills = skillStats(range);

  return [
    `## Operations report — ${range.label}`,
    "",
    `Period: ${range.firstDay} → ${range.lastDay}`,
    "",
    "### Workflow runs",
    `- Successful: ${runs.success}`,
    `- Failed: ${runs.failure}`,
    "",
    "### Issues",
    `- Automation failures opened/closed: ${automationIssues.opened}/${automationIssues.closed}`,
    `- Production issues opened/closed: ${productionIssues.opened}/${productionIssues.closed}`,
    "",
    "### Pull requests",
    `- Bot-created PRs: ${botPRs}`,
    "",
    "### Skills",
    `- Discovered this month: ${skills.discovered}`,
    `- Verified this month: ${skills.verified}`,
    `- Currently archived: ${skills.archived}`,
    "",
    "---",
    "Generated automatically by `scripts/ops-report.ts`.",
  ].join("\n");
}

function writeBlogDraft(range: MonthRange, report: string): string[] | undefined {
  const slug = `ops-report-${range.firstDay.slice(0, 7)}`;
  const dir = join(BLOG_DIR, slug);
  if (existsSync(dir)) {
    console.log(`[ops-report] blog draft ${slug} already exists — skipping`);
    return undefined;
  }
  mkdirSync(dir, { recursive: true });

  const pubDate = new Date().toISOString();
  const en = `---
title: "Operations report — ${range.label}"
description: "A monthly summary of autonomous content operations on Claude Code Learn."
pubDate: "${pubDate}"
author: "Claude Code Learn"
tags:
  - "operations"
draft: true
---

${report.replace(/## /g, "### ")}
`;
  const no = `---
title: "Driftsrapport — ${range.label}"
description: "En månedlig oppsummering av autonome innholdsoperasjoner på Claude Code Learn."
pubDate: "${pubDate}"
author: "Claude Code Learn"
tags:
  - "operations"
draft: true
---

${report.replace(/## /g, "### ")}
`;
  const enPath = join(dir, "en.md");
  const noPath = join(dir, "no.md");
  writeFileSync(enPath, en, "utf-8");
  writeFileSync(noPath, no, "utf-8");
  console.log(`[ops-report] wrote blog draft ${dir}`);
  return [enPath, noPath];
}

function openIssue(title: string, body: string) {
  if (!process.env.GH_TOKEN) {
    console.warn("[ops-report] GH_TOKEN not set; printing report instead of opening issue.");
    console.log("\n--- ISSUE BODY ---\n");
    console.log(body);
    console.log("\n--- END ISSUE BODY ---\n");
    return;
  }
  try {
    execFileSync("gh", ["issue", "create", "--title", title, "--label", "operations", "--body", body]);
    console.log(`[ops-report] created issue: ${title}`);
  } catch (err) {
    console.error(`[ops-report] failed to create issue: ${(err as Error).message}`);
  }
}

async function main() {
  const range = previousMonthRange();
  const report = buildReport(range);
  console.log(report);
  openIssue(`📊 Operations report — ${range.label}`, report);
  const draftPaths = writeBlogDraft(range, report);
  if (draftPaths) {
    const result = await verifyAndPublish({
      commitMessage: `content(blog): operations report draft for ${range.label}`,
      paths: draftPaths,
      fallbackBranchPrefix: "auto/ops-report",
      prTitle: `Operations report draft — ${range.label}`,
      prBody: `Monthly operations report draft for ${range.label}.\n\n${report}`,
    });
    console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
    if (result.published && !result.deployTriggered) process.exit(1);
  }
}

main();
