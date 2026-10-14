"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SiteNav from "../../components/site-nav";
import { useAuthToken } from "../../hooks/use-auth";
import { apiUrl } from "../../lib/api";

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

type PdfState = {
  source: string | null;
  url: string | null;
  error: string;
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
  const [dataKey, setDataKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pdfState, setPdfState] = useState<PdfState>({
    source: null,
    url: null,
    error: "",
  });
  const [viewerLoadedUrl, setViewerLoadedUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState("");
  const recordedViewKeys = useRef(new Set<string>());
  const viewRequestController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => viewRequestController.current?.abort();
  }, []);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const requestKey = `${token}:${params.id}`;

    async function loadResource() {
      try {
        const response = await fetch(apiUrl(`/api/resources/${params.id}`), {
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
          setResource(null);
          setPageError("");
          setDataKey(requestKey);
          return;
        }
        if (!response.ok) {
          throw new Error(getMessage(data, "Unable to load this resource."));
        }

        setResource((data as { resource: Resource }).resource);
        setUnavailable(false);
        setPageError("");
        setDataKey(requestKey);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        setResource(null);
        setPageError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load this resource.",
        );
        setDataKey(requestKey);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadResource();
    return () => controller.abort();
  }, [params.id, redirectToLogin, token]);

  const fileUrl = resource?.fileUrl;
  const pdfSource = token && fileUrl ? `${token}:${fileUrl}` : null;

  useEffect(() => {
    if (!token || !fileUrl || !pdfSource) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function loadPdf() {
      try {
        const response = await fetch(apiUrl(fileUrl!), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (!response.ok) {
          const data: unknown = await response.json().catch(() => null);
          throw new Error(getMessage(data, "Unable to load this PDF."));
        }

        const blob = await response.blob();
        if (!blob.type.startsWith("application/pdf")) {
          throw new Error("The server did not return a PDF document.");
        }

        objectUrl = URL.createObjectURL(blob);
        setPdfState({ source: pdfSource, url: objectUrl, error: "" });
      } catch (fileError) {
        if (fileError instanceof DOMException && fileError.name === "AbortError") {
          return;
        }
        setPdfState({
          source: pdfSource,
          url: null,
          error:
            fileError instanceof Error
              ? fileError.message
              : "Unable to load this PDF.",
        });
      }
    }

    void loadPdf();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl, pdfSource, redirectToLogin, token]);

  async function downloadPdf() {
    if (!resource || !token) return;

    setDownloading(true);
    setActionError("");

    try {
      const separator = resource.fileUrl.includes("?") ? "&" : "?";
      const response = await fetch(
        apiUrl(`${resource.fileUrl}${separator}download=1`),
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(getMessage(data, "Unable to download this PDF."));
      }

      const downloadUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${resource.title}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
      setResource((current) =>
        current ? { ...current, downloads: current.downloads + 1 } : current,
      );
    } catch (downloadError) {
      setActionError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download this PDF.",
      );
    } finally {
      setDownloading(false);
    }
  }

  function handleViewerLoad(loadedPdfUrl: string) {
    setViewerLoadedUrl(loadedPdfUrl);
    if (!token || !resource) return;

    const resourceId = resource.id;
    const viewKey = `${token}:${resourceId}`;
    if (recordedViewKeys.current.has(viewKey)) return;
    recordedViewKeys.current.add(viewKey);

    const controller = new AbortController();
    viewRequestController.current?.abort();
    viewRequestController.current = controller;

    async function recordView() {
      try {
        const response = await fetch(apiUrl(`/api/resources/${resourceId}/view`), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getMessage(data, "Unable to record this PDF view."));
        }

        const result = data as { recorded: boolean; views: number };
        setResource((current) =>
          current?.id === resourceId
            ? { ...current, views: result.views }
            : current,
        );
      } catch (viewError) {
        if (viewError instanceof DOMException && viewError.name === "AbortError") {
          return;
        }
        recordedViewKeys.current.delete(viewKey);
        setActionError(
          viewError instanceof Error
            ? viewError.message
            : "The PDF opened, but its view could not be recorded.",
        );
      }
    }

    void recordView();
  }

  if (checkingAuth || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        Checking your session…
      </main>
    );
  }

  const currentDataKey = `${token}:${params.id}`;

  if (loading || dataKey !== currentDataKey) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-950">
        <SiteNav />
        <div className="mx-auto max-w-7xl px-5 py-16 text-zinc-500">
          Loading resource…
        </div>
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
            {pageError ||
              "This resource does not exist or is not available to your institution."}
          </p>
          <Link
            href="/resources"
            className="mt-7 inline-block font-semibold text-emerald-700"
          >
            Back to resources
          </Link>
        </div>
      </main>
    );
  }

  const course = resource.course
    ? [resource.course.code, resource.course.name].filter(Boolean).join(" · ")
    : "General";
  const pdfUrl = pdfState.source === pdfSource ? pdfState.url : null;
  const pdfError = pdfState.source === pdfSource ? pdfState.error : "";
  const pdfLoading = pdfState.source !== pdfSource;
  const viewerLoaded = viewerLoadedUrl === pdfUrl;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
        <Link
          href="/resources"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-950"
        >
          ← Back to resources
        </Link>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {typeLabels[resource.type]}
                </span>
                <span className="text-sm text-zinc-500">{course}</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                {resource.title}
              </h1>
              {resource.description && (
                <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                  {resource.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              {pdfUrl && (
                <button
                  type="button"
                  onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-zinc-100"
                >
                  Open in browser
                </button>
              )}
              <button
                type="button"
                onClick={() => void downloadPdf()}
                disabled={downloading}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {downloading ? "Downloading…" : "Download PDF"}
              </button>
            </div>
          </div>

          {actionError && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </p>
          )}

          <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-zinc-200 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Detail
              label="Uploader"
              value={`${resource.uploader.firstName} ${resource.uploader.lastName}`}
            />
            <Detail
              label="Institution"
              value={resource.institution.abbreviation ?? resource.institution.name}
            />
            <Detail
              label="Academic year"
              value={resource.academicYear ?? "Not specified"}
            />
            <Detail
              label="Professor"
              value={resource.professor ?? "Not specified"}
            />
            <Detail
              label="Shared"
              value={new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                new Date(resource.createdAt),
              )}
            />
            <Detail
              label="Activity"
              value={`${resource.views} views · ${resource.downloads} downloads`}
            />
          </dl>
        </section>

        <section className="relative mt-5 min-h-[30rem] overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-200 shadow-sm">
          {(pdfLoading || (pdfUrl && !viewerLoaded)) && !pdfError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-100 text-sm font-medium text-zinc-500">
              Loading PDF reader…
            </div>
          )}

          {pdfError ? (
            <div className="flex min-h-[30rem] flex-col items-center justify-center px-6 text-center">
              <div className="rounded-full bg-white p-4 text-2xl shadow-sm" aria-hidden="true">
                PDF
              </div>
              <h2 className="mt-5 text-lg font-semibold">The PDF could not be displayed</h2>
              <p className="mt-2 max-w-lg text-sm text-zinc-600">{pdfError}</p>
              <button
                type="button"
                onClick={() => void downloadPdf()}
                disabled={downloading}
                className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {downloading ? "Downloading…" : "Try downloading instead"}
              </button>
            </div>
          ) : pdfUrl ? (
            <iframe
              title={`${resource.title} PDF reader`}
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              onLoad={() => handleViewerLoad(pdfUrl)}
              onError={() =>
                setPdfState((current) => ({
                  ...current,
                  error: "Your browser could not open the embedded PDF reader.",
                }))
              }
              className="h-[72vh] min-h-[30rem] w-full bg-white sm:min-h-[38rem]"
            />
          ) : null}
        </section>

        <p className="mt-3 text-center text-xs text-zinc-500">
          The embedded reader uses your browser&apos;s native PDF controls for page
          navigation, scrolling, and zoom. A unique view is recorded when this
          authenticated PDF finishes loading in the embedded frame.
        </p>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-zinc-800" title={value}>
        {value}
      </dd>
    </div>
  );
}
