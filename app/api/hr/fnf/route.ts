import { withAuth, withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { fnfSettlements, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  resignationId: z.number().int().positive().optional(),
  basicDues: z.number().optional(),
  leaveEncashment: z.number().optional(),
  bonusDue: z.number().optional(),
  deductions: z.number().optional(),
  loanRecovery: z.number().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    const isAdmin = ability.can("approve", "hr:payroll");

    const data = await db
      .select()
      .from(fnfSettlements)
      .where(
        isAdmin
          ? eq(fnfSettlements.orgId, session.orgId)
          : eq(fnfSettlements.userId, session.user.id)
      )
      .orderBy(desc(fnfSettlements.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:exit", async (session) => {
    const body = createSchema.parse(await req.json());

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId),
      ),
      columns: { userId: true },
    });
    if (!member) {
      return err("User not found in your organization", 404);
    }

    const basicDues = body.basicDues ?? 0;
    const leaveEncashment = body.leaveEncashment ?? 0;
    const bonusDue = body.bonusDue ?? 0;
    const deductions = body.deductions ?? 0;
    const loanRecovery = body.loanRecovery ?? 0;
    const netPayable = basicDues + leaveEncashment + bonusDue - deductions - loanRecovery;

    const [record] = await db
      .insert(fnfSettlements)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        resignationId: body.resignationId ?? null,
        basicDues: basicDues.toString(),
        leaveEncashment: leaveEncashment.toString(),
        bonusDue: bonusDue.toString(),
        deductions: deductions.toString(),
        loanRecovery: loanRecovery.toString(),
        netPayable: netPayable.toString(),
        status: "DRAFT",
      })
      .returning();

    return ok(record, 201);
  });
}
