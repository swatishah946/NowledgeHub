import "./env.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { io as connectClient } from "socket.io-client";
import app from "../app.js";
import { socketAuth } from "../config/socketConfig.js";
import { createToken } from "../utils/jwtUtils.js";

// No database in these tests: every request below must be answered before any DB access.
mongoose.set("bufferCommands", false);

const token = createToken({ id: new mongoose.Types.ObjectId().toString() });
const auth = { Authorization: `Bearer ${token}` };

test("health check and JSON 404", async () => {
    await request(app).get("/health").expect(200);
    const res = await request(app).get("/api/does-not-exist").expect(404);
    assert.equal(res.body.code, "NOT_FOUND");
});

test("previously public study endpoints now require login", async () => {
    for (const [method, path] of [
        ["post", "/api/study/clear"],
        ["get", "/api/study/metrics"],
        ["get", "/api/study/verify-index"],
        ["get", "/api/study/documents"],
        ["post", "/api/study/ask"],
        ["post", "/api/ai/research"],
    ]) {
        await request(app)[method](path).expect(401);
    }
});

test("expired and tampered tokens are rejected with 401", async () => {
    const expired = jwt.sign({ id: "abc" }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get("/api/ai/history").set("Authorization", `Bearer ${expired}`).expect(401);
    assert.equal(res.body.message, "Session expired");

    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    await request(app).get("/api/ai/history").set("Authorization", `Bearer ${tampered}`).expect(401);

    const noneAlg = jwt.sign({ id: "abc" }, "", { algorithm: "none" });
    await request(app).get("/api/ai/history").set("Authorization", `Bearer ${noneAlg}`).expect(401);
});

test("NoSQL operator objects are rejected before reaching MongoDB", async () => {
    await request(app).post("/api/auth/login").send({ email: { $ne: null }, password: "x" }).expect(400);
    await request(app).post("/api/chat/join").set(auth).send({ code: { $ne: null } }).expect(400);
    await request(app).post("/api/study/ask").set(auth).send({ query: { $gt: "" } }).expect(400);
});

test("input validation", async () => {
    await request(app).post("/api/auth/register").send({ name: "A", email: "a@college.edu", password: "abc123!" }).expect(400);
    await request(app).post("/api/auth/register").send({ name: "A", email: "a@gmail.com", password: "short" }).expect(400);
    await request(app).post("/api/ai/chat").set(auth).send({ query: "x".repeat(5001) }).expect(400);
    await request(app).post("/api/ai/chat").set(auth).send({ query: "hi", sessionId: "bad id!" }).expect(400);
    const bad = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{not json").expect(400);
    assert.equal(bad.body.code, "BAD_JSON");
});

test("uploads must be real PDFs", async () => {
    await request(app).post("/api/study/upload").set(auth).attach("pdf", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" }).expect(400);
    const fake = await request(app)
        .post("/api/study/upload")
        .set(auth)
        .attach("pdf", Buffer.from("not really a pdf"), { filename: "fake.pdf", contentType: "application/pdf" })
        .expect(400);
    assert.match(fake.body.error, /not a valid PDF/);
});

test("CORS only allows the configured frontends", async () => {
    const ok = await request(app).get("/health").set("Origin", "https://nowledgehub.vercel.app");
    assert.equal(ok.headers["access-control-allow-origin"], "https://nowledgehub.vercel.app");
    const evil = await request(app).get("/health").set("Origin", "https://evil.example");
    assert.equal(evil.headers["access-control-allow-origin"], undefined);
});

test("auth routes are rate limited (20 per 15 minutes)", async () => {
    const ip = "203.0.113.7";
    let last;
    for (let i = 0; i < 21; i++) {
        last = await request(app).post("/api/auth/login").set("X-Forwarded-For", ip).send({ email: "x", password: "" });
    }
    assert.equal(last.status, 429);
    assert.ok(last.body.retryAfterSeconds > 0);
    assert.ok(last.headers["ratelimit-policy"]);
});

test("security headers are set", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.headers["x-content-type-options"], "nosniff");
});

/* -------------------------- Socket.IO authentication -------------------------- */

const server = http.createServer();
const io = new Server(server);
io.use(socketAuth);
await new Promise((resolve) => server.listen(0, resolve));
const url = `http://localhost:${server.address().port}`;

after(() => {
    io.close();
    server.close();
});

const connectError = (options) =>
    new Promise((resolve) => {
        const client = connectClient(url, { ...options, reconnection: false, transports: ["websocket"] });
        client.on("connect_error", (err) => {
            client.close();
            resolve(err.message);
        });
        client.on("connect", () => {
            client.close();
            resolve("connected");
        });
    });

test("sockets without a valid JWT are refused", async () => {
    assert.equal(await connectError({}), "Authentication error: No token provided.");
    assert.equal(await connectError({ auth: { token: "garbage" } }), "Authentication error: Invalid token.");
});
