"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { communityRequest } from "./community-api";
import PostCard from "./PostCard";
import type { CommunityPost, FeedTab } from "./types";

const labels: Array<{ value: FeedTab; label: string }> = [
  { value: "for-you", label: "For You" },
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
];

type Props = {
  token: string;
  communitySlug?: string;
  initialTab?: FeedTab;
  showTabs?: boolean;
};

export default function PostFeed({
  token,
  communitySlug,
  initialTab = "for-you",
  showTabs = true,
}: Props) {
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextPage: number, append = false, signal?: AbortSignal) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          feed: tab,
          page: String(nextPage),
          limit: "10",
        });
        if (communitySlug) query.set("community", communitySlug);

        const result = await communityRequest<{
          posts: CommunityPost[];
          page: number;
          hasMore: boolean;
        }>(`/api/posts?${query}`, token, { signal });

        setPosts((current) =>
          append ? [...current, ...result.posts] : result.posts,
        );
        setPage(result.page);
        setHasMore(result.hasMore);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load posts.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [communitySlug, tab, token],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => void load(1, false, controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const createHref = communitySlug
    ? `/community/post/create?community=${encodeURIComponent(communitySlug)}`
    : "/community/post/create";

  return (
    <section aria-label="Posts">
      {showTabs && (
        <div className="flex border-b border-zinc-300" aria-label="Feed order">
          {labels.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={tab === item.value}
              onClick={() => setTab(item.value)}
              className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset ${
                tab === item.value
                  ? "border-emerald-700 text-zinc-950"
                  : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="border-b border-zinc-200 bg-white px-5 py-8 text-sm text-zinc-700">
          <h2 className="font-semibold text-zinc-950">
            Posts could not be loaded
          </h2>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void load(1)}
            className="mt-3 font-semibold text-emerald-800 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div
          className="divide-y divide-zinc-200 border-b border-zinc-200 bg-white"
          aria-label="Loading posts"
        >
          {[0, 1, 2].map((item) => (
            <div key={item} className="px-5 py-6">
              <div className="h-3 w-48 animate-pulse bg-zinc-200" />
              <div className="mt-4 h-5 w-3/4 animate-pulse bg-zinc-200" />
              <div className="mt-3 h-3 w-full animate-pulse bg-zinc-100" />
              <div className="mt-2 h-3 w-2/3 animate-pulse bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="border-b border-zinc-200 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-zinc-950">
            No posts here yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
            Ask a course question, share a campus update, or start a useful
            discussion.
          </p>
          <Link
            href={createHref}
            className="mt-4 inline-block text-sm font-semibold text-emerald-800 hover:underline"
          >
            Write the first post
          </Link>
        </div>
      ) : (
        <div className="border-b border-zinc-200 bg-white">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              token={token}
              showCommunity={!communitySlug}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load(page + 1, true)}
              className="w-full border-t border-zinc-200 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-emerald-800 disabled:opacity-50"
            >
              {loadingMore ? "Loading more…" : "Load more posts"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
