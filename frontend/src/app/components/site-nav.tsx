"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/resources", label: "Resources" },
  { href: "/clubs", label: "Clubs" },
  { href: "/profile", label: "Profile" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0">
        <Link href="/" className="text-lg font-bold tracking-tight text-zinc-950">
          Oued Eddahab
        </Link>

        <nav
          aria-label="Main navigation"
          className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-50 p-1 text-center text-xs font-medium text-zinc-600 sm:flex sm:text-sm"
        >
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "hover:bg-white hover:text-zinc-950"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
