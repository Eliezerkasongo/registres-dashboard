const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/** The PHP backend's own origin, derived from NEXT_PUBLIC_API_URL by dropping
 * the trailing "/api" - used to resolve relative asset paths it returns
 * (uploaded logos, avatars, entry files) into absolute URLs. */
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/** Resolves a relative path returned by the API (e.g. "/uploads/logos/x.png")
 * into an absolute URL. Returns null/undefined and already-absolute URLs
 * unchanged. */
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
