"use client";

import { useState } from "react";
import { communityRequest } from "./community-api";
import { ChevronIcon } from "./Icons";

type Props = {
  postId: string;
  score: number;
  userVote: -1 | 0 | 1;
  token: string;
};

export default function VoteButtons({
  postId,
  score,
  userVote,
  token,
}: Props) {
  const [state, setState] = useState({ score, userVote, busy: false });

  async function vote(next: -1 | 1) {
    if (state.busy) return;

    const value = state.userVote === next ? 0 : next;
    setState((current) => ({ ...current, busy: true }));

    try {
      const result = await communityRequest<{
        voteScore: number;
        userVote: -1 | 0 | 1;
      }>(`/api/posts/${postId}/vote`, token, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
      setState({
        score: result.voteScore,
        userVote: result.userVote,
        busy: false,
      });
    } catch {
      setState((current) => ({ ...current, busy: false }));
    }
  }

  return (
    <div
      className="flex items-center border border-zinc-200 bg-zinc-50"
      aria-label="Post votes"
    >
      <button
        type="button"
        disabled={state.busy}
        onClick={() => void vote(1)}
        aria-label="Upvote"
        aria-pressed={state.userVote === 1}
        className={`p-1.5 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
          state.userVote === 1
            ? "bg-emerald-50 text-emerald-800"
            : "text-zinc-500"
        }`}
      >
        <ChevronIcon className="h-4 w-4" />
      </button>
      <span
        className={`min-w-7 text-center text-xs font-bold ${
          state.userVote === 1
            ? "text-emerald-700"
            : state.userVote === -1
              ? "text-amber-700"
              : "text-zinc-700"
        }`}
      >
        {state.score}
      </span>
      <button
        type="button"
        disabled={state.busy}
        onClick={() => void vote(-1)}
        aria-label="Downvote"
        aria-pressed={state.userVote === -1}
        className={`p-1.5 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
          state.userVote === -1
            ? "bg-amber-50 text-amber-800"
            : "text-zinc-500"
        }`}
      >
        <ChevronIcon className="h-4 w-4 rotate-180" />
      </button>
    </div>
  );
}
