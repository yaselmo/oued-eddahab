"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
    id: string;
    email: string;
    username: string;

    firstName: string;
    lastName: string;
    bio: string | null;
    avatarUrl: string | null;

    age: number | null;
    city: string | null;
    country: string | null;
    nationality: string | null;
    phone: string | null;

    languages: string[];
    interests: string[];

    sex: string | null;

    program: string | null;
    year: number | null;

    role: string;
    createdAt: string;

    institution: {
        id: string;
        name: string;
        abbreviation: string | null;
        city: string;

        university: {
            id: string;
            name: string;
        };
    } | null;

    _count: {
        posts: number;
        clubMemberships: number;
        eventAttendance: number;
    };
};

export default function ProfilePage() {
    const router = useRouter();
    function handleLogout() {
        localStorage.removeItem("token");
        router.push("/login");
    }
    const API_URL =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProfile() {
            const token = localStorage.getItem("token");

            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const response = await fetch(
                    `${API_URL}/api/profile/me`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    router.push("/login");
                    return;
                }

                if (!response.ok) {
                    throw new Error("Failed to load profile");
                }

                const data = await response.json();

                setProfile(data.profile);
            } catch (error) {
                console.error(error);
                setError("Unable to load your profile");
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [API_URL, router]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
                Loading profile...
            </main>
        );
    }

    if (error || !profile) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
                <p>{error || "Profile not found"}</p>
            </main>
        );
    }

    const initials =
        `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

    return (
        <main className="min-h-screen bg-zinc-950 px-4 py-12 text-white">
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/"
                    className="mb-6 inline-block text-sm text-zinc-400 hover:text-white"
                >
                    ← Back
                </Link>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
                    <div className="mb-6 flex justify-end">
                        <button
                            onClick={handleLogout}
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                        >
                            Log out
                        </button>
                    </div>
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                        {profile.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={`${profile.firstName} ${profile.lastName}`}
                                className="h-24 w-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold">
                                {initials}
                            </div>
                        )}

                        <div>
                            <h1 className="text-3xl font-bold">
                                {profile.firstName} {profile.lastName}
                            </h1>

                            <p className="mt-1 text-zinc-400">
                                @{profile.username}
                            </p>

                            {profile.bio && (
                                <p className="mt-3 text-zinc-300">
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        <Stat
                            label="Posts"
                            value={profile._count.posts}
                        />

                        <Stat
                            label="Clubs"
                            value={profile._count.clubMemberships}
                        />

                        <Stat
                            label="Events"
                            value={profile._count.eventAttendance}
                        />
                    </div>

                    <div className="mt-8 grid gap-8 md:grid-cols-2">
                        <section>
                            <h2 className="mb-4 text-lg font-semibold">
                                About
                            </h2>

                            <div className="space-y-3 text-sm">
                                <ProfileRow
                                    label="City"
                                    value={profile.city}
                                />

                                <ProfileRow
                                    label="Country"
                                    value={profile.country}
                                />

                                <ProfileRow
                                    label="Nationality"
                                    value={profile.nationality}
                                />

                                <ProfileRow
                                    label="Age"
                                    value={profile.age?.toString()}
                                />

                                <ProfileRow
                                    label="Email"
                                    value={profile.email}
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="mb-4 text-lg font-semibold">
                                Academic
                            </h2>

                            <div className="space-y-3 text-sm">
                                <ProfileRow
                                    label="Institution"
                                    value={
                                        profile.institution?.abbreviation ??
                                        profile.institution?.name
                                    }
                                />

                                <ProfileRow
                                    label="University"
                                    value={profile.institution?.university.name}
                                />

                                <ProfileRow
                                    label="Program"
                                    value={profile.program}
                                />

                                <ProfileRow
                                    label="Year"
                                    value={
                                        profile.year
                                            ? `Year ${profile.year}`
                                            : null
                                    }
                                />
                            </div>
                        </section>
                    </div>

                    <section className="mt-8">
                        <h2 className="mb-3 text-lg font-semibold">
                            Languages
                        </h2>

                        <div className="flex flex-wrap gap-2">
                            {profile.languages.length ? (
                                profile.languages.map((language) => (
                                    <Tag key={language}>{language}</Tag>
                                ))
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    No languages added
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="mt-8">
                        <h2 className="mb-3 text-lg font-semibold">
                            Interests
                        </h2>

                        <div className="flex flex-wrap gap-2">
                            {profile.interests.length ? (
                                profile.interests.map((interest) => (
                                    <Tag key={interest}>{interest}</Tag>
                                ))
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    No interests added
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

function ProfileRow({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
    return (
        <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">
                {label}
            </span>

            <span className="text-right text-zinc-200">
                {value || "Not set"}
            </span>
        </div>
    );
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl bg-zinc-800 p-4 text-center">
            <p className="text-2xl font-bold">
                {value}
            </p>

            <p className="text-sm text-zinc-400">
                {label}
            </p>
        </div>
    );
}

function Tag({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <span className="rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300">
            {children}
        </span>
    );
}