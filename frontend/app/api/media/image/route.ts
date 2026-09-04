import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend-url";
import { getServerAuth } from "@/lib/get-server-auth";
import { mediaImageQuerySchema } from "./media-image-schema";

const UPSTREAM_TIMEOUT_MS = 20_000;

/**
 * Served from the app's own origin, so anything the object store holds would run
 * as first-party content on navigation. Only these render inline; everything
 * else is downgraded to an opaque download.
 */
const INLINE_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

function failure(status: number, message: string): NextResponse {
  return NextResponse.json({ message }, { status });
}

function contentTypeOf(response: Response): string {
  const raw = response.headers.get("content-type") ?? "";
  return (raw.split(";", 1)[0] ?? "").trim().toLowerCase();
}

export async function GET(request: Request): Promise<Response> {
  const parsed = mediaImageQuerySchema.safeParse({
    key: new URL(request.url).searchParams.get("key"),
  });
  if (!parsed.success) return failure(400, "Invalid image reference");

  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) return failure(401, "Not authenticated");

  let upstream: Response;
  try {
    upstream = await fetch(
      `${BACKEND_URL}/storage/image?key=${encodeURIComponent(parsed.data.key)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );
  } catch {
    return failure(504, "Image request failed");
  }

  if (!upstream.ok || upstream.body === null) {
    if (upstream.body) void upstream.body.cancel().catch(() => undefined);
    return failure(upstream.ok ? 502 : upstream.status, "Image unavailable");
  }

  const upstreamType = contentTypeOf(upstream);
  const inline = INLINE_IMAGE_TYPES.has(upstreamType);
  /**
   * `immutable` promised the browser the bytes behind a key never change and
   * that it need not revalidate for a day. Neither holds: an object can be
   * REPLACED under the same key, and the permission that authorised this fetch
   * can be revoked — with `immutable` the revoked viewer keeps serving the image
   * out of its own cache for the rest of the day and no request ever reaches the
   * authorization check. `Vary: Cookie` is the other half: without it a cache
   * keyed on the URL alone can hand one session's entry to another, and the
   * session cookie is the only thing distinguishing the two requests.
   */
  const headers = new Headers({
    "Content-Type": inline ? upstreamType : "application/octet-stream",
    "Content-Disposition": inline ? "inline" : "attachment",
    "Cache-Control": "private, max-age=60, must-revalidate",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
