import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { reimbursements } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  category: z.string().min(1).max(100),
  amount: z.number().min(1, "Amount must be at least ₹1").max(999999, "Amount cannot exceed ₹9,99,999").multipleOf(0.01, "Amount must have at most 2 decimal places"),
  description: z.string().max(1000).optional(),
  receiptUrl: z.string().url("Enter a valid URL (e.g. https://example.com)").optional().or(z.literal("")),
});

export async function GET() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    const isAdmin = ability.can("approve", "hr:expenses");
    const conditions = [eq(reimbursements.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(reimbursements.userId, session.user.id));

    const data = await db.query.reimbursements.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(reimbursements.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const [record] = await db.insert(reimbursements).values({
      orgId: session.orgId,
      userId: session.user.id,
      category: body.category,
      amount: body.amount.toString(),
      description: body.description,
      receiptUrl: body.receiptUrl || undefined,
      status: "PENDING",
    }).returning();
    return ok(record, 201);
  });
}
