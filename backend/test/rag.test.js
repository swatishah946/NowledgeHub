import "./env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { RAG_CONFIG } from "../config/ai.js";
import { extractPdfPages, isPdfBuffer, cleanFileName } from "../utils/pdf.js";
import { buildRagContext } from "../controllers/studyController.js";
import { describeIndexProblems, expectedIndexDefinition } from "../services/vectorStore.js";
import { buildSourcesSection } from "../controllers/researchController.js";
import { percentile } from "../services/metricsService.js";

const pdf = await readFile(new URL("./fixtures/sample.pdf", import.meta.url));

test("extracts text page by page (for page-number citations)", async () => {
    assert.equal(isPdfBuffer(pdf), true);
    assert.equal(isPdfBuffer(Buffer.from("not a pdf")), false);
    const { pages, numPages, totalChars } = await extractPdfPages(pdf);
    assert.equal(numPages, 3);
    assert.deepEqual(pages.map((p) => p.page), [1, 2, 3]);
    assert.match(pages[1].text, /page table/);
    assert.match(pages[2].text, /Banker's algorithm/);
    assert.ok(totalChars > RAG_CONFIG.minTextLength);
});

test("chunks keep their page number in metadata", async () => {
    const { pages } = await extractPdfPages(pdf);
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 80, chunkOverlap: 20, separators: RAG_CONFIG.separators });
    const chunks = await splitter.createDocuments(pages.map((p) => p.text), pages.map((p) => ({ page: p.page, source: "os.pdf" })));
    assert.ok(chunks.length > 3);
    const tlb = chunks.find((c) => c.pageContent.includes("TLB"));
    assert.equal(tlb.metadata.page, 2);
});

test("RAG context labels excerpts with source and page", () => {
    const ctx = buildRagContext([[{ pageContent: "Paging divides memory", metadata: { source: "os.pdf", page: 2 } }, 0.8]]);
    assert.match(ctx, /<excerpt id="1" source="os.pdf" page="2">/);
    assert.match(ctx, /^<documents>/);
});

test("index check catches wrong dimensions and missing filter fields", () => {
    const good = { queryable: true, latestDefinition: expectedIndexDefinition(768) };
    assert.deepEqual(describeIndexProblems(good, 768), []);
    const old = { queryable: true, latestDefinition: { fields: [{ type: "vector", path: "embedding", numDimensions: 1024, similarity: "cosine" }] } };
    const problems = describeIndexProblems(old, 768);
    assert.equal(problems.length, 3); // dimensions + userId filter + source filter
    assert.deepEqual(describeIndexProblems(undefined, 768).length, 1);
});

test("file names are cleaned", () => {
    assert.equal(cleanFileName("../../etc/passwd.pdf"), "passwd.pdf");
    assert.equal(cleanFileName(Buffer.from("Notes – OS.pdf", "utf8").toString("latin1")), "Notes – OS.pdf");
});

test("research sources come from real search results", () => {
    const section = buildSourcesSection([{ title: "MDN", url: "https://developer.mozilla.org" }]);
    assert.match(section, /## Sources\n1\. \[MDN\]\(https:\/\/developer\.mozilla\.org\)/);
});

test("percentile (nearest rank)", () => {
    const v = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    assert.equal(percentile(v, 50), 50);
    assert.equal(percentile(v, 95), 100);
    assert.equal(percentile([], 50), null);
});
