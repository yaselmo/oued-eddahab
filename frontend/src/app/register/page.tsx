"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Institution = {
  id: string;
  name: string;
  abbreviation: string | null;
  university: {
    name: string;
  };
};


export default function RegisterPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  const [cities, setCities] = useState<string[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const [selectedCity, setSelectedCity] = useState("");

  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);


  useEffect(() => {
    async function loadCities() {
      try {
        const response = await fetch(`${API_URL}/api/cities`);

        if (!response.ok) {
          throw new Error("Failed to load cities");
        }

        const data = await response.json();

        setCities(data.cities);
      } catch (error) {
        console.error("Failed to load cities:", error);
        setError("Unable to load cities");
      } finally {
        setLoadingCities(false);
      }
    }

    loadCities();
  }, [API_URL]);

  useEffect(() => {
    if (!selectedCity) {
      return;
    }

    async function loadInstitutions() {
      try {
        const response = await fetch(
          `${API_URL}/api/institutions?city=${encodeURIComponent(selectedCity)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load institutions");
        }

        const data = await response.json();

        setInstitutions(data.institutions);
      } catch (error) {
        console.error("Failed to load institutions:", error);
        setInstitutions([]);
      } finally {
        setLoadingInstitutions(false);
      }
    }

    void loadInstitutions();
  }, [selectedCity, API_URL]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const ageValue = form.get("age");
    const yearValue = form.get("year");


    const data = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      username: String(form.get("username") ?? "").trim(),

      age: ageValue ? Number(ageValue) : undefined,
      city: String(form.get("city") ?? "").trim(),
      institutionId: String(
        form.get("institutionId") ?? "",
      ).trim(),
      nationality: String(form.get("nationality") ?? "").trim(),

      email: String(form.get("email") ?? "")
        .trim()
        .toLowerCase(),

      year: yearValue ? Number(yearValue) : undefined,

      languages: String(form.get("languages") ?? "")
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean),

      interests: String(form.get("interests") ?? "")
        .split(",")
        .map((interest) => interest.trim())
        .filter(Boolean),

      sex: String(form.get("sex") ?? "").trim(),

      phone: String(form.get("phone") ?? "").trim() || undefined,

      password: String(form.get("password") ?? ""),
    };

    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Registration failed");
        return;
      }

      router.push("/login");
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-zinc-500";

  const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Oued Eddahab
          </h1>

          <p className="mt-2 text-zinc-400">
            Join your university community
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="mb-6 text-2xl font-semibold text-white">
            Create account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Username + Age */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="username" className={labelClass}>
                  Username
                </label>

                <input
                  id="username"
                  name="username"
                  minLength={3}
                  required
                  autoComplete="username"
                  placeholder="zarzour"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="age" className={labelClass}>
                  Age
                </label>

                <input
                  id="age"
                  name="age"
                  type="number"
                  min={16}
                  max={100}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* City + Nationality */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className={labelClass}>
                  City
                </label>

                <select
                  id="city"
                  name="city"
                  value={selectedCity}
                  onChange={(event) => {
                    const city = event.target.value;

                    setSelectedCity(city);
                    setInstitutions([]);
                    setLoadingInstitutions(Boolean(city));
                  }}
                  required
                  className={inputClass}
                  disabled={loadingCities}
                >
                  <option value="">
                    {loadingCities ? "Loading cities..." : "Select your city"}
                  </option>

                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="nationality" className={labelClass}>
                  Nationality
                </label>

                <input
                  id="nationality"
                  name="nationality"
                  placeholder="Canadian"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Institution */}
            <div>
              <label htmlFor="institutionId" className={labelClass}>
                Institution
              </label>

              <select
                id="institutionId"
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
                  <option
                    key={institution.id}
                    value={institution.id}
                  >
                    {institution.abbreviation
                      ? `${institution.abbreviation} — ${institution.name}`
                      : institution.name}
                  </option>
                ))}
              </select>
            </div>

            {/* University email */}
            <div>
              <label htmlFor="email" className={labelClass}>
                University email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="student@university.ca"
                autoComplete="email"
                required
                className={inputClass}
              />

              <p className="mt-1.5 text-xs text-zinc-500">
                You&apos;ll eventually verify this email before the
                account becomes active.
              </p>
            </div>

            {/* University year */}
            <div>
              <label htmlFor="year" className={labelClass}>
                University year
              </label>

              <select
                id="year"
                name="year"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="" disabled>
                  Select your year
                </option>
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
                <option value="3">3rd year</option>
                <option value="4">4th year</option>
                <option value="5">5th year+</option>
              </select>
            </div>

            {/* Languages */}
            <div>
              <label htmlFor="languages" className={labelClass}>
                Languages
              </label>

              <input
                id="languages"
                name="languages"
                placeholder="English, French, Arabic"
                required
                className={inputClass}
              />

              <p className="mt-1.5 text-xs text-zinc-500">
                Separate multiple languages with commas.
              </p>
            </div>

            {/* Interests */}
            <div>
              <label htmlFor="interests" className={labelClass}>
                Interests
              </label>

              <input
                id="interests"
                name="interests"
                placeholder="Programming, football, photography"
                required
                className={inputClass}
              />

              <p className="mt-1.5 text-xs text-zinc-500">
                Separate multiple interests with commas.
              </p>
            </div>

            {/* Sex */}
            <div>
              <label htmlFor="sex" className={labelClass}>
                Sex
              </label>

              <select
                id="sex"
                name="sex"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">
                  Prefer not to say
                </option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone{" "}
                <span className="font-normal text-zinc-500">
                  (optional)
                </span>
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 613 555 1234"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-white hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}