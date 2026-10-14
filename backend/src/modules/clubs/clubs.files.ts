import { constants } from "node:fs";
import { access, open, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CLUB_LOGO_UPLOAD_DIR = path.resolve(
  fileURLToPath(new URL("../../../uploads/clubs/", import.meta.url)),
);

export const CLUB_LOGO_MAX_SIZE = 2 * 1024 * 1024;

// SVG is intentionally not allowed (it can embed scripts).
export const LOGO_EXTENSIONS: Record<string, ".png" | ".jpg" | ".webp"> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const LOGO_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

const LOGO_FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/i;

export function getClubLogoPath(fileName: string) {
  const safeFileName = path.basename(fileName);

  if (safeFileName !== fileName || !LOGO_FILE_NAME_PATTERN.test(safeFileName)) {
    throw new Error("Invalid club logo file name");
  }

  const filePath = path.resolve(CLUB_LOGO_UPLOAD_DIR, safeFileName);

  if (path.dirname(filePath) !== CLUB_LOGO_UPLOAD_DIR) {
    throw new Error("Club logo path is outside the upload directory");
  }

  return filePath;
}

export function getClubLogoContentType(fileName: string) {
  return LOGO_CONTENT_TYPES[path.extname(fileName).toLowerCase()];
}

export async function removeClubLogo(fileName?: string | null) {
  if (!fileName) return;

  try {
    await unlink(getClubLogoPath(fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function assertClubLogoReadable(fileName: string) {
  const filePath = getClubLogoPath(fileName);
  await access(filePath, constants.R_OK);
  return filePath;
}

// Checks the real file signature, not only the declared mimetype.
async function hasValidSignature(fileName: string) {
  const filePath = getClubLogoPath(fileName);
  const handle = await open(filePath, "r");

  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, 12, 0);
    if (bytesRead < 12) return false;

    switch (path.extname(fileName).toLowerCase()) {
      case ".png":
        return header
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      case ".jpg":
        return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      case ".webp":
        return (
          header.subarray(0, 4).toString("latin1") === "RIFF" &&
          header.subarray(8, 12).toString("latin1") === "WEBP"
        );
      default:
        return false;
    }
  } finally {
    await handle.close();
  }
}

export async function validateUploadedLogo(fileName: string) {
  if (await hasValidSignature(fileName)) return true;

  await removeClubLogo(fileName);
  return false;
}