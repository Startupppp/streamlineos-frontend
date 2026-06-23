import { withAuth, ok, err } from "@/lib/api/helpers";
import { getTodayActivities } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const activities = await getTodayActivities(session.orgId);
      return ok(activities);
    } catch (error) {
      return err("An unexpected error occurred", 500);
    }
  });
}
