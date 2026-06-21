import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { reimbursements, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  rejectionReason: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reimbursementId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("approve", "hr:expenses"))  return err("Only admins can process reimbursements.", 403);
    const { reimbursementId: id } = await params;
    const reimbursementId = Number(id);
    if (!reimbursementId) return err("Invalid ID.", 400);

    const existing = await db.query.reimbursements.findFirst({
      where: and(eq(reimbursements.id, reimbursementId), eq(reimbursements.orgId, session.orgId)),
    });
    if (!existing) return err("Not found.", 404);

    const body = updateSchema.parse(await req.json());
    await db.update(reimbursements).set({
      status: body.status,
      ...(body.status === "APPROVED" && { approvedBy: session.user.id, approvedAt: new Date() }),
      ...(body.status === "PAID" && { paidAt: new Date() }),
      ...(body.rejectionReason && { rejectionReason: body.rejectionReason }),
      updatedAt: new Date(),
    }).where(eq(reimbursements.id, reimbursementId));

    if (body.status === "APPROVED" || body.status === "REJECTED") {
      void import("@/lib/services/automation/engine").then(async ({ runAutomationsForEvent }) => {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, existing.userId),
          columns: { name: true, email: true },
        });
        await runAutomationsForEvent(
          session.orgId,
          body.status === "APPROVED" ? "reimbursement.approved" : "reimbursement.rejected",
          {
            reimbursementId,
            userId: existing.userId,
            employeeName: employee?.name ?? "",
            employeeEmail: employee?.email ?? "",
            amount: String(existing.amount ?? ""),
            decision: body.status,
          }
        );
      });
    }

    return ok({ success: true });
  });
}
