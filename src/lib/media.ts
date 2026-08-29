/**
 * Media URL helpers.
 *
 * Admin uploads always land on a fresh storage path, but settings rows can be
 * re-pointed at the same URL. Appending a version stamp derived from the row's
 * `updated_at` keeps long-lived CDN caching while guaranteeing a replaced image
 * is fetched fresh instead of served from the browser cache.
 */
export function versionedUrl(url: string | null | undefined, stamp?: string | number | null): string | null {
  if (!url) return null;
  if (!stamp) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const v = typeof stamp === "number" ? String(stamp) : String(new Date(stamp).getTime() || stamp);
  if (!v || v === "NaN") return url;
  return url + (url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(v);
}
