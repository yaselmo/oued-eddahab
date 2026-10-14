import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  assertClubLogoReadable,
  getClubLogoContentType,
  removeClubLogo,
  validateUploadedLogo,
} from "./clubs.files.js";
import {
  clubIdSchema,
  createClubSchema,
  listClubsSchema,
  rejectClubSchema,
  updateClubSchema,
} from "./clubs.schema.js";
import {
  approveClub,
  ClubServiceError,
  createClub,
  deleteClub,
  getClub,
  getClubLogoFileName,
  joinClub,
  listClubs,
  rejectClub,
  submitClub,
  updateClub,
} from "./clubs.service.js";

async function removeUploadedLogo(fileName?: string) {
  try {
    await removeClubLogo(fileName);
  } catch (error) {
    console.error("Failed to remove club logo", error);
  }
}

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ClubServiceError) {
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

function parseClubId(req: AuthenticatedRequest, res: Response) {
  const parsed = clubIdSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ message: "Identifiant de club invalide." });
    return null;
  }

  return parsed.data.id;
}

export async function getClubs(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = listClubsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      message: "Filtres invalides.",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    res.json(await listClubs(userId, parsed.data));
  } catch (error) {
    handleError(res, error, "Impossible de charger les clubs.");
  }
}

export async function getClubById(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const id = parseClubId(req, res);
  if (!id) return;

  try {
    res.json({ club: await getClub(userId, id) });
  } catch (error) {
    handleError(res, error, "Impossible de charger le club.");
  }
}

export async function addClub(req: AuthenticatedRequest, res: Response) {
  const logoFileName = req.file?.filename;

  const userId = requireUserId(req, res);
  if (!userId) {
    await removeUploadedLogo(logoFileName);
    return;
  }

  const parsed = createClubSchema.safeParse(req.body);
  if (!parsed.success) {
    await removeUploadedLogo(logoFileName);
    res.status(400).json({
      message: "Les informations du club sont invalides.",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    if (logoFileName && !(await validateUploadedLogo(logoFileName))) {
      res.status(400).json({ message: "Le logo n'est pas une image valide." });
      return;
    }

    const club = await createClub(userId, parsed.data, logoFileName);
    res.status(201).json({
      message: "Votre demande a été envoyée. Elle est en attente de validation.",
      club,
    });
  } catch (error) {
    await removeUploadedLogo(logoFileName);
    handleError(res, error, "Impossible d'envoyer la demande.");
  }
}

export async function editClub(req: AuthenticatedRequest, res: Response) {
  const logoFileName = req.file?.filename;

  const userId = requireUserId(req, res);
  const id = userId ? parseClubId(req, res) : null;
  if (!userId || !id) {
    await removeUploadedLogo(logoFileName);
    return;
  }

  const parsed = updateClubSchema.safeParse(req.body);
  if (!parsed.success) {
    await removeUploadedLogo(logoFileName);
    res.status(400).json({
      message: "Les informations du club sont invalides.",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    if (logoFileName && !(await validateUploadedLogo(logoFileName))) {
      res.status(400).json({ message: "Le logo n'est pas une image valide." });
      return;
    }

    const club = await updateClub(userId, id, parsed.data, logoFileName);
    res.json({ message: "Club mis à jour.", club });
  } catch (error) {
    await removeUploadedLogo(logoFileName);
    handleError(res, error, "Impossible de modifier le club.");
  }
}

export async function removeClub(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const id = parseClubId(req, res);
  if (!id) return;

  try {
    await deleteClub(userId, id);
    res.json({ message: "Club supprimé." });
  } catch (error) {
    handleError(res, error, "Impossible de supprimer le club.");
  }
}

export async function sendClubForValidation(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const id = parseClubId(req, res);
  if (!id) return;

  try {
    const club = await submitClub(userId, id);
    res.json({ message: "Club renvoyé pour validation.", club });
  } catch (error) {
    handleError(res, error, "Impossible d'envoyer le club pour validation.");
  }
}

export async function validateClub(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const id = parseClubId(req, res);
  if (!id) return;

  try {
    const club = await approveClub(userId, id);
    res.json({ message: "Club validé.", club });
  } catch (error) {
    handleError(res, error, "Impossible de valider le club.");
  }
}

export async function refuseClub(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const id = parseClubId(req, res);
  if (!id) return;

  const parsed = rejectClubSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Merci d'indiquer le motif du refus.",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    const club = await rejectClub(userId, id, parsed.data.reason);
    res.json({ message: "Club refusé.", club });
  } catch (error) {
    handleError(res, error, "Impossible de refuser le club.");
  }
}

export async function joinClubById(req: AuthenticatedRequest, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const id = parseClubId(req, res);
  if (!id) return;

  try {
    const club = await joinClub(userId, id);
    res.status(201).json({ message: "Vous avez rejoint le club.", club });
  } catch (error) {
    handleError(res, error, "Impossible de rejoindre le club.");
  }
}

// Public on purpose: <img> tags cannot send an Authorization header.
export async function serveClubLogo(req: Request, res: Response) {
  const parsed = clubIdSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(404).end();
    return;
  }

  try {
    const fileName = await getClubLogoFileName(parsed.data.id);

    if (!fileName) {
      res.status(404).end();
      return;
    }

    const absolutePath = await assertClubLogoReadable(fileName);

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.type(getClubLogoContentType(fileName) ?? "application/octet-stream");
    res.sendFile(absolutePath, (error) => {
      if (!error) return;
      if (res.headersSent) res.destroy(error);
      else res.status(404).end();
    });
  } catch {
    res.status(404).end();
  }
}