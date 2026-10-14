"use client";

import Link from "next/link";
import { useState } from "react";
import { communityRequest } from "./community-api";
import CommunityAvatar from "./CommunityAvatar";
import type { Community } from "./types";

type Props = {
  initialCommunity: Community;
  token: string;
  onChange?: (community: Community) => void;
};

export default function CommunityCard({
  initialCommunity,
  token,
  onChange,
}: Props) {
  const [community, setCommunity] = useState(initialCommunity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const result = await communityRequest<{ community: Community }>(
        `/api/communities/${community.slug}/join`,
        token,
        { method: community.isJoined ? "DELETE" : "POST" },
      );
      setCommunity(result.community);
      onChange?.(result.community);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update membership.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border-b border-zinc-200 bg-white px-4 py-5 first:border-t sm:px-5">
      <div className="flex items-start gap-3">
        <Link
          href={`/community/c/${community.slug}`}
          aria-label={`Open ${community.name}`}
        >
          <CommunityAvatar community={community} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/community/c/${community.slug}`}
            className="font-semibold text-zinc-950 hover:text-emerald-800"
          >
            {community.name}
          </Link>
          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
            {community.memberCount.toLocaleString()} members
            {community.institution
              ? ` · ${community.institution.abbreviation ?? community.institution.name}`
              : " · Open to all students"}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
            {community.description}
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy || community.memberRole === "ADMIN"}
          onClick={() => void toggle()}
          aria-pressed={community.isJoined}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            community.isJoined
              ? "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              : "bg-emerald-700 text-white hover:bg-emerald-800"
          }`}
        >
          {busy ? "Updating…" : community.isJoined ? "Joined" : "Join"}
        </button>
      </div>
    </article>
  );
}
