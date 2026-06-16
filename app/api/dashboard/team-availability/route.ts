import { withAuth, ok, err } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { getTeamAvailability } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const orgId = session.orgId;
      const key = `dashboard:team-availability:${orgId}`;
      const data = await cached(
        key,
        () => getTeamAvailability(orgId),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load team availability",
        500
      );
    }
  });
}
