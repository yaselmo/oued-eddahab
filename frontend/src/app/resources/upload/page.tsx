"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SiteNav from "../../components/site-nav";
import { useAuthToken } from "../../hooks/use-auth";
import { apiUrl } from "../../lib/api";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type Course = {
  id: string;
  name: string;
  code: string | null;
};

type Institution = {
  name: string;
  abbreviation: string | null;
};

function responseMessage(value: unknown, fallback: string) {
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

export default function UploadResourcePage() {
  const router = useRouter();
  const { token, checkingAuth, redirectToLogin } = useAuthToken();
  const [courses, setCourses] = useState<Course[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [dataToken, setDataToken] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadCourses() {
      try {
        const response = await fetch(apiUrl("/api/resources/courses"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(responseMessage(data, "Unable to load courses."));
        }

        const result = data as { courses: Course[]; institution: Institution };
        setCourses(result.courses);
        setInstitution(result.institution);
        setError("");
        setDataToken(token);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load courses.",
        );
        setDataToken(token);
      } finally {
        if (!controller.signal.aborted) setLoadingCourses(false);
      }
    }

    void loadCourses();
    return () => controller.abort();
  }, [redirectToLogin, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      redirectToLogin();
      return;
    }

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a PDF file to upload.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("PDF files must be 20 MB or smaller.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(apiUrl("/api/resources"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data: unknown = await response.json();

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        throw new Error(responseMessage(data, "Unable to upload resource."));
      }

      router.push("/resources");
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload resource.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  if (checkingAuth || !token || dataToken !== token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        Checking your session…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link href="/resources" className="text-sm font-medium text-zinc-500 hover:text-zinc-950">
          ← Back to resources
        </Link>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {institution?.abbreviation ?? institution?.name ?? "Your institution"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Upload Resource</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Your institution is assigned automatically. PDF files only, up to 20 MB.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium">
              Title
              <input name="title" required maxLength={200} className={inputClass} />
            </label>

            <label className="block text-sm font-medium">
              Description
              <textarea
                name="description"
                rows={4}
                maxLength={2000}
                className={inputClass}
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Resource type
                <select name="type" required className={inputClass} defaultValue="NOTES">
                  <option value="NOTES">Notes</option>
                  <option value="SUMMARY">Summary</option>
                  <option value="EXAM">Exam</option>
                  <option value="EXERCISE">Exercise</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Course
                <select name="courseId" className={inputClass} disabled={loadingCourses}>
                  <option value="">General / no course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code} — ` : ""}{course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Academic year
                <input
                  name="academicYear"
                  placeholder="e.g. 2025–2026"
                  maxLength={50}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium">
                Professor <span className="font-normal text-zinc-400">(optional)</span>
                <input name="professor" maxLength={120} className={inputClass} />
              </label>
            </div>

            <label className="block text-sm font-medium">
              PDF file
              <input
                name="file"
                type="file"
                accept="application/pdf,.pdf"
                required
                className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white`}
              />
            </label>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || loadingCourses || Boolean(error && !institution)}
              className="inline-flex w-full justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? "Uploading…" : "Upload Resource"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
