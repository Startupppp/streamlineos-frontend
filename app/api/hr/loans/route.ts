import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  amount: z.number().min(1000, "Loan amount must be at least ₹1,000").max(10000000, "Loan amount cannot exceed ₹1,00,00,000"),
  reason: z.string().min(1, "Reason is required").max(500),
  totalEmis: z.number().int().min(1, "At least 1 EMI required").max(360, "Maximum 360 EMIs").optional(),
  userId: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    const isAdmin = ability.can("approve", "hr:expenses");
    const conditions = [eq(salaryLoans.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(salaryLoans.userId, session.user.id));

    const data = await db.query.salaryLoans.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(salaryLoans.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const emiAmount = body.totalEmis ? (body.amount / body.totalEmis) : body.amount;
    const ability = await getSessionAbility();
    const isAdmin = ability.can("approve", "hr:expenses");
    const targetUserId = isAdmin && body.userId ? body.userId : session.user.id;

    const [loan] = await db.insert(salaryLoans).values({
      orgId: session.orgId,
      userId: targetUserId,
      amount: body.amount.toString(),
      reason: body.reason,
      emiAmount: emiAmount.toFixed(2),
      totalEmis: body.totalEmis ?? 1,
      paidEmis: 0,
      status: "PENDING",
    }).returning();
    return ok(loan, 201);
  });
}
