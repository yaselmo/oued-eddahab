"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "../components/site-nav";
import { useAuthToken } from "../hooks/use-auth";
import {
  CATEGORIES,
  ClubLogo,
  ClubSummary,
  Institution,
  StatusBadge,
  UnauthorizedError,
  clubRequest,
  primaryButton,
  secondaryButton,
} from "./club-shared";

type ClubsResponse = {
  clubs: ClubSummary[];
  institution: Institution;
  canReview: boolean;
};

function ClubCard({ club, showStatus }: { club: ClubSummary; showStatus: boolean }) {
  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <ClubLogo club={club} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{club.name}</h3>
          <p className="truncate text-sm text-zinc-500">
            {club.institution.abbreviation ?? club.institution.name}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
          {CATEGORIES[club.category] ?? club.category}
        </span>
        {showStatus && <StatusBadge status={club.status} />}
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-zinc-600">
        {club.description}
      </p>

      <Link href={`/clubs/${club.id}`} className={`${secondaryButton} mt-4`}>
        Voir les détails
      </Link>
    </article>
  );
}

function Section({
  title,
  clubs,
  showStatus,
}: {
  title: string;
  clubs: ClubSummary[];
  showStatus: boolean;
}) {
  if (clubs.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <ClubCard key={club.id} club={club} showStatus={showStatus} />
        ))}
      </div>
    </section>
  );
}

export default function ClubsPage() {
  const { token, checkingAuth, redirectToLogin } = useAuthToken();
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [mine, setMine] = useState<ClubSummary[]>([]);
  const [toReview, setToReview] = useState<ClubSummary[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function load(authToken: string) {
      try {
        const publicData = await clubRequest<ClubsResponse>(
          "/api/clubs",
          authToken,
          options,
        );
        const [mineData, reviewData] = await Promise.all([
          clubRequest<ClubsResponse>("/api/clubs?scope=mine", authToken, options),
          publicData.canReview
            ? clubRequest<ClubsResponse>("/api/clubs?scope=review", authToken, options)
            : Promise.resolve(null),
        ]);

        setClubs(publicData.clubs);
        setInstitution(publicData.institution);
        setMine(mineData.clubs.filter((club) => club.status !== "APPROVED"));
        setToReview(reviewData?.clubs ?? []);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (requestError instanceof UnauthorizedError) {
          redirectToLogin();
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger les clubs.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load(token);
    return () => controller.abort();
  }, [token, redirectToLogin]);

  if (checkingAuth || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        Vérification de votre session…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Clubs</h1>
            <p className="mt-2 text-zinc-600">
              {institution
                ? `Les clubs de ${institution.name}`
                : "Les clubs de votre établissement"}
            </p>
          </div>
          <Link href="/clubs/new" className={primaryButton}>
            + Ajouter un club
          </Link>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}{" "}
            {error.includes("établissement") && (
              <Link href="/profile" className="font-semibold underline">
                Aller à mon profil
              </Link>
            )}
          </p>
        )}

        {loading ? (
          <p className="mt-10 text-zinc-500">Chargement des clubs…</p>
        ) : (
          <>
            {!error && clubs.length === 0 && (
              <p className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-zinc-500">
                Aucun club validé pour le moment. Proposez le premier !
              </p>
            )}

            <Section title="Clubs de mon établissement" clubs={clubs} showStatus={false} />
            <Section title="Mes demandes" clubs={mine} showStatus />
            <Section title="Demandes à valider" clubs={toReview} showStatus />
          </>
        )}
      </div>
    </main>
  );
}