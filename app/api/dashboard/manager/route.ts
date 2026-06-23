import { withAuth, ok, err } from "@/lib/api/helpers";
import { getManagerDashboard } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getManagerDashboard(session.orgId, session.user.id);
      return ok(data);
    } catch (error) {
      return err("Failed to load manager dashboard", 500);
    }
  });
}
