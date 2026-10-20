"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { storeAuthToken } from "../hooks/use-auth";
import { apiUrl } from "../lib/api";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Shell>Loading…</Shell>}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const submittingRef = useRef(false);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/api/auth/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = (await response.json()) as {
        message?: string;
        token?: string;
        code?: string;
      };

      if (response.status === 409 && result.code === "ALREADY_VERIFIED") {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.token) {
        setError(result.message || "Unable to verify this code.");
        return;
      }

      storeAuthToken(result.token);
      router.replace("/");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;

    setError("");
    setInfo("");

    try {
      const response = await fetch(apiUrl("/api/auth/resend-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(result.message || "Unable to send a new code.");
        return;
      }

      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo("A new code was sent. Check your inbox (and your spam folder).");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    }
  }

  if (!email) {
    return (
      <Shell>
        <p>
          No email to verify.{" "}
          <Link href="/register" className="font-semibold text-emerald-700 hover:underline">
            Create an account
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-5 py-12 text-zinc-950">
      <div className="w-full max-w-md">
        <Link href="/login" className="block text-center text-2xl font-bold tracking-tight">
          Oued Eddahab
        </Link>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-9">
          <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
          <p className="mt-2 leading-6 text-zinc-600">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-zinc-950">{email}</span>. It is
            valid for 10 minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <label className="block text-sm font-medium">
              Verification code
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                required
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-zinc-950 outline-none transition placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            {info && !error && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {info}
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify and continue"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Didn&apos;t receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="font-semibold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </p>

          <p className="mt-3 text-center text-sm text-zinc-500">
            <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-5 text-zinc-500">
      {children}
    </main>
  );
}
