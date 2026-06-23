import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, lte, gte, inArray, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { LEAVE_POLICY, ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";
import { ROLES } from "@/lib/constants/roles";
import { ensureLeaveTypes, ensureUserBalances } from "@/server/actions/leave-actions/leave-balance";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { sendLeaveRequestEmail } from "@/lib/email";

const createLeaveSchema = z.object({
  leaveTypeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(10, "Reason must be at least 10 characters").max(500, "Reason must be at most 500 characters").optional()
  ),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  approverId: z.string().optional(),
  attachmentUrl: z.string().optional(),
  isHalfDay: z.boolean().optional().default(false),
  halfDayPeriod: z.enum(["AM", "PM"]).optional(),
}).refine(
  (d) => d.endDate >= d.startDate,
  { message: "End date must be on or after start date", path: ["endDate"] },
).refine(
  (d) => !d.isHalfDay || d.startDate === d.endDate,
  { message: "Half-day leave cannot span multiple dates", path: ["endDate"] },
);

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const userId = session.user.id;

    const seededTypes = await ensureLeaveTypes(orgId);
    const allowedSeeded = seededTypes
      .filter((t) => ALLOWED_LEAVE_TYPE_NAMES.has(t.name))
      .map((t) => ({ id: t.id, name: t.name, daysPerYear: t.daysPerYear }));
    await ensureUserBalances(orgId, userId, allowedSeeded);

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

    const seenNames = new Set<string>();
    const balances = rawBalances.filter((b) => {
      if (!b.typeName || !ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName) || seenNames.has(b.typeName)) return false;
      seenNames.add(b.typeName);
      return true;
    });

    const seenTypeNames = new Set<string>();
    const types = allTypes.filter((t) => {
      if (seenTypeNames.has(t.name)) return false;
      seenTypeNames.add(t.name);
      return true;
    });

    let approvers: Array<Record<string, unknown>> = [];
    if (member) {
      const role = member.role;
      const targetRoles =
        role === ROLES.CEO
          ? [ROLES.HR]
          : role === ROLES.HR
          ? [ROLES.CEO]
          : [ROLES.HR, ROLES.CEO];

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

      if (!body.leaveTypeId || !body.startDate || !body.endDate) {
        return err("leaveTypeId, startDate, and endDate are required.", 400);
      }

      if (body.startDate > body.endDate) {
        return err("Start date must be before or equal to end date.", 400);
      }

      const requestedDays = body.isHalfDay
        ? 0.5
        : Math.round(
            Math.abs(
              new Date(body.endDate).getTime() - new Date(body.startDate).getTime()
            ) / (1000 * 60 * 60 * 24)
          ) + 1;

      const [balance, leaveType] = await Promise.all([
        db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, session.user.id),
            eq(leaveBalances.orgId, session.orgId),
            eq(leaveBalances.leaveTypeId, body.leaveTypeId),
            eq(leaveBalances.year, new Date().getFullYear())
          ),
        }),
        db.query.leaveTypes.findFirst({
          where: and(
            eq(leaveTypes.id, body.leaveTypeId),
            eq(leaveTypes.orgId, session.orgId),
          ),
          columns: { name: true },
        }),
      ]);

      const isUnpaid = leaveType?.name === LEAVE_POLICY.UNPAID.name;
      if (!isUnpaid && balance && Number(balance.balance) < requestedDays) {
        return err(
          `Insufficient leave balance. Available: ${balance.balance}, Required: ${requestedDays}`,
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

      const [leaveRequest] = await db.insert(leaveRequests).values({
        orgId: session.orgId,
        userId: session.user.id,
        leaveTypeId: body.leaveTypeId,
        startDate: formatDateOnly(new Date(body.startDate)),
        endDate: formatDateOnly(new Date(body.endDate)),
        reason: body.reason,
        priority: body.priority ?? "MEDIUM",
        approverId: body.approverId ?? null,
        attachmentUrl: body.attachmentUrl ?? null,
        isHalfDay: body.isHalfDay ?? false,
        halfDayPeriod: body.halfDayPeriod ?? null,
        status: "PENDING",
      }).returning();

      void import("@/lib/services/automation/engine").then(({ runAutomationsForEvent }) =>
        runAutomationsForEvent(session.orgId, "leave.requested", {
          leaveRequestId: leaveRequest.id,
          userId: session.user.id,
          employeeName: session.user.name ?? "",
          leaveType: leaveType?.name ?? "Leave",
          startDate: body.startDate,
          endDate: body.endDate,
          totalDays: requestedDays,
          reason: body.reason ?? null,
          priority: body.priority ?? "MEDIUM",
        })
      );

      void (async () => {
        const hrMemberIds = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

        if (hrMemberIds.length === 0) return;

        const hrUsers = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(inArray(users.id, hrMemberIds.map((m) => m.userId)));

        await Promise.all(
          hrUsers
            .filter((u) => u.email)
            .map((u) =>
              sendLeaveRequestEmail(
                u.email!,
                u.name ?? "HR",
                session.user.name ?? "Employee",
                leaveType?.name ?? "Leave",
                formatDateOnly(new Date(body.startDate)),
                formatDateOnly(new Date(body.endDate)),
                body.reason ?? "No reason provided"
              )
            )
        );
      })().catch(() => {});

      return ok({ success: true }, 201);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      return err(message, 400);
    }
  });
}
