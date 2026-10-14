import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import {
  generateResourceThumbnail,
  getResourceFilePath,
  getResourceThumbnailPath,
  isValidPdf,
  openResourceFile,
  removeResourceAssets,
  RESOURCE_THUMBNAIL_DIR,
  RESOURCE_UPLOAD_DIR,
  validateUploadedPdf,
} from "../src/modules/resources/resources.files.js";

const createdFiles: string[] = [];

beforeAll(async () => {
  await mkdir(RESOURCE_UPLOAD_DIR, { recursive: true });
  await mkdir(RESOURCE_THUMBNAIL_DIR, { recursive: true });
});

afterEach(async () => {
  await Promise.all(createdFiles.splice(0).map((file) => rm(file, { force: true })));
});

async function writeResourceFile(contents: string) {
  const fileName = `${randomUUID()}.pdf`;
  const filePath = getResourceFilePath(fileName);
  createdFiles.push(filePath);
  await writeFile(filePath, contents, "latin1");
  return fileName;
}

function minimalPdf() {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>\nendobj\n",
    "4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n",
  ];
  let body = "%PDF-1.7\n";
  const offsets = objects.map((object) => {
    const offset = Buffer.byteLength(body, "latin1");
    body += object;
    return offset;
  });
  const xrefOffset = Buffer.byteLength(body, "latin1");
  const entries = offsets
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `)
    .join("\n");

  return `${body}xref\n0 5\n0000000000 65535 f \n${entries}\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
}

describe("resource file validation", () => {
  test("accepts a PDF with a valid header, xref target, and EOF marker", async () => {
    const fileName = await writeResourceFile(minimalPdf());
    expect(await isValidPdf(fileName)).toBe(true);

    const handle = await openResourceFile(fileName);
    expect((await handle.stat()).isFile()).toBe(true);
    await handle.close();
  });

  test("rejects a header-only payload disguised as a PDF", async () => {
    const fileName = await writeResourceFile(
      "%PDF-1.7\nnot a document\nstartxref\n0\n%%EOF\n",
    );
    expect(await isValidPdf(fileName)).toBe(false);
  });

  test("rejects a truncated PDF without an EOF marker", async () => {
    const fileName = await writeResourceFile("%PDF-1.7\n1 0 obj\n");
    expect(await isValidPdf(fileName)).toBe(false);
  });

  test("removes a rejected uploaded PDF", async () => {
    const fileName = await writeResourceFile("%PDF-1.7\nmalformed upload");
    const filePath = getResourceFilePath(fileName);

    expect(await validateUploadedPdf(fileName)).toBe(false);
    await expect(access(filePath)).rejects.toThrow();
  });

  test("rejects invalid and escaping filenames", () => {
    const invalidNames = [
      "",
      "../../outside.pdf",
      "..\\..\\outside.pdf",
      "/tmp/outside.pdf",
      "C:\\temp\\outside.pdf",
      "%2e%2e%2foutside.pdf",
      `${randomUUID()}.PDF/../outside.pdf`,
      "outside.pdf",
    ];

    for (const fileName of invalidNames) {
      expect(() => getResourceFilePath(fileName)).toThrow();
      expect(() => getResourceThumbnailPath(fileName)).toThrow();
    }
  });

  test("does not delete a traversal target outside resource storage", async () => {
    const outsideName = `${randomUUID()}.pdf`;
    const outsidePath = `${RESOURCE_UPLOAD_DIR}/../${outsideName}`;
    createdFiles.push(outsidePath);
    await writeFile(outsidePath, "outside", "utf8");

    await expect(removeResourceAssets(`../${outsideName}`)).rejects.toThrow();
    await expect(removeResourceAssets("")).rejects.toThrow();
    expect(await readFile(outsidePath, "utf8")).toBe("outside");
  });

  test("does not follow symbolic links outside resource storage", async () => {
    const fileName = `${randomUUID()}.pdf`;
    const filePath = getResourceFilePath(fileName);
    const outsidePath = `${RESOURCE_UPLOAD_DIR}-outside-${randomUUID()}.pdf`;
    createdFiles.push(filePath, outsidePath);
    await writeFile(outsidePath, minimalPdf(), "latin1");
    await symlink(outsidePath, filePath);

    await expect(openResourceFile(fileName)).rejects.toThrow();
    await removeResourceAssets(fileName);

    expect(await readFile(outsidePath, "latin1")).toBe(minimalPdf());
    await expect(access(filePath)).rejects.toThrow();
  });

  test("generates and opens a thumbnail for a legitimate PDF", async () => {
    const fileName = await writeResourceFile(minimalPdf());
    const thumbnailPath = getResourceThumbnailPath(fileName);
    createdFiles.push(thumbnailPath);

    expect(await generateResourceThumbnail(fileName)).toBe(thumbnailPath);
    expect((await readFile(thumbnailPath)).subarray(1, 4).toString()).toBe("PNG");
  });

  test("removes a PDF and its derived thumbnail together", async () => {
    const fileName = await writeResourceFile(minimalPdf());
    const filePath = getResourceFilePath(fileName);
    const thumbnailPath = getResourceThumbnailPath(fileName);
    createdFiles.push(thumbnailPath);
    await writeFile(thumbnailPath, "png");

    await removeResourceAssets(fileName);

    await expect(access(filePath)).rejects.toThrow();
    await expect(access(thumbnailPath)).rejects.toThrow();
  });
});
