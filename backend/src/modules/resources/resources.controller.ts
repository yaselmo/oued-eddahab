import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  createCourseSchema,
  createResourceSchema,
  listResourcesSchema,
  resourceIdSchema,
} from "./resources.schema.js";
import {
  createCourse,
  createResource,
  deleteResource,
  getResource,
  getResourceFile,
  listCourses,
  listResources,
  ResourceServiceError,
  recordResourceDownload,
  recordResourceView,
} from "./resources.service.js";
import {
  generateResourceThumbnail,
  validateUploadedPdf,
} from "./resources.files.js";
import {
  discardUploadedResourceAssets,
  ensureResourceThumbnail,
  InvalidResourceRangeError,
  persistUploadedResourceAssets,
  readResourceAsset,
  type ResourceAsset,
} from "./resources.storage.js";

async function removeUploadedFile(fileName?: string) {
  try {
    await discardUploadedResourceAssets(fileName);
  } catch (error) {
    console.error("Failed to remove resource file", error);
  }
}

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ResourceServiceError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: fallback });
}

function requireUserId(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }

  return req.userId;
}

function streamResourceAsset(
  res: Response,
  asset: ResourceAsset,
) {
  asset.stream.on("error", (error) => {
    if (res.headersSent) res.destroy(error);
    else handleError(res, error, "Failed to read resource file");
  });
  asset.stream.pipe(res);
}

function setResourceAssetHeaders(res: Response, asset: ResourceAsset) {
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", asset.contentLength);
  if (asset.etag) res.setHeader("ETag", asset.etag);
  if (asset.lastModified) {
    res.setHeader("Last-Modified", asset.lastModified.toUTCString());
  }

  if (asset.range) {
    res.status(206);
    res.setHeader(
      "Content-Range",
      `bytes ${asset.range.start}-${asset.range.end}/${asset.totalSize}`,
    );
  }
}

function handleResourceAssetError(
  res: Response,
  error: unknown,
  fallback: string,
) {
  if (error instanceof InvalidResourceRangeError) {
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Range", `bytes */${error.totalSize}`);
    res.status(416).json({ message: error.message });
    return;
  }

  handleError(res, error, fallback);
}

export async function getResources(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = listResourcesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid resource filters",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    res.json(await listResources(userId, parsed.data));
  } catch (error) {
    handleError(res, error, "Failed to fetch resources");
  }
}

export async function getResourceById(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = resourceIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid resource ID" });
    return;
  }

  try {
    res.json({ resource: await getResource(userId, parsed.data.id) });
  } catch (error) {
    handleError(res, error, "Failed to fetch resource");
  }
}

export async function addResourceView(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = resourceIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid resource ID" });
    return;
  }

  try {
    res.json(await recordResourceView(userId, parsed.data.id));
  } catch (error) {
    handleError(res, error, "Failed to record resource view");
  }
}

export async function uploadResource(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = requireUserId(req, res);
  if (!userId) {
    await removeUploadedFile(req.file?.filename);
    return;
  }

  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    await removeUploadedFile(req.file?.filename);
    res.status(400).json({
      message: "Invalid resource data",
      errors: parsed.error.flatten(),
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: "A PDF file is required." });
    return;
  }

  try {
    if (!(await validateUploadedPdf(req.file.filename))) {
      res.status(400).json({ message: "Only valid PDF files are allowed." });
      return;
    }

    try {
      await generateResourceThumbnail(req.file.filename);
    } catch (thumbnailError) {
      // A preview is a derived cache: never reject an otherwise valid upload.
      // The protected thumbnail endpoint will retry and the UI has a fallback.
      console.warn("Failed to generate resource thumbnail", thumbnailError);
    }

    await persistUploadedResourceAssets(req.file.filename);

    const resource = await createResource(userId, parsed.data, {
      fileName: req.file.filename,
      fileSize: req.file.size,
    });

    res.status(201).json({
      message: "Resource uploaded successfully",
      resource,
    });
  } catch (error) {
    await removeUploadedFile(req.file.filename);
    handleError(res, error, "Failed to upload resource");
  }
}

export async function removeResource(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = resourceIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid resource ID" });
    return;
  }

  try {
    await deleteResource(userId, parsed.data.id);
    res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    handleError(res, error, "Failed to delete resource");
  }
}

export async function getCourses(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    res.json(await listCourses(userId));
  } catch (error) {
    handleError(res, error, "Failed to fetch courses");
  }
}

export async function addCourse(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = createCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid course data",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    res.status(201).json({ course: await createCourse(userId, parsed.data) });
  } catch (error) {
    handleError(res, error, "Failed to create course");
  }
}

export async function serveResourceFile(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = resourceIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid resource ID" });
    return;
  }

  try {
    const shouldDownload = req.query.download === "1";
    const resource = await getResourceFile(userId, parsed.data.id);
    const asset = await readResourceAsset(
      resource.fileName,
      "pdf",
      req.headers.range,
    );

    if (shouldDownload) {
      res.attachment(`${resource.title}.pdf`);
      const isCompleteResponse = !asset.range || (
        asset.range.start === 0 && asset.range.end === asset.totalSize - 1
      );
      if (isCompleteResponse) {
        res.once("finish", () => {
          void recordResourceDownload(resource.id).catch((updateError) => {
            console.error("Failed to record resource download", updateError);
          });
        });
      }
    } else {
      res.setHeader("Content-Disposition", "inline");
    }

    setResourceAssetHeaders(res, asset);
    res.type(asset.contentType);
    streamResourceAsset(res, asset);
  } catch (error) {
    handleResourceAssetError(res, error, "Failed to open resource file");
  }
}

export async function serveResourceThumbnail(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = resourceIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid resource ID" });
    return;
  }

  try {
    // This lookup applies the same institution authorization as the PDF.
    const resource = await getResourceFile(userId, parsed.data.id);

    try {
      await ensureResourceThumbnail(resource.fileName);
      const asset = await readResourceAsset(resource.fileName, "thumbnail");
      res.setHeader("Cache-Control", "private, max-age=86400");
      setResourceAssetHeaders(res, asset);
      res.type(asset.contentType);
      streamResourceAsset(res, asset);
    } catch (thumbnailError) {
      console.warn("Resource thumbnail is unavailable", thumbnailError);
      res.status(404).json({ message: "Resource preview is unavailable" });
    }
  } catch (error) {
    handleError(res, error, "Failed to open resource thumbnail");
  }
}
