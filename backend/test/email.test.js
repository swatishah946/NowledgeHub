import "./env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { sendWithBrevo, getEmailProvider, BREVO_API_URL } from "../services/emailService.js";

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, statusText: "", json: async () => body });

const withEnv = async (vars, fn) => {
    const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
    Object.entries(vars).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
    try {
        await fn();
    } finally {
        Object.entries(saved).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
    }
};

test("Brevo is used when BREVO_API_KEY is set, SMTP otherwise", async () => {
    await withEnv({ BREVO_API_KEY: "xkeysib-test", EMAIL_USER: "a@gmail.com", EMAIL_PASS: "p" }, () => assert.equal(getEmailProvider(), "brevo"));
    await withEnv({ BREVO_API_KEY: undefined, EMAIL_USER: "a@gmail.com", EMAIL_PASS: "p" }, () => assert.equal(getEmailProvider(), "smtp"));
    await withEnv({ BREVO_API_KEY: undefined, EMAIL_USER: undefined, EMAIL_PASS: undefined }, () => assert.equal(getEmailProvider(), null));
});

test("sends the right request to the Brevo API", async () => {
    await withEnv({ BREVO_API_KEY: "xkeysib-test", EMAIL_FROM: "shahswati946@gmail.com", EMAIL_FROM_NAME: "NowledgeHub" }, async () => {
        let url, options;
        const result = await sendWithBrevo(
            { to: "student@gmail.com", subject: "Code", html: "<b>123456</b>", text: "123456" },
            { fetchFn: async (u, o) => ((url = u), (options = o), jsonResponse(201, { messageId: "<abc@brevo>" })) }
        );
        assert.equal(url, BREVO_API_URL);
        assert.equal(options.method, "POST");
        assert.equal(options.headers["api-key"], "xkeysib-test");
        assert.deepEqual(JSON.parse(options.body), {
            sender: { email: "shahswati946@gmail.com", name: "NowledgeHub" },
            to: [{ email: "student@gmail.com" }],
            subject: "Code",
            htmlContent: "<b>123456</b>",
            textContent: "123456",
        });
        assert.deepEqual(result, { provider: "brevo", messageId: "<abc@brevo>" });
    });
});

test("a bad API key fails at once with a helpful message", async () => {
    await withEnv({ BREVO_API_KEY: "wrong", EMAIL_FROM: "x@gmail.com" }, async () => {
        let calls = 0;
        await assert.rejects(
            sendWithBrevo({ to: "a@gmail.com", subject: "s", html: "h", text: "t" }, { fetchFn: async () => (calls++, jsonResponse(401, { message: "Key not found" })) }),
            (err) => /Brevo error 401/.test(err.message) && /BREVO_API_KEY/.test(err.message)
        );
        assert.equal(calls, 1);
    });
});

test("temporary Brevo errors are retried", async () => {
    await withEnv({ BREVO_API_KEY: "k", EMAIL_FROM: "x@gmail.com" }, async () => {
        let calls = 0;
        const result = await sendWithBrevo(
            { to: "a@gmail.com", subject: "s", html: "h", text: "t" },
            { fetchFn: async () => (++calls === 1 ? jsonResponse(503, { message: "busy" }) : jsonResponse(201, { messageId: "1" })) }
        );
        assert.equal(calls, 2);
        assert.equal(result.messageId, "1");
    });
});
