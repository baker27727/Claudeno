// Shared HTTP policy for the blocking external-link audit.
//
// A definitive client error (for example 404) means the link itself needs
// attention. Timeouts, rate limits, and server failures are inconclusive:
// retry them, then warn without blocking unrelated content automation.

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface LinkCheckOptions {
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  fetchFn?: FetchFn;
  sleep?: (delayMs: number) => Promise<void>;
  warn?: (message: string) => void;
}

const RETRYABLE_CLIENT_STATUSES = new Set([408, 425, 429]);

export function isTransientHttpStatus(status: number): boolean {
  return RETRYABLE_CLIENT_STATUSES.has(status) || status >= 500;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function requestStatus(url: string, fetchFn: FetchFn, timeoutMs: number): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const init = {
      redirect: "follow" as const,
      signal: controller.signal,
      headers: { "user-agent": "Claudeno link audit" },
    };
    let response = await fetchFn(url, { ...init, method: "HEAD" });
    if (response.status === 405 || response.status === 501) {
      response = await fetchFn(url, { ...init, method: "GET" });
    }
    return response.status;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns a problem only when the response proves that the link is bad.
 * An exhausted transient failure is deliberately reported as a warning, not
 * a dead link, because no trustworthy conclusion was obtained about the URL.
 */
export async function checkExternalUrl(url: string, options: LinkCheckOptions = {}): Promise<string | undefined> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const timeoutMs = options.timeoutMs ?? 15_000;
  const retryDelayMs = options.retryDelayMs ?? 500;
  const fetchFn = options.fetchFn ?? fetch;
  const sleep = options.sleep ?? ((delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const warn = options.warn ?? console.warn;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let transientFailure: string;

    try {
      const status = await requestStatus(url, fetchFn, timeoutMs);
      if (status < 400) return undefined;

      const problem = `${url}: HTTP ${status}`;
      if (!isTransientHttpStatus(status)) return problem;
      transientFailure = problem;
    } catch (error) {
      transientFailure = `${url}: ${errorMessage(error)}`;
    }

    if (attempt === attempts) {
      warn(
        `audit-links: transient check failure after ${attempts} attempt(s) ` +
          `(not treated as a dead link): ${transientFailure}`,
      );
      return undefined;
    }

    warn(`audit-links: transient check failure ${attempt}/${attempts}; retrying: ${transientFailure}`);
    await sleep(attempt * retryDelayMs);
  }

  return undefined;
}
