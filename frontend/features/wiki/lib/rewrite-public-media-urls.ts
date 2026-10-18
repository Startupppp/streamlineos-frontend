type KbContentNode = Record<string, unknown>;
type KbContent = KbContentNode | KbContentNode[] | null;

const MEDIA_NODE_TYPES: ReadonlySet<string> = new Set([
  "img",
  "image",
  "video",
  "audio",
  "file",
]);

const ATTRS_KEY = "attrs";
const MEDIA_URL_KEYS: ReadonlySet<string> = new Set([
  "url",
  "src",
  "href",
  "poster",
  "thumbnail",
  "thumbnailUrl",
]);

const ABSOLUTE_URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const PUBLIC_MEDIA_PATH = /^\/public\/wiki\/[A-Za-z0-9-]{8,64}\/media$/;

export const COVER_GRADIENT_PREFIX = "gradient:";

const PUBLIC_API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function publicMediaBrokerUrl(
  shareToken: string,
  fileKey: string,
): string {
  return `${PUBLIC_API_ORIGIN}/public/wiki/${shareToken}/media?key=${encodeURIComponent(fileKey)}`;
}

export function publicMediaFileKey(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  try {
    const parsed = new URL(trimmed, "https://public-wiki.invalid");
    if (PUBLIC_MEDIA_PATH.test(parsed.pathname)) {
      const key = parsed.searchParams.get("key");
      return key && key.trim() !== "" ? key : null;
    }
  } catch {
    return null;
  }
  if (ABSOLUTE_URL_SCHEME.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const path = parsed.pathname.replace(/^\/+/, "");
    if (path === "") return null;
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }
  const relative = trimmed.replace(/^\/+/, "");
  return relative === "" ? null : relative;
}

function rewriteMediaUrl(url: string, shareToken: string): string {
  const fileKey = publicMediaFileKey(url);
  return fileKey === null ? url : publicMediaBrokerUrl(shareToken, fileKey);
}

function rewriteNode(
  node: KbContentNode,
  shareToken: string,
  enclosingType: string,
): KbContentNode {
  const rawType = node["type"];
  const nodeType = typeof rawType === "string" ? rawType : enclosingType;
  const result: KbContentNode = {};
  for (const [k, v] of Object.entries(node)) {
    const childType = k === ATTRS_KEY ? nodeType : "";
    if (MEDIA_URL_KEYS.has(k) && typeof v === "string") {
      result[k] = MEDIA_NODE_TYPES.has(nodeType)
        ? rewriteMediaUrl(v, shareToken)
        : v;
    } else if (Array.isArray(v)) {
      result[k] = v.map((item) =>
        isRecord(item) ? rewriteNode(item, shareToken, childType) : item,
      );
    } else if (isRecord(v)) {
      result[k] = rewriteNode(v, shareToken, childType);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export function rewritePublicMediaUrls(
  content: KbContent,
  shareToken: string,
): KbContent {
  if (content === null) return null;
  if (Array.isArray(content)) {
    return content.map((node) => rewriteNode(node, shareToken, ""));
  }
  return rewriteNode(content, shareToken, "");
}

export function rewritePublicCoverImage(
  coverImage: string | null,
  shareToken: string,
): string | null {
  if (coverImage === null || coverImage.trim() === "") return null;
  if (coverImage.startsWith(COVER_GRADIENT_PREFIX)) return coverImage;
  const withoutFragment = coverImage.split("#", 1)[0] ?? "";
  const fileKey = publicMediaFileKey(withoutFragment);
  return fileKey === null ? null : publicMediaBrokerUrl(shareToken, fileKey);
}
