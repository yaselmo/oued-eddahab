import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { apiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import {
  addCourse,
  getCourses,
  getResourceById,
  getResources,
  removeResource,
  RESOURCE_UPLOAD_DIR,
  serveResourceFile,
  uploadResource,
} from "./resources.controller.js";

mkdirSync(RESOURCE_UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: RESOURCE_UPLOAD_DIR,
    filename: (_req, _file, callback) => {
      callback(null, `${randomUUID()}.pdf`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("Only PDF files are allowed."));
      return;
    }

    callback(null, true);
  },
});

const router = Router();

router.use(apiRateLimiter, requireAuth);

router.get("/courses", getCourses);
router.post("/courses", addCourse);
router.get("/:id/file", serveResourceFile);
router.get("/:id", getResourceById);
router.delete("/:id", removeResource);
router.get("/", getResources);
router.post(
  "/",
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ message: "PDF files must be 20 MB or smaller." });
        return;
      }

      res.status(400).json({
        message: error instanceof Error ? error.message : "Invalid file upload.",
      });
    });
  },
  uploadResource,
);

export default router;
