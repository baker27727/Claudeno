// _auto-publish — shared "verify, then publish without waiting for a human"
// gate used by generate-update.ts, audit-freshness.ts, and every scripts/*
// content pipeline (skills, topics, use-cases).
//
// The user explicitly asked for zero-human-intervention publishing. The
// safety net that makes that responsible is automated, not manual: nothing
// reaches `main` unless `npm run check`, `npm run audit`, and `npm run build`
// all pass against the applied patch. If any of them fail, the change is
// pushed to a branch and a PR is opened instead — falling back to human
// review only when the machine can't already prove the change is safe.
//
// Direct-push requires the CI token to have `contents: write` on `main` and
// no required-review branch protection rule blocking pushes. If the user
// later adds branch protection, this push simply fails closed (falls back
// to opening a PR/issue), which is the right behavior.
//
// 2026-07-16 incident: two separate scheduled runs (watch-upstream,
// skills-discover) generated valid content, had their branch pushed
// successfully after a direct-push race, then crashed uncaught on
// `gh pr create` failing with "GitHub Actions is not permitted to create or
// approve pull requests" — a repo permission this automation cannot grant
// itself (enabling it is an access-control change, out of scope for a
// script to do unilaterally). The content sat on an orphaned branch,
// invisible, until a human happened to go looking. Two fixes below close
// this without depending on that permission ever being granted:
//   1. Direct push now retries with fetch+rebase a few times before giving
//      up — the actual root cause both times was a same-minute push race
//      between parallel automation runs, not a real conflict, so most
//      "failures" now just self-heal instead of ever reaching the fallback.
//   2. PR creation is no longer allowed to crash the run. If it fails for
//      any reason (including the missing permission), the branch is already
//      pushed — we fall back to opening/updating an Issue (issues:write is
//      always granted) with a compare link, so the content stays
//      discoverable and mergeable by hand instead of silently orphaned.

import { execFileSync } from "node:child_process";

export interface PublishResult {
  published: boolean;
  reason: string;
  /**
   * Only meaningful when `published` is true. false means the content
   * genuinely reached `main` but deploy.yml was never triggered (dispatch
   * failed after retries) — the live site will NOT reflect this change
   * until someone manually runs `gh workflow run deploy.yml`, or fixes
   * whatever's wrong with the dispatch call itself. Callers should treat
   * this as a failure (non-zero exit), not a quiet warning: a real incident
   * (2026-07-09) went unnoticed for a full day specifically because this
   * used to be a console.error that never affected the exit code.
   */
  deployTriggered: boolean;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Fails fast if an Anthropic API call exceeded the configured token budget.
 * Set MAX_INPUT_TOKENS / MAX_OUTPUT_TOKENS env vars to enforce hard caps.
 * BLUEPRINT: autonomous-content-ops-blueprint.md §6 (PR-D).
 */
export function assertTokenBudget(usage: TokenUsage): void {
  const maxInput = parseInt(process.env.MAX_INPUT_TOKENS ?? "0", 10);
  const maxOutput = parseInt(process.env.MAX_OUTPUT_TOKENS ?? "0", 10);
  if (maxInput && usage.input_tokens > maxInput) {
    throw new Error(`Input token budget exceeded: ${usage.input_tokens} > ${maxInput}`);
  }
  if (maxOutput && usage.output_tokens > maxOutput) {
    throw new Error(`Output token budget exceeded: ${usage.output_tokens} > ${maxOutput}`);
  }
}

function run(cmd: string, args: string[]): { ok: boolean; output: string } {
  try {
    const output = execFileSync(cmd, args, { encoding: "utf-8", stdio: "pipe" });
    return { ok: true, output };
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message: string };
    const output = [e.stdout?.toString(), e.stderr?.toString()].filter(Boolean).join("\n") || e.message;
    return { ok: false, output };
  }
}

function isGitRepo(): boolean {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function currentRepoSlug(): string | undefined {
  const result = run("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
  return result.ok ? result.output.trim() : undefined;
}

/**
 * Dispatches deploy.yml, retrying transient failures (network blips, brief
 * API rate limits) instead of giving up on the first error. Returns whether
 * it ultimately succeeded — never throws, so a genuinely broken dispatch
 * doesn't itself crash the publish flow; the caller decides what a failed
 * dispatch means for its own exit code.
 */
function dispatchDeployWithRetry(attempts = 3): boolean {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const dispatch = run("gh", ["workflow", "run", "deploy.yml", "--ref", "main"]);
    if (dispatch.ok) return true;
    console.error(`Attempt ${attempt}/${attempts} to dispatch deploy.yml failed: ${dispatch.output}`);
    if (attempt < attempts) {
      execFileSync("sleep", ["5"]);
    }
  }
  return false;
}

/** Runs the full verification suite. Returns the failing step's output, or null if everything passed. */
export function verify(): string | null {
  for (const [cmd, args] of [
    ["npm", ["run", "check"]],
    ["npm", ["run", "audit"]],
    ["npm", ["run", "build"]],
  ] as const) {
    const result = run(cmd, [...args]);
    if (!result.ok) {
      return `\`${cmd} ${args.join(" ")}\` failed:\n\n\`\`\`\n${result.output.slice(-4000)}\n\`\`\``;
    }
  }
  return null;
}

/**
 * Commits and pushes straight to main, retrying on push rejection by
 * fetching + rebasing onto the new tip first. Most rejections here are a
 * same-minute race between two parallel automation runs touching different
 * files, not a real conflict — rebase resolves those cleanly. A genuine
 * conflict (rebase fails) or repeated rejection past `attempts` is reported
 * back so the caller can fall through to the branch/issue fallback.
 */
function commitAndPushWithRetry(paths: string[], commitMessage: string, attempts = 3): { ok: true; noop?: boolean } | { ok: false; error: string } {
  try {
    execFileSync("git", ["add", ...paths]);
    const staged = run("git", ["diff", "--cached", "--quiet"]);
    if (staged.ok) return { ok: true, noop: true };
    execFileSync("git", ["commit", "-m", commitMessage]);
  } catch (err) {
    return { ok: false, error: `commit failed: ${(err as Error).message}` };
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      execFileSync("git", ["push", "origin", "HEAD:main"]);
      return { ok: true };
    } catch (pushErr) {
      if (attempt === attempts) {
        return { ok: false, error: (pushErr as Error).message };
      }
      console.warn(`Push attempt ${attempt}/${attempts} rejected — fetching and rebasing onto origin/main, then retrying.`);
      try {
        execFileSync("git", ["fetch", "origin", "main"]);
        execFileSync("git", ["rebase", "origin/main"]);
      } catch (rebaseErr) {
        execFileSync("git", ["rebase", "--abort"], { stdio: "ignore" });
        return { ok: false, error: `rebase onto origin/main failed after push conflict: ${(rebaseErr as Error).message}` };
      }
    }
  }
  return { ok: false, error: "unreachable" };
}

/**
 * Pushes a fallback branch and tries to open a PR from it. If PR creation
 * fails for any reason (including the repo not allowing Actions to create
 * PRs), the failure is caught and an informational Issue is opened instead
 * — the branch is already safely on GitHub either way, so this never
 * silently loses content, and never lets `gh pr create` crash the run.
 */
function pushBranchAndNotify(branch: string, prTitle: string, prBody: string): void {
  execFileSync("git", ["push", "-u", "origin", branch]);

  if (!process.env.GH_TOKEN) return;

  const prResult = run("gh", ["pr", "create", "--title", prTitle, "--body", prBody]);
  if (prResult.ok) return;

  console.error(`gh pr create failed (branch was still pushed successfully): ${prResult.output}`);
  const repo = currentRepoSlug();
  const compareUrl = repo ? `https://github.com/${repo}/compare/main...${branch}` : `(compare URL unavailable — branch: ${branch})`;
  const issueBody = [
    prBody,
    "",
    "---",
    "",
    `**PR creation failed**, so this was opened as an issue instead. The branch was pushed successfully — review and merge it by hand:`,
    compareUrl,
    "",
    `\`\`\`\n${prResult.output.slice(-1500)}\n\`\`\``,
  ].join("\n");
  const issueResult = run("gh", ["issue", "create", "--title", `⚠️ ${prTitle} (needs manual merge)`, "--label", "automation-failure", "--body", issueBody]);
  if (!issueResult.ok) {
    console.error(`Fallback issue creation also failed: ${issueResult.output}`);
  }
}

export async function verifyAndPublish(opts: {
  commitMessage: string;
  paths: string[];
  fallbackBranchPrefix: string;
  prTitle: string;
  prBody: string;
}): Promise<PublishResult> {
  if (process.env.SKIP_PUBLISH === "1") {
    return {
      published: false,
      deployTriggered: false,
      reason: "SKIP_PUBLISH=1 — dry run: changes written to disk but not committed or pushed.",
    };
  }

  if (!isGitRepo()) {
    return {
      published: false,
      deployTriggered: false,
      reason: "Not a git repository — changes were written to disk but not committed (local dry run).",
    };
  }

  const failure = verify();

  if (!failure) {
    const pushResult = commitAndPushWithRetry(opts.paths, opts.commitMessage);

    if (pushResult.ok) {
      if (pushResult.noop) {
        return {
          published: false,
          deployTriggered: true,
          reason: "Verification passed, but generated content is unchanged — nothing to commit or deploy.",
        };
      }
      // GitHub doesn't fire `on: push` workflows for commits made with
      // GITHUB_TOKEN, so deploy.yml would never see this push. Dispatch it
      // explicitly so the live site actually picks up the change. No
      // GH_TOKEN at all (e.g. a local dry run) is a normal, expected case —
      // not a failure — so it's tracked separately from a token being
      // present but the dispatch itself failing.
      const hasToken = Boolean(process.env.GH_TOKEN);
      const dispatchSucceeded = hasToken ? dispatchDeployWithRetry() : false;
      const deployTriggered = !hasToken || dispatchSucceeded;
      if (hasToken && !dispatchSucceeded) {
        console.error(
          "deploy.yml dispatch failed after retries — content is safely on main, but the live site will " +
            "NOT reflect it until someone runs `gh workflow run deploy.yml` manually or the next scheduled " +
            "run's deploy dispatch succeeds. Treating this as a failure so it doesn't go unnoticed.",
        );
      }
      return {
        published: true,
        deployTriggered,
        reason: !hasToken
          ? "Verification passed — pushed directly to main (no GH_TOKEN set, deploy dispatch skipped)."
          : dispatchSucceeded
            ? "Verification passed — pushed directly to main and deploy triggered."
            : "Verification passed and content pushed to main, but deploy.yml dispatch failed after retries.",
      };
    }

    // Direct push (with retry-via-rebase) still didn't land — fall back to
    // a branch. The commit already exists locally (commitAndPushWithRetry
    // committed before attempting to push), so just branch off HEAD and
    // push that.
    const branch = `${opts.fallbackBranchPrefix}-${Date.now()}`;
    execFileSync("git", ["checkout", "-b", branch]);
    pushBranchAndNotify(
      branch,
      opts.prTitle,
      `${opts.prBody}\n\nVerification passed locally, but the direct push to \`main\` was rejected even after retrying with rebase: ${pushResult.error}`,
    );
    return {
      published: false,
      deployTriggered: false,
      reason: `Push to main was rejected after retries: ${pushResult.error}. Opened branch/PR (or issue) instead.`,
    };
  }

  // Verification failed — never publish unverified content. Open a PR (or,
  // if PR creation isn't possible, an issue) that clearly explains what
  // failed, so a human (or the next scheduled run, after a source-side fix)
  // can act on it.
  const branch = `${opts.fallbackBranchPrefix}-${Date.now()}`;
  execFileSync("git", ["checkout", "-b", branch]);
  execFileSync("git", ["add", ...opts.paths]);
  if (run("git", ["diff", "--cached", "--quiet"]).ok) {
    return {
      published: false,
      deployTriggered: true,
      reason: "Verification failed because of an external check, but generated content is unchanged — no review branch created.",
    };
  }
  execFileSync("git", ["commit", "-m", `${opts.commitMessage} [needs review: verification failed]`]);
  pushBranchAndNotify(
    branch,
    `[Needs review] ${opts.prTitle}`,
    `${opts.prBody}\n\n---\n\n**⚠️ Automated verification failed, so this was NOT published automatically:**\n\n${failure}`,
  );
  return {
    published: false,
    deployTriggered: false,
    reason: "Verification failed — opened a PR (or issue) for human review instead of publishing.",
  };
}
