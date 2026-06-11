import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSalaryStructures } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { salaryStructures } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";

const createSalaryStructureSchema = z.object({
  userId: z.string(),
  basicSalary: z.number(),
  hraPercentage: z.number(),
  allowances: z.number(),
  deductions: z.number(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? undefined;
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:salary");

    if (userId && userId !== session.user.id && !isAdmin) {
      return err("Not authorized.", 403);
    }

    const data = await getSalaryStructures(
      session.orgId,
      userId,
      session.user.id,
      isAdmin
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:salary")) {
      return err("Only admins can manage salary structures.", 403);
    }

    const body = await parseBody(req, createSalaryStructureSchema);

    if (!body.userId || body.basicSalary === undefined || !body.effectiveFrom) {
      return err("userId, basicSalary, and effectiveFrom are required.", 400);
    }

    const [structure] = await db.transaction(async (tx) => {
      await tx
        .update(salaryStructures)
        .set({ isActive: false })
        .where(
          and(
            eq(salaryStructures.userId, body.userId),
            eq(salaryStructures.orgId, session.orgId),
            eq(salaryStructures.isActive, true)
          )
        );

      return await tx
        .insert(salaryStructures)
        .values({
          orgId: session.orgId,
          userId: body.userId,
          basicSalary: body.basicSalary.toString(),
          hraPercentage: (body.hraPercentage ?? 40).toString(),
          allowances: (body.allowances ?? 0).toString(),
          deductions: (body.deductions ?? 0).toString(),
          effectiveFrom: formatDateOnly(new Date(body.effectiveFrom)),
          effectiveTo: body.effectiveTo
            ? formatDateOnly(new Date(body.effectiveTo))
            : undefined,
          isActive: true,
        })
        .returning();
    });

    void createAuditLog({
      action: "hr.salary_changed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: body.userId,
      targetType: "salary_structure",
      metadata: { basicSalary: body.basicSalary, effectiveFrom: body.effectiveFrom },
    }).catch(() => {});

    return ok(structure);
  });
}
