// Retry with exponential backoff and "full jitter".
//
// attempt 1 waits a random time in [0, base], attempt 2 in [0, 2*base],
// attempt 3 in [0, 4*base] ... capped at maxDelayMs. The randomness stops many
// clients that failed together from retrying at the same instant.

export const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

const NETWORK_ERROR_CODES = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENOTFOUND",
    "UND_ERR_SOCKET",
    "UND_ERR_CONNECT_TIMEOUT",
]);

export const getStatus = (error) =>
    error?.status ?? error?.response?.status ?? error?.statusCode;

export const isRetryableError = (error) => {
    const status = getStatus(error);
    if (status) return RETRYABLE_STATUS.has(Number(status));
    const code = error?.code ?? error?.cause?.code;
    if (code && NETWORK_ERROR_CODES.has(code)) return true;
    // fetch() reports network failures as a TypeError("fetch failed")
    return error?.name === "TypeError" && /fetch failed/i.test(error?.message ?? "");
};

export const backoffDelay = (attempt, baseDelayMs, maxDelayMs, random = Math.random) => {
    const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
    return Math.round(random() * ceiling);
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn`, retrying retryable failures up to `retries` extra times.
 * Non-retryable errors (400, 401, 403, 404 ...) are thrown immediately.
 */
export async function withRetry(fn, options = {}) {
    const {
        retries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 10_000,
        shouldRetry = isRetryableError,
        onRetry,
        sleep = defaultSleep,
        random = Math.random,
    } = options;

    let attempt = 0;
    for (;;) {
        try {
            return await fn(attempt);
        } catch (error) {
            attempt += 1;
            if (attempt > retries || !shouldRetry(error)) throw error;
            const delay = backoffDelay(attempt, baseDelayMs, maxDelayMs, random);
            onRetry?.(error, attempt, delay);
            await sleep(delay);
        }
    }
}
