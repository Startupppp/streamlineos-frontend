import { withAuth, ok, err } from "@/lib/api/helpers";
import { getPersonalDashboard } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getPersonalDashboard(session.orgId, session.user.id);
      return ok(data);
    } catch (error) {
      return err("Failed to load personal dashboard", 500);
    }
  });
}
