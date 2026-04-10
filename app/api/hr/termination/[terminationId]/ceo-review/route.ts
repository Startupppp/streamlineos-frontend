import { withAuth, err, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import type { NextRequest } from "next/server";

const reviewSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    remarks: z.string().optional(),
  })
  .refine(
    (data) => data.decision !== "reject" || (!!data.remarks && data.remarks.trim().length > 0),
    { message: "Remarks are required when rejecting.", path: ["remarks"] }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    if (session.user.role !== "CEO") return err("Only CEO can review terminations.", 403);

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!Number.isFinite(terminationId) || terminationId <= 0) return err("Invalid ID.", 400);

    const body = reviewSchema.parse(await req.json());

    const record = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!record) return err("Not found.", 404);
    if (record.status !== "PENDING_CEO") return err("Termination is not pending CEO review.", 400);

    const approved = body.decision === "approve";

    await db
      .update(terminations)
      .set({
        status: approved ? "APPROVED" : "REJECTED",
        ceoReviewedBy: session.user.id,
        ceoReviewedAt: new Date(),
        ceoRemarks: body.remarks ?? null,
        updatedAt: new Date(),
      })
      .where(eq(terminations.id, terminationId));

    const employee = await db.query.users.findFirst({
      where: eq(users.id, record.userId),
      columns: { name: true },
    });
    void inngest.send({
      name: "hr/termination.ceo_decision",
      data: {
        terminationId,
        orgId: session.orgId,
        employeeName: employee?.name ?? "Employee",
        approved,
      },
    });

    return ok({ success: true });
  });
}
