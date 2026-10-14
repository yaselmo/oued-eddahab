"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SiteNav from "../components/site-nav";
import { useAuthenticatedProfile } from "../hooks/use-auth";
import { communityRequest } from "./_components/community-api";
import CommunitySidebar from "./_components/CommunitySidebar";
import PostFeed from "./_components/PostFeed";
import type { Community, FeedTab } from "./_components/types";

function CommunityHome() {
  const {
    token,
    profile,
    loading: authLoading,
    error: authError,
  } = useAuthenticatedProfile();
  const params = useSearchParams();
  const requestedFeed = params.get("feed");
  const initialTab: FeedTab =
    requestedFeed === "popular" || requestedFeed === "latest"
      ? requestedFeed
      : "for-you";
  const [joined, setJoined] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [communityError, setCommunityError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadJoinedCommunities() {
      setLoadingCommunities(true);
      try {
        const result = await communityRequest<{ communities: Community[] }>(
          "/api/communities?joined=true&limit=20",
          token,
          { signal: controller.signal },
        );
        setJoined(result.communities);
        setCommunityError("");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCommunityError(
          error instanceof Error
            ? error.message
            : "Unable to load your communities.",
        );
      } finally {
        if (!controller.signal.aborted) setLoadingCommunities(false);
      }
    }

    void loadJoinedCommunities();
    return () => controller.abort();
  }, [token]);

  if (authLoading || !token || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-zinc-500">
        {authError || "Opening your community…"}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <SiteNav />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-[220px_minmax(0,760px)] lg:gap-10 lg:px-8 lg:py-8">
        <CommunitySidebar
          active={initialTab === "popular" ? "popular" : "feed"}
          communities={joined}
          loading={loadingCommunities}
          error={communityError}
        />

        <section
          className="min-w-0 py-6 lg:py-0"
          aria-labelledby="community-feed-title"
        >
          <header className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h1
                id="community-feed-title"
                className="text-2xl font-bold tracking-tight"
              >
                Community feed
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Questions, advice, and updates from students.
              </p>
            </div>
            <Link
              href="/community/post/create"
              className="shrink-0 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              New post
            </Link>
          </header>

          <PostFeed key={initialTab} token={token} initialTab={initialTab} />
        </section>
      </div>
    </main>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={(
        <main className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-zinc-500">
          Opening your community…
        </main>
      )}
    >
      <CommunityHome />
    </Suspense>
  );
}
