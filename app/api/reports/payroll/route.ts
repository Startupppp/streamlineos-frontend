import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getPayrollReport } from "@/server/queries/reports";
import { getSessionAbility } from "@/lib/abilities-server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const userId = params.get("userId") ?? undefined;
      const startMonth = params.get("startMonth");
      const endMonth = params.get("endMonth");

      if (!startMonth || !endMonth) {
        return err("startMonth and endMonth are required", 400);
      }

      const ability = await getSessionAbility();


      const isAdmin = ability.can("view", "hr:payroll");
      if (userId && userId !== session.user.id && !isAdmin) {
        return err("Forbidden", 403);
      }

      const targetUserId = userId || (isAdmin ? undefined : session.user.id);

      const data = await getPayrollReport(session.orgId, {
        userId: targetUserId,
        startMonth,
        endMonth,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load payroll report",
        500
      );
    }
  });
}
