import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../lib/prisma.js";
import { removeClubLogo } from "./clubs.files.js";
import type {
  CreateClubInput,
  ListClubsInput,
  UpdateClubInput,
} from "./clubs.schema.js";

export class ClubServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ClubServiceError";
  }
}

const institutionSelect = {
  id: true,
  name: true,
  abbreviation: true,
} satisfies Prisma.InstitutionSelect;

// Card data: no contact e-mail in lists.
const clubListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  logoFileName: true,
  category: true,
  status: true,
  responsibleName: true,
  createdAt: true,
  updatedAt: true,
  institution: { select: institutionSelect },
  _count: { select: { members: true } },
} satisfies Prisma.ClubSelect;

const clubDetailSelect = {
  ...clubListSelect,
  activities: true,
  additionalInfo: true,
  responsibleEmail: true,
  rejectionReason: true,
  reviewedAt: true,
  institutionId: true,
  createdById: true,
} satisfies Prisma.ClubSelect;

type UserContext = Awaited<ReturnType<typeof getUserContext>>;

async function getUserContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      institutionId: true,
      institution: { select: institutionSelect },
    },
  });

  if (!user) {
    throw new ClubServiceError("Utilisateur introuvable.", 404);
  }

  if (!user.institutionId || !user.institution) {
    throw new ClubServiceError(
      "Vous devez renseigner votre établissement dans votre profil avant d'accéder aux clubs.",
      400,
    );
  }

  return {
    userId: user.id,
    role: user.role,
    institutionId: user.institutionId,
    institution: user.institution,
  };
}

// "Administration de l'établissement" = an ADMIN or MODERATOR attached to the
// institution of the club.
function isReviewerFor(context: UserContext, institutionId: string) {
  return (
    (context.role === "ADMIN" || context.role === "MODERATOR") &&
    context.institutionId === institutionId
  );
}

function isReviewer(context: UserContext) {
  return isReviewerFor(context, context.institutionId);
}

function withLogo<
  T extends {
    id: string;
    logoUrl: string | null;
    logoFileName: string | null;
    updatedAt: Date;
  },
>(club: T) {
  const { logoFileName, ...rest } = club;

  return {
    ...rest,
    logoUrl: logoFileName
      ? `/api/clubs/${club.id}/logo?v=${club.updatedAt.getTime()}`
      : club.logoUrl,
  };
}

function viewerFor(
  context: UserContext,
  club: { createdById: string; institutionId: string; status: string },
  isMember: boolean,
) {
  const isOwner = club.createdById === context.userId;
  const reviewer = isReviewerFor(context, club.institutionId);
  const ownerCanChange = isOwner && club.status !== "APPROVED";

  return {
    isOwner,
    isMember,
    canEdit: reviewer || ownerCanChange,
    canDelete: reviewer || ownerCanChange,
    canSubmit: isOwner && club.status === "REJECTED",
    canReview: reviewer && club.status === "PENDING",
    canJoin:
      club.status === "APPROVED" &&
      club.institutionId === context.institutionId &&
      !isMember,
  };
}

function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  return slug || "club";
}

async function assertNameAvailable(
  institutionId: string,
  name: string,
  excludeId?: string,
) {
  const duplicate = await prisma.club.findFirst({
    where: {
      institutionId,
      name: { equals: name, mode: "insensitive" },
      status: { in: ["PENDING", "APPROVED"] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new ClubServiceError(
      "Un club avec ce nom existe déjà dans votre établissement.",
      409,
    );
  }
}

// Loads a club the user is allowed to see, otherwise answers 404.
async function loadVisibleClub(context: UserContext, id: string) {
  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      institutionId: true,
      createdById: true,
      logoFileName: true,
    },
  });

  const visible =
    club &&
    ((club.status === "APPROVED" &&
      club.institutionId === context.institutionId) ||
      club.createdById === context.userId ||
      isReviewerFor(context, club.institutionId));

  if (!club || !visible) {
    throw new ClubServiceError("Club introuvable.", 404);
  }

  return club;
}

async function presentClub(context: UserContext, id: string) {
  const club = await prisma.club.findUnique({
    where: { id },
    select: clubDetailSelect,
  });

  if (!club) {
    throw new ClubServiceError("Club introuvable.", 404);
  }

  const membership = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId: context.userId, clubId: id } },
    select: { id: true },
  });

  const { institutionId, createdById, ...rest } = club;
  void institutionId;
  void createdById;

  return {
    ...withLogo(rest),
    viewer: viewerFor(context, club, Boolean(membership)),
  };
}

export async function listClubs(userId: string, filters: ListClubsInput) {
  const context = await getUserContext(userId);

  if (filters.scope === "review" && !isReviewer(context)) {
    throw new ClubServiceError(
      "Seule l'administration de l'établissement peut valider les clubs.",
      403,
    );
  }

  const search = filters.search?.trim();

  const scopeFilter: Prisma.ClubWhereInput =
    filters.scope === "mine"
      ? { createdById: context.userId }
      : filters.scope === "review"
        ? { institutionId: context.institutionId, status: "PENDING" }
        : { institutionId: context.institutionId, status: "APPROVED" };

  const clubs = await prisma.club.findMany({
    where: {
      ...scopeFilter,
      category: filters.category,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: clubListSelect,
    orderBy:
      filters.scope === "public"
        ? { name: "asc" }
        : filters.scope === "review"
          ? { createdAt: "asc" }
          : { createdAt: "desc" },
  });

  return {
    clubs: clubs.map(withLogo),
    institution: context.institution,
    canReview: isReviewer(context),
  };
}

export async function getClub(userId: string, id: string) {
  const context = await getUserContext(userId);
  await loadVisibleClub(context, id);

  return presentClub(context, id);
}

export async function createClub(
  userId: string,
  input: CreateClubInput,
  logoFileName?: string,
) {
  const context = await getUserContext(userId);
  await assertNameAvailable(context.institutionId, input.name);

  const club = await prisma.club.create({
    data: {
      name: input.name,
      slug: `${slugify(input.name)}-${randomUUID().slice(0, 8)}`,
      description: input.description,
      category: input.category,
      activities: input.activities,
      additionalInfo: input.additionalInfo || null,
      responsibleName: input.responsibleName,
      responsibleEmail: input.responsibleEmail,
      logoFileName: logoFileName ?? null,
      // Always pending: only an administrator can approve a club.
      status: "PENDING",
      institutionId: context.institutionId,
      createdById: context.userId,
    },
    select: { id: true },
  });

  return presentClub(context, club.id);
}

export async function updateClub(
  userId: string,
  id: string,
  input: UpdateClubInput,
  newLogoFileName?: string,
) {
  const context = await getUserContext(userId);
  const club = await loadVisibleClub(context, id);
  const permissions = viewerFor(context, club, false);

  if (!permissions.canEdit) {
    throw new ClubServiceError("Vous ne pouvez pas modifier ce club.", 403);
  }

  if (input.name && input.name !== club.name) {
    await assertNameAvailable(club.institutionId, input.name, club.id);
  }

  const replaceLogo = Boolean(newLogoFileName) || input.removeLogo === true;

  await prisma.club.update({
    where: { id: club.id },
    data: {
      name: input.name,
      description: input.description,
      category: input.category,
      activities: input.activities,
      additionalInfo:
        input.additionalInfo === undefined
          ? undefined
          : input.additionalInfo || null,
      responsibleName: input.responsibleName,
      responsibleEmail: input.responsibleEmail,
      ...(replaceLogo ? { logoFileName: newLogoFileName ?? null } : {}),
    },
  });

  if (replaceLogo) {
    try {
      await removeClubLogo(club.logoFileName);
    } catch (error) {
      console.error("Failed to remove previous club logo", error);
    }
  }

  return presentClub(context, club.id);
}

export async function deleteClub(userId: string, id: string) {
  const context = await getUserContext(userId);
  const club = await loadVisibleClub(context, id);

  if (!viewerFor(context, club, false).canDelete) {
    throw new ClubServiceError("Vous ne pouvez pas supprimer ce club.", 403);
  }

  await prisma.club.delete({ where: { id: club.id } });

  try {
    await removeClubLogo(club.logoFileName);
  } catch (error) {
    console.error("Failed to remove club logo", error);
  }
}

// A rejected club goes back to "pending" so the administration reviews it again.
export async function submitClub(userId: string, id: string) {
  const context = await getUserContext(userId);
  const club = await loadVisibleClub(context, id);

  if (club.createdById !== context.userId) {
    throw new ClubServiceError(
      "Seul le créateur du club peut le renvoyer pour validation.",
      403,
    );
  }

  if (club.status !== "REJECTED") {
    throw new ClubServiceError(
      club.status === "PENDING"
        ? "Ce club est déjà en attente de validation."
        : "Ce club est déjà validé.",
      409,
    );
  }

  await prisma.club.update({
    where: { id: club.id },
    data: {
      status: "PENDING",
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
  });

  return presentClub(context, club.id);
}

async function loadClubToReview(context: UserContext, id: string) {
  const club = await loadVisibleClub(context, id);

  if (!isReviewerFor(context, club.institutionId)) {
    throw new ClubServiceError(
      "Seule l'administration de l'établissement peut valider ou refuser ce club.",
      403,
    );
  }

  if (club.status !== "PENDING") {
    throw new ClubServiceError(
      "Seuls les clubs en attente peuvent être validés ou refusés.",
      409,
    );
  }

  return club;
}

export async function approveClub(userId: string, id: string) {
  const context = await getUserContext(userId);
  const club = await loadClubToReview(context, id);

  await prisma.club.update({
    where: { id: club.id },
    data: {
      status: "APPROVED",
      rejectionReason: null,
      reviewedAt: new Date(),
      reviewedById: context.userId,
    },
  });

  return presentClub(context, club.id);
}

export async function rejectClub(userId: string, id: string, reason: string) {
  const context = await getUserContext(userId);
  const club = await loadClubToReview(context, id);

  await prisma.club.update({
    where: { id: club.id },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedById: context.userId,
    },
  });

  return presentClub(context, club.id);
}

// Only students of the club's institution can join an approved club.
export async function joinClub(userId: string, id: string) {
  const context = await getUserContext(userId);

  const club = await prisma.club.findUnique({
    where: { id },
    select: { id: true, status: true, institutionId: true },
  });

  if (!club || club.status !== "APPROVED") {
    throw new ClubServiceError("Club introuvable.", 404);
  }

  if (club.institutionId !== context.institutionId) {
    throw new ClubServiceError(
      "Vous devez être étudiant de l'établissement de ce club pour le rejoindre.",
      403,
    );
  }

  try {
    await prisma.clubMember.create({
      data: { userId: context.userId, clubId: club.id },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      throw new ClubServiceError("Vous êtes déjà membre de ce club.", 409);
    }
    throw error;
  }

  return presentClub(context, club.id);
}

export async function getClubLogoFileName(id: string) {
  const club = await prisma.club.findUnique({
    where: { id },
    select: { logoFileName: true },
  });

  return club?.logoFileName ?? null;
}