import type {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

type JwtPayload = {
  userId: string;
};

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
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
    const payload = jwt.verify(
      token,
      secret,
    ) as JwtPayload;

    req.userId = payload.userId;

    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}