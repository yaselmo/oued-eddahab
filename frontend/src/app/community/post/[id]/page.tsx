"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SiteNav from "../../../components/site-nav";
import { useAuthenticatedProfile } from "../../../hooks/use-auth";
import CommentSection from "../../_components/CommentSection";
import CommunityAvatar from "../../_components/CommunityAvatar";
import { communityRequest, relativeTime } from "../../_components/community-api";
import type { CommunityPost } from "../../_components/types";
import VoteButtons from "../../_components/VoteButtons";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, profile, loading: authLoading, error: authError } = useAuthenticatedProfile();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    const controller = new AbortController();
    void communityRequest<{ post: CommunityPost }>(`/api/posts/${id}`, token, { signal: controller.signal })
      .then((result) => { setPost(result.post); setDraft({ title: result.post.title ?? "", content: result.post.content }); })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setError(loadError instanceof Error ? loadError.message : "Unable to load post."); });
    return () => controller.abort();
  }, [id, token]);

  async function save() {
    if (!token || !post) return;
    setBusy(true); setError("");
    try {
      const result = await communityRequest<{ post: CommunityPost }>(`/api/posts/${post.id}`, token, { method: "PATCH", body: JSON.stringify(draft) });
      setPost((current) => current ? { ...current, ...result.post, userVote: current.userVote } : current);
      setEditing(false);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update post."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!token || !post || !window.confirm("Delete this post and all of its comments?")) return;
    setBusy(true);
    try { await communityRequest(`/api/posts/${post.id}`, token, { method: "DELETE" }); router.replace(`/community/c/${post.community.slug}`); }
    catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Unable to delete post."); setBusy(false); }
  }

  if (authLoading || !token || !profile || (!post && !error)) return <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">{authError || "Loading discussion…"}</main>;
  if (!post) return <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-5 text-center"><h1 className="text-xl font-bold">Post unavailable</h1><p className="mt-2 text-sm text-zinc-500">{error}</p><Link href="/community" className="mt-5 text-sm font-bold text-emerald-700">Back to community</Link></main>;
  const isOwner = post.authorId === profile.id;

  return (
    <main className="min-h-screen bg-[#f7f8f7] text-zinc-950">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
        <Link href={`/community/c/${post.community.slug}`} className="text-sm font-semibold text-zinc-500 hover:text-emerald-700">← Back to c/{post.community.slug}</Link>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,720px)_240px]">
          <div className="min-w-0 space-y-4">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3"><CommunityAvatar community={post.community} size="sm" /><div className="min-w-0"><Link href={`/community/c/${post.community.slug}`} className="text-sm font-bold text-zinc-900 hover:text-emerald-700">c/{post.community.slug}</Link><p className="text-xs text-zinc-500">Posted by @{post.author.username} · <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time></p></div></div>
              {editing ? <div className="mt-6 space-y-4"><input value={draft.title} maxLength={180} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-lg font-bold outline-none focus:border-emerald-500" /><textarea value={draft.content} maxLength={10000} rows={10} onChange={(event) => setDraft({ ...draft, content: event.target.value })} className="w-full rounded-xl border border-zinc-200 p-4 text-sm leading-7 outline-none focus:border-emerald-500" /><div className="flex gap-2"><button disabled={busy} onClick={save} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">{busy ? "Saving…" : "Save changes"}</button><button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button></div></div> : <><h1 className="mt-6 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{post.title}</h1><p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-zinc-700">{post.content}</p></>}
              <div className="mt-7 flex items-center justify-between border-t border-zinc-100 pt-4"><VoteButtons postId={post.id} score={post.voteScore} userVote={post.userVote} token={token} />{isOwner && !editing && <div className="flex gap-3"><button onClick={() => setEditing(true)} className="text-xs font-bold text-zinc-500 hover:text-emerald-700">Edit post</button><button disabled={busy} onClick={remove} className="text-xs font-bold text-zinc-500 hover:text-red-600">Delete</button></div>}</div>
            </article>
            <CommentSection postId={post.id} token={token} profileId={profile.id} onCountChange={(delta) => setPost((current) => current ? { ...current, commentCount: current.commentCount + delta } : current)} />
          </div>
          <aside className="hidden lg:block"><div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">In this discussion</p><p className="mt-3 text-3xl font-bold">{post.voteScore}</p><p className="text-xs text-zinc-500">vote score</p><p className="mt-4 text-3xl font-bold">{post.commentCount}</p><p className="text-xs text-zinc-500">comments</p></div></aside>
        </div>
      </div>
    </main>
  );
}
