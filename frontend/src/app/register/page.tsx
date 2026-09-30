"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { storeAuthToken } from "../hooks/use-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const inputClass =
  "mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-zinc-100";

type Institution = {
  id: string;
  name: string;
  abbreviation: string | null;
  university: { name: string };
};

export default function RegisterPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCities() {
      try {
        const response = await fetch(`${API_URL}/api/cities`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { cities: string[] };
        setCities(data.cities);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setLocationError("Unable to load cities. Please refresh and try again.");
      } finally {
        if (!controller.signal.aborted) setLoadingCities(false);
      }
    }

    void loadCities();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedCity) return;

    const controller = new AbortController();

    async function loadInstitutions() {
      setLoadingInstitutions(true);
      setLocationError("");
      try {
        const response = await fetch(
          `${API_URL}/api/institutions?city=${encodeURIComponent(selectedCity)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { institutions: Institution[] };
        setInstitutions(data.institutions);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setInstitutions([]);
        setLocationError("Unable to load institutions for that city.");
      } finally {
        if (!controller.signal.aborted) setLoadingInstitutions(false);
      }
    }

    void loadInstitutions();
    return () => controller.abort();
  }, [selectedCity]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const age = form.get("age");
    const year = form.get("year");
    const data = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      username: String(form.get("username") ?? "").trim(),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
      age: age ? Number(age) : undefined,
      city: String(form.get("city") ?? "").trim(),
      institutionId: String(form.get("institutionId") ?? "").trim(),
      nationality: String(form.get("nationality") ?? "").trim(),
      program: String(form.get("program") ?? "").trim() || undefined,
      year: year ? Number(year) : undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
      languages: String(form.get("languages") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      interests: String(form.get("interests") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      sex: String(form.get("sex") ?? "").trim(),
    };

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as {
        message?: string;
        token?: string;
      };

      if (!response.ok) {
        setError(result.message || "Unable to sign up. Please check your details.");
        return;
      }

      if (result.token) {
        storeAuthToken(result.token);
        router.replace("/");
        return;
      }

      router.replace("/login?registered=1");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-12 text-zinc-950">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/register" className="block text-center text-2xl font-bold tracking-tight">
          Oued Eddahab
        </Link>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-zinc-600">Join your university community.</p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-9">
            <FormSection title="Personal information">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" name="firstName" autoComplete="given-name" required />
                <Field label="Last name" name="lastName" autoComplete="family-name" required />
                <Field label="Username" name="username" autoComplete="username" minLength={3} required />
                <Field label="Age" name="age" type="number" min={16} max={100} required />
                <Field label="Nationality" name="nationality" required />
                <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" />
              </div>
              <label className="block text-sm font-medium">
                Sex
                <select name="sex" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </label>
            </FormSection>

            <FormSection title="Account">
              <Field label="University email" name="email" type="email" autoComplete="email" required />
              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </FormSection>

            <FormSection title="School">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  City
                  <select
                    name="city"
                    value={selectedCity}
                    onChange={(event) => {
                      const city = event.target.value;
                      setSelectedCity(city);
                      setInstitutions([]);
                      setLoadingInstitutions(Boolean(city));
                    }}
                    required
                    disabled={loadingCities}
                    className={inputClass}
                  >
                    <option value="">
                      {loadingCities ? "Loading cities..." : "Select your city"}
                    </option>
                    {cities.map((city) => <option key={city}>{city}</option>)}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Institution
                  <select
                    name="institutionId"
                    required
                    defaultValue=""
                    disabled={!selectedCity || loadingInstitutions}
                    className={inputClass}
                  >
                    <option value="">
                      {!selectedCity
                        ? "Select a city first"
                        : loadingInstitutions
                          ? "Loading institutions..."
                          : "Select your institution"}
                    </option>
                    {institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.abbreviation
                          ? `${institution.abbreviation} — ${institution.name}`
                          : institution.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {locationError && <p className="text-sm text-red-700">{locationError}</p>}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Program (optional)" name="program" placeholder="Computer Science" />
                <label className="block text-sm font-medium">
                  University year
                  <select name="year" required defaultValue="" className={inputClass}>
                    <option value="" disabled>Select your year</option>
                    <option value="1">1st year</option>
                    <option value="2">2nd year</option>
                    <option value="3">3rd year</option>
                    <option value="4">4th year</option>
                    <option value="5">5th year+</option>
                  </select>
                </label>
              </div>
            </FormSection>

            <FormSection title="Additional profile information">
              <Field
                label="Languages"
                name="languages"
                placeholder="English, French, Arabic"
                help="Separate multiple languages with commas."
                required
              />
              <Field
                label="Interests"
                name="interests"
                placeholder="Programming, football, photography"
                help="Separate multiple interests with commas."
                required
              />
            </FormSection>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || loadingCities || loadingInstitutions}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5 border-t border-zinc-200 pt-6 first:border-0 first:pt-0">
      <legend className="mb-4 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  help?: string;
};

function Field({ label, help, ...props }: FieldProps) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input {...props} className={inputClass} />
      {help && <span className="mt-1.5 block text-xs font-normal text-zinc-500">{help}</span>}
    </label>
  );
}
