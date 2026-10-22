import { createCn } from "cn/config";

export const cn = createCn({
  extend: {
    classGroups: { "font-size": [{ text: ["micro", "dense", "label"] }] },
  },
});

const ABSOLUTE_SOURCE = /^(?:https?:|data:|blob:)/i;
const ORG_ID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORG_NAMESPACED_KEY_FOLDERS: ReadonlySet<string> = new Set([
  "kb-media",
  "kb-sources",
]);

export function isStorageObjectKey(value: string): boolean {
  const segments = value.replace(/^\/+/, "").split("/");
  if (segments.length < 3) return false;
  const first = segments[0] ?? "";
  return ORG_ID_SEGMENT.test(first) || ORG_NAMESPACED_KEY_FOLDERS.has(first);
}

export const MEDIA_IMAGE_ROUTE = "/api/media/image";

export function storageObjectUrl(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  return `${MEDIA_IMAGE_ROUTE}?key=${encodeURIComponent(normalized)}`;
}

const RESOLVED_IMAGE_PATHS = [
  `${MEDIA_IMAGE_ROUTE}?key=`,
  "/storage/image?key=",
] as const;

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

export function resolveImageUrl(
  image: string | null | undefined,
): string | undefined {
  if (!image) return undefined;
  if (ABSOLUTE_SOURCE.test(image)) return image;
  if (image.startsWith("/") && !isStorageObjectKey(image)) return image;
  return storageObjectUrl(image);
}
