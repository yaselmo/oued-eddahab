import { randomUUID } from "node:crypto";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import {
  getResourceFilePath,
  isValidPdf,
  RESOURCE_UPLOAD_DIR,
  validateUploadedPdf,
} from "../src/modules/resources/resources.files.js";

const createdFiles: string[] = [];

beforeAll(async () => {
  await mkdir(RESOURCE_UPLOAD_DIR, { recursive: true });
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
  const body = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n";
  const xrefOffset = Buffer.byteLength(body, "latin1");

  return `${body}xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
}

describe("resource file validation", () => {
  test("accepts a PDF with a valid header, xref target, and EOF marker", async () => {
    const fileName = await writeResourceFile(minimalPdf());
    expect(await isValidPdf(fileName)).toBe(true);
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

  test("rejects filenames that could escape the upload directory", () => {
    expect(() => getResourceFilePath("../../outside.pdf")).toThrow();
  });
});
