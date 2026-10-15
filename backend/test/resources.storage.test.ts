import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import {
  generateResourceThumbnail,
  getResourceFilePath,
  getResourceThumbnailPath,
  RESOURCE_THUMBNAIL_DIR,
  RESOURCE_UPLOAD_DIR,
} from "../src/modules/resources/resources.files.js";
import {
  createResourceStorage,
  getResourceObjectKey,
  InvalidResourceRangeError,
  LocalResourceStorage,
  parseResourceRange,
  R2ResourceStorage,
  type R2StorageConfig,
} from "../src/modules/resources/resources.storage.js";

const createdFiles: string[] = [];

beforeAll(async () => {
  await mkdir(RESOURCE_UPLOAD_DIR, { recursive: true });
  await mkdir(RESOURCE_THUMBNAIL_DIR, { recursive: true });
});

afterEach(async () => {
  await Promise.all(createdFiles.splice(0).map((file) => rm(file, { force: true })));
});

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

  return Buffer.from(
    `${body}xref\n0 5\n0000000000 65535 f \n${entries}\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    "latin1",
  );
}

async function writePdf() {
  const fileName = `${randomUUID()}.pdf`;
  const filePath = getResourceFilePath(fileName);
  createdFiles.push(filePath, getResourceThumbnailPath(fileName));
  await writeFile(filePath, minimalPdf());
  return fileName;
}

async function streamToBuffer(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

class FakeR2Client {
  readonly commands: object[] = [];
  readonly objects = new Map<string, Buffer>();
  failNextPut = false;
  failNextDelete = false;

  async send(command: object) {
    this.commands.push(command);

    if (command instanceof PutObjectCommand) {
      if (this.failNextPut) {
        this.failNextPut = false;
        throw new Error("simulated R2 upload failure");
      }
      this.objects.set(command.input.Key!, Buffer.from(command.input.Body as Uint8Array));
      return {};
    }

    if (command instanceof HeadObjectCommand) {
      const body = this.objects.get(command.input.Key!);
      if (!body) throw Object.assign(new Error("missing"), {
        name: "NotFound",
        $metadata: { httpStatusCode: 404 },
      });
      return { ContentLength: body.length, ETag: '"test-etag"' };
    }

    if (command instanceof GetObjectCommand) {
      const body = this.objects.get(command.input.Key!);
      if (!body) throw Object.assign(new Error("missing"), {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      });
      const match = command.input.Range
        ? /^bytes=(\d+)-(\d+)$/.exec(command.input.Range)
        : undefined;
      const selected = match
        ? body.subarray(Number(match[1]), Number(match[2]) + 1)
        : body;
      return { Body: Readable.from(selected) };
    }

    if (command instanceof DeleteObjectCommand) {
      if (this.failNextDelete) {
        this.failNextDelete = false;
        throw new Error("simulated R2 deletion failure");
      }
      this.objects.delete(command.input.Key!);
      return {};
    }

    throw new Error("Unexpected S3 command");
  }
}

const r2Config: R2StorageConfig = {
  accountId: "00000000000000000000000000000000",
  bucketName: "oued-eddahab-test",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
};

function createFakeR2Storage() {
  const client = new FakeR2Client();
  const storage = new R2ResourceStorage(
    r2Config,
    client as unknown as S3Client,
  );
  return { client, storage };
}

describe("resource byte ranges", () => {
  test("supports bounded, open-ended, and suffix byte ranges", () => {
    expect(parseResourceRange("bytes=2-5", 10)).toEqual({ start: 2, end: 5 });
    expect(parseResourceRange("bytes=7-", 10)).toEqual({ start: 7, end: 9 });
    expect(parseResourceRange("bytes=-3", 10)).toEqual({ start: 7, end: 9 });
    expect(parseResourceRange(undefined, 10)).toBeUndefined();
  });

  test("rejects multiple, malformed, and unsatisfiable ranges", () => {
    for (const range of ["bytes=10-", "bytes=5-2", "bytes=0-1,4-5", "items=0-1"]) {
      expect(() => parseResourceRange(range, 10)).toThrow(InvalidResourceRangeError);
    }
  });
});

describe("local resource storage", () => {
  test("reads full and ranged PDFs and deletes their assets", async () => {
    const fileName = await writePdf();
    const storage = new LocalResourceStorage();

    await storage.persistUploadedAssets(fileName);
    const full = await storage.readAsset(fileName, "pdf");
    expect(await streamToBuffer(full.stream)).toEqual(minimalPdf());

    const partial = await storage.readAsset(fileName, "pdf", "bytes=0-7");
    expect(partial.range).toEqual({ start: 0, end: 7 });
    expect(partial.contentLength).toBe(8);
    expect((await streamToBuffer(partial.stream)).toString("latin1")).toBe("%PDF-1.7");

    await storage.ensureThumbnail(fileName);
    const thumbnail = await storage.readAsset(fileName, "thumbnail");
    expect((await streamToBuffer(thumbnail.stream)).subarray(1, 4).toString()).toBe("PNG");

    await storage.removeAssets(fileName);
    await expect(access(getResourceFilePath(fileName))).rejects.toThrow();
    await expect(access(getResourceThumbnailPath(fileName))).rejects.toThrow();
  });
});

describe("R2 resource storage", () => {
  test("uploads private object keys, serves ranges, and deletes both assets", async () => {
    const fileName = await writePdf();
    await generateResourceThumbnail(fileName);
    const { client, storage } = createFakeR2Storage();

    await storage.persistUploadedAssets(fileName);
    const pdfKey = getResourceObjectKey(fileName, "pdf");
    const thumbnailKey = getResourceObjectKey(fileName, "thumbnail");
    expect(client.objects.has(pdfKey)).toBe(true);
    expect(client.objects.has(thumbnailKey)).toBe(true);
    await expect(access(getResourceFilePath(fileName))).rejects.toThrow();

    const partial = await storage.readAsset(fileName, "pdf", "bytes=1-4");
    expect(await streamToBuffer(partial.stream)).toEqual(minimalPdf().subarray(1, 5));

    await storage.removeAssets(fileName);
    expect(client.objects.has(pdfKey)).toBe(false);
    expect(client.objects.has(thumbnailKey)).toBe(false);
  });

  test("generates a missing thumbnail from the private R2 PDF", async () => {
    const fileName = await writePdf();
    const { client, storage } = createFakeR2Storage();
    await storage.persistUploadedAssets(fileName);

    await storage.ensureThumbnail(fileName);

    const thumbnail = client.objects.get(getResourceObjectKey(fileName, "thumbnail"));
    expect(thumbnail?.subarray(1, 4).toString()).toBe("PNG");
  });

  test("retains the staged file when an R2 upload fails", async () => {
    const fileName = await writePdf();
    const { client, storage } = createFakeR2Storage();
    client.failNextPut = true;

    await expect(storage.persistUploadedAssets(fileName)).rejects.toThrow(
      "simulated R2 upload failure",
    );
    expect(await readFile(getResourceFilePath(fileName))).toEqual(minimalPdf());
  });

  test("cleans the staged file even when remote cleanup fails", async () => {
    const fileName = await writePdf();
    const { client, storage } = createFakeR2Storage();
    client.failNextDelete = true;

    await expect(storage.discardUploadedAssets(fileName)).rejects.toThrow(
      "simulated R2 deletion failure",
    );
    await expect(access(getResourceFilePath(fileName))).rejects.toThrow();
  });

  test("falls back to an existing local resource that is not in R2", async () => {
    const fileName = await writePdf();
    const { storage } = createFakeR2Storage();

    const asset = await storage.readAsset(fileName, "pdf");
    expect(await streamToBuffer(asset.stream)).toEqual(minimalPdf());
  });
});

describe("resource storage configuration", () => {
  test("defaults to local and rejects incomplete R2 configuration", () => {
    expect(createResourceStorage({}).driver).toBe("local");
    expect(() => createResourceStorage({ RESOURCE_STORAGE_DRIVER: "r2" })).toThrow(
      "R2_ACCOUNT_ID is required",
    );
  });

  test("rejects traversal in object keys", () => {
    expect(() => getResourceObjectKey("../../outside.pdf", "pdf")).toThrow();
  });
});
