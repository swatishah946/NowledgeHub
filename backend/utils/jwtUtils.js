import jwt from "jsonwebtoken";

export const JWT_OPTIONS = { algorithm: "HS256", expiresIn: "7d" };

export const createToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, JWT_OPTIONS);

// Pinning the algorithm stops a token signed with a different algorithm from being accepted.
export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
