import "./env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { AI_CONFIG } from "../config/ai.js";
import { generateText, embedTexts, extractJson, __setClientForTests, AIServiceError } from "../services/gemini.js";

const dims = AI_CONFIG.embeddingDimensions;
const vec = (seed = 1) => Array.from({ length: dims }, (_, i) => ((i + seed) % 7) + 1);
const httpError = (status, message = `HTTP ${status}`) => Object.assign(new Error(message), { status });

const fakeClient = ({ generate, embed }) => ({ models: { generateContent: generate, embedContent: embed } });

test("defaults to Gemini 3.6 Flash / 3.5 Flash-Lite / gemini-embedding-2", () => {
    assert.equal(AI_CONFIG.chatModel, "gemini-3.6-flash");
    assert.equal(AI_CONFIG.fastModel, "gemini-3.5-flash-lite");
    assert.equal(AI_CONFIG.embeddingModel, "gemini-embedding-2");
});

test("generateText sends system instruction, no temperature, and ends with a user turn", async () => {
    let request;
    __setClientForTests(fakeClient({ generate: async (req) => ((request = req), { text: "Hello!" }) }));

    const text = await generateText({
        system: "be nice",
        messages: [
            { role: "user", text: "hi" },
            { role: "model", text: "hello" },
            { role: "user", text: "how are you?" },
        ],
    });
    assert.equal(text, "Hello!");
    assert.equal(request.model, "gemini-3.6-flash");
    assert.equal(request.config.systemInstruction, "be nice");
    assert.equal("temperature" in request.config, false, "Gemini 3 deprecates temperature");
    assert.equal(request.contents.at(-1).role, "user");
    assert.equal(request.contents.length, 3);
    assert.equal(request.config.httpOptions.timeout, AI_CONFIG.requestTimeoutMs);
});

test("generateText retries a 429 and succeeds", async () => {
    let calls = 0;
    __setClientForTests(
        fakeClient({
            generate: async () => {
                calls++;
                if (calls === 1) throw httpError(429);
                return { text: "ok" };
            },
        })
    );
    assert.equal(await generateText({ prompt: "x" }), "ok");
    assert.equal(calls, 2);
});

test("an invalid API key becomes a safe 503 error without retries", async () => {
    let calls = 0;
    __setClientForTests(
        fakeClient({
            generate: async () => {
                calls++;
                throw httpError(400, "API key not valid. Please pass a valid API key. [API_KEY_INVALID]");
            },
        })
    );
    await assert.rejects(generateText({ prompt: "x" }), (err) => {
        assert.ok(err instanceof AIServiceError);
        assert.equal(err.status, 503);
        assert.equal(err.code, "GEMINI_AUTH");
        assert.ok(!/API key/i.test(err.message), "user message must not leak key details");
        return true;
    });
    assert.equal(calls, 1);
});

test("empty responses raise an error instead of returning blank text", async () => {
    __setClientForTests(fakeClient({ generate: async () => ({ text: "", candidates: [{ finishReason: "SAFETY" }] }) }));
    await assert.rejects(generateText({ prompt: "x" }), { code: "GEMINI_EMPTY" });
});

test("embedTexts sends one Content per text, in batches of 100, with embedding-2 prefixes", async () => {
    const calls = [];
    __setClientForTests(
        fakeClient({
            embed: async (req) => {
                calls.push(req);
                return { embeddings: req.contents.map((_, i) => ({ values: vec(i) })) };
            },
        })
    );
    const texts = Array.from({ length: 250 }, (_, i) => `chunk ${i}`);
    const vectors = await embedTexts(texts, { kind: "document", titles: texts.map(() => "notes.pdf") });

    assert.equal(vectors.length, 250);
    assert.equal(calls.length, 3); // 100 + 100 + 50
    assert.equal(calls[0].contents.length, 100);
    assert.equal(calls[0].config.outputDimensionality, dims);
    assert.deepEqual(calls[0].contents[0], { role: "user", parts: [{ text: "title: notes.pdf | text: chunk 0" }] });
    // vectors are unit length (normalised)
    const norm = Math.sqrt(vectors[0].reduce((s, v) => s + v * v, 0));
    assert.ok(Math.abs(norm - 1) < 1e-9);
});

test("query embeddings use the search prefix", async () => {
    let req;
    __setClientForTests(fakeClient({ embed: async (r) => ((req = r), { embeddings: [{ values: vec() }] }) }));
    await embedTexts(["what is paging?"], { kind: "query" });
    assert.equal(req.contents[0].parts[0].text, "task: search result | query: what is paging?");
});

test("falls back to one-by-one if a batch returns the wrong number of vectors", async () => {
    let calls = 0;
    __setClientForTests(
        fakeClient({
            embed: async (req) => {
                calls++;
                // first (batch) call returns a single merged embedding — the bug we guard against
                if (req.contents.length > 1) return { embeddings: [{ values: vec() }] };
                return { embeddings: [{ values: vec() }] };
            },
        })
    );
    const vectors = await embedTexts(["a", "b", "c"]);
    assert.equal(vectors.length, 3);
    assert.equal(calls, 4);
});

test("never returns empty vectors: wrong dimensions throw", async () => {
    __setClientForTests(fakeClient({ embed: async (req) => ({ embeddings: req.contents.map(() => ({ values: [] })) }) }));
    await assert.rejects(embedTexts(["a"]), { code: "EMBEDDING_INVALID" });
});

test("extractJson handles fences and surrounding text", () => {
    assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
    assert.deepEqual(extractJson('Here you go: {"a":2} hope that helps'), { a: 2 });
    assert.throws(() => extractJson("no json here"), { code: "GEMINI_BAD_JSON" });
});
