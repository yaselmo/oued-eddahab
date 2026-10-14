"use client";

import Link from "next/link";
import CommunityAvatar from "./CommunityAvatar";
import { relativeTime } from "./community-api";
import type { CommunityPost } from "./types";
import VoteButtons from "./VoteButtons";

type Props = {
  post: CommunityPost;
  token: string;
  showCommunity?: boolean;
};

export default function PostCard({ post, token, showCommunity = true }: Props) {
  return (
    <article className="group border-t border-zinc-200 px-4 py-5 first:border-t-0 sm:px-5">
      <div className="flex gap-3">
        {showCommunity && (
          <Link
            href={`/community/c/${post.community.slug}`}
            aria-label={`Open ${post.community.name}`}
            className="mt-0.5 shrink-0"
          >
            <CommunityAvatar community={post.community} size="sm" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-zinc-500">
            {showCommunity && (
              <>
                <Link
                  href={`/community/c/${post.community.slug}`}
                  className="font-semibold text-zinc-800 hover:text-emerald-800"
                >
                  c/{post.community.slug}
                </Link>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>
              <span className="sr-only">Posted by </span>@{post.author.username}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
          </div>

          <Link
            href={`/community/post/${post.id}`}
            className="mt-1.5 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <h2 className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-zinc-950 transition group-hover:text-emerald-900 sm:text-lg">
              {post.title}
            </h2>
            <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-6 text-zinc-600">
              {post.content}
            </p>
          </Link>

          <div className="mt-3 flex items-center gap-3">
            <VoteButtons
              postId={post.id}
              score={post.voteScore}
              userVote={post.userVote}
              token={token}
            />
            <Link
              href={`/community/post/${post.id}`}
              className="py-1 text-xs font-semibold text-zinc-500 transition hover:text-emerald-800"
            >
              {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
