import type { NextRequest } from "next/server";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { clients, purchaseBills, purchaseBillItems } from "@/lib/db/schema/crm";
import { withModuleAbility, parseQuery, parseBody, ok, err } from "@/lib/api/helpers";
import {
  createPurchaseBillSchema,
  listPurchaseBillsQuerySchema,
} from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";
import { seedChartOfAccountsForOrg } from "@/lib/accounting/seed-coa";
import { postPurchaseBill } from "@/lib/accounting/post-purchase-bill";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:journal", async (session) => {
    const { page, pageSize, q, status, vendorId } = parseQuery(req, listPurchaseBillsQuerySchema);

    const tag = orgScopedTag(CacheTag.purchaseBills, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const conds = [eq(purchaseBills.orgId, session.orgId)];
        if (status) conds.push(eq(purchaseBills.status, status));
        if (vendorId) conds.push(eq(purchaseBills.vendorId, vendorId));
        if (q) conds.push(ilike(purchaseBills.billNumber, `%${q.replaceAll("%", "\\%")}%`));

        const { offset, limit } = paginateOffset({ page, pageSize });
        const items = await db
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
          .where(and(...conds))
          .orderBy(desc(purchaseBills.billDate), asc(purchaseBills.id))
          .offset(offset)
          .limit(limit);
        const totalRows = await db.select({ c: count() }).from(purchaseBills).where(and(...conds));
        return buildListResponse(items, Number(totalRows[0]?.c ?? 0), { page, pageSize });
      },
      [tag, `purchase-bills:${page}:${pageSize}:${q ?? ""}:${status ?? ""}:${vendorId ?? ""}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}

export async function POST(req: NextRequest) {
  return withModuleAbility("accounting", "manage", "accounting:journal", async (session) => {
    const input = await parseBody(req, createPurchaseBillSchema);

    const itemsWithAmounts = input.items.map((it, idx) => {
      const amount = round2(it.quantity * it.rate);
      const tax = round2(amount * (it.gstRate / 100));
      return { ...it, amount, tax, lineOrder: idx };
    });
    const subtotal = round2(itemsWithAmounts.reduce((acc, it) => acc + it.amount, 0));
    const taxPool = round2(itemsWithAmounts.reduce((acc, it) => acc + it.tax, 0));
    const discount = round2(input.discount);
    const total = round2(subtotal + taxPool - discount);

    const supplierStateCode = input.supplierGstin && input.supplierGstin.length >= 2
      ? input.supplierGstin.slice(0, 2)
      : input.placeOfSupply ?? "";
    const placeOfSupplyStateCode = input.placeOfSupply ?? supplierStateCode;

    const intra = supplierStateCode === placeOfSupplyStateCode && supplierStateCode !== "";
    const cgst = intra ? round2(taxPool / 2) : 0;
    const sgst = intra ? round2(taxPool - cgst) : 0;
    const igst = intra ? 0 : taxPool;

    if (input.status === "POSTED") {
      await seedChartOfAccountsForOrg(session.orgId);
    }

    const result = await db.transaction(async (tx) => {
      const [{ count: existingCount }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(purchaseBills)
        .where(eq(purchaseBills.orgId, session.orgId));
      const billNumber = `BILL-${new Date(input.billDate).getFullYear()}-${String((existingCount ?? 0) + 1).padStart(4, "0")}`;

      const [inserted] = await tx
        .insert(purchaseBills)
        .values({
          orgId: session.orgId,
          vendorId: input.vendorId,
          billNumber,
          vendorBillNumber: input.vendorBillNumber ?? null,
          billDate: input.billDate,
          dueDate: input.dueDate ?? null,
          status: input.status,
          subtotal: subtotal.toFixed(4),
          taxAmount: taxPool.toFixed(4),
          cgstAmount: cgst.toFixed(4),
          sgstAmount: sgst.toFixed(4),
          igstAmount: igst.toFixed(4),
          discount: discount.toFixed(4),
          total: total.toFixed(4),
          currency: "INR",
          placeOfSupply: placeOfSupplyStateCode || null,
          vendorGstin: input.vendorGstin && input.vendorGstin.length > 0 ? input.vendorGstin : null,
          supplierGstin: input.supplierGstin && input.supplierGstin.length > 0 ? input.supplierGstin : null,
          reverseCharge: input.reverseCharge,
          notes: input.notes ?? null,
          expenseAccountCode: input.expenseAccountCode,
          createdBy: session.user.id,
        })
        .returning();

      if (!inserted) throw new Error("Purchase bill insert returned no rows");

      if (itemsWithAmounts.length > 0) {
        await tx.insert(purchaseBillItems).values(
          itemsWithAmounts.map((it) => ({
            billId: inserted.id,
            description: it.description,
            hsnSacCode: it.hsnSacCode ?? null,
            quantity: it.quantity.toFixed(4),
            rate: it.rate.toFixed(4),
            gstRate: it.gstRate.toFixed(2),
            amount: it.amount.toFixed(4),
            lineOrder: it.lineOrder,
          })),
        );
      }

      if (input.status === "POSTED") {
        await postPurchaseBill(
          {
            orgId: session.orgId,
            billId: inserted.id,
            billNumber: inserted.billNumber,
            billDate: inserted.billDate,
            supplierStateCode,
            placeOfSupplyStateCode,
            subtotal,
            discount,
            taxPool,
            total,
            expenseAccountCode: input.expenseAccountCode,
            createdBy: session.user.id,
          },
          tx,
        );
      }

      return inserted;
    });

    revalidateTag(orgScopedTag(CacheTag.purchaseBills, session.orgId), "default");
    if (input.status === "POSTED") {
      revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.balanceSheet, session.orgId), "default");
    }

    return ok(result, 201);
  });
}
