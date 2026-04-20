import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users } from "@/lib/db/schema";
import { eq, and, desc, SQL } from "drizzle-orm";
import { EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";

export const dynamic = "force-dynamic";

const WITH_RELATIONS = {
  user: {
    columns: {
      id: true as const,
      name: true as const,
      firstName: true as const,
      lastName: true as const,
      email: true as const,
      image: true as const,
      designation: true as const,
    },
  },
  leaveType: { columns: { id: true as const, name: true as const } },
  approver: {
    columns: {
      id: true as const,
      name: true as const,
      firstName: true as const,
      lastName: true as const,
    },
  },
};

async function queryLeaves(conditions: SQL[], orgId: string, userId: string, isAdmin: boolean) {
  const base = await db.query.leaveRequests.findMany({
    where: and(...conditions),
    with: WITH_RELATIONS,
    orderBy: [desc(leaveRequests.createdAt)],
  });

  if (isAdmin) return base;

  const reportingUsers = await db.query.users.findMany({
    where: eq(users.reportingTo, userId),
    columns: { id: true },
  });

  if (reportingUsers.length === 0) return base;

  const reportingUserIds = new Set(reportingUsers.map((u) => u.id));
  const alreadyFetchedIds = new Set(base.map((r) => r.id));

  const reporteeRequests = await db.query.leaveRequests.findMany({
    where: and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.status, "PENDING")),
    with: WITH_RELATIONS,
    orderBy: [desc(leaveRequests.createdAt)],
  });

  const extra = reporteeRequests.filter(
    (r) => !alreadyFetchedIds.has(r.id) && reportingUserIds.has(r.userId),
  );

  return [...base, ...extra];
}


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    const isAdmin = EXPENSE_ADMIN_ROLES.includes(role) || role === "ADMIN";

    if (!isAdmin && role !== "MANAGER" && role !== "BRANCH_MANAGER") {
      return err("Only managers and admins can access team leave requests.", 403);
    }

    const orgId = session.orgId;
    const userId = session.user.id;

    const baseConditions: SQL[] = isAdmin
      ? [eq(leaveRequests.orgId, orgId)]
      : [eq(leaveRequests.orgId, orgId), eq(leaveRequests.approverId, userId)];

    const pendingConditions: SQL[] = [...baseConditions, eq(leaveRequests.status, "PENDING")];

    const [pending, all] = await Promise.all([
      queryLeaves(pendingConditions, orgId, userId, isAdmin),
      db.query.leaveRequests.findMany({
        where: and(...baseConditions),
        with: WITH_RELATIONS,
        orderBy: [desc(leaveRequests.createdAt)],
      }),
    ]);

    return ok({ pending, all });
  });
}
