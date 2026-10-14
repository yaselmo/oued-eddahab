import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const RESOURCE_UPLOAD_DIR = path.resolve(
  fileURLToPath(new URL("../../../uploads/resources/", import.meta.url)),
);
export const RESOURCE_THUMBNAIL_DIR = path.resolve(
  fileURLToPath(new URL("../../../uploads/resource-thumbnails/", import.meta.url)),
);

const RESOURCE_FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

export function getResourceFilePath(fileName: string) {
  const safeFileName = path.basename(fileName);

  if (
    safeFileName !== fileName ||
    !RESOURCE_FILE_NAME_PATTERN.test(safeFileName)
  ) {
    throw new Error("Invalid resource file name");
  }

  const filePath = path.resolve(RESOURCE_UPLOAD_DIR, safeFileName);

  if (path.dirname(filePath) !== RESOURCE_UPLOAD_DIR) {
    throw new Error("Resource file path is outside the upload directory");
  }

  return filePath;
}

export function getResourceThumbnailPath(fileName: string) {
  // Validate the server-generated PDF name before deriving another file path.
  getResourceFilePath(fileName);
  const thumbnailName = `${fileName.slice(0, -4)}.png`;
  const thumbnailPath = path.resolve(RESOURCE_THUMBNAIL_DIR, thumbnailName);

  if (path.dirname(thumbnailPath) !== RESOURCE_THUMBNAIL_DIR) {
    throw new Error("Resource thumbnail path is outside the thumbnail directory");
  }

  return thumbnailPath;
}

async function removeResourceFile(fileName?: string) {
  if (!fileName) return;

  try {
    await unlink(getResourceFilePath(fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function removeResourceThumbnail(fileName?: string) {
  if (!fileName) return;

  try {
    await unlink(getResourceThumbnailPath(fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function removeResourceAssets(fileName?: string) {
  if (!fileName) return;

  // Remove the derived asset first. If deleting the PDF subsequently fails,
  // the thumbnail can still be recreated from the intact source document.
  await removeResourceThumbnail(fileName);
  await removeResourceFile(fileName);
}

export async function assertResourceFileReadable(fileName: string) {
  const filePath = getResourceFilePath(fileName);
  await access(filePath, constants.R_OK);
  return filePath;
}

async function assertResourceThumbnailReadable(fileName: string) {
  const thumbnailPath = getResourceThumbnailPath(fileName);
  await access(thumbnailPath, constants.R_OK);
  return thumbnailPath;
}

export async function generateResourceThumbnail(fileName: string) {
  const pdfPath = await assertResourceFileReadable(fileName);
  const thumbnailPath = getResourceThumbnailPath(fileName);
  const temporaryBase = path.join(
    RESOURCE_THUMBNAIL_DIR,
    `.thumbnail-${randomUUID()}`,
  );
  const temporaryPath = `${temporaryBase}.png`;

  await mkdir(RESOURCE_THUMBNAIL_DIR, { recursive: true });

  try {
    // Poppler renders only page one, keeping listing requests independent of
    // the original PDF size. execFile passes arguments without a shell.
    await execFileAsync(
      "pdftocairo",
      [
        "-png",
        "-f",
        "1",
        "-l",
        "1",
        "-singlefile",
        "-scale-to-x",
        "720",
        "-scale-to-y",
        "-1",
        pdfPath,
        temporaryBase,
      ],
      { timeout: 20_000, maxBuffer: 1024 * 1024 },
    );
    await access(temporaryPath, constants.R_OK);
    await rename(temporaryPath, thumbnailPath);
    return thumbnailPath;
  } finally {
    try {
      await unlink(temporaryPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export async function getOrCreateResourceThumbnail(fileName: string) {
  try {
    return await assertResourceThumbnailReadable(fileName);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  return generateResourceThumbnail(fileName);
}

export async function isValidPdf(fileName: string) {
  const filePath = getResourceFilePath(fileName);
  const handle = await open(filePath, "r");

  try {
    const { size } = await handle.stat();
    if (size < 32) return false;

    const headerLength = Math.min(size, 16);
    const header = Buffer.alloc(headerLength);
    const headerRead = await handle.read(header, 0, headerLength, 0);
    const headerText = header.subarray(0, headerRead.bytesRead).toString("latin1");

    if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r\n|\r|\n)/.test(headerText)) {
      return false;
    }

    const tailLength = Math.min(size, 4_096);
    const tail = Buffer.alloc(tailLength);
    const tailRead = await handle.read(
      tail,
      0,
      tailLength,
      size - tailLength,
    );
    const tailText = tail.subarray(0, tailRead.bytesRead).toString("latin1");
    const eofIndex = tailText.lastIndexOf("%%EOF");

    if (eofIndex === -1 || !/^\s*$/.test(tailText.slice(eofIndex + 5))) {
      return false;
    }

    const startXrefMatch = /startxref\s+(\d+)\s*$/.exec(
      tailText.slice(0, eofIndex),
    );

    if (!startXrefMatch) return false;

    const xrefOffset = Number(startXrefMatch[1]);
    if (!Number.isSafeInteger(xrefOffset) || xrefOffset <= 0 || xrefOffset >= size) {
      return false;
    }

    const xrefLength = Math.min(size - xrefOffset, 512);
    const xref = Buffer.alloc(xrefLength);
    const xrefRead = await handle.read(xref, 0, xrefLength, xrefOffset);
    const xrefText = xref.subarray(0, xrefRead.bytesRead).toString("latin1");

    const hasClassicXref = /^xref(?:\r\n|\r|\n)/.test(xrefText);
    const hasXrefStream =
      /^\d+\s+\d+\s+obj\b/.test(xrefText) &&
      /\/Type\s*\/XRef\b/.test(xrefText);

    return hasClassicXref || hasXrefStream;
  } finally {
    await handle.close();
  }
}

export async function validateUploadedPdf(fileName: string) {
  if (await isValidPdf(fileName)) return true;

  await removeResourceFile(fileName);
  return false;
}
