"use client";

import Link from "next/link";
import SiteNav from "./components/site-nav";
import { useAuthenticatedProfile } from "./hooks/use-auth";

export default function HomePage() {
  const { profile, loading, error } = useAuthenticatedProfile();

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        {error || "Loading your home…"}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Oued Eddahab
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome back, {profile.firstName}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600">
            Your university community in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/resources"
              className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Browse resources
            </Link>
            <Link
              href="/clubs"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Explore clubs
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-10 sm:px-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Your university</p>
          <h2 className="mt-2 text-xl font-semibold">
            {profile.institution?.name ?? "Institution not selected"}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {[profile.program, profile.year ? `Year ${profile.year}` : null]
              .filter(Boolean)
              .join(" · ") || "Add your program details from your profile."}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight">Quick access</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <QuickLink
              href="/resources"
              title="Study Resources"
              description="Find notes, exams and study materials from your institution."
            />
            <QuickLink
              href="/clubs"
              title="Clubs"
              description="Discover clubs and student communities at your institution."
            />
            <QuickLink
              href="/profile"
              title="Profile"
              description="Manage and review your student information."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <h3 className="font-semibold group-hover:text-emerald-700">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
      <span className="mt-5 inline-block text-sm font-semibold text-emerald-700">
        Open →
      </span>
    </Link>
  );
}
