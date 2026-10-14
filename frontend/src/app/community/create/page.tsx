"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import SiteNav from "../../components/site-nav";
import { useAuthenticatedProfile } from "../../hooks/use-auth";
import { communityRequest } from "../_components/community-api";
import { PlusIcon, SparklesIcon } from "../_components/Icons";
import type { Community } from "../_components/types";

export default function CreateCommunityPage() {
  const { token, profile, loading, error: authError } = useAuthenticatedProfile();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", slug: "", description: "", associate: false });
  const [slugEdited, setSlugEdited] = useState(false);
  const [state, setState] = useState({ busy: false, error: "", success: "" });

  function slugify(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  function updateName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugEdited ? current.slug : slugify(name),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setState({ busy: true, error: "", success: "" });
    try {
      const result = await communityRequest<{ community: Community }>(
        "/api/communities",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            slug: form.slug,
            description: form.description,
            institutionId: form.associate ? profile?.institution?.id : null,
          }),
        },
      );
      setState({ busy: true, error: "", success: "Community created. Opening it now…" });
      router.push(`/community/c/${result.community.slug}`);
    } catch (error) {
      setState({
        busy: false,
        success: "",
        error: error instanceof Error ? error.message : "Unable to create community.",
      });
    }
  }

  if (loading || !token || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        {authError || "Preparing community creation…"}
      </main>
    );
  }

  const inputClass = "mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <main className="min-h-screen bg-[#f7f8f7] text-zinc-950">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/community" className="text-sm font-semibold text-zinc-500 hover:text-emerald-700">
          ← Back to Community
        </Link>

        <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <PlusIcon />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">
            Build a student space
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Create a community</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
            Create a focused place for students to exchange questions, advice, and ideas.
          </p>

          {state.error && (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {state.success}
            </p>
          )}

          <form onSubmit={submit} className="mt-8 space-y-6">
            <label className="block text-sm font-bold text-zinc-800">
              Community name
              <input
                required
                minLength={3}
                maxLength={60}
                value={form.name}
                onChange={(event) => updateName(event.target.value)}
                placeholder="e.g. Computer Science"
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-bold text-zinc-800">
              Community slug
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">c/</span>
                <input
                  required
                  minLength={3}
                  maxLength={50}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setForm({ ...form, slug: slugify(event.target.value) });
                  }}
                  className={`${inputClass} pl-9`}
                />
              </div>
              <span className="mt-1.5 block text-xs font-normal text-zinc-400">
                Lowercase letters, numbers, and hyphens only. You can edit the generated value.
              </span>
            </label>

            <label className="block text-sm font-bold text-zinc-800">
              Description
              <textarea
                required
                minLength={20}
                maxLength={500}
                rows={5}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="What should students discuss here?"
                className={`${inputClass} resize-y leading-6`}
              />
              <span className="mt-1.5 block text-right text-xs font-normal text-zinc-400">
                {form.description.length}/500
              </span>
            </label>

            {profile.institution ? (
              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <input
                  type="checkbox"
                  checked={form.associate}
                  onChange={(event) => setForm({ ...form, associate: event.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                />
                <span>
                  <span className="block text-sm font-bold text-zinc-800">
                    Associate with {profile.institution.name}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    This improves discovery. It does not verify enrollment or restrict access.
                  </span>
                </span>
              </label>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                Add an institution to your profile if you want this community associated with it.
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-end">
              <Link href="/community" className="rounded-xl px-5 py-3 text-center text-sm font-bold text-zinc-600 hover:bg-zinc-100">
                Cancel
              </Link>
              <button
                disabled={state.busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.busy ? "Creating community…" : "Create Community"}
              </button>
            </div>
          </form>
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
          <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-xs leading-5">
            Choose a clear name and description so students immediately understand who the community is for.
          </p>
        </div>
      </div>
    </main>
  );
}
