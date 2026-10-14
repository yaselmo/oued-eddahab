export class CommunityServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CommunityServiceError";
  }
}

export function assertOwner(ownerId: string, userId: string, resource: string) {
  if (ownerId !== userId) {
    throw new CommunityServiceError(`You can only edit or delete your own ${resource}.`, 403);
  }
}

export function voteDelta(previous: number, next: -1 | 0 | 1) {
  return next - previous;
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "P2002",
  );
}
