"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SiteNav from "../../components/site-nav";
import { useAuthToken } from "../../hooks/use-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  type: "NOTES" | "SUMMARY" | "EXAM" | "EXERCISE" | "ASSIGNMENT" | "OTHER";
  academicYear: string | null;
  professor: string | null;
  views: number;
  downloads: number;
  createdAt: string;
  uploader: {
    username: string;
    firstName: string;
    lastName: string;
  };
  institution: {
    name: string;
    abbreviation: string | null;
  };
  course: { name: string; code: string | null } | null;
};

const typeLabels: Record<Resource["type"], string> = {
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

export default function ResourceDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, checkingAuth, redirectToLogin } = useAuthToken();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<"open" | "download" | null>(null);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadResource() {
      try {
        const response = await fetch(`${API_URL}/api/resources/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        const data: unknown = await response.json();
        if (response.status === 403 || response.status === 404) {
          setUnavailable(true);
          return;
        }
        if (!response.ok) {
          throw new Error(getMessage(data, "Unable to load this resource."));
        }

        setResource((data as { resource: Resource }).resource);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load this resource.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadResource();
    return () => controller.abort();
  }, [params.id, redirectToLogin, token]);

  async function fetchPdf(download: boolean) {
    if (!resource) return;
    if (!token) {
      redirectToLogin();
      return;
    }

    setError("");
    setOpening(download ? "download" : "open");
    const pdfWindow = download ? null : window.open("about:blank", "_blank");
    if (pdfWindow) pdfWindow.opener = null;

    try {
      const separator = resource.fileUrl.includes("?") ? "&" : "?";
      const filePath = download
        ? `${resource.fileUrl}${separator}download=1`
        : resource.fileUrl;
      const response = await fetch(`${API_URL}${filePath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(getMessage(data, "Unable to open this PDF."));
      }

      const objectUrl = URL.createObjectURL(await response.blob());
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `${resource.title}.pdf`;
        anchor.click();
        setResource({ ...resource, downloads: resource.downloads + 1 });
      } else {
        if (pdfWindow) {
          pdfWindow.location.href = objectUrl;
        } else {
          window.open(objectUrl, "_blank", "noopener,noreferrer");
        }
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (fileError) {
      pdfWindow?.close();
      setError(
        fileError instanceof Error ? fileError.message : "Unable to open this PDF.",
      );
    } finally {
      setOpening(null);
    }
  }

  if (checkingAuth || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        Checking your session…
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-950">
        <SiteNav />
        <div className="mx-auto max-w-4xl px-5 py-16 text-zinc-500">Loading resource…</div>
      </main>
    );
  }

  if (unavailable || !resource) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-950">
        <SiteNav />
        <div className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1 className="text-3xl font-bold">Resource unavailable</h1>
          <p className="mt-3 text-zinc-600">
            {error || "This resource does not exist or is not available to your institution."}
          </p>
          <Link href="/resources" className="mt-7 inline-block font-semibold text-emerald-700">
            Back to resources
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <Link href="/resources" className="text-sm font-medium text-zinc-500 hover:text-zinc-950">
          ← Back to resources
        </Link>

        <article className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {typeLabels[resource.type]}
            </span>
            <span className="text-sm text-zinc-500">
              {resource.institution.abbreviation ?? resource.institution.name}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            {resource.title}
          </h1>
          {resource.description && (
            <p className="mt-5 whitespace-pre-wrap leading-7 text-zinc-600">
              {resource.description}
            </p>
          )}

          <dl className="mt-8 grid gap-5 border-y border-zinc-200 py-7 text-sm sm:grid-cols-2">
            <Detail label="Course" value={resource.course ? [resource.course.code, resource.course.name].filter(Boolean).join(" · ") : "General"} />
            <Detail label="Uploader" value={`${resource.uploader.firstName} ${resource.uploader.lastName} (@${resource.uploader.username})`} />
            <Detail label="Academic year" value={resource.academicYear ?? "Not specified"} />
            <Detail label="Professor" value={resource.professor ?? "Not specified"} />
            <Detail label="Shared" value={new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(resource.createdAt))} />
            <Detail label="Activity" value={`${resource.views} views · ${resource.downloads} downloads`} />
          </dl>

          {error && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void fetchPdf(false)}
              disabled={opening !== null}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {opening === "open" ? "Opening…" : "Open PDF"}
            </button>
            <button
              type="button"
              onClick={() => void fetchPdf(true)}
              disabled={opening !== null}
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-zinc-100 disabled:opacity-50"
            >
              {opening === "download" ? "Downloading…" : "Download"}
            </button>
          </div>
        </article>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-400">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
