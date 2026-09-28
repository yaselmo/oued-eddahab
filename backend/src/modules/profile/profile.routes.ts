import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { apiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { getMyProfile } from "./profile.controller.js";

const router = Router();

router.get("/me", apiRateLimiter, requireAuth, getMyProfile);

export default router;