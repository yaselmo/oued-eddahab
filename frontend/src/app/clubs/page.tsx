"use client";

import SiteNav from "../components/site-nav";
import { useAuthenticatedProfile } from "../hooks/use-auth";

export default function ClubsPage() {
  const { profile, loading, error } = useAuthenticatedProfile();

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        {error || "Loading clubs…"}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />
      <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-24">
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-16 shadow-sm sm:px-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
            ✦
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">Clubs</h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-zinc-600">
            Discover student clubs and communities at your institution.
          </p>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Clubs are coming next.
          </p>
        </div>
      </section>
    </main>
  );
}
