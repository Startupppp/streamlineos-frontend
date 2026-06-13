import { withAuth, withAbility, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { bonuses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["PERFORMANCE", "FESTIVAL", "REFERRAL", "SPOT", "ANNUAL"]),
  amount: z.number().positive(),
  reason: z.string().optional(),
  month: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    const isAdmin = ability.can("approve", "hr:payroll");

    const data = await db
      .select()
      .from(bonuses)
      .where(
        isAdmin
          ? eq(bonuses.orgId, session.orgId)
          : eq(bonuses.userId, session.user.id)
      )
      .orderBy(desc(bonuses.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:bonuses", async (session) => {
    const body = createSchema.parse(await req.json());

    const [record] = await db
      .insert(bonuses)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        type: body.type,
        amount: body.amount.toString(),
        reason: body.reason ?? null,
        month: body.month ?? null,
        status: "PENDING",
      })
      .returning();

    return ok(record, 201);
  });
}
