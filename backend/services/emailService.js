// Sends transactional email (verification codes).
//
// Two providers:
//  - Brevo HTTP API (used when BREVO_API_KEY is set). It sends over HTTPS (port
//    443), so it works on hosts that block SMTP ports, such as Render's free plan.
//  - Nodemailer over SMTP (fallback, e.g. Gmail on port 587 for local development).

import nodemailer from "nodemailer";
import { withRetry } from "../utils/retry.js";

export const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 15_000;

export class EmailError extends Error {
    constructor(message, { status, cause } = {}) {
        super(message);
        this.name = "EmailError";
        this.status = status;
        this.cause = cause;
    }
}

export const getEmailProvider = () => {
    if (process.env.BREVO_API_KEY) return "brevo";
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) return "smtp";
    return null;
};

export const getSender = () => ({
    email: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    name: process.env.EMAIL_FROM_NAME || "NowledgeHub",
});

/* ------------------------------ Brevo (HTTPS) ------------------------------ */

// Explains the most common Brevo setup problems in the server logs.
const brevoHint = (status, message) => {
    if (status === 401 && /IP/i.test(message)) return "Brevo blocked this server's IP. In Brevo → Security → Authorised IPs, turn off IP blocking or add the server IP.";
    if (status === 401) return "Brevo rejected the API key. Check BREVO_API_KEY (it needs the 'Transactional email: All' permission and expires after 90 days unused).";
    if (status === 400 && /sender/i.test(message)) return "The sender isn't verified in Brevo. EMAIL_FROM must match a verified sender in Brevo → Senders.";
    if (status === 402) return "Brevo account limit reached (free plan: 300 emails/day).";
    return "";
};

export async function sendWithBrevo({ to, subject, html, text }, { fetchFn = fetch } = {}) {
    const sender = getSender();
    if (!sender.email) throw new EmailError("EMAIL_FROM is not set");

    return withRetry(
        async () => {
            let response;
            try {
                response = await fetchFn(BREVO_API_URL, {
                    method: "POST",
                    headers: {
                        accept: "application/json",
                        "content-type": "application/json",
                        "api-key": process.env.BREVO_API_KEY,
                    },
                    body: JSON.stringify({
                        sender,
                        to: [{ email: to }],
                        subject,
                        htmlContent: html,
                        textContent: text,
                    }),
                    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
                });
            } catch (error) {
                const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
                throw new EmailError(timedOut ? "Email send timeout" : `Email request failed: ${error.message}`, { cause: error });
            }

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                const message = body?.message || response.statusText || "Unknown error";
                const hint = brevoHint(response.status, message);
                throw new EmailError(`Brevo error ${response.status}: ${message}${hint ? ` → ${hint}` : ""}`, { status: response.status });
            }
            const body = await response.json().catch(() => ({}));
            return { provider: "brevo", messageId: body?.messageId };
        },
        // Retry only temporary problems (429 / 5xx / network). Bad key or sender fails at once.
        { retries: 2, baseDelayMs: 500, maxDelayMs: 2000 }
    );
}

/* ------------------------------ SMTP (Nodemailer) ------------------------------ */

let transporter = null;
const getTransporter = () => {
    if (transporter) return transporter;
    const port = Number(process.env.EMAIL_PORT) || 587;
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port,
        secure: port === 465, // 465 = TLS from the start, 587 = STARTTLS
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
    });
    return transporter;
};

async function sendWithSmtp({ to, subject, html, text }) {
    const sender = getSender();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new EmailError("Email send timeout")), SEND_TIMEOUT_MS);
    });
    try {
        const info = await Promise.race([
            getTransporter().sendMail({ from: { name: sender.name, address: sender.email }, to, subject, html, text }),
            timeout,
        ]);
        return { provider: "smtp", messageId: info?.messageId };
    } finally {
        clearTimeout(timer);
    }
}

/* ---------------------------------- Public ---------------------------------- */

export async function sendEmail(message) {
    const provider = getEmailProvider();
    if (provider === "brevo") return sendWithBrevo(message);
    if (provider === "smtp") return sendWithSmtp(message);
    throw new EmailError("Email service is not configured");
}
