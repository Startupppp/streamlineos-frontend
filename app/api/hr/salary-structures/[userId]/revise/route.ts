import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { salaryStructures, salaryRevisionHistory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";

const reviseSchema = z.object({
  basicSalary: z.number().positive(),
  hraPercentage: z.number().min(0).max(100).default(50),
  specialAllowance: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(200),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can revise salaries.", 403);
    }

    const { userId } = await params;
    const body = await parseBody(req, reviseSchema);

    const existing = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.userId, userId),
        eq(salaryStructures.orgId, session.orgId),
        eq(salaryStructures.isActive, true)
      ),
    });

    const [newStructure] = await db.transaction(async (tx) => {
      if (existing) {
        await tx.update(salaryStructures).set({ isActive: false }).where(eq(salaryStructures.id, existing.id));
      }

      const [s] = await tx
        .insert(salaryStructures)
        .values({
          orgId: session.orgId,
          userId,
          basicSalary: body.basicSalary.toString(),
          hraPercentage: body.hraPercentage.toString(),
          specialAllowance: body.specialAllowance.toString(),
          allowances: "0",
          deductions: body.deductions.toString(),
          professionalTax: body.professionalTax.toString(),
          effectiveFrom: formatDateOnly(new Date(body.effectiveFrom)),
          isActive: true,
          createdBy: session.user.id,
        })
        .returning();

      await tx.insert(salaryRevisionHistory).values({
        orgId: session.orgId,
        userId,
        salaryStructureId: s.id,
        previousBasic: existing?.basicSalary ?? null,
        previousHraPct: existing?.hraPercentage ?? null,
        previousSpecialAllowance: existing?.specialAllowance ?? null,
        previousPt: existing?.professionalTax ?? null,
        newBasic: body.basicSalary.toString(),
        newHraPct: body.hraPercentage.toString(),
        newSpecialAllowance: body.specialAllowance.toString(),
        newPt: body.professionalTax.toString(),
        effectiveFrom: formatDateOnly(new Date(body.effectiveFrom)),
        reason: body.reason ?? null,
        changedBy: session.user.id,
      });

      return [s];
    });

    void createAuditLog({
      action: "hr.salary_revised",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: userId,
      targetType: "salary_structure",
      metadata: { newBasic: body.basicSalary, effectiveFrom: body.effectiveFrom, reason: body.reason },
    }).catch(() => {});

    return ok(newStructure);
  });
}
