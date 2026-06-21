import { withAuth, ok, err } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { getUnreadCount } from "@/server/queries/notifications";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const key = `notifications:unread-count:${session.user.id}:${session.orgId}`;
      const data = await cached(
        key,
        () => getUnreadCount(session.user.id, session.orgId),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load unread count",
        500
      );
    }
  });
}
