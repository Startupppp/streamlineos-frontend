import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { getEmployeePayslips } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const requestedId = req.nextUrl.searchParams.get("userId");
    const ability = await getSessionAbility();
    const canViewAll = ability.can("read", "hr:payroll");

    if (requestedId && requestedId !== session.user.id && !canViewAll) {
      return err("Forbidden", 403);
    }

    const userId = canViewAll && requestedId ? requestedId : session.user.id;
    const data = await getEmployeePayslips(session.orgId, userId);
    return ok(data);
  });
}
