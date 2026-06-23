import { withAuth, withAbility, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { bonuses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["PERFORMANCE", "FESTIVAL", "REFERRAL", "SPOT", "ANNUAL"]),
  amount: z.preprocess(
    (val) => {
      const n = typeof val === "string" ? parseFloat(val) : val;
      return typeof n === "number" && isFinite(n) ? n : NaN;
    },
    z
      .number()
      .positive("Amount must be positive")
      .multipleOf(0.01, "Amount must have at most 2 decimal places")
  ),
  reason: z
    .string()
    .max(500, "Reason must be at most 500 characters")
    .refine((v) => !v || v.trim().length >= 3, "Reason must be at least 3 characters")
    .refine((v) => !v || !/^[\s\W]+$/.test(v.trim()), "Reason cannot consist of only special characters")
    .optional(),
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
    const body = await parseBody(req, createSchema);

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
