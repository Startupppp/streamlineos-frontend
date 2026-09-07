export { cn } from "cn";

const ABSOLUTE_SOURCE = /^(?:https?:|data:|blob:)/i;
const ORG_ID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORG_NAMESPACED_KEY_FOLDERS: ReadonlySet<string> = new Set([
  "kb-media",
  "kb-sources",
]);

/**
 * Mirrors the backend `parseStorageKey` seam: a key is `<orgId>/<folder>/<file>`,
 * or `<namespaced-folder>/<orgId>/<file>`. A leading slash is stripped first so a
 * key that arrives with one is still recognised instead of being served as a
 * same-origin path that does not exist.
 */
export function isStorageObjectKey(value: string): boolean {
  const segments = value.replace(/^\/+/, "").split("/");
  if (segments.length < 3) return false;
  const first = segments[0] ?? "";
  return ORG_ID_SEGMENT.test(first) || ORG_NAMESPACED_KEY_FOLDERS.has(first);
}

export const MEDIA_IMAGE_ROUTE = "/api/media/image";

/**
 * Same-origin on purpose. An `<img>` cannot send an `Authorization` header, so a
 * key is rendered through the app's own media bridge, which carries the session
 * cookie the browser already has and re-authorizes at the API before any byte
 * moves. Emitting the API origin instead needs that origin in `img-src` too.
 */
export function storageObjectUrl(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  return `${MEDIA_IMAGE_ROUTE}?key=${encodeURIComponent(normalized)}`;
}

const RESOLVED_IMAGE_PATHS = [`${MEDIA_IMAGE_ROUTE}?key=`, "/storage/image?key="] as const;

/**
 * The inverse of `storageObjectUrl`. A value that has already been resolved for
 * display must be turned back into its key before it is stored again or sent to
 * a route that takes a key, otherwise a delivery path is baked into tenant data.
 */
export function storageKeyFromUrl(value: string): string {
  for (const path of RESOLVED_IMAGE_PATHS) {
    const at = value.indexOf(path);
    if (at === -1) continue;
    const encoded = value.slice(at + path.length).split("&", 1)[0] ?? "";
    try {
      return decodeURIComponent(encoded);
    } catch {
      return value;
    }
  }
  return value;
}

export function resolveImageUrl(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (ABSOLUTE_SOURCE.test(image)) return image;
  if (image.startsWith("/") && !isStorageObjectKey(image)) return image;
  return storageObjectUrl(image);
}
