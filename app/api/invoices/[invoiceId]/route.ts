import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getInvoice } from "@/server/queries/invoice";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1).max(999999),
  rate: z.number().positive().max(999999999.99),
  amount: z.number().min(0).max(999999999.99),
});

const updateSchema = z.object({
  clientId: z.number().optional(),
  projectId: z.number().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).optional(),
  currency: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { invoiceId: id } = await params;
      const invoiceId = Number(id);
      if (!Number.isFinite(invoiceId)) return err("Invalid ID", 400);

      const invoice = await getInvoice(session.orgId, invoiceId);
      if (!invoice) return err("Invoice not found", 404);
      return ok(invoice);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load invoice",
        500
      );
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { invoiceId: id } = await params;
      const invoiceId = Number(id);
      if (!Number.isFinite(invoiceId)) return err("Invalid ID", 400);

      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, invoiceId),
          eq(invoices.orgId, session.orgId)
        ),
      });
      if (!existing) return err("Invoice not found", 404);

      const body = await req.json();
      const input = updateSchema.parse(body);

      if (input.status) {
        const updateData: Record<string, unknown> = {
          status: input.status,
          updatedAt: new Date(),
        };
        if (input.status === "SENT") updateData.sentAt = new Date();
        if (input.status === "PAID") updateData.paidAt = new Date();

        await db
          .update(invoices)
          .set(updateData)
          .where(
            and(
              eq(invoices.id, invoiceId),
              eq(invoices.orgId, session.orgId)
            )
          );
        return ok({ success: true });
      }

      if (existing.status !== "DRAFT") {
        return err("Only draft invoices can be edited", 400);
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.clientId !== undefined) updateData.clientId = input.clientId;
      if (input.projectId !== undefined) updateData.projectId = input.projectId;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
      if (input.notes !== undefined) updateData.notes = input.notes;

      if (input.lineItems) {
        const subtotal = Number(
          input.lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
        );
        const taxRate = input.taxRate ?? Number(existing.taxRate ?? 0);
        const discount = input.discount ?? Number(existing.discount ?? 0);
        const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
        const total = Number((subtotal + taxAmount - discount).toFixed(2));

        updateData.lineItems = input.lineItems;
        updateData.subtotal = subtotal.toString();
        updateData.taxRate = taxRate.toString();
        updateData.taxAmount = taxAmount.toString();
        updateData.discount = discount.toString();
        updateData.total = total.toString();
      }

      await db
        .update(invoices)
        .set(updateData)
        .where(
          and(eq(invoices.id, invoiceId), eq(invoices.orgId, session.orgId))
        );

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update invoice",
        500
      );
    }
  });
}
