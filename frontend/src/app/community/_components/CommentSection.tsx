"use client";

import { FormEvent, useEffect, useState } from "react";
import { communityRequest, relativeTime } from "./community-api";
import type { CommunityComment } from "./types";

export default function CommentSection({ postId, token, profileId, onCountChange }: { postId: string; token: string; profileId: string; onCountChange?: (delta: number) => void }) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void communityRequest<{ comments: CommunityComment[] }>(`/api/posts/${postId}/comments`, token, { signal: controller.signal })
      .then((result) => setComments(result.comments))
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setError(loadError instanceof Error ? loadError.message : "Unable to load comments."); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [postId, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await communityRequest<{ comment: CommunityComment }>(`/api/posts/${postId}/comments`, token, { method: "POST", body: JSON.stringify({ content }) });
      setComments((current) => [...current, result.comment]);
      setContent(""); onCountChange?.(1);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to add comment."); }
    finally { setBusy(false); }
  }

  async function save(comment: CommunityComment) {
    try {
      const result = await communityRequest<{ comment: CommunityComment }>(`/api/comments/${comment.id}`, token, { method: "PATCH", body: JSON.stringify({ content: editContent }) });
      setComments((current) => current.map((item) => item.id === comment.id ? result.comment : item));
      setEditing(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update comment."); }
  }

  async function remove(comment: CommunityComment) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await communityRequest(`/api/comments/${comment.id}`, token, { method: "DELETE" });
      const removed = 1 + comments.filter((item) => item.parentId === comment.id).length;
      setComments((current) => current.filter((item) => item.id !== comment.id && item.parentId !== comment.id));
      onCountChange?.(-removed);
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Unable to delete comment."); }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold">Discussion <span className="ml-1 text-sm font-normal text-zinc-400">{comments.length}</span></h2>
      <form onSubmit={submit} className="mt-5"><label className="sr-only" htmlFor="comment">Add a comment</label><textarea id="comment" required maxLength={3000} rows={4} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Add to the conversation…" className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /><div className="mt-2 flex items-center justify-between"><span className="text-xs text-zinc-400">Be constructive and kind.</span><button disabled={busy || !content.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "Posting…" : "Comment"}</button></div></form>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-7 divide-y divide-zinc-100">
        {loading ? [0,1].map((item) => <div key={item} className="h-24 animate-pulse py-4"><div className="h-full rounded-xl bg-zinc-100" /></div>) : comments.length === 0 ? <div className="py-10 text-center"><p className="font-semibold text-zinc-700">No comments yet</p><p className="mt-1 text-sm text-zinc-500">Share the first thoughtful response.</p></div> : comments.map((comment) => (
          <article key={comment.id} className={`py-5 ${comment.parentId ? "ml-8 border-l-2 border-emerald-100 pl-4" : ""}`}>
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700">{comment.author.username.slice(0, 1).toUpperCase()}</span><div><p className="text-xs font-bold text-zinc-800">@{comment.author.username}</p><time className="text-xs text-zinc-400" dateTime={comment.createdAt}>{relativeTime(comment.createdAt)}{comment.updatedAt !== comment.createdAt ? " · edited" : ""}</time></div></div>
            {editing === comment.id ? <div className="mt-3"><textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} maxLength={3000} rows={3} className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-emerald-500" /><div className="mt-2 flex gap-2"><button onClick={() => save(comment)} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white">Save</button><button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs font-bold text-zinc-500">Cancel</button></div></div> : <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700">{comment.content}</p>}
            {comment.authorId === profileId && editing !== comment.id && <div className="mt-3 flex gap-3"><button onClick={() => { setEditing(comment.id); setEditContent(comment.content); }} className="text-xs font-bold text-zinc-500 hover:text-emerald-700">Edit</button><button onClick={() => remove(comment)} className="text-xs font-bold text-zinc-500 hover:text-red-600">Delete</button></div>}
          </article>
        ))}
      </div>
    </section>
  );
}
