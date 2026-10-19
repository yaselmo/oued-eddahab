"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SiteNav from "../../components/site-nav";
import { useAuthToken } from "../../hooks/use-auth";
import {
  CATEGORIES,
  ClubDetail,
  ClubLogo,
  StatusBadge,
  UnauthorizedError,
  clubRequest,
  dangerButton,
  primaryButton,
} from "../club-shared";

export default function ClubDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, checkingAuth, redirectToLogin } = useAuthToken();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function load(authToken: string) {
      try {
        const data = await clubRequest<{ club: ClubDetail }>(
          `/api/clubs/${params.id}`,
          authToken,
          { signal: controller.signal },
        );
        setClub(data.club);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (requestError instanceof UnauthorizedError) {
          redirectToLogin();
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger le club.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load(token);
    return () => controller.abort();
  }, [params.id, redirectToLogin, token]);

  async function runAction(path: string, init: RequestInit = {}) {
    if (!token) return;
    setBusy(true);
    setActionError("");

    try {
      const data = await clubRequest<{ club?: ClubDetail }>(path, token, init);

      if (init.method === "DELETE") {
        router.push("/clubs");
        return;
      }
      if (data.club) setClub(data.club);
    } catch (requestError) {
      if (requestError instanceof UnauthorizedError) {
        redirectToLogin();
        return;
      }
      setActionError(
        requestError instanceof Error ? requestError.message : "Action impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  function rejectClub() {
    const reason = window.prompt("Motif du refus :")?.trim();
    if (!reason) return;

    void runAction(`/api/clubs/${params.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  }

  if (checkingAuth || !token || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        Chargement du club…
      </main>
    );
  }

  if (error || !club) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-950">
        <SiteNav />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center">
          <h1 className="text-2xl font-bold">Club introuvable</h1>
          <p className="mt-2 text-zinc-600">{error}</p>
          <Link href="/clubs" className={`${primaryButton} mt-6`}>
            Retour aux clubs
          </Link>
        </div>
      </main>
    );
  }

  const { viewer } = club;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link href="/clubs" className="text-sm font-medium text-zinc-500 hover:text-zinc-950">
          ← Retour aux clubs
        </Link>

        {club.status === "PENDING" && (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>En attente de validation.</strong> Ce club sera visible par les
            autres étudiants une fois validé par l&apos;administration.
          </p>
        )}

        {club.status === "REJECTED" && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <strong>Demande refusée.</strong>
            {club.rejectionReason && ` Motif : ${club.rejectionReason}`}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-5">
            <ClubLogo club={club} size="h-20 w-20" />
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">{club.name}</h1>
              <p className="mt-1 text-zinc-500">{club.institution.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                  {CATEGORIES[club.category] ?? club.category}
                </span>
                <StatusBadge status={club.status} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {viewer.isMember && (
              <span className="rounded-xl bg-emerald-50 px-5 py-3 text-center text-sm font-semibold text-emerald-700">
                ✓ Vous êtes membre de ce club
              </span>
            )}

            {viewer.canJoin && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(`/api/clubs/${club.id}/join`, { method: "POST" })}
                className={primaryButton}
              >
                Rejoindre le club
              </button>
            )}

            {viewer.canReview && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction(`/api/clubs/${club.id}/approve`, { method: "POST" })}
                  className={primaryButton}
                >
                  Valider
                </button>
                <button type="button" disabled={busy} onClick={rejectClub} className={dangerButton}>
                  Refuser
                </button>
              </>
            )}

            {viewer.canDelete && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Supprimer « ${club.name} » ?`)) {
                    void runAction(`/api/clubs/${club.id}`, { method: "DELETE" });
                  }
                }}
                className={dangerButton}
              >
                Supprimer
              </button>
            )}
          </div>

          {actionError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-700">
            {club.description}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Activités</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-700">
            {club.activities}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Informations importantes</h2>
          <ul className="mt-2 space-y-1 text-sm leading-7 text-zinc-700">
            <li>
              <strong>Établissement :</strong> {club.institution.name}
            </li>
            <li>
              <strong>Responsable :</strong> {club.responsibleName}
            </li>
            <li>
              <strong>Contact :</strong>{" "}
              <a href={`mailto:${club.responsibleEmail}`} className="text-emerald-700 hover:underline">
                {club.responsibleEmail}
              </a>
            </li>
            {club.additionalInfo && (
              <li className="whitespace-pre-line">
                <strong>À savoir :</strong> {club.additionalInfo}
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}