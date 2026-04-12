import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";

export const dynamic = "force-dynamic";

/**
 * GET /api/hr/leaves/team
 * Returns all pending leave requests assigned to the current user as approver.
 * HR/CEO/Admin see all org-wide pending requests.
 */
export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    const isAdmin = EXPENSE_ADMIN_ROLES.includes(role) || role === "ADMIN";

    if (!isAdmin && role !== "MANAGER" && role !== "BRANCH_MANAGER") {
      return err("Only managers and admins can access team leave requests.", 403);
    }

    const conditions = isAdmin
      ? [eq(leaveRequests.orgId, session.orgId), eq(leaveRequests.status, "PENDING")]
      : [
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.approverId, session.user.id),
          eq(leaveRequests.status, "PENDING"),
        ];

    const requests = await db.query.leaveRequests.findMany({
      where: and(...conditions),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            designation: true,
          },
        },
        leaveType: { columns: { id: true, name: true } },
        approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
      },
      orderBy: [desc(leaveRequests.createdAt)],
    });

    // For non-admin managers, also include requests where they are the reporting manager
    // (reportingTo = session.user.id) even if not set as explicit approverId
    if (!isAdmin) {
      const reportingUsers = await db.query.users.findMany({
        where: eq(users.reportingTo, session.user.id),
        columns: { id: true },
      });

      if (reportingUsers.length > 0) {
        const reportingUserIds = new Set(reportingUsers.map((u) => u.id));
        const alreadyFetchedIds = new Set(requests.map((r) => r.id));

        const reportingRequests = await db.query.leaveRequests.findMany({
          where: and(
            eq(leaveRequests.orgId, session.orgId),
            eq(leaveRequests.status, "PENDING"),
          ),
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
                designation: true,
              },
            },
            leaveType: { columns: { id: true, name: true } },
            approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
          },
          orderBy: [desc(leaveRequests.createdAt)],
        });

        const extra = reportingRequests.filter(
          (r) =>
            !alreadyFetchedIds.has(r.id) &&
            reportingUserIds.has(r.userId),
        );

        return ok([...requests, ...extra]);
      }
    }

    return ok(requests);
  });
}
