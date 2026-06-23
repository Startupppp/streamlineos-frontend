import { withAuth, ok, err , parseBody} from "@/lib/api/helpers"; 
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "ACTIVE", "REPAID", "REJECTED"]).optional(),
  paidEmis: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("approve", "hr:expenses"))  return err("Only admins can manage loans.", 403);
    const { loanId: id } = await params;
    const loanId = Number(id);
    if (!loanId) return err("Invalid ID.", 400);

    const existing = await db.query.salaryLoans.findFirst({
      where: and(eq(salaryLoans.id, loanId), eq(salaryLoans.orgId, session.orgId)),
    });
    if (!existing) return err("Loan not found.", 404);

    const body = await parseBody(req, updateSchema);
    await db.update(salaryLoans).set({
      ...(body.status && { status: body.status }),
      ...(body.status === "APPROVED" && { approvedBy: session.user.id, approvedAt: new Date() }),
      ...(body.status === "ACTIVE" && { disbursedAt: new Date() }),
      ...(body.paidEmis !== undefined && { paidEmis: body.paidEmis }),
      updatedAt: new Date(),
    }).where(eq(salaryLoans.id, loanId));

    return ok({ success: true });
  });
}
