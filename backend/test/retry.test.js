import "./env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { withRetry, backoffDelay, isRetryableError } from "../utils/retry.js";

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const noSleep = async () => {};

test("retries 429/503 and then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
        async () => {
            calls++;
            if (calls < 3) throw httpError(calls === 1 ? 429 : 503);
            return "ok";
        },
        { retries: 3, sleep: noSleep }
    );
    assert.equal(result, "ok");
    assert.equal(calls, 3);
});

test("does not retry client errors like 400/401/403/404", async () => {
    for (const status of [400, 401, 403, 404]) {
        let calls = 0;
        await assert.rejects(
            withRetry(async () => {
                calls++;
                throw httpError(status);
            }, { retries: 3, sleep: noSleep }),
            { status }
        );
        assert.equal(calls, 1, `status ${status} should not be retried`);
    }
});

test("gives up after the retry limit (1 try + 3 retries)", async () => {
    let calls = 0;
    await assert.rejects(
        withRetry(async () => {
            calls++;
            throw httpError(500);
        }, { retries: 3, sleep: noSleep })
    );
    assert.equal(calls, 4);
});

test("backoff grows exponentially and is capped", () => {
    const max = () => 0.9999;
    assert.equal(backoffDelay(1, 1000, 10_000, max), 1000);
    assert.equal(backoffDelay(2, 1000, 10_000, max), 2000);
    assert.equal(backoffDelay(3, 1000, 10_000, max), 4000);
    assert.equal(backoffDelay(10, 1000, 10_000, max), 9999);
    assert.equal(backoffDelay(3, 1000, 10_000, () => 0), 0); // full jitter can be 0
});

test("network failures are retryable", () => {
    assert.equal(isRetryableError(Object.assign(new TypeError("fetch failed"))), true);
    assert.equal(isRetryableError({ code: "ECONNRESET" }), true);
    assert.equal(isRetryableError(new Error("something else")), false);
});
