import Link from "next/link";

export default function CreatePostPrompt({
  username,
  communitySlug,
}: {
  username: string;
  communitySlug?: string;
}) {
  const query = communitySlug
    ? `?community=${encodeURIComponent(communitySlug)}`
    : "";

  return (
    <div className="flex items-center gap-3 border-y border-zinc-200 bg-white px-4 py-3 sm:px-5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white"
      >
        {username.slice(0, 1).toUpperCase()}
      </span>
      <Link
        href={`/community/post/create${query}`}
        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 transition hover:border-zinc-400 hover:bg-white hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        Start a post
      </Link>
      <Link
        href={`/community/post/create${query}`}
        className="text-sm font-semibold text-emerald-800 hover:underline"
      >
        Post
      </Link>
    </div>
  );
}
