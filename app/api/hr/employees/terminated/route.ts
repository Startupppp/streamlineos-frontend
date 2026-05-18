import { withAuth, ok } from "@/lib/api/helpers";
import { getTerminatedEmployees } from "@/server/queries/hr";
import type { TerminatedEmployee } from "@/types/hr/employees";

export async function GET() {
  return withAuth<TerminatedEmployee[]>(async (session) => {
    const branchCtx = {
      role: session.user.role ?? "",
      branchId: session.branchId,
      userId: session.user.id,
    };

    const data = await getTerminatedEmployees(session.orgId, branchCtx);
    return ok(data);
  });
}
