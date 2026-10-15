import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
  type FileHandle,
} from "node:fs/promises";
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

export function assertResourceFileName(fileName: string) {
  if (!RESOURCE_FILE_NAME_PATTERN.test(fileName)) {
    throw new Error("Invalid resource file name");
  }

  return fileName;
}

function resolveStoragePath(storageDirectory: string, fileName: string) {
  const filePath = path.resolve(storageDirectory, fileName);
  const relativePath = path.relative(storageDirectory, filePath);

  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Resource file path is outside its storage directory");
  }

  return filePath;
}

async function assertRegularStorageFile(
  storageDirectory: string,
  filePath: string,
) {
  const fileStats = await lstat(filePath);
  if (fileStats.isSymbolicLink() || !fileStats.isFile()) {
    throw new Error("Resource asset must be a regular file");
  }

  const [canonicalDirectory, canonicalFile] = await Promise.all([
    realpath(storageDirectory),
    realpath(filePath),
  ]);
  const relativePath = path.relative(canonicalDirectory, canonicalFile);

  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Resource asset resolves outside its storage directory");
  }
}

async function openRegularStorageFile(
  storageDirectory: string,
  filePath: string,
) {
  await assertRegularStorageFile(storageDirectory, filePath);

  const handle = await open(
    filePath,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );

  try {
    if (!(await handle.stat()).isFile()) {
      throw new Error("Resource asset must be a regular file");
    }

    return handle;
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function removeStorageFile(filePath: string) {
  try {
    const fileStats = await lstat(filePath);
    if (!fileStats.isFile() && !fileStats.isSymbolicLink()) {
      throw new Error("Resource asset must be a file");
    }

    // unlink removes a final symbolic-link entry rather than following it.
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function getResourceFilePath(fileName: string) {
  const validatedFileName = assertResourceFileName(fileName);
  return resolveStoragePath(RESOURCE_UPLOAD_DIR, validatedFileName);
}

export function getResourceThumbnailPath(fileName: string) {
  const validatedFileName = assertResourceFileName(fileName);
  const thumbnailName = `${validatedFileName.slice(0, -4)}.png`;
  return resolveStoragePath(RESOURCE_THUMBNAIL_DIR, thumbnailName);
}

async function removeResourceFile(fileName: string) {
  await removeStorageFile(getResourceFilePath(fileName));
}

async function removeResourceThumbnail(fileName: string) {
  await removeStorageFile(getResourceThumbnailPath(fileName));
}

export async function removeLocalResourceAssets(fileName?: string) {
  if (fileName === undefined) return;

  // Remove the derived asset first. If deleting the PDF subsequently fails,
  // the thumbnail can still be recreated from the intact source document.
  await removeResourceThumbnail(fileName);
  await removeResourceFile(fileName);
}

export async function assertResourceFileReadable(fileName: string) {
  const filePath = getResourceFilePath(fileName);
  const handle = await openRegularStorageFile(RESOURCE_UPLOAD_DIR, filePath);
  await handle.close();
  return filePath;
}

export async function assertResourceThumbnailReadable(fileName: string) {
  const thumbnailPath = getResourceThumbnailPath(fileName);
  const handle = await openRegularStorageFile(
    RESOURCE_THUMBNAIL_DIR,
    thumbnailPath,
  );
  await handle.close();
  return thumbnailPath;
}

export function openResourceFile(fileName: string): Promise<FileHandle> {
  const filePath = getResourceFilePath(fileName);
  return openRegularStorageFile(RESOURCE_UPLOAD_DIR, filePath);
}

export function openResourceThumbnail(fileName: string): Promise<FileHandle> {
  const thumbnailPath = getResourceThumbnailPath(fileName);
  return openRegularStorageFile(RESOURCE_THUMBNAIL_DIR, thumbnailPath);
}

export async function generateThumbnailFile(
  pdfPath: string,
  thumbnailPath: string,
) {
  const pdfDirectory = path.dirname(pdfPath);
  const thumbnailDirectory = path.dirname(thumbnailPath);
  await assertRegularStorageFile(pdfDirectory, pdfPath);

  const temporaryBase = path.join(
    thumbnailDirectory,
    `.thumbnail-${randomUUID()}`,
  );
  const temporaryPath = `${temporaryBase}.png`;

  await mkdir(thumbnailDirectory, { recursive: true });

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
    const temporaryHandle = await openRegularStorageFile(
      thumbnailDirectory,
      temporaryPath,
    );
    await temporaryHandle.close();
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

export async function generateResourceThumbnail(fileName: string) {
  const pdfPath = await assertResourceFileReadable(fileName);
  const thumbnailPath = getResourceThumbnailPath(fileName);
  return generateThumbnailFile(pdfPath, thumbnailPath);
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
  const handle = await openResourceFile(fileName);

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
