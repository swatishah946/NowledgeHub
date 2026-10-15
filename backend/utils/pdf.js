// Import the library file directly: pdf-parse's index.js runs a debug block
// that tries to read a test PDF and crashes when loaded from an ES module.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// Same text-joining logic as pdf-parse's default renderer, but we also keep
// each page's text separately so every chunk can be cited with a page number.
const renderPage = (pages) => (pageData) =>
    pageData
        .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
        .then((textContent) => {
            let lastY;
            let text = "";
            for (const item of textContent.items) {
                if (lastY === item.transform[5] || lastY === undefined) text += item.str;
                else text += `\n${item.str}`;
                lastY = item.transform[5];
            }
            const pageNumber = Number(pageData.pageNumber) || pages.length + 1;
            pages.push({ page: pageNumber, text });
            return text;
        });

export const isPdfBuffer = (buffer) =>
    Buffer.isBuffer(buffer) && buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";

/** Returns { pages: [{ page, text }], numPages, totalChars } */
export async function extractPdfPages(buffer) {
    const pages = [];
    // Copy into a standalone Uint8Array. Small Node Buffers often share one
    // memory pool (byteOffset > 0) and the old pdf.js bundled with pdf-parse
    // ignores the offset, which shows up as "bad XRef entry".
    const data = await pdfParse(new Uint8Array(buffer), { pagerender: renderPage(pages) });
    pages.sort((a, b) => a.page - b.page);
    const totalChars = pages.reduce((sum, p) => sum + p.text.trim().length, 0);
    return { pages, numPages: data.numpages, totalChars };
}

// Multer reports non-ASCII file names as latin1; convert back to UTF-8 and
// keep only the base name.
export const cleanFileName = (name) => {
    let decoded = String(name || "document.pdf");
    try {
        const utf8 = Buffer.from(decoded, "latin1").toString("utf8");
        if (!utf8.includes("�")) decoded = utf8;
    } catch {
        /* keep original */
    }
    decoded = decoded.split(/[\\/]/).pop().replace(/[\u0000-\u001f]/g, "").trim();
    return (decoded || "document.pdf").slice(0, 200);
};
