"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { apiUrl } from "../lib/api";
const AUTH_EVENT = "oued-eddahab-auth-change";

function subscribeToAuth(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_EVENT, callback);
  };
}

function getStoredToken() {
  return localStorage.getItem("token");
}

function subscribeToNothing() {
  return () => undefined;
}

export function storeAuthToken(token: string) {
  localStorage.setItem("token", token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export type Profile = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  avatarUrl: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  nationality: string | null;
  phone: string | null;
  languages: string[];
  interests: string[];
  sex: string | null;
  program: string | null;
  year: number | null;
  role: string;
  createdAt: string;
  institution: {
    id: string;
    name: string;
    abbreviation: string | null;
    city: string;
    university: { id: string; name: string };
  } | null;
  _count: {
    posts: number;
    clubMemberships: number;
    eventAttendance: number;
  };
};

export function useAuthToken() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeToAuth, getStoredToken, () => null);
  const clientReady = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event(AUTH_EVENT));
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (clientReady && !token) {
      router.replace("/login");
    }
  }, [clientReady, router, token]);

  return { token, checkingAuth: !clientReady, redirectToLogin };
}

export function useAuthenticatedProfile() {
  const auth = useAuthToken();
  const { token, redirectToLogin } = auth;
  const [profileState, setProfileState] = useState<{
    token: string;
    profile: Profile | null;
    error: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    const profileToken = token;

    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch(apiUrl("/api/profile/me"), {
          headers: { Authorization: `Bearer ${profileToken}` },
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        if (!response.ok) throw new Error("Unable to load your profile.");
        const data = (await response.json()) as { profile: Profile };
        if (!controller.signal.aborted) {
          setProfileState({ token: profileToken, profile: data.profile, error: "" });
        }
      } catch (profileError) {
        if (
          profileError instanceof DOMException &&
          profileError.name === "AbortError"
        ) {
          return;
        }
        setProfileState({
          token: profileToken,
          profile: null,
          error:
            profileError instanceof Error
              ? profileError.message
              : "Unable to load your profile.",
        });
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [redirectToLogin, token]);

  const hasCurrentProfile = Boolean(
    token && profileState?.token === token,
  );

  return {
    ...auth,
    profile: hasCurrentProfile ? profileState?.profile ?? null : null,
    error: hasCurrentProfile ? profileState?.error ?? "" : "",
    loading: auth.checkingAuth || Boolean(token && !hasCurrentProfile),
  };
}
