type KbContentNode = Record<string, unknown>;
type KbContent = KbContentNode | KbContentNode[] | null;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function rewriteUrl(
  url: string,
  shareToken: string,
  r2BaseNormalized: string,
): string {
  if (!r2BaseNormalized) return url;
  const prefix = r2BaseNormalized + "/";
  if (!url.startsWith(prefix)) return url;
  const key = url.slice(prefix.length);
  return `/public/wiki/${shareToken}/media?key=${encodeURIComponent(key)}`;
}

function rewriteNode(
  node: KbContentNode,
  shareToken: string,
  r2BaseNormalized: string,
): KbContentNode {
  const result: KbContentNode = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "url" && typeof v === "string") {
      result[k] = rewriteUrl(v, shareToken, r2BaseNormalized);
    } else if (Array.isArray(v)) {
      result[k] = v.map((item) =>
        isRecord(item) ? rewriteNode(item, shareToken, r2BaseNormalized) : item,
      );
    } else if (isRecord(v)) {
      result[k] = rewriteNode(v, shareToken, r2BaseNormalized);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export function rewritePublicMediaUrls(
  content: KbContent,
  shareToken: string,
  r2BaseUrl: string,
): KbContent {
  if (content === null) return null;
  const r2BaseNormalized = r2BaseUrl.replace(/\/$/, "");
  if (Array.isArray(content)) {
    return content.map((node) =>
      rewriteNode(node, shareToken, r2BaseNormalized),
    );
  }
  return rewriteNode(content, shareToken, r2BaseNormalized);
}
