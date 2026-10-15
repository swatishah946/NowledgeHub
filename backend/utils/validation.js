import mongoose from "mongoose";

export class HttpError extends Error {
    constructor(status, message, code) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.code = code;
    }
}

/**
 * Returns a trimmed string or throws a 400.
 * Rejects objects/arrays, which blocks NoSQL operator injection such as
 * { "email": { "$ne": null } } reaching a Mongo query.
 */
export const requireString = (value, field, { min = 1, max = 1000 } = {}) => {
    if (typeof value !== "string") throw new HttpError(400, `${field} is required`);
    const trimmed = value.trim();
    if (trimmed.length < min) throw new HttpError(400, `${field} is required`);
    if (trimmed.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
    return trimmed;
};

export const optionalString = (value, field, options) =>
    value === undefined || value === null || value === "" ? undefined : requireString(value, field, options);

// Session IDs are created by the browser (crypto.randomUUID). Allow only
// simple characters so they can't be abused in queries or logs.
export const optionalSessionId = (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(value)) {
        throw new HttpError(400, "Invalid sessionId");
    }
    return value;
};

export const isObjectId = (value) => typeof value === "string" && mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value);

export const normalizeEmail = (value) => requireString(value, "Email", { max: 254 }).toLowerCase();
