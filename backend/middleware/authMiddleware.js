import { verifyToken } from "../utils/jwtUtils.js";

export const authenticate = (req, res, next) => {
    const header = req.header("Authorization") || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Unauthorized", error: "Unauthorized" });
    }

    try {
        const payload = verifyToken(token);
        if (!payload?.id) throw new Error("Token has no user id");
        req.user = { id: String(payload.id) };
        next();
    } catch (error) {
        const expired = error.name === "TokenExpiredError";
        return res.status(401).json({
            message: expired ? "Session expired" : "Invalid token",
            error: expired ? "Session expired" : "Invalid token",
        });
    }
};
