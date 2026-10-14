import Link from "next/link";
import CommunityAvatar from "./CommunityAvatar";
import type { Community } from "./types";

type ActiveSection = "feed" | "popular" | "discover";

const links: Array<{
  href: string;
  label: string;
  section: ActiveSection;
}> = [
  { href: "/community", label: "Feed", section: "feed" },
  { href: "/community?feed=popular", label: "Popular", section: "popular" },
  { href: "/community/discover", label: "Discover", section: "discover" },
];

type Props = {
  active: ActiveSection;
  communities: Community[];
  loading?: boolean;
  error?: string;
};

export default function CommunitySidebar({
  active,
  communities,
  loading = false,
  error = "",
}: Props) {
  return (
    <>
      <nav
        aria-label="Community sections"
        className="-mx-4 flex overflow-x-auto border-b border-zinc-200 bg-white px-4 sm:-mx-6 sm:px-6 lg:hidden"
      >
        {links.map((link) => (
          <Link
            key={link.section}
            href={link.href}
            aria-current={active === link.section ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
              active === link.section
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <aside className="hidden border-r border-zinc-200 pr-5 lg:block">
        <div className="sticky top-6">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Community
          </p>

          <nav aria-label="Community sections" className="mt-3 space-y-0.5">
            {links.map((link) => (
              <Link
                key={link.section}
                href={link.href}
                aria-current={active === link.section ? "page" : undefined}
                className={`block border-l-2 px-3 py-2 text-sm font-semibold transition ${
                  active === link.section
                    ? "border-emerald-700 bg-emerald-50/60 text-emerald-900"
                    : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/community/post/create"
            className="mt-6 block rounded-md bg-emerald-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Create a post
          </Link>
          <Link
            href="/community/create"
            className="mt-2 block px-4 py-2 text-center text-sm font-semibold text-zinc-600 transition hover:text-emerald-800"
          >
            Start a community
          </Link>

          <section className="mt-8" aria-labelledby="joined-communities-title">
            <div className="flex items-center justify-between px-2">
              <h2
                id="joined-communities-title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400"
              >
                Joined
              </h2>
              {!loading && communities.length > 0 && (
                <span className="text-xs text-zinc-400">
                  {communities.length}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-0.5">
              {loading ? (
                [0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 px-2 py-2">
                    <span className="h-8 w-8 animate-pulse rounded-md bg-zinc-200" />
                    <span className="h-3 flex-1 animate-pulse bg-zinc-200" />
                  </div>
                ))
              ) : communities.length > 0 ? (
                communities.slice(0, 8).map((community) => (
                  <Link
                    key={community.id}
                    href={`/community/c/${community.slug}`}
                    className="flex items-center gap-2.5 px-2 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white hover:text-emerald-800"
                  >
                    <CommunityAvatar community={community} size="sm" />
                    <span className="truncate">{community.name}</span>
                  </Link>
                ))
              ) : (
                <div className="px-2 py-2 text-xs leading-5 text-zinc-500">
                  <p>{error || "You have not joined a community yet."}</p>
                  <Link
                    href="/community/discover"
                    className="mt-2 inline-block font-semibold text-emerald-800 hover:underline"
                  >
                    Find communities
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
