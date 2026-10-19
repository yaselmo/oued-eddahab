import jwt from "jsonwebtoken";
export function requireAuth(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        res.status(401).json({
            message: "Authentication required",
        });
        return;
    }
    const token = authorization.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({
            message: "JWT_SECRET is not configured",
        });
        return;
    }
    try {
        const payload = jwt.verify(token, secret);
        req.userId = payload.userId;
        next();
    }
    catch {
        res.status(401).json({
            message: "Invalid or expired token",
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map