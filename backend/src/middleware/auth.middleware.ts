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

function readUserId(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(authorization.slice(7), secret) as JwtPayload;
    return payload.userId;
  } catch {
    return null;
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  req.userId = readUserId(req.headers.authorization) ?? undefined;
  next();
}

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

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      message: "JWT_SECRET is not configured",
    });
    return;
  }

  try {
    req.userId = readUserId(authorization) ?? undefined;

    if (!req.userId) throw new Error("Invalid token");

    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
