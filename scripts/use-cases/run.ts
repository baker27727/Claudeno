// run.ts — weekly orchestrator for the use-case automation pipeline.
// Fetches curated sources, generates/updates use-case content, and publishes
// if all verification checks pass.

import { researchAll } from "./research.ts";
import { generateUseCases, publishUseCases } from "./generate.ts";
import { deferOnAnthropicCreditError } from "../_anthropic-credit.ts";

async function main() {
  const researchByProfession = await researchAll();
  const { touchedPaths, findings } = await generateUseCases(researchByProfession);
  const result = await publishUseCases(touchedPaths, findings);
  console.log(result.published ? `✓ Published: ${result.reason}` : `✗ Not published: ${result.reason}`);
  // A publish that didn't actually trigger a deploy is a failure, not a
  // success with a footnote — see PublishResult.deployTriggered.
  if (result.published && !result.deployTriggered) process.exit(1);
}

main().catch((err) => {
  if (deferOnAnthropicCreditError(err, "use-case content generation")) return;
  console.error("use-cases/run failed:", err);
  process.exit(1);
});
