"use client";

import SiteNav from "../components/site-nav";
import { useAuthenticatedProfile } from "../hooks/use-auth";

export default function ProfilePage() {
  const { profile, loading, error, redirectToLogin } = useAuthenticatedProfile();

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        {error || "Loading profile…"}
      </main>
    );
  }

  const initials =
    `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-10 sm:px-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="h-24 w-24 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-2xl font-bold text-emerald-700">
                {initials}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Student profile
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="mt-1 text-zinc-500">@{profile.username}</p>
              {profile.bio && <p className="mt-3 text-zinc-600">{profile.bio}</p>}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Posts" value={profile._count.posts} />
            <Stat label="Clubs" value={profile._count.clubMemberships} />
            <Stat label="Events" value={profile._count.eventAttendance} />
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <ProfileSection title="Academic information">
            <ProfileRow
              label="Institution"
              value={profile.institution?.abbreviation ?? profile.institution?.name}
            />
            <ProfileRow label="University" value={profile.institution?.university.name} />
            <ProfileRow label="Program" value={profile.program} />
            <ProfileRow label="Year" value={profile.year ? `Year ${profile.year}` : null} />
          </ProfileSection>

          <ProfileSection title="Personal information">
            <ProfileRow label="Email" value={profile.email} />
            <ProfileRow label="City" value={profile.city} />
            <ProfileRow label="Country" value={profile.country} />
            <ProfileRow label="Nationality" value={profile.nationality} />
            <ProfileRow label="Age" value={profile.age?.toString()} />
            <ProfileRow
              label="Sex"
              value={profile.sex?.toLowerCase().replaceAll("_", " ")}
            />
            <ProfileRow label="Phone" value={profile.phone} />
          </ProfileSection>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ProfileSection title="Languages">
            <TagList values={profile.languages} empty="No languages added" />
          </ProfileSection>
          <ProfileSection title="Interests">
            <TagList values={profile.interests} empty="No interests added" />
          </ProfileSection>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Account</h2>
            <p className="mt-1 text-sm text-zinc-500">Sign out of Oued Eddahab on this device.</p>
          </div>
          <button
            type="button"
            onClick={redirectToLogin}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Sign out
          </button>
        </section>
      </div>
    </main>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 text-sm last:border-0 last:pb-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-800">{value || "Not set"}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4 text-center">
      <p className="text-2xl font-bold text-zinc-950">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function TagList({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="text-sm text-zinc-500">{empty}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800"
        >
          {value}
        </span>
      ))}
    </div>
  );
}
