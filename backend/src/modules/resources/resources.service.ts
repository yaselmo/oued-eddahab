import { randomUUID } from "node:crypto";
import type { Prisma, ResourceType } from "../../generated/prisma/client.js";
import prisma from "../../lib/prisma.js";
import { recordUniqueResourceView } from "./resource-views.domain.js";
import { removeResourceAssets } from "./resources.files.js";
import type {
  CreateCourseInput,
  CreateResourceInput,
} from "./resources.schema.js";

export class ResourceServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ResourceServiceError";
  }
}

const resourceInclude = {
  uploader: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
  institution: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
    },
  },
  course: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  _count: {
    select: { resourceViews: true },
  },
} satisfies Prisma.StudyResourceInclude;

type ResourceWithViewCount = Prisma.StudyResourceGetPayload<{
  include: typeof resourceInclude;
}>;

function withUniqueViewCount(resource: ResourceWithViewCount) {
  const { _count, ...resourceData } = resource;
  return { ...resourceData, views: _count.resourceViews };
}

async function getInstitutionContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
        },
      },
    },
  });

  if (!user) {
    throw new ResourceServiceError("User not found", 404);
  }

  if (!user.institutionId || !user.institution) {
    throw new ResourceServiceError(
      "You must select an institution before viewing resources.",
      400,
    );
  }

  return {
    institutionId: user.institutionId,
    institution: user.institution,
  };
}

export async function listResources(
  userId: string,
  filters: {
    search?: string;
    type?: ResourceType;
    courseId?: string;
  },
) {
  const context = await getInstitutionContext(userId);
  const search = filters.search?.trim();

  const where: Prisma.StudyResourceWhereInput = {
    institutionId: context.institutionId,
    type: filters.type,
    courseId: filters.courseId,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { course: { name: { contains: search, mode: "insensitive" } } },
            { course: { code: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const resources = await prisma.studyResource.findMany({
    where,
    include: resourceInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    resources: resources.map(withUniqueViewCount),
    institution: context.institution,
  };
}

export async function getResource(userId: string, id: string) {
  const { institutionId } = await getInstitutionContext(userId);

  const resource = await prisma.studyResource.findFirst({
    where: { id, institutionId },
    include: resourceInclude,
  });

  if (!resource) {
    throw new ResourceServiceError("Resource not found", 404);
  }

  return withUniqueViewCount(resource);
}

export async function createResource(
  userId: string,
  input: CreateResourceInput,
  file: { fileName: string; fileSize: number },
) {
  const { institutionId } = await getInstitutionContext(userId);

  if (input.courseId) {
    const course = await prisma.course.findFirst({
      where: { id: input.courseId, institutionId },
      select: { id: true },
    });

    if (!course) {
      throw new ResourceServiceError(
        "The selected course does not belong to your institution.",
        400,
      );
    }
  }

  const id = randomUUID();

  const resource = await prisma.studyResource.create({
    data: {
      id,
      title: input.title,
      description: input.description,
      type: input.type,
      academicYear: input.academicYear,
      professor: input.professor,
      courseId: input.courseId,
      uploaderId: userId,
      institutionId,
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileUrl: `/api/resources/${id}/file`,
    },
    include: resourceInclude,
  });

  return withUniqueViewCount(resource);
}

export async function deleteResource(userId: string, id: string) {
  const { institutionId } = await getInstitutionContext(userId);
  const resource = await prisma.studyResource.findFirst({
    where: { id, institutionId },
    select: { id: true, uploaderId: true, fileName: true },
  });

  if (!resource) {
    throw new ResourceServiceError("Resource not found", 404);
  }

  if (resource.uploaderId !== userId) {
    throw new ResourceServiceError(
      "You can only delete resources that you uploaded.",
      403,
    );
  }

  // Remove the filesystem asset before its database reference. If cleanup
  // fails, keep the row so the file is not silently orphaned.
  await removeResourceAssets(resource.fileName);
  await prisma.studyResource.delete({ where: { id: resource.id } });
}

export async function listCourses(userId: string) {
  const context = await getInstitutionContext(userId);
  const courses = await prisma.course.findMany({
    where: { institutionId: context.institutionId },
    select: { id: true, name: true, code: true },
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });

  return { courses, institution: context.institution };
}

export async function createCourse(userId: string, input: CreateCourseInput) {
  const { institutionId } = await getInstitutionContext(userId);

  return prisma.course.create({
    data: {
      name: input.name,
      code: input.code,
      institutionId,
    },
    select: { id: true, name: true, code: true },
  });
}

export async function getResourceFile(
  userId: string,
  id: string,
) {
  const { institutionId } = await getInstitutionContext(userId);
  const resource = await prisma.studyResource.findFirst({
    where: { id, institutionId },
    select: { id: true, title: true, fileName: true },
  });

  if (!resource) {
    throw new ResourceServiceError("Resource not found", 404);
  }

  return resource;
}

export async function recordResourceDownload(id: string) {
  await prisma.studyResource.update({
    where: { id },
    data: { downloads: { increment: 1 } },
  });
}

export async function recordResourceView(userId: string, id: string) {
  // Authorization and institution scoping are identical to opening the PDF.
  await getResourceFile(userId, id);

  return recordUniqueResourceView(
    {
      async insert(resourceId, viewerId) {
        const result = await prisma.resourceView.createMany({
          data: [{ resourceId, userId: viewerId }],
          skipDuplicates: true,
        });
        return result.count === 1;
      },
      count(resourceId) {
        return prisma.resourceView.count({ where: { resourceId } });
      },
    },
    id,
    userId,
  );
}
