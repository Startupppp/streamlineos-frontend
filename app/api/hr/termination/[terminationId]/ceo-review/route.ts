import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";

const reviewSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    if (session.user.role !== "CEO") {
      return err("Only CEO can review terminations.", 403);
    }

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!existing) return err("Termination not found.", 404);
    if (existing.status !== "PENDING_CEO") return err("Termination is not pending CEO review.", 400);

    const body = reviewSchema.parse(await req.json());

    if (body.action === "REJECTED" && !body.remarks) {
      return err("Remarks are required when rejecting.", 400);
    }

    await db.update(terminations).set({
      status: body.action,
      ceoReviewedBy: session.user.id,
      ceoReviewedAt: new Date(),
      ceoRemarks: body.remarks || null,
      updatedAt: new Date(),
    }).where(eq(terminations.id, terminationId));

    void writeAuditLog({
      action: body.action === "APPROVED" ? "TERMINATION_APPROVED" : "TERMINATION_REJECTED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(terminationId),
      targetType: "termination",
      metadata: {
        employeeId: existing.userId,
        remarks: body.remarks,
      },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
