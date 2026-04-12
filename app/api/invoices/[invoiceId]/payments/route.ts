import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { createPayment, getInvoicePayments } from "@/server/queries/invoice";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const recordPaymentSchema = z.object({
  amount: z.number().positive().max(999999999.99),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  paymentMethod: z.enum(["bank_transfer", "upi", "cheque", "cash", "card", "other"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth(async (session) => {
    const { invoiceId: id } = await params;
    const invoiceId = Number(id);
    if (!Number.isFinite(invoiceId)) return err("Invalid ID", 400);

    const pmts = await getInvoicePayments(session.orgId, invoiceId);
    return ok(pmts);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth(async (session) => {
    const { invoiceId: id } = await params;
    const invoiceId = Number(id);
    if (!Number.isFinite(invoiceId)) return err("Invalid ID", 400);

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.orgId, session.orgId)),
    });
    if (!invoice) return err("Invoice not found", 404);
    if (invoice.status === "CANCELLED") return err("Cannot record payment on cancelled invoice", 400);

    const body = await req.json() as unknown;
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) return err("Invalid payment data", 400);

    const payment = await createPayment(session.orgId, invoiceId, {
      ...parsed.data,
      createdBy: session.user.id,
    });

    return ok(payment, 201);
  });
}
