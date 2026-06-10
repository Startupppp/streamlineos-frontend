import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { getPublishedPosts } from "@/server/queries/blog";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limitRaw = sp.get("limit");
    const result = await getPublishedPosts({
      limit: limitRaw ? Number(limitRaw) : undefined,
      cursor: sp.get("cursor"),
      categorySlug: sp.get("category") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      search: sp.get("search") ?? undefined,
    });
    return ok(result);
  } catch {
    return err("Failed to load posts", 500);
  }
}
