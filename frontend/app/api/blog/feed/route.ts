import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { err } from "@/lib/api/helpers";
import { CacheTag } from "@/lib/api/cache-tags";
import { getPublishedPosts } from "@/server/queries/blog";

interface FeedParams {
  limit?: number;
  cursor?: string | null;
  categorySlug?: string;
  tag?: string;
  search?: string;
}

const fetchPublishedPosts = unstable_cache(
  (params: FeedParams) => getPublishedPosts(params),
  [CacheTag.blogPosts, "blog:feed"],
  { tags: [CacheTag.blogPosts], revalidate: 300 },
);

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limitRaw = sp.get("limit");
    const result = await fetchPublishedPosts({
      limit: limitRaw ? Number(limitRaw) : undefined,
      cursor: sp.get("cursor"),
      categorySlug: sp.get("category") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      search: sp.get("search") ?? undefined,
    });
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return err("Failed to load posts", 500);
  }
}
