import { open, unlink } from "node:fs/promises";
import path from "node:path";
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
} from "./resources.service.js";

export const RESOURCE_UPLOAD_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "resources",
);

async function removeUploadedFile(fileName?: string) {
  if (!fileName) return;

  try {
    await unlink(path.join(RESOURCE_UPLOAD_DIR, path.basename(fileName)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to remove resource file", error);
    }
  }
}

async function isPdf(filePath: string) {
  const handle = await open(filePath, "r");

  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead === 5 && header.toString("ascii") === "%PDF-";
  } finally {
    await handle.close();
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
    if (!(await isPdf(req.file.path))) {
      await removeUploadedFile(req.file.filename);
      res.status(400).json({ message: "Only valid PDF files are allowed." });
      return;
    }

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
    const fileName = await deleteResource(userId, parsed.data.id);
    await removeUploadedFile(fileName);
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
    const resource = await getResourceFile(userId, parsed.data.id, shouldDownload);
    const absolutePath = path.join(
      RESOURCE_UPLOAD_DIR,
      path.basename(resource.fileName),
    );

    if (shouldDownload) {
      res.download(absolutePath, `${resource.title}.pdf`);
      return;
    }

    res.type("application/pdf").sendFile(absolutePath);
  } catch (error) {
    handleError(res, error, "Failed to open resource file");
  }
}
