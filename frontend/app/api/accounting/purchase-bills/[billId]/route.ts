import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { clients, purchaseBills, purchaseBillItems } from "@/lib/db/schema/crm";
import { withModuleAbility, parseBody, ok, err } from "@/lib/api/helpers";
import { updatePurchaseBillStatusSchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { seedChartOfAccountsForOrg } from "@/lib/accounting/seed-coa";
import { postPurchaseBill } from "@/lib/accounting/post-purchase-bill";

type RouteContext = { params: Promise<{ billId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { billId } = await params;
  const id = Number(billId);

  return withModuleAbility("accounting", "read", "accounting:journal", async (session) => {
    if (!Number.isInteger(id) || id <= 0) return err("Invalid bill id", 400);

    const rows = await db
      .select({
        id: purchaseBills.id,
        orgId: purchaseBills.orgId,
        vendorId: purchaseBills.vendorId,
        vendorName: clients.name,
        billNumber: purchaseBills.billNumber,
        vendorBillNumber: purchaseBills.vendorBillNumber,
        billDate: purchaseBills.billDate,
        dueDate: purchaseBills.dueDate,
        status: purchaseBills.status,
        subtotal: purchaseBills.subtotal,
        taxAmount: purchaseBills.taxAmount,
        cgstAmount: purchaseBills.cgstAmount,
        sgstAmount: purchaseBills.sgstAmount,
        igstAmount: purchaseBills.igstAmount,
        discount: purchaseBills.discount,
        total: purchaseBills.total,
        amountPaid: purchaseBills.amountPaid,
        currency: purchaseBills.currency,
        placeOfSupply: purchaseBills.placeOfSupply,
        vendorGstin: purchaseBills.vendorGstin,
        supplierGstin: purchaseBills.supplierGstin,
        reverseCharge: purchaseBills.reverseCharge,
        notes: purchaseBills.notes,
        expenseAccountCode: purchaseBills.expenseAccountCode,
        createdBy: purchaseBills.createdBy,
        createdAt: purchaseBills.createdAt,
        updatedAt: purchaseBills.updatedAt,
      })
      .from(purchaseBills)
      .leftJoin(clients, eq(clients.id, purchaseBills.vendorId))
      .where(and(eq(purchaseBills.id, id), eq(purchaseBills.orgId, session.orgId)))
      .limit(1);

    const header = rows[0];
    if (!header) return err("Purchase bill not found", 404);

    const items = await db
      .select()
      .from(purchaseBillItems)
      .where(eq(purchaseBillItems.billId, id))
      .orderBy(asc(purchaseBillItems.lineOrder));

    return ok({ ...header, items });
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { billId } = await params;
  const id = Number(billId);

  return withModuleAbility("accounting", "manage", "accounting:journal", async (session) => {
    if (!Number.isInteger(id) || id <= 0) return err("Invalid bill id", 400);

    const input = await parseBody(req, updatePurchaseBillStatusSchema);

    const existingRows = await db
      .select()
      .from(purchaseBills)
      .where(and(eq(purchaseBills.id, id), eq(purchaseBills.orgId, session.orgId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) return err("Purchase bill not found", 404);

    if (input.status === "POSTED") {
      if (existing.status !== "DRAFT") return err(`Cannot post bill in status ${existing.status}`, 409);
      await seedChartOfAccountsForOrg(session.orgId);

      await db.transaction(async (tx) => {
        await tx
          .update(purchaseBills)
          .set({ status: "POSTED", updatedAt: new Date() })
          .where(and(eq(purchaseBills.id, id), eq(purchaseBills.orgId, session.orgId)));

        const subtotal = Number(existing.subtotal ?? 0);
        const discount = Number(existing.discount ?? 0);
        const cgst = Number(existing.cgstAmount ?? 0);
        const sgst = Number(existing.sgstAmount ?? 0);
        const igst = Number(existing.igstAmount ?? 0);
        const taxPool = Math.round((cgst + sgst + igst) * 100) / 100;
        const total = Number(existing.total ?? 0);
        const supplierStateCode = existing.supplierGstin && existing.supplierGstin.length >= 2
          ? existing.supplierGstin.slice(0, 2)
          : existing.placeOfSupply ?? "";
        const placeOfSupplyStateCode = existing.placeOfSupply ?? supplierStateCode;

        await postPurchaseBill(
          {
            orgId: session.orgId,
            billId: existing.id,
            billNumber: existing.billNumber,
            billDate: existing.billDate,
            supplierStateCode,
            placeOfSupplyStateCode,
            subtotal,
            discount,
            taxPool,
            total,
            expenseAccountCode: existing.expenseAccountCode ?? "5990",
            createdBy: session.user.id,
          },
          tx,
        );
      });
    } else if (input.status === "CANCELLED") {
      if (existing.status === "POSTED" || existing.status === "PARTIALLY_PAID" || existing.status === "PAID") {
        return err("Cannot cancel a posted bill — reverse the journal entry instead", 409);
      }
      await db
        .update(purchaseBills)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(and(eq(purchaseBills.id, id), eq(purchaseBills.orgId, session.orgId)));
    }

    revalidateTag(orgScopedTag(CacheTag.purchaseBills, session.orgId), "default");
    if (input.status === "POSTED") {
      revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.balanceSheet, session.orgId), "default");
    }

    return ok({ id, status: input.status });
  });
}
