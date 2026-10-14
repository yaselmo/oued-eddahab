"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SiteNav from "../../../components/site-nav";
import { useAuthenticatedProfile } from "../../../hooks/use-auth";
import CommunityAvatar from "../../_components/CommunityAvatar";
import { communityRequest } from "../../_components/community-api";
import CreatePostPrompt from "../../_components/CreatePostPrompt";
import { PlusIcon, UsersIcon } from "../../_components/Icons";
import PostFeed from "../../_components/PostFeed";
import type { Community } from "../../_components/types";

export default function CommunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, profile, loading: authLoading, error: authError } = useAuthenticatedProfile();
  const [community, setCommunity] = useState<Community | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !slug) return;
    const controller = new AbortController();
    void communityRequest<{ community: Community }>(`/api/communities/${slug}`, token, { signal: controller.signal })
      .then((result) => setCommunity(result.community))
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setError(loadError instanceof Error ? loadError.message : "Unable to load this community."); });
    return () => controller.abort();
  }, [slug, token]);

  async function toggleJoin() {
    if (!token || !community) return;
    setBusy(true);
    try {
      const result = await communityRequest<{ community: Community }>(`/api/communities/${community.slug}/join`, token, { method: community.isJoined ? "DELETE" : "POST" });
      setCommunity(result.community);
    } catch (joinError) { setError(joinError instanceof Error ? joinError.message : "Unable to update membership."); }
    finally { setBusy(false); }
  }

  if (authLoading || !token || !profile || (!community && !error)) return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">{authError || "Loading community…"}</main>;
  if (!community) return <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-5 text-center"><h1 className="text-xl font-bold">Community unavailable</h1><p className="mt-2 text-sm text-zinc-500">{error}</p><Link href="/community" className="mt-5 text-sm font-bold text-emerald-700">Back to community home</Link></main>;

  return (
    <main className="min-h-screen bg-[#f7f8f7] text-zinc-950">
      <SiteNav />
      <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-emerald-950 via-emerald-700 to-teal-600" />
        <div className="relative mx-auto max-w-6xl px-5 pb-7 pt-16 sm:px-8 sm:pt-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <CommunityAvatar community={community} size="lg" />
            <div className="min-w-0 flex-1"><p className="text-sm font-bold text-emerald-700">c/{community.slug}</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{community.name}</h1><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500"><span className="flex items-center gap-1.5"><UsersIcon className="h-4 w-4" />{community.memberCount.toLocaleString()} members</span>{community.institution && <span>· {community.institution.name}</span>}</div></div>
            <div className="flex gap-2"><Link href={`/community/post/create?community=${community.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><PlusIcon className="h-4 w-4" />New post</Link><button disabled={busy || community.memberRole === "ADMIN"} onClick={toggleJoin} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-60 ${community.isJoined ? "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>{busy ? "Updating…" : community.isJoined ? "Joined" : "Join community"}</button></div>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,720px)_280px]">
        <div className="min-w-0 space-y-4"><CreatePostPrompt username={profile.username} communitySlug={community.slug} />{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<PostFeed token={token} communitySlug={community.slug} /></div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="font-bold">About this community</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-600">{community.description}</p><div className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500"><span className="block font-semibold text-zinc-700">Created by @{community.creator.username}</span><time className="mt-1 block" dateTime={community.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(community.createdAt))}</time></div></section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-sm font-bold">Before you post</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Keep it relevant, assume good intent, and avoid sharing private student information.</p></section>
        </aside>
      </div>
    </main>
  );
}
