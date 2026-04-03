import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSalaryStructures } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { salaryStructures } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? undefined;
    const isAdmin = isAdminOrOwner(session.user.role);

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
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can manage salary structures.", 403);
    }

    const body = await req.json() as {
      userId: string;
      basicSalary: number;
      hraPercentage: number;
      allowances: number;
      deductions: number;
      effectiveFrom: string;
      effectiveTo?: string;
    };

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

    return ok(structure);
  });
}
