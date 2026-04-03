import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getInvoices } from "@/server/queries/invoice";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1).max(999999),
  rate: z.number().positive().max(999999999.99),
  amount: z.number().min(0).max(999999999.99),
});

const createSchema = z.object({
  clientId: z.number().optional(),
  projectId: z.number().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  currency: z.string().default("INR"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") as
        | "DRAFT"
        | "SENT"
        | "PAID"
        | "OVERDUE"
        | "CANCELLED"
        | null;
      const clientId = toNumber(params.get("clientId"));
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 50;

      const data = await getInvoices(session.orgId, {
        status: status ?? undefined,
        clientId,
        page,
        limit,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load invoices",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await req.json();
      const input = createSchema.parse(body);

      const orgId = session.orgId;
      const subtotal = Number(
        input.lineItems
          .reduce((sum, item) => sum + item.amount, 0)
          .toFixed(2)
      );
      const taxAmount = Number(
        (subtotal * (input.taxRate / 100)).toFixed(2)
      );
      const total = Number(
        (subtotal + taxAmount - input.discount).toFixed(2)
      );

      const [invoice] = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'invoice'))`
        );

        const [countResult] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(invoices)
          .where(eq(invoices.orgId, orgId));
        const nextNum = (countResult?.count ?? 0) + 1;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;

        return tx
          .insert(invoices)
          .values({
            orgId,
            clientId: input.clientId,
            projectId: input.projectId,
            invoiceNumber,
            lineItems: input.lineItems,
            subtotal: subtotal.toString(),
            taxRate: input.taxRate.toString(),
            taxAmount: taxAmount.toString(),
            discount: input.discount.toString(),
            total: total.toString(),
            currency: input.currency,
            dueDate: input.dueDate,
            notes: input.notes,
            createdBy: session.user.id,
          })
          .returning();
      });

      return ok(invoice, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create invoice",
        500
      );
    }
  });
}
