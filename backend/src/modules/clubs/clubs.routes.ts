
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { apiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import {
  addClub,
  editClub,
  getClubById,
  getClubs,
  joinClubById,
  refuseClub,
  removeClub,
  sendClubForValidation,
  serveClubLogo,
  validateClub,
} from "./clubs.controller.js";
import {
  CLUB_LOGO_MAX_SIZE,
  CLUB_LOGO_UPLOAD_DIR,
  LOGO_EXTENSIONS,
} from "./clubs.files.js";

mkdirSync(CLUB_LOGO_UPLOAD_DIR, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: CLUB_LOGO_UPLOAD_DIR,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${LOGO_EXTENSIONS[file.mimetype]}`);
    },
  }),
  limits: { fileSize: CLUB_LOGO_MAX_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!(file.mimetype in LOGO_EXTENSIONS)) {
      callback(
        new Error("Le logo doit être une image PNG, JPEG ou WebP."),
      );
      return;
    }

    callback(null, true);
  },
});

function uploadLogo(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  logoUpload.single("logo")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      res.status(400).json({
        message: "Le logo doit faire 2 Mo maximum.",
      });
      return;
    }

    res.status(400).json({
      message: error instanceof Error
        ? error.message
        : "Logo invalide.",
    });
  });
}

const router = Router();

// Logos remain public, but requests are rate-limited
// to prevent excessive file system access.
router.get("/:id/logo", apiRateLimiter, serveClubLogo);

// The remaining routes require authentication.
router.use(apiRateLimiter, requireAuth);

router.get("/", getClubs);
router.post("/", uploadLogo, addClub);
router.get("/:id", getClubById);
router.patch("/:id", uploadLogo, editClub);
router.delete("/:id", removeClub);
router.post("/:id/submit", sendClubForValidation);
router.post("/:id/approve", validateClub);
router.post("/:id/reject", refuseClub);
router.post("/:id/join", joinClubById);

export default router;
