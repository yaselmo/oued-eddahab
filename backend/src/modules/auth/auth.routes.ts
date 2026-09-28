import { Router } from "express";

import { authRateLimiter } from "../../middleware/rate-limit.middleware.js";
import {
  login,
  register,
} from "./auth.controller.js";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);

export default router;