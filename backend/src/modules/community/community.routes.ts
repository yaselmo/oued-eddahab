import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware.js";
import { apiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import * as controller from "./community.controller.js";

const router = Router();
router.use(apiRateLimiter);

router.get("/communities", optionalAuth, controller.communities);
router.post("/communities", requireAuth, controller.addCommunity);
router.get("/communities/:slug", optionalAuth, controller.community);
router.post("/communities/:slug/join", requireAuth, controller.join);
router.delete("/communities/:slug/join", requireAuth, controller.leave);

router.get("/posts", optionalAuth, controller.posts);
router.post("/posts", requireAuth, controller.addPost);
router.get("/posts/:id", optionalAuth, controller.post);
router.patch("/posts/:id", requireAuth, controller.editPost);
router.delete("/posts/:id", requireAuth, controller.removePost);
router.post("/posts/:id/vote", requireAuth, controller.vote);
router.get("/posts/:id/comments", optionalAuth, controller.comments);
router.post("/posts/:id/comments", requireAuth, controller.addComment);

router.patch("/comments/:id", requireAuth, controller.editComment);
router.delete("/comments/:id", requireAuth, controller.removeComment);

export default router;
