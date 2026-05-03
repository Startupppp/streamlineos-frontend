import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisals, appraisalStages, organizationMembers } from "@/lib/db/schema";
import { and, desc, eq, exists, or } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { createAppraisalSchema } from "@/lib/validations/hr-appraisals";
import { createAppraisalBundle } from "@/lib/hr/create-appraisal";
import { notifyNewAppraisalAssignee, scheduleAppraisalPipEmails } from "@/lib/email/hr-appraisal-pip";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const myActions = req.nextUrl.searchParams.get("myActions") === "1";
    const filterUserId = req.nextUrl.searchParams.get("userId") ?? undefined;

    const pendingMine = exists(
      db
        .select()
        .from(appraisalStages)
        .where(
          and(
            eq(appraisalStages.appraisalId, appraisals.id),
            eq(appraisalStages.status, "PENDING"),
            eq(appraisalStages.assigneeId, session.user.id)
          )
        )
    );

    const conditions = [eq(appraisals.orgId, session.orgId)];

    if (myActions) {
      conditions.push(pendingMine);
    } else if (filterUserId) {
      if (filterUserId !== session.user.id && !isAdmin) {
        const mgr = await isManagerOf(session.user.id, filterUserId);
        if (!mgr) return err("Not authorized to filter this user.", 403);
      }
      conditions.push(eq(appraisals.userId, filterUserId));
    } else if (!isAdmin) {
      conditions.push(
        or(
          eq(appraisals.userId, session.user.id),
          eq(appraisals.reviewerId, session.user.id),
          pendingMine
        )!
      );
    }

    const data = await db.query.appraisals.findMany({
      where: and(...conditions),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        reviewer: { columns: { id: true, name: true, image: true } },
        cycle: true,
        stages: { orderBy: (s, { asc }) => [asc(s.id)] },
      },
      orderBy: [desc(appraisals.updatedAt)],
      limit: 100,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createAppraisalSchema);
    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isAdmin) {
      const mgr = await isManagerOf(session.user.id, body.userId);
      if (!mgr) return err("Only HR, CEO, or the employee's manager can create an appraisal.", 403);
    }

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!member) return err("Employee not found in organization.", 404);

    const { appraisalId } = await createAppraisalBundle({
      orgId: session.orgId,
      userId: body.userId,
      cycleId: body.cycleId ?? null,
      type: body.type,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      dueDate: body.dueDate ?? null,
      confidentialityNote: body.confidentialityNote ?? null,
      initiatorId: session.user.id,
    });

    const row = await db.query.appraisals.findFirst({
      where: eq(appraisals.id, appraisalId),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        reviewer: { columns: { id: true, name: true, image: true } },
        cycle: true,
        stages: true,
      },
    });

    scheduleAppraisalPipEmails(() => notifyNewAppraisalAssignee(appraisalId));

    return ok(row, 201);
  });
}
