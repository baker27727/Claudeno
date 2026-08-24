// Deterministic regression tests for the external-link HTTP policy.
// Run: npm run audit:links:test

import { checkExternalUrl, isTransientHttpStatus, type FetchFn } from "./_link-check.ts";

let failures = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failures++;
  }
}

function sequenceFetch(sequence: Array<number | Error>): { fetchFn: FetchFn; calls: () => number } {
  let callCount = 0;
  const fetchFn: FetchFn = async () => {
    const result = sequence[Math.min(callCount, sequence.length - 1)];
    callCount++;
    if (result instanceof Error) throw result;
    return new Response(null, { status: result });
  };
  return { fetchFn, calls: () => callCount };
}

const noWait = async (): Promise<void> => {};
const warnings: string[] = [];
const testOptions = { retryDelayMs: 0, sleep: noWait, warn: (message: string) => warnings.push(message) };

check("503 is classified as transient", isTransientHttpStatus(503));
check("429 is classified as transient", isTransientHttpStatus(429));
check("404 is classified as definitive", !isTransientHttpStatus(404));

{
  warnings.length = 0;
  const mock = sequenceFetch([503, 503, 200]);
  const result = await checkExternalUrl("https://example.test/recovers", { ...testOptions, fetchFn: mock.fetchFn });
  check("a recovering 503 does not fail", result === undefined);
  check("a recovering 503 is retried", mock.calls() === 3);
}

{
  warnings.length = 0;
  const mock = sequenceFetch([503]);
  const result = await checkExternalUrl("https://example.test/unavailable", { ...testOptions, fetchFn: mock.fetchFn });
  check("repeated 503 remains inconclusive", result === undefined);
  check("repeated 503 exhausts all attempts", mock.calls() === 3);
  check("repeated 503 emits a final warning", warnings.some((message) => message.includes("after 3 attempt")));
}

{
  const mock = sequenceFetch([429, 200]);
  const result = await checkExternalUrl("https://example.test/rate-limited", { ...testOptions, fetchFn: mock.fetchFn });
  check("429 is retried", result === undefined && mock.calls() === 2);
}

{
  const mock = sequenceFetch([404]);
  const result = await checkExternalUrl("https://example.test/missing", { ...testOptions, fetchFn: mock.fetchFn });
  check("404 fails immediately", result?.endsWith("HTTP 404") === true && mock.calls() === 1);
}

{
  const mock = sequenceFetch([new Error("socket reset")]);
  const result = await checkExternalUrl("https://example.test/network", { ...testOptions, fetchFn: mock.fetchFn });
  check("network errors remain inconclusive after retries", result === undefined && mock.calls() === 3);
}

{
  const methods: string[] = [];
  const fetchFn: FetchFn = async (_url, init) => {
    methods.push(init?.method ?? "GET");
    return new Response(null, { status: methods.length === 1 ? 405 : 200 });
  };
  const result = await checkExternalUrl("https://example.test/no-head", { ...testOptions, fetchFn });
  check("HEAD 405 falls back to GET", result === undefined && methods.join(",") === "HEAD,GET");
}

if (failures > 0) {
  console.error(`\n✗ _link-check.test.ts: ${failures} check(s) failed\n`);
  process.exit(1);
}

console.log("\n✓ _link-check.test.ts: all checks passed\n");
