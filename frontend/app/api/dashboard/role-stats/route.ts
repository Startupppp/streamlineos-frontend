import { withAuth, ok, err } from "@/lib/api/helpers";
import { getRoleStats } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const stats = await getRoleStats(session.orgId);
      return ok(stats);
    } catch (error) {
      return err("An unexpected error occurred", 500);
    }
  });
}
