import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, lte, gte, inArray, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { LEAVE_POLICY, ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";
import { ROLES } from "@/lib/constants/roles";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { sendLeaveRequestEmail } from "@/lib/email";

const createLeaveSchema = z.object({
  typeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const userId = session.user.id;

    const [rawBalances, allTypes, requests, user, member] = await Promise.all([
      db
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
            eq(leaveBalances.orgId, orgId),
            eq(leaveBalances.year, new Date().getFullYear()),
          ),
        ),
      db.query.leaveTypes.findMany({ where: eq(leaveTypes.orgId, orgId) }),
      db.query.leaveRequests.findMany({
        where: and(eq(leaveRequests.userId, userId), eq(leaveRequests.orgId, orgId)),
        with: {
          leaveType: { columns: { id: true, name: true, daysPerYear: true } },
          approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
        },
        orderBy: [desc(leaveRequests.createdAt)],
      }),
      db.query.users.findFirst({ where: eq(users.id, userId), columns: { joiningDate: true } }),
      db.query.organizationMembers.findFirst({ where: eq(organizationMembers.userId, userId) }),
    ]);

    // Deduplicate balances by typeName and filter to allowed types
    const seenNames = new Set<string>();
    const balances = rawBalances.filter((b) => {
      if (!b.typeName || !ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName) || seenNames.has(b.typeName)) return false;
      seenNames.add(b.typeName);
      return true;
    });

    // Deduplicate types
    const seenTypeNames = new Set<string>();
    const types = allTypes.filter((t) => {
      if (seenTypeNames.has(t.name)) return false;
      seenTypeNames.add(t.name);
      return true;
    });

    // Get approvers based on role
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

    return ok({
      balances,
      types,
      requests,
      joiningDate: user?.joiningDate ?? null,
      approvers,
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await parseBody(req, createLeaveSchema);

      if (!body.typeId || !body.startDate || !body.endDate) {
        return err("typeId, startDate, and endDate are required.", 400);
      }

      if (body.startDate > body.endDate) {
        return err("Start date must be before or equal to end date.", 400);
      }

      const diffDays =
        Math.round(
          Math.abs(
            new Date(body.endDate).getTime() -
              new Date(body.startDate).getTime()
          ) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      const [balance, leaveType] = await Promise.all([
        db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, session.user.id),
            eq(leaveBalances.orgId, session.orgId),
            eq(leaveBalances.leaveTypeId, body.typeId),
            eq(leaveBalances.year, new Date().getFullYear())
          ),
        }),
        db.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, body.typeId),
          columns: { name: true },
        }),
      ]);

      const isUnpaid = leaveType?.name === LEAVE_POLICY.UNPAID.name;
      if (!isUnpaid && balance && Number(balance.balance) < diffDays) {
        return err(
          `Insufficient leave balance. Available: ${balance.balance}, Required: ${diffDays}`,
          400
        );
      }

      const overlapping = await db.query.leaveRequests.findFirst({
        where: and(
          eq(leaveRequests.userId, session.user.id),
          eq(leaveRequests.orgId, session.orgId),
          lte(leaveRequests.startDate, formatDateOnly(new Date(body.endDate))),
          gte(leaveRequests.startDate, formatDateOnly(new Date(body.startDate)))
        ),
      });

      if (overlapping && overlapping.status !== "REJECTED") {
        return err(
          "You already have a leave request for overlapping dates.",
          400
        );
      }

      await db.insert(leaveRequests).values({
        orgId: session.orgId,
        userId: session.user.id,
        leaveTypeId: body.typeId,
        startDate: formatDateOnly(new Date(body.startDate)),
        endDate: formatDateOnly(new Date(body.endDate)),
        reason: body.reason,
        status: "PENDING",
      });

      // Notify HR/Admin about the leave request (non-blocking)
      void (async () => {
        const hrMembers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

        for (const m of hrMembers) {
          const hrUser = await db.query.users.findFirst({
            where: eq(users.id, m.userId),
            columns: { email: true, name: true },
          });
          if (hrUser?.email) {
            await sendLeaveRequestEmail(
              hrUser.email,
              hrUser.name ?? "HR",
              session.user.name ?? "Employee",
              leaveType?.name ?? "Leave",
              formatDateOnly(new Date(body.startDate)),
              formatDateOnly(new Date(body.endDate)),
              body.reason ?? "No reason provided"
            );
          }
        }
      })().catch(() => {});

      return ok({ success: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      return err(message, 400);
    }
  });
}
