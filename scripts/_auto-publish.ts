// _auto-publish — shared "verify, then publish without waiting for a human"
// gate used by generate-update.ts and audit-freshness.ts.
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
// to opening a PR), which is the right behavior.

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

export async function verifyAndPublish(opts: {
  commitMessage: string;
  paths: string[];
  fallbackBranchPrefix: string;
  prTitle: string;
  prBody: string;
}): Promise<PublishResult> {
  if (!isGitRepo()) {
    return {
      published: false,
      deployTriggered: false,
      reason: "Not a git repository — changes were written to disk but not committed (local dry run).",
    };
  }

  const failure = verify();

  if (!failure) {
    // Everything passed — push straight to main, no PR, no waiting.
    try {
      execFileSync("git", ["add", ...opts.paths]);
      execFileSync("git", ["commit", "-m", opts.commitMessage]);
      execFileSync("git", ["push", "origin", "HEAD:main"]);
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
    } catch (err) {
      // Push rejected (e.g. branch protection, someone pushed in the meantime).
      // Fall through to the PR fallback below using the same commit.
      const branch = `${opts.fallbackBranchPrefix}-${Date.now()}`;
      execFileSync("git", ["checkout", "-b", branch]);
      execFileSync("git", ["push", "-u", "origin", branch]);
      if (process.env.GH_TOKEN) {
        execFileSync("gh", [
          "pr",
          "create",
          "--title",
          opts.prTitle,
          "--body",
          `${opts.prBody}\n\nVerification passed locally, but the direct push to \`main\` was rejected (branch protection or a race). Opened as a PR instead.`,
        ]);
      }
      return {
        published: false,
        deployTriggered: false,
        reason: `Push to main was rejected: ${(err as Error).message}. Opened branch/PR instead.`,
      };
    }
  }

  // Verification failed — never publish unverified content. Open a PR that
  // clearly explains what failed, so a human (or the next scheduled run,
  // after a source-side fix) can act on it.
  const branch = `${opts.fallbackBranchPrefix}-${Date.now()}`;
  execFileSync("git", ["checkout", "-b", branch]);
  execFileSync("git", ["add", ...opts.paths]);
  execFileSync("git", ["commit", "-m", `${opts.commitMessage} [needs review: verification failed]`]);
  execFileSync("git", ["push", "-u", "origin", branch]);
  if (process.env.GH_TOKEN) {
    execFileSync("gh", [
      "pr",
      "create",
      "--title",
      `[Needs review] ${opts.prTitle}`,
      "--body",
      `${opts.prBody}\n\n---\n\n**⚠️ Automated verification failed, so this was NOT published automatically:**\n\n${failure}`,
    ]);
  }
  return {
    published: false,
    deployTriggered: false,
    reason: "Verification failed — opened a PR for human review instead of publishing.",
  };
}
