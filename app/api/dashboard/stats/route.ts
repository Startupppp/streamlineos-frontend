import { withAuth, ok, err } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { getDashboardStats } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const key = `dashboard:stats:${session.orgId}:${session.user.id}`;
      const data = await cached(
        key,
        () => getDashboardStats(session.orgId, session.user.id),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
      return ok(data);
    } catch (error) {
      return err(
        "Failed to load dashboard stats",
        500
      );
    }
  });
}
