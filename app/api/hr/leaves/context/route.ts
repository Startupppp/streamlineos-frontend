import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveBalances, leaveTypes, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";
import { ROLES } from "@/lib/constants/roles";

export const dynamic = "force-dynamic";

/**
 * GET /api/hr/leaves/context
 * Returns leave balances, types, joining date, and approvers for the current user.
 */
export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const userId = session.user.id;

    // Get all leave types for the org
    const allTypes = await db.query.leaveTypes.findMany({
      where: eq(leaveTypes.orgId, orgId),
    });
    const seenTypeNames = new Set<string>();
    const filteredTypes = allTypes.filter((t) => {
      if (!ALLOWED_LEAVE_TYPE_NAMES.has(t.name) || seenTypeNames.has(t.name)) return false;
      seenTypeNames.add(t.name);
      return true;
    });

    // Get leave balances for current user
    const rawBalances = await db
      .select({
        id: leaveBalances.id,
        leaveTypeId: leaveBalances.leaveTypeId,
        balance: leaveBalances.balance,
        typeName: leaveTypes.name,
        daysPerYear: leaveTypes.daysPerYear,
      })
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.year, new Date().getFullYear()),
        ),
      );

    const seenNames = new Set<string>();
    const balances = rawBalances.filter((b) => {
      if (!b.typeName || !ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName) || seenNames.has(b.typeName)) return false;
      seenNames.add(b.typeName);
      return true;
    });

    // Get joining date
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { joiningDate: true },
    });
    const joiningDate = user?.joiningDate ?? null;

    // Get approvers based on role
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    let approvers: Array<Record<string, unknown>> = [];
    if (member) {
      const role = member.role;
      const targetRoles =
        role === ROLES.CEO
          ? [ROLES.HR, ROLES.ADMIN]
          : role === ROLES.HR
          ? [ROLES.CEO, ROLES.ADMIN]
          : [ROLES.ADMIN, ROLES.HR, ROLES.CEO];

      const approverMembers = await db.query.organizationMembers.findMany({
        where: and(
          eq(organizationMembers.orgId, orgId),
          inArray(organizationMembers.role, targetRoles),
        ),
        with: { user: true },
      });

      approvers = approverMembers
        .filter((m) => m.userId !== userId && m.user)
        .map((m) => m.user as Record<string, unknown>);
    }

    return ok({ balances, types: filteredTypes, joiningDate, approvers });
  });
}
