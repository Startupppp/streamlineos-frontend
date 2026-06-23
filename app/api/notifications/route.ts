import { type NextRequest } from "next/server";
import { withAuth, ok, err, toBool, toNumber } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { getNotifications } from "@/server/queries/notifications";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const unreadOnly = toBool(params.get("unreadOnly")) ?? false;
      const limit = toNumber(params.get("limit")) ?? 20;

      const key = `notifications:list:${session.user.id}:${session.orgId}:${unreadOnly ? "unread" : "all"}:${limit}`;
      const data = await cached(
        key,
        () => getNotifications(session.user.id, session.orgId, unreadOnly, limit),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
      return ok(data);
    } catch (error) {
      return err(
        "Failed to load notifications",
        500
      );
    }
  });
}
