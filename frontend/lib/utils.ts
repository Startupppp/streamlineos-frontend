import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export function storageObjectUrl(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  return `${process.env.NEXT_PUBLIC_API_URL ?? ""}/storage/image?key=${encodeURIComponent(normalized)}`;
}

const STORAGE_IMAGE_PATH = "/storage/image?key=";

/**
 * The inverse of `storageObjectUrl`. A value that has already been resolved for
 * display must be turned back into its key before it is stored again or sent to
 * a route that takes a key, otherwise the API origin is baked into tenant data.
 */
export function storageKeyFromUrl(value: string): string {
  const at = value.indexOf(STORAGE_IMAGE_PATH);
  if (at === -1) return value;
  const encoded = value.slice(at + STORAGE_IMAGE_PATH.length).split("&", 1)[0] ?? "";
  try {
    return decodeURIComponent(encoded);
  } catch {
    return value;
  }
}

export function resolveImageUrl(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (ABSOLUTE_SOURCE.test(image)) return image;
  if (image.startsWith("/") && !isStorageObjectKey(image)) return image;
  return storageObjectUrl(image);
}
