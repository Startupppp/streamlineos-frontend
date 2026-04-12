import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getExpenses } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createExpenseSchema = z.object({
  category: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  expenseDate: z.string(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const status = searchParams.get("status") as
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "PAID"
      | null;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const data = await getExpenses(session.orgId, session.user.id, isAdmin, {
      filterUserId,
      status: status ?? undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      startDate,
      endDate,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createExpenseSchema);

    if (!body.category || body.amount === undefined || !body.expenseDate) {
      return err("category, amount, and expenseDate are required.", 400);
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        category: body.category,
        amount: body.amount.toString(),
        description: body.description,
        receiptUrl: body.receiptUrl,
        expenseDate: formatDateOnly(new Date(body.expenseDate)),
        status: "PENDING",
      })
      .returning();

    return ok(expense);
  });
}
