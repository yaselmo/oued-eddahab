import { apiUrl } from "../lib/api";

export type ClubStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Institution = {
  id: string;
  name: string;
  abbreviation: string | null;
};

export type ClubSummary = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  category: string;
  status: ClubStatus;
  institution: Institution;
};

export type ClubDetail = ClubSummary & {
  activities: string | null;
  additionalInfo: string | null;
  responsibleName: string;
  responsibleEmail: string;
  rejectionReason: string | null;
  viewer: {
    isOwner: boolean;
    isMember: boolean;
    canDelete: boolean;
    canReview: boolean;
    canJoin: boolean;
  };
};

export const CATEGORIES: Record<string, string> = {
  TECH: "Technologie",
  SPORT: "Sport",
  CULTURE: "Culture",
  ART: "Art & création",
  SCIENCE: "Sciences",
  SOCIAL: "Social & solidarité",
  ENTREPRENEURSHIP: "Entrepreneuriat",
  OTHER: "Autre",
};

export const STATUS_LABELS: Record<ClubStatus, { label: string; style: string }> = {
  PENDING: { label: "En attente de validation", style: "bg-amber-50 text-amber-800" },
  APPROVED: { label: "Validé", style: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Refusé", style: "bg-red-50 text-red-700" },
};

export class UnauthorizedError extends Error {}

// Fetch wrapper: adds the token and throws readable errors.
export async function clubRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) throw new UnauthorizedError();

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "Une erreur est survenue. Réessayez.");
  }

  return data as T;
}

export function ClubLogo({
  club,
  size = "h-14 w-14",
}: {
  club: Pick<ClubSummary, "name" | "logoUrl">;
  size?: string;
}) {
  if (club.logoUrl) {
    return (
      // Logos come from the API origin, so a plain <img> is used on purpose.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={apiUrl(club.logoUrl)}
        alt={`Logo du club ${club.name}`}
        className={`${size} shrink-0 rounded-2xl border border-zinc-200 object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-700`}
    >
      {club.name.trim().charAt(0).toUpperCase() || "C"}
    </div>
  );
}

export function StatusBadge({ status }: { status: ClubStatus }) {
  const { label, style } = STATUS_LABELS[status];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

export const inputClass =
  "mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-zinc-100 disabled:text-zinc-500";

export const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50";

export const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50";

export const dangerButton =
  "inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50";