import { withAuth, ok, err, parseBody, type AuthSession } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceImprovementPlans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { patchPIPSchema } from "@/lib/validations/hr-pip";
import { notifyPIPOutcome, scheduleAppraisalPipEmails } from "@/lib/email/hr-appraisal-pip";
import type { NextRequest } from "next/server";

async function canAccessPip(
  session: AuthSession,
  pip: {
    orgId: string;
    userId: string;
    managerId: string;
    hrRepId: string | null;
    mentorId: string | null;
  }
) {
  if (pip.orgId !== session.orgId) return false;
  if (isAdminOrOwner(session.user.role) || session.user.role === "ADMIN") return true;
  if (
    pip.userId === session.user.id ||
    pip.managerId === session.user.id ||
    pip.hrRepId === session.user.id ||
    pip.mentorId === session.user.id
  )
    return true;
  return isManagerOf(session.user.id, pip.userId);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  return withAuth(async (session) => {
    const { pipId: raw } = await params;
    const pipId = Number(raw);
    if (!pipId) return err("Invalid id.", 400);

    const row = await db.query.performanceImprovementPlans.findFirst({
      where: and(eq(performanceImprovementPlans.id, pipId), eq(performanceImprovementPlans.orgId, session.orgId)),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true, designation: true, employeeId: true } },
        manager: { columns: { id: true, name: true, image: true } },
        hrRep: { columns: { id: true, name: true } },
        mentor: { columns: { id: true, name: true } },
        goals: { orderBy: (g, { asc }) => [asc(g.sortOrder), asc(g.id)] },
        checkIns: {
          orderBy: (c, { desc }) => [desc(c.checkInDate)],
          with: { goalProgressRows: { with: { goal: true } } },
        },
        linkedAppraisal: true,
      },
    });
    if (!row) return err("Not found.", 404);
    if (!(await canAccessPip(session, row))) return err("Forbidden.", 403);
    return ok(row);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  return withAuth(async (session) => {
    const { pipId: raw } = await params;
    const pipId = Number(raw);
    if (!pipId) return err("Invalid id.", 400);

    const row = await db.query.performanceImprovementPlans.findFirst({
      where: and(eq(performanceImprovementPlans.id, pipId), eq(performanceImprovementPlans.orgId, session.orgId)),
    });
    if (!row) return err("Not found.", 404);
    if (!(await canAccessPip(session, row))) return err("Forbidden.", 403);

    const body = await parseBody(req, patchPIPSchema);
    const admin = isAdminOrOwner(session.user.role) || session.user.role === "ADMIN";

    if (body.finalOutcome && !admin) {
      return err("Only HR or CEO can set final PIP outcome.", 403);
    }

    if (body.status === "ACTIVE" && !admin && row.managerId !== session.user.id && row.hrRepId !== session.user.id) {
      return err("Only HR, CEO, or PIP owner can activate.", 403);
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) patch.status = body.status;
    if (body.outcome !== undefined) patch.outcome = body.outcome;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.endDate !== undefined) patch.endDate = body.endDate;
    if (body.finalOutcome !== undefined) {
      patch.finalOutcome = body.finalOutcome;
      if (body.finalOutcome === "SUCCESS") patch.status = "COMPLETED";
      else if (body.finalOutcome === "EXTENDED") patch.status = "EXTENDED";
      else if (body.finalOutcome === "FAILED") patch.status = "TERMINATED";
    }

    const prevFinal = row.finalOutcome;
    await db
      .update(performanceImprovementPlans)
      .set(patch as typeof performanceImprovementPlans.$inferInsert)
      .where(eq(performanceImprovementPlans.id, pipId));

    if (
      body.finalOutcome !== undefined &&
      body.finalOutcome !== prevFinal &&
      (body.finalOutcome === "SUCCESS" || body.finalOutcome === "FAILED" || body.finalOutcome === "EXTENDED")
    ) {
      scheduleAppraisalPipEmails(() => notifyPIPOutcome(pipId, body.finalOutcome!));
    }

    const updated = await db.query.performanceImprovementPlans.findFirst({
      where: eq(performanceImprovementPlans.id, pipId),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        manager: { columns: { id: true, name: true } },
        hrRep: { columns: { id: true, name: true } },
        goals: true,
        checkIns: { with: { goalProgressRows: true } },
      },
    });
    return ok(updated);
  });
}
