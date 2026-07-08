// watch-upstream — compares the latest published Claude Code npm version and
// CHANGELOG against the local snapshot in content/snapshots/. Run daily by
// .github/workflows/watch.yml. BLUEPRINT §7.1.
//
// Emits `changed` / `latest_version` to $GITHUB_OUTPUT when run in CI, and
// writes the fetched CHANGELOG to .upstream-diff.md when a change is found
// so generate-update.ts can use it as input.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SNAPSHOT_VERSION_PATH = join(ROOT, "content/snapshots/upstream-version.txt");
const SNAPSHOT_CHANGELOG_PATH = join(ROOT, "content/snapshots/upstream-changelog.md");
const DIFF_OUTPUT_PATH = join(ROOT, ".upstream-diff.md");

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@anthropic-ai/claude-code/latest";
const CHANGELOG_URL = "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const [pkgText, changelog] = await Promise.all([fetchText(NPM_REGISTRY_URL), fetchText(CHANGELOG_URL)]);
  const pkg = JSON.parse(pkgText) as { version: string };
  const latestVersion = pkg.version;

  const knownVersion = existsSync(SNAPSHOT_VERSION_PATH) ? readFileSync(SNAPSHOT_VERSION_PATH, "utf-8").trim() : "";
  const knownChangelog = existsSync(SNAPSHOT_CHANGELOG_PATH) ? readFileSync(SNAPSHOT_CHANGELOG_PATH, "utf-8") : "";

  const changed = latestVersion !== knownVersion || changelog.trim() !== knownChangelog.trim();

  console.log(`Known version:  ${knownVersion || "(none)"}`);
  console.log(`Latest version: ${latestVersion}`);
  console.log(changed ? "Upstream change detected." : "No upstream change.");

  if (changed) {
    writeFileSync(DIFF_OUTPUT_PATH, changelog, "utf-8");
    console.log(`Wrote upstream CHANGELOG to ${DIFF_OUTPUT_PATH}`);
  }

  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    appendFileSync(githubOutput, `changed=${changed}\n`);
    appendFileSync(githubOutput, `latest_version=${latestVersion}\n`);
  }
}

main().catch((err) => {
  console.error("watch-upstream failed:", err);
  process.exit(1);
});
