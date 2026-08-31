// Regression tests for malformed model output in generate-update.ts.
// Run: npm run audit:upstream-plan

import { normalizeUpstreamUpdatePlan } from "./_upstream-update-plan.ts";

let failures = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failures++;
  }
}

function throws(name: string, fn: () => unknown, message: string): void {
  try {
    fn();
    check(name, false);
  } catch (error) {
    check(name, error instanceof Error && error.message.includes(message));
  }
}

const baseInput = {
  affected_modules: ["wrong-model-list"],
  content_patches: [{ file: "cli-basics", en: "English update", no: "Norsk oppdatering" }],
  changelog_entry: { en: "Release summary", no: "Versjonssammendrag" },
  new_glossary_terms: [],
  sources: ["https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md"],
};

{
  const plan = normalizeUpstreamUpdatePlan(baseInput, "2.1.251");
  check("missing model version uses authoritative npm version", plan.changelog_entry.version === "2.1.251");
  check("affected modules are derived from validated patches", plan.affected_modules.join(",") === "cli-basics");
}

{
  const plan = normalizeUpstreamUpdatePlan(
    { ...baseInput, changelog_entry: { ...baseInput.changelog_entry, version: "99.99.99" } },
    "2.1.251",
  );
  check("invented model version is ignored", plan.changelog_entry.version === "2.1.251");
}

{
  const plan = normalizeUpstreamUpdatePlan(
    { ...baseInput, sources: ["not-a-url", "https://example.com/source", "https://example.com/source"] },
    "2.1.251",
  );
  check("sources are filtered and deduplicated", plan.sources.join(",") === "https://example.com/source");
}

throws(
  "missing localized changelog text fails before file writes",
  () => normalizeUpstreamUpdatePlan({ ...baseInput, changelog_entry: { en: "Release summary" } }, "2.1.251"),
  "changelog_entry.no",
);
throws(
  "malformed content patch fails before file writes",
  () => normalizeUpstreamUpdatePlan({ ...baseInput, content_patches: [{ file: "cli-basics", en: "English update" }] }, "2.1.251"),
  "content_patches[0].no",
);
throws(
  "invalid registry version is rejected",
  () => normalizeUpstreamUpdatePlan(baseInput, "undefined"),
  "Invalid authoritative upstream version",
);

if (failures > 0) {
  console.error(`\n✗ _upstream-update-plan.test.ts: ${failures} check(s) failed\n`);
  process.exit(1);
}

console.log("\n✓ _upstream-update-plan.test.ts: all checks passed\n");
