import type { NextRequest } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { purchaseBills, vendorPayments } from "@/lib/db/schema/crm";
import { withModuleAbility, parseBody, ok, err } from "@/lib/api/helpers";
import { recordVendorPaymentSchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { seedChartOfAccountsForOrg } from "@/lib/accounting/seed-coa";
import { postVendorPayment } from "@/lib/accounting/post-vendor-payment";

type RouteContext = { params: Promise<{ billId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { billId } = await params;
  const id = Number(billId);

  return withModuleAbility("accounting", "read", "accounting:journal", async (session) => {
    if (!Number.isInteger(id) || id <= 0) return err("Invalid bill id", 400);

    const bills = await db
      .select({ id: purchaseBills.id })
      .from(purchaseBills)
      .where(and(eq(purchaseBills.id, id), eq(purchaseBills.orgId, session.orgId)))
      .limit(1);
    if (!bills[0]) return err("Purchase bill not found", 404);

    const items = await db
      .select()
      .from(vendorPayments)
      .where(eq(vendorPayments.billId, id))
      .orderBy(asc(vendorPayments.paymentDate), asc(vendorPayments.id));

    return ok(items);
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { billId } = await params;
  const id = Number(billId);

  return withModuleAbility("accounting", "manage", "accounting:journal", async (session) => {
    if (!Number.isInteger(id) || id <= 0) return err("Invalid bill id", 400);

    const input = await parseBody(req, recordVendorPaymentSchema);

    const billRows = await db
      .select()
      .from(purchaseBills)
      .where(and(eq(purchaseBills.id, id), eq(purchaseBills.orgId, session.orgId)))
      .limit(1);
    const bill = billRows[0];
    if (!bill) return err("Purchase bill not found", 404);
    if (bill.status === "DRAFT") return err("Post the bill before recording a payment", 409);
    if (bill.status === "CANCELLED") return err("Cannot record payment on a cancelled bill", 409);

    const total = Number(bill.total ?? 0);
    const alreadyPaid = Number(bill.amountPaid ?? 0);
    const remaining = total - alreadyPaid;
    if (input.amount > remaining + 0.01) {
      return err(`Payment amount ${input.amount.toFixed(2)} exceeds remaining ${remaining.toFixed(2)}`, 400);
    }

    await seedChartOfAccountsForOrg(session.orgId);

    const payment = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(vendorPayments)
        .values({
          orgId: session.orgId,
          billId: id,
          amount: input.amount.toFixed(2),
          paymentDate: input.paymentDate,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber ?? null,
          notes: input.notes ?? null,
          createdBy: session.user.id,
        })
        .returning();
      if (!inserted) throw new Error("Vendor payment insert returned no rows");

      const newPaidTotal = await tx
        .select({ paid: sql<string>`COALESCE(sum(${vendorPayments.amount}::numeric), 0)::text` })
        .from(vendorPayments)
        .where(eq(vendorPayments.billId, id));
      const paidSum = Number(newPaidTotal[0]?.paid ?? 0);
      const nextStatus = paidSum >= total - 0.005 ? "PAID" : "PARTIALLY_PAID";

      await tx
        .update(purchaseBills)
        .set({
          amountPaid: paidSum.toFixed(4),
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseBills.id, id), eq(purchaseBills.orgId, session.orgId)));

      await postVendorPayment(
        {
          orgId: session.orgId,
          paymentId: inserted.id,
          billNumber: bill.billNumber,
          paymentDate: input.paymentDate,
          paymentMethod: input.paymentMethod,
          amount: input.amount,
          createdBy: session.user.id,
        },
        tx,
      );

      return inserted;
    });

    revalidateTag(orgScopedTag(CacheTag.purchaseBills, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.balanceSheet, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.vendorLedger, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.agedPayables, session.orgId), "default");

    return ok(payment, 201);
  });
}
