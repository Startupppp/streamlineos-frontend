import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";

export const dynamic = "force-dynamic";

/**
 * GET /api/hr/leaves/approvals
 * Returns pending and all incoming leave requests for the current user (admin/manager).
 */
export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const userId = session.user.id;
    const role = session.user.role ?? "";
    const isAdmin = EXPENSE_ADMIN_ROLES.includes(role);

    const baseWhere = isAdmin
      ? [eq(leaveRequests.orgId, orgId)]
      : [eq(leaveRequests.orgId, orgId), eq(leaveRequests.approverId, userId)];

    const [pending, all] = await Promise.all([
      db.query.leaveRequests.findMany({
        where: and(...baseWhere, eq(leaveRequests.status, "PENDING")),
        with: {
          user: true,
          leaveType: { columns: { id: true, name: true } },
          approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
        },
        orderBy: [desc(leaveRequests.createdAt)],
      }),
      db.query.leaveRequests.findMany({
        where: and(...baseWhere),
        with: {
          user: true,
          leaveType: { columns: { id: true, name: true } },
          approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
        },
        orderBy: [desc(leaveRequests.createdAt)],
      }),
    ]);

    return ok({ pending, all });
  });
}
