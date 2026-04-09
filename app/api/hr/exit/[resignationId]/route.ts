import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { resignations, exitChecklists, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendResignationApprovedEmail } from "@/lib/email";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["SUBMITTED", "APPROVED", "WITHDRAWN", "COMPLETED"]).optional(),
  exitInterviewNotes: z.string().max(5000).optional(),
  exitInterviewDate: z.string().optional(),
  feedback: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  checklistItems: z.array(z.string().min(1)).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAuth(async (session) => {
    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const existing = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
    });
    if (!existing) return err("Resignation not found.", 404);

    const body = updateSchema.parse(await req.json());

    if (body.status === "APPROVED" || body.status === "COMPLETED") {
      if (!isAdminOrOwner(session.user.role)) return err("Only admins can approve.", 403);
    }

    await db.update(resignations).set({
      ...(body.status && { status: body.status }),
      ...(body.status === "APPROVED" && { approvedBy: session.user.id, approvedAt: new Date() }),
      ...(body.exitInterviewNotes && { exitInterviewNotes: body.exitInterviewNotes }),
      ...(body.exitInterviewDate && { exitInterviewDate: new Date(body.exitInterviewDate), exitInterviewConductedBy: session.user.id }),
      ...(body.feedback && { feedback: body.feedback }),
      updatedAt: new Date(),
    }).where(eq(resignations.id, resignationId));

    if (body.checklistItems?.length) {
      await db.insert(exitChecklists).values(
        body.checklistItems.map((item) => ({
          resignationId,
          item,
          status: "PENDING" as const,
        }))
      );
    }

    if (body.status === "APPROVED") {
      const employee = await db.query.users.findFirst({
        where: eq(users.id, existing.userId),
      });
      if (employee?.email) {
        const lwd = existing.lastWorkingDate ? new Date(existing.lastWorkingDate) : new Date();
        const sub = existing.createdAt ?? new Date();
        const lastWorkingDate = format(lwd, "dd MMM yyyy");
        const submissionDate = format(sub, "dd MMM yyyy");
        sendResignationApprovedEmail(
          employee.email,
          employee.name ?? "Employee",
          session.user.name ?? "HR",
          lastWorkingDate,
          existing.noticePeriodDays ?? 30,
          submissionDate
        ).catch(() => undefined);
      }
    }

    return ok({ success: true });
  });
}
