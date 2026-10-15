import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import {
  assertResourceFileName,
  assertResourceFileReadable,
  assertResourceThumbnailReadable,
  generateThumbnailFile,
  getOrCreateResourceThumbnail,
  openResourceFile,
  openResourceThumbnail,
  removeLocalResourceAssets,
} from "./resources.files.js";

export type ResourceAssetKind = "pdf" | "thumbnail";
export type ResourceStorageDriver = "local" | "r2";

export type ResourceByteRange = {
  start: number;
  end: number;
};

export type ResourceAsset = {
  stream: Readable;
  contentType: "application/pdf" | "image/png";
  contentLength: number;
  totalSize: number;
  range?: ResourceByteRange;
  etag?: string;
  lastModified?: Date;
};

export interface ResourceStorage {
  readonly driver: ResourceStorageDriver;
  persistUploadedAssets(fileName: string): Promise<void>;
  readAsset(
    fileName: string,
    kind: ResourceAssetKind,
    rangeHeader?: string,
  ): Promise<ResourceAsset>;
  ensureThumbnail(fileName: string): Promise<void>;
  removeAssets(fileName?: string): Promise<void>;
  discardUploadedAssets(fileName?: string): Promise<void>;
}

export class InvalidResourceRangeError extends Error {
  constructor(readonly totalSize: number) {
    super("Requested byte range is not satisfiable");
    this.name = "InvalidResourceRangeError";
  }
}

export class ResourceStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceStorageConfigurationError";
  }
}

export const RESOURCE_STAGING_DIR = path.resolve(
  fileURLToPath(new URL("../../../uploads/resource-staging/", import.meta.url)),
);

const RESOURCE_OBJECT_PREFIX = "study-resources";

function contentTypeFor(kind: ResourceAssetKind) {
  return kind === "pdf" ? "application/pdf" as const : "image/png" as const;
}

export function getResourceObjectKey(
  fileName: string,
  kind: ResourceAssetKind,
) {
  const validatedFileName = assertResourceFileName(fileName);

  if (kind === "pdf") {
    return `${RESOURCE_OBJECT_PREFIX}/pdfs/${validatedFileName}`;
  }

  return `${RESOURCE_OBJECT_PREFIX}/thumbnails/${validatedFileName.slice(0, -4)}.png`;
}

export function parseResourceRange(
  rangeHeader: string | undefined,
  totalSize: number,
): ResourceByteRange | undefined {
  if (!rangeHeader) return undefined;

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || totalSize <= 0) {
    throw new InvalidResourceRangeError(totalSize);
  }

  const [, startText, endText] = match;
  if (!startText && !endText) {
    throw new InvalidResourceRangeError(totalSize);
  }

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      throw new InvalidResourceRangeError(totalSize);
    }

    return {
      start: Math.max(totalSize - suffixLength, 0),
      end: totalSize - 1,
    };
  }

  const start = Number(startText);
  const requestedEnd = endText ? Number(endText) : totalSize - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= totalSize ||
    requestedEnd < start
  ) {
    throw new InvalidResourceRangeError(totalSize);
  }

  return { start, end: Math.min(requestedEnd, totalSize - 1) };
}

function isMissingFile(error: unknown) {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function isMissingObject(error: unknown) {
  const storageError = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return storageError.$metadata?.httpStatusCode === 404 ||
    storageError.name === "NoSuchKey" ||
    storageError.name === "NotFound";
}

async function openLocalAsset(
  fileName: string,
  kind: ResourceAssetKind,
  rangeHeader?: string,
): Promise<ResourceAsset> {
  const handle = kind === "pdf"
    ? await openResourceFile(fileName)
    : await openResourceThumbnail(fileName);

  try {
    const { size } = await handle.stat();
    const range = parseResourceRange(rangeHeader, size);
    const contentLength = range ? range.end - range.start + 1 : size;
    const stream = handle.createReadStream(
      range ? { start: range.start, end: range.end } : undefined,
    );

    return {
      stream,
      contentType: contentTypeFor(kind),
      contentLength,
      totalSize: size,
      range,
    };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

export class LocalResourceStorage implements ResourceStorage {
  readonly driver = "local" as const;

  async persistUploadedAssets(fileName: string) {
    await assertResourceFileReadable(fileName);
  }

  readAsset(
    fileName: string,
    kind: ResourceAssetKind,
    rangeHeader?: string,
  ) {
    return openLocalAsset(fileName, kind, rangeHeader);
  }

  async ensureThumbnail(fileName: string) {
    await getOrCreateResourceThumbnail(fileName);
  }

  removeAssets(fileName?: string) {
    return removeLocalResourceAssets(fileName);
  }

  discardUploadedAssets(fileName?: string) {
    return removeLocalResourceAssets(fileName);
  }
}

export type R2StorageConfig = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export class R2ResourceStorage implements ResourceStorage {
  readonly driver = "r2" as const;
  private readonly localFallback = new LocalResourceStorage();

  constructor(
    private readonly config: R2StorageConfig,
    private readonly client: S3Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  ) {}

  private async putLocalFile(
    fileName: string,
    kind: ResourceAssetKind,
    filePath: string,
  ) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: getResourceObjectKey(fileName, kind),
      Body: await readFile(filePath),
      ContentType: contentTypeFor(kind),
      CacheControl: kind === "pdf"
        ? "private, no-store"
        : "private, max-age=86400",
    }));
  }

  private async headObject(fileName: string, kind: ResourceAssetKind) {
    return this.client.send(new HeadObjectCommand({
      Bucket: this.config.bucketName,
      Key: getResourceObjectKey(fileName, kind),
    }));
  }

  async persistUploadedAssets(fileName: string) {
    const pdfPath = await assertResourceFileReadable(fileName);
    await this.putLocalFile(fileName, "pdf", pdfPath);

    try {
      const thumbnailPath = await assertResourceThumbnailReadable(fileName);
      await this.putLocalFile(fileName, "thumbnail", thumbnailPath);
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }

    await removeLocalResourceAssets(fileName);
  }

  private async readR2Asset(
    fileName: string,
    kind: ResourceAssetKind,
    rangeHeader?: string,
  ): Promise<ResourceAsset> {
    const metadata = await this.headObject(fileName, kind);
    const totalSize = metadata.ContentLength;
    if (totalSize === undefined) {
      throw new Error("R2 object size is unavailable");
    }

    const range = parseResourceRange(rangeHeader, totalSize);
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: getResourceObjectKey(fileName, kind),
      Range: range ? `bytes=${range.start}-${range.end}` : undefined,
    }));

    if (!response.Body) {
      throw new Error("R2 returned an empty object response");
    }

    const stream = response.Body instanceof Readable
      ? response.Body
      : Readable.from(response.Body as AsyncIterable<Uint8Array>);

    return {
      stream,
      contentType: contentTypeFor(kind),
      contentLength: range ? range.end - range.start + 1 : totalSize,
      totalSize,
      range,
      etag: metadata.ETag,
      lastModified: metadata.LastModified,
    };
  }

  async readAsset(
    fileName: string,
    kind: ResourceAssetKind,
    rangeHeader?: string,
  ) {
    try {
      return await this.readR2Asset(fileName, kind, rangeHeader);
    } catch (error) {
      if (!isMissingObject(error)) throw error;
      return this.localFallback.readAsset(fileName, kind, rangeHeader);
    }
  }

  async ensureThumbnail(fileName: string) {
    try {
      await this.headObject(fileName, "thumbnail");
      return;
    } catch (error) {
      if (!isMissingObject(error)) throw error;
    }

    try {
      const localThumbnail = await assertResourceThumbnailReadable(fileName);
      await this.putLocalFile(fileName, "thumbnail", localThumbnail);
      return;
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }

    await mkdir(RESOURCE_STAGING_DIR, { recursive: true });
    const temporaryDirectory = await mkdtemp(
      path.join(RESOURCE_STAGING_DIR, "thumbnail-"),
    );
    const pdfPath = path.join(temporaryDirectory, "source.pdf");
    const thumbnailPath = path.join(temporaryDirectory, "preview.png");

    try {
      const pdf = await this.readAsset(fileName, "pdf");
      await pipeline(
        pdf.stream,
        createWriteStream(pdfPath, { flags: "wx" }),
      );
      await generateThumbnailFile(pdfPath, thumbnailPath);
      await this.putLocalFile(fileName, "thumbnail", thumbnailPath);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  async removeAssets(fileName?: string) {
    if (fileName === undefined) return;

    assertResourceFileName(fileName);
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: getResourceObjectKey(fileName, "thumbnail"),
    }));
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: getResourceObjectKey(fileName, "pdf"),
    }));
    await removeLocalResourceAssets(fileName);
  }

  async discardUploadedAssets(fileName?: string) {
    try {
      await this.removeAssets(fileName);
    } finally {
      await removeLocalResourceAssets(fileName);
    }
  }
}

function requireEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  name: "R2_ACCOUNT_ID" | "R2_BUCKET_NAME" | "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY",
) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new ResourceStorageConfigurationError(
      `${name} is required when RESOURCE_STORAGE_DRIVER=r2`,
    );
  }

  return value;
}

export function createResourceStorage(
  environment: NodeJS.ProcessEnv = process.env,
): ResourceStorage {
  const driver = environment.RESOURCE_STORAGE_DRIVER?.trim() || "local";
  if (driver === "local") return new LocalResourceStorage();
  if (driver !== "r2") {
    throw new ResourceStorageConfigurationError(
      "RESOURCE_STORAGE_DRIVER must be either local or r2",
    );
  }

  const config: R2StorageConfig = {
    accountId: requireEnvironmentValue(environment, "R2_ACCOUNT_ID"),
    bucketName: requireEnvironmentValue(environment, "R2_BUCKET_NAME"),
    accessKeyId: requireEnvironmentValue(environment, "R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnvironmentValue(environment, "R2_SECRET_ACCESS_KEY"),
  };

  if (!/^[0-9a-f]{32}$/i.test(config.accountId)) {
    throw new ResourceStorageConfigurationError("R2_ACCOUNT_ID is invalid");
  }
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.bucketName)) {
    throw new ResourceStorageConfigurationError("R2_BUCKET_NAME is invalid");
  }

  return new R2ResourceStorage(config);
}

let configuredStorage: ResourceStorage | undefined;

export function getResourceStorage() {
  configuredStorage ??= createResourceStorage();
  return configuredStorage;
}

export function persistUploadedResourceAssets(fileName: string) {
  return getResourceStorage().persistUploadedAssets(fileName);
}

export function readResourceAsset(
  fileName: string,
  kind: ResourceAssetKind,
  rangeHeader?: string,
) {
  return getResourceStorage().readAsset(fileName, kind, rangeHeader);
}

export function ensureResourceThumbnail(fileName: string) {
  return getResourceStorage().ensureThumbnail(fileName);
}

export function removeResourceAssets(fileName?: string) {
  return getResourceStorage().removeAssets(fileName);
}

export async function discardUploadedResourceAssets(fileName?: string) {
  await getResourceStorage().discardUploadedAssets(fileName);
}
