import { constants } from "node:fs";
import { access, open, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RESOURCE_UPLOAD_DIR = path.resolve(
  fileURLToPath(new URL("../../../uploads/resources/", import.meta.url)),
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

export async function removeResourceFile(fileName?: string) {
  if (!fileName) return;

  try {
    await unlink(getResourceFilePath(fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function assertResourceFileReadable(fileName: string) {
  const filePath = getResourceFilePath(fileName);
  await access(filePath, constants.R_OK);
  return filePath;
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
