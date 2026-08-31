// Deterministic regression tests for Anthropic credit-exhaustion deferral.
// Run: npm run audit:anthropic-credit

import { deferOnAnthropicCreditError, isAnthropicCreditError } from "./_anthropic-credit.ts";

let failures = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failures++;
  }
}

const liveFailure = new Error(
  'Claude API error: HTTP 400 — {"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}',
);

check("current Anthropic low-credit response is detected", isAnthropicCreditError(liveFailure));
check("stable error-code variant is detected", isAnthropicCreditError({ type: "credit_balance_too_low" }));
check("insufficient credits variant is detected", isAnthropicCreditError("insufficient-credits"));
check("unrelated HTTP 400 remains fatal", !isAnthropicCreditError(new Error("Claude API error: HTTP 400 — invalid model")));
check("network failures remain fatal", !isAnthropicCreditError(new Error("fetch failed: socket reset")));
check("unknown values remain fatal", !isAnthropicCreditError(undefined));

{
  const warnings: string[] = [];
  const summaries: string[] = [];
  const deferred = deferOnAnthropicCreditError(liveFailure, "use-case generation", {
    warn: (message) => warnings.push(message),
    writeSummary: (markdown) => summaries.push(markdown),
  });
  check("credit failure is converted to a deferral", deferred);
  check("deferral emits one visible warning", warnings.length === 1 && warnings[0].includes("use-case generation"));
  check("deferral records safe retry guidance", summaries.length === 1 && summaries[0].includes("no partial generated output"));
}

{
  let emitted = false;
  const deferred = deferOnAnthropicCreditError(new Error("HTTP 500"), "unrelated failure", {
    warn: () => {
      emitted = true;
    },
    writeSummary: () => {
      emitted = true;
    },
  });
  check("non-credit failures are not swallowed", !deferred && !emitted);
}

if (failures > 0) {
  console.error(`\n✗ _anthropic-credit.test.ts: ${failures} check(s) failed\n`);
  process.exit(1);
}

console.log("\n✓ _anthropic-credit.test.ts: all checks passed\n");
