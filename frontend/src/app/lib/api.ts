const configuredOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

// NEXT_PUBLIC_API_URL is an origin (for example http://localhost:5000), not
// an /api-prefixed base path. Strip a legacy suffix defensively.
export const API_ORIGIN = configuredOrigin.endsWith("/api")
  ? configuredOrigin.slice(0, -4)
  : configuredOrigin;

export function apiUrl(pathname: string) {
  if (pathname !== "/api" && !pathname.startsWith("/api/")) {
    throw new Error("API paths must start with /api/");
  }

  return `${API_ORIGIN}${pathname}`;
}
