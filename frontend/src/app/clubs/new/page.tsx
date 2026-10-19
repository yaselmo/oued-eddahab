"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import SiteNav from "../../components/site-nav";
import { useAuthenticatedProfile } from "../../hooks/use-auth";
import {
  CATEGORIES,
  UnauthorizedError,
  clubRequest,
  inputClass,
  primaryButton,
  secondaryButton,
} from "../club-shared";

export default function NewClubPage() {
  const router = useRouter();
  const { token, profile, loading, error: profileError, redirectToLogin } =
    useAuthenticatedProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const formData = new FormData(event.currentTarget);
    const logo = formData.get("logo");

    if (logo instanceof File && logo.size === 0) {
      formData.delete("logo");
    } else if (logo instanceof File && logo.size > 2 * 1024 * 1024) {
      setError("Le logo doit faire 2 Mo maximum.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await clubRequest<{ club: { id: string } }>("/api/clubs", token, {
        method: "POST",
        body: formData,
      });
      router.push(`/clubs/${data.club.id}`);
    } catch (submitError) {
      if (submitError instanceof UnauthorizedError) {
        redirectToLogin();
        return;
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d'envoyer la demande.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !token || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        {profileError || "Chargement…"}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />

      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <Link href="/clubs" className="text-sm font-medium text-zinc-500 hover:text-zinc-950">
          ← Retour aux clubs
        </Link>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight">Ajouter un club</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Votre demande sera examinée par l&apos;administration de votre
            établissement avant d&apos;être publiée.
          </p>

          {!profile.institution ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Renseignez d&apos;abord votre établissement dans votre profil.{" "}
              <Link href="/profile" className="font-semibold underline">
                Aller à mon profil
              </Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block text-sm font-medium">
                Nom du club
                <input name="name" required minLength={3} maxLength={100} className={inputClass} />
              </label>

              <label className="block text-sm font-medium">
                Catégorie
                <select name="category" required defaultValue="OTHER" className={inputClass}>
                  {Object.entries(CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Établissement
                <input value={profile.institution.name} disabled readOnly className={inputClass} />
              </label>

              <label className="block text-sm font-medium">
                Description
                <textarea
                  name="description"
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={4}
                  placeholder="Présentez le club en quelques phrases…"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium">
                Description des activités
                <textarea
                  name="activities"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  placeholder="Ateliers, événements, compétitions…"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium">
                Nom du responsable
                <input
                  name="responsibleName"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={`${profile.firstName} ${profile.lastName}`.trim()}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium">
                Email du responsable
                <input
                  name="responsibleEmail"
                  type="email"
                  required
                  defaultValue={profile.email}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium">
                Logo du club <span className="font-normal text-zinc-400">(PNG, JPEG ou WebP, 2 Mo max)</span>
                <input
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium">
                Informations supplémentaires <span className="font-normal text-zinc-400">(facultatif)</span>
                <textarea name="additionalInfo" maxLength={2000} rows={3} className={inputClass} />
              </label>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" disabled={submitting} className={primaryButton}>
                  {submitting ? "Envoi en cours…" : "Envoyer la demande"}
                </button>
                <Link href="/clubs" className={secondaryButton}>
                  Annuler
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}