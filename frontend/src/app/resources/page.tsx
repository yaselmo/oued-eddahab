"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "../components/site-nav";
import { useAuthToken } from "../hooks/use-auth";
import { apiUrl } from "../lib/api";

type ResourceType =
  | "NOTES"
  | "SUMMARY"
  | "EXAM"
  | "EXERCISE"
  | "ASSIGNMENT"
  | "OTHER";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  views: number;
  downloads: number;
  createdAt: string;
  uploader: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  course: { id: string; name: string; code: string | null } | null;
};

type Institution = {
  id: string;
  name: string;
  abbreviation: string | null;
};

const filters: Array<{ value: ResourceType | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "NOTES", label: "Notes" },
  { value: "SUMMARY", label: "Summaries" },
  { value: "EXAM", label: "Exams" },
  { value: "EXERCISE", label: "Exercises" },
  { value: "ASSIGNMENT", label: "Assignments" },
];

const typeLabels: Record<ResourceType, string> = {
  NOTES: "Notes",
  SUMMARY: "Summary",
  EXAM: "Exam",
  EXERCISE: "Exercise",
  ASSIGNMENT: "Assignment",
  OTHER: "Other",
};

function getMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return fallback;
}

export default function ResourcesPage() {
  const { token, checkingAuth, redirectToLogin } = useAuthToken();
  const [resources, setResources] = useState<Resource[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<ResourceType | "ALL">("ALL");
  const [dataToken, setDataToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (selectedType !== "ALL") query.set("type", selectedType);

      try {
        const response = await fetch(
          apiUrl(`/api/resources${query.size ? `?${query}` : ""}`),
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getMessage(data, "Unable to load resources."));
        }

        const result = data as {
          resources: Resource[];
          institution: Institution;
        };
        setResources(result.resources);
        setInstitution(result.institution);
        setDataToken(token);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load resources.",
        );
        setDataToken(token);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [redirectToLogin, search, selectedType, token]);

  if (checkingAuth || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        Checking your session…
      </main>
    );
  }

  const hasCurrentData = dataToken === token;
  const visibleResources = hasCurrentData ? resources : [];
  const visibleInstitution = hasCurrentData ? institution : null;
  const visibleError = hasCurrentData ? error : "";

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                {visibleInstitution?.abbreviation ?? visibleInstitution?.name ?? "Your institution"}
              </p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Study Resources
              </h1>
              <p className="mt-3 text-zinc-600">
                Resources shared by students at your institution.
              </p>
            </div>

            <Link
              href="/resources/upload"
              className="inline-flex w-fit items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Upload Resource
            </Link>
          </div>

          <label className="mt-9 flex max-w-3xl items-center rounded-2xl border border-zinc-200 bg-white px-5 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100">
            <span aria-hidden="true" className="mr-3 text-xl text-zinc-400">⌕</span>
            <span className="sr-only">Search resources</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resources..."
              className="h-15 w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedType(filter.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedType === filter.value
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {visibleError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
            <h2 className="font-semibold">Resources are unavailable</h2>
            <p className="mt-1 text-sm">{visibleError}</p>
          </div>
        ) : loading || !hasCurrentData ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-white"
              />
            ))}
          </div>
        ) : visibleResources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">No resources found</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Try another search or be the first to upload a resource.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleResources.map((resource) => (
              <Link
                key={resource.id}
                href={`/resources/${resource.id}`}
                className="group flex min-h-56 flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {typeLabels[resource.type]}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                      new Date(resource.createdAt),
                    )}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-semibold leading-snug group-hover:text-emerald-700">
                  {resource.title}
                </h2>
                <p className="mt-2 text-sm font-medium text-zinc-500">
                  {resource.course
                    ? [resource.course.code, resource.course.name]
                        .filter(Boolean)
                        .join(" · ")
                    : "General"}
                </p>

                <div className="mt-auto flex items-end justify-between gap-3 pt-6 text-xs text-zinc-500">
                  <span>
                    {resource.uploader.firstName} {resource.uploader.lastName}
                  </span>
                  <span>{resource.views} views · {resource.downloads} downloads</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
