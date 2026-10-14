"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import SiteNav from "../../../components/site-nav";
import { useAuthenticatedProfile } from "../../../hooks/use-auth";
import { communityRequest } from "../../_components/community-api";
import { MessageIcon, SparklesIcon } from "../../_components/Icons";
import type { Community, CommunityPost } from "../../_components/types";

function CreatePostForm() {
  const { token, profile, loading: authLoading, error: authError } = useAuthenticatedProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCommunity = searchParams.get("community") ?? "";
  const [communities, setCommunities] = useState<Community[]>([]);
  const [form, setForm] = useState({ communitySlug: "", title: "", content: "" });
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [state, setState] = useState({ busy: false, error: "", success: "" });

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadAllowedCommunities() {
      setLoadingCommunities(true);
      try {
        const available: Community[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const result = await communityRequest<{
            communities: Community[];
            hasMore: boolean;
          }>(`/api/communities?limit=50&page=${page}`, token, {
            signal: controller.signal,
          });
          available.push(...result.communities);
          hasMore = result.hasMore;
          page += 1;
        }

        if (controller.signal.aborted) return;
        setCommunities(available);

        const requestedIsAllowed = available.some(
          (community) => community.slug === requestedCommunity,
        );
        setForm((current) => ({
          ...current,
          communitySlug: requestedIsAllowed
            ? requestedCommunity
            : available[0]?.slug ?? "",
        }));

        if (requestedCommunity && !requestedIsAllowed) {
          setState({
            busy: false,
            success: "",
            error: "The requested community is unavailable. Choose another community below.",
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          busy: false,
          success: "",
          error: error instanceof Error ? error.message : "Unable to load communities.",
        });
      } finally {
        if (!controller.signal.aborted) setLoadingCommunities(false);
      }
    }

    void loadAllowedCommunities();
    return () => controller.abort();
  }, [requestedCommunity, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setState({ busy: true, error: "", success: "" });
    try {
      const result = await communityRequest<{ post: CommunityPost }>(
        "/api/posts",
        token,
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );
      setState({ busy: true, error: "", success: "Post published. Opening the discussion…" });
      router.push(`/community/post/${result.post.id}`);
    } catch (error) {
      setState({
        busy: false,
        success: "",
        error: error instanceof Error ? error.message : "Unable to publish post.",
      });
    }
  }

  if (authLoading || !token || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        {authError || "Preparing the post editor…"}
      </main>
    );
  }

  const inputClass = "mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <main className="min-h-screen bg-[#f7f8f7] text-zinc-950">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/community" className="text-sm font-semibold text-zinc-500 hover:text-emerald-700">
          ← Back to Community
        </Link>

        <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <MessageIcon />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">
            Start a conversation
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Create a post</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
            Ask a clear question, share useful information, or start a thoughtful campus discussion.
          </p>

          {state.error && (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {state.success}
            </p>
          )}

          {loadingCommunities ? (
            <div className="mt-8 space-y-5" aria-label="Loading communities">
              <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-52 animate-pulse rounded-xl bg-zinc-100" />
            </div>
          ) : communities.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
              <h2 className="font-bold text-zinc-900">There are no communities to post in yet</h2>
              <p className="mt-2 text-sm text-zinc-500">Create the first community, then return here to start a discussion.</p>
              <Link href="/community/create" className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                Create Community
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-6">
              <label className="block text-sm font-bold text-zinc-800">
                Community
                <select
                  required
                  value={form.communitySlug}
                  onChange={(event) => setForm({ ...form, communitySlug: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Choose a community</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.slug}>
                      {community.name}
                      {community.institution
                        ? ` · ${community.institution.abbreviation ?? community.institution.name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-zinc-800">
                Post title
                <input
                  required
                  minLength={5}
                  maxLength={180}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="What would make someone stop and read?"
                  className={inputClass}
                />
                <span className="mt-1.5 block text-right text-xs font-normal text-zinc-400">
                  {form.title.length}/180
                </span>
              </label>

              <label className="block text-sm font-bold text-zinc-800">
                Post content
                <textarea
                  required
                  maxLength={10000}
                  rows={10}
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  placeholder="Add the context and details other students need…"
                  className={`${inputClass} resize-y leading-6`}
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-end">
                <Link href="/community" className="rounded-xl px-5 py-3 text-center text-sm font-bold text-zinc-600 hover:bg-zinc-100">
                  Cancel
                </Link>
                <button
                  disabled={state.busy || !form.communitySlug}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {state.busy ? "Publishing post…" : "Publish Post"}
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
          <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-xs leading-5">
            Specific titles and enough context help fellow students give better answers.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense
      fallback={(
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Preparing the post editor…
        </main>
      )}
    >
      <CreatePostForm />
    </Suspense>
  );
}
