"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "../../components/site-nav";
import { useAuthenticatedProfile } from "../../hooks/use-auth";
import CommunityCard from "../_components/CommunityCard";
import { communityRequest } from "../_components/community-api";
import CommunitySidebar from "../_components/CommunitySidebar";
import type { Community } from "../_components/types";

export default function DiscoverCommunitiesPage() {
  const {
    token,
    profile,
    loading: authLoading,
    error: authError,
  } = useAuthenticatedProfile();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joined, setJoined] = useState<Community[]>([]);
  const [search, setSearch] = useState("");
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingJoined, setLoadingJoined] = useState(true);
  const [error, setError] = useState("");
  const [joinedError, setJoinedError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadJoinedCommunities() {
      setLoadingJoined(true);
      try {
        const result = await communityRequest<{ communities: Community[] }>(
          "/api/communities?joined=true&limit=20",
          token,
          { signal: controller.signal },
        );
        setJoined(result.communities);
        setJoinedError("");
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }
        setJoinedError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your communities.",
        );
      } finally {
        if (!controller.signal.aborted) setLoadingJoined(false);
      }
    }

    void loadJoinedCommunities();
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!token || !profile) return;

    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setLoadingCommunities(true);
        setError("");

        const query = new URLSearchParams({ limit: "50" });
        if (search.trim()) query.set("search", search.trim());
        if (profile.institution?.id) {
          query.set("institutionId", profile.institution.id);
        }

        try {
          const result = await communityRequest<{
            communities: Community[];
          }>(`/api/communities?${query}`, token, {
            signal: controller.signal,
          });
          setCommunities(result.communities);
        } catch (loadError) {
          if (
            loadError instanceof DOMException &&
            loadError.name === "AbortError"
          ) {
            return;
          }
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load communities.",
          );
        } finally {
          if (!controller.signal.aborted) setLoadingCommunities(false);
        }
      },
      search ? 250 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [profile, search, token]);

  function updateMembership(updated: Community) {
    setCommunities((current) =>
      current.map((community) =>
        community.id === updated.id ? updated : community,
      ),
    );
    setJoined((current) => {
      if (!updated.isJoined) {
        return current.filter((community) => community.id !== updated.id);
      }
      if (current.some((community) => community.id === updated.id)) {
        return current.map((community) =>
          community.id === updated.id ? updated : community,
        );
      }
      return [...current, updated];
    });
  }

  if (authLoading || !token || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-zinc-500">
        {authError || "Loading communities…"}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <SiteNav />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-[220px_minmax(0,760px)] lg:gap-10 lg:px-8 lg:py-8">
        <CommunitySidebar
          active="discover"
          communities={joined}
          loading={loadingJoined}
          error={joinedError}
        />

        <section
          className="min-w-0 py-6 lg:py-0"
          aria-labelledby="discover-title"
        >
          <header className="flex flex-col gap-4 border-b border-zinc-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 id="discover-title" className="text-2xl font-bold tracking-tight">
                Discover communities
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Find groups for your courses, interests, and campus.
              </p>
            </div>
            <Link
              href="/community/create"
              className="w-fit rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Start a community
            </Link>
          </header>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-zinc-700">
              Search communities
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or topic"
              className="mt-2 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="mt-6">
            {error ? (
              <div className="border-y border-zinc-200 bg-white px-5 py-8 text-sm text-zinc-700">
                <h2 className="font-semibold text-zinc-950">
                  Communities could not be loaded
                </h2>
                <p className="mt-1">{error}</p>
              </div>
            ) : loadingCommunities ? (
              <div
                className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white"
                aria-label="Loading communities"
              >
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="px-5 py-5">
                    <div className="h-4 w-48 animate-pulse bg-zinc-200" />
                    <div className="mt-3 h-3 w-3/4 animate-pulse bg-zinc-100" />
                  </div>
                ))}
              </div>
            ) : communities.length > 0 ? (
              <div>
                <p className="mb-2 text-xs text-zinc-500">
                  {communities.length}{" "}
                  {communities.length === 1 ? "community" : "communities"}
                </p>
                <div>
                  {communities.map((community) => (
                    <CommunityCard
                      key={community.id}
                      initialCommunity={community}
                      token={token}
                      onChange={updateMembership}
                    />
                  ))}
                </div>
              </div>
            ) : search.trim() ? (
              <div className="border-y border-zinc-200 bg-white px-6 py-10 text-center">
                <h2 className="font-semibold text-zinc-950">
                  No communities match “{search.trim()}”
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Try a broader term or browse all communities.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-4 text-sm font-semibold text-emerald-800 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="border-y border-zinc-200 bg-white px-6 py-10 text-center">
                <h2 className="font-semibold text-zinc-950">
                  No communities have been created yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  Start a focused group for a course, student organization, or
                  shared interest.
                </p>
                <Link
                  href="/community/create"
                  className="mt-4 inline-block text-sm font-semibold text-emerald-800 hover:underline"
                >
                  Create the first community
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
