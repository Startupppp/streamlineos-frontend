import type { NextRequest } from "next/server";
import { and, eq, gte, inArray, lte, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { invoices, purchaseBills } from "@/lib/db/schema/crm";
import { withModuleAbility, parseQuery, ok } from "@/lib/api/helpers";
import { gstr3BQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import type { Gstr3BTaxBlock } from "@/types/accounting";

const OUTWARD_STATUSES = ["SENT", "PAID", "OVERDUE"] as const;
const INWARD_STATUSES = ["POSTED", "PARTIALLY_PAID", "PAID"] as const;

function emptyBlock(): Gstr3BTaxBlock {
  return { taxableValue: "0.00", cgst: "0.00", sgst: "0.00", igst: "0.00" };
}

function buildBlock(taxable: number, cgst: number, sgst: number, igst: number): Gstr3BTaxBlock {
  return {
    taxableValue: taxable.toFixed(2),
    cgst: cgst.toFixed(2),
    sgst: sgst.toFixed(2),
    igst: igst.toFixed(2),
  };
}

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { from, to } = parseQuery(req, gstr3BQuerySchema);
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const tag = orgScopedTag(CacheTag.gstr3B, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const outwardAgg = await db
          .select({
            taxable: sum(invoices.subtotal),
            cgst: sum(invoices.cgstAmount),
            sgst: sum(invoices.sgstAmount),
            igst: sum(invoices.igstAmount),
            discount: sum(invoices.discount),
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.orgId, session.orgId),
              inArray(invoices.status, OUTWARD_STATUSES),
              gte(invoices.createdAt, fromDate),
              lte(invoices.createdAt, toDate),
            ),
          );

        const outwardRow = outwardAgg[0] ?? { taxable: "0", cgst: "0", sgst: "0", igst: "0", discount: "0" };
        const outwardTaxable = Number(outwardRow.taxable ?? 0) - Number(outwardRow.discount ?? 0);
        const outwardCgst = Number(outwardRow.cgst ?? 0);
        const outwardSgst = Number(outwardRow.sgst ?? 0);
        const outwardIgst = Number(outwardRow.igst ?? 0);

        const outwardCount = await db
          .select({ id: invoices.id })
          .from(invoices)
          .where(
            and(
              eq(invoices.orgId, session.orgId),
              inArray(invoices.status, OUTWARD_STATUSES),
              gte(invoices.createdAt, fromDate),
              lte(invoices.createdAt, toDate),
            ),
          );

        const reverseChargeAgg = await db
          .select({
            taxable: sum(invoices.subtotal),
            cgst: sum(invoices.cgstAmount),
            sgst: sum(invoices.sgstAmount),
            igst: sum(invoices.igstAmount),
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.orgId, session.orgId),
              inArray(invoices.status, OUTWARD_STATUSES),
              eq(invoices.reverseCharge, true),
              gte(invoices.createdAt, fromDate),
              lte(invoices.createdAt, toDate),
            ),
          );
        const rcRow = reverseChargeAgg[0] ?? { taxable: "0", cgst: "0", sgst: "0", igst: "0" };
        const rcTaxable = Number(rcRow.taxable ?? 0);
        const rcCgst = Number(rcRow.cgst ?? 0);
        const rcSgst = Number(rcRow.sgst ?? 0);
        const rcIgst = Number(rcRow.igst ?? 0);

        const inwardAgg = await db
          .select({
            taxable: sum(purchaseBills.subtotal),
            cgst: sum(purchaseBills.cgstAmount),
            sgst: sum(purchaseBills.sgstAmount),
            igst: sum(purchaseBills.igstAmount),
            discount: sum(purchaseBills.discount),
          })
          .from(purchaseBills)
          .where(
            and(
              eq(purchaseBills.orgId, session.orgId),
              inArray(purchaseBills.status, INWARD_STATUSES),
              gte(purchaseBills.billDate, from),
              lte(purchaseBills.billDate, to),
            ),
          );
        const inwardRow = inwardAgg[0] ?? { taxable: "0", cgst: "0", sgst: "0", igst: "0", discount: "0" };
        const itcTaxable = Number(inwardRow.taxable ?? 0) - Number(inwardRow.discount ?? 0);
        const itcCgst = Number(inwardRow.cgst ?? 0);
        const itcSgst = Number(inwardRow.sgst ?? 0);
        const itcIgst = Number(inwardRow.igst ?? 0);

        const inwardCount = await db
          .select({ id: purchaseBills.id })
          .from(purchaseBills)
          .where(
            and(
              eq(purchaseBills.orgId, session.orgId),
              inArray(purchaseBills.status, INWARD_STATUSES),
              gte(purchaseBills.billDate, from),
              lte(purchaseBills.billDate, to),
            ),
          );

        const netCgst = Math.max(0, outwardCgst - itcCgst);
        const netSgst = Math.max(0, outwardSgst - itcSgst);
        const netIgst = Math.max(0, outwardIgst - itcIgst);
        const netTotal = netCgst + netSgst + netIgst;

        return {
          from,
          to,
          outward: {
            taxable: buildBlock(outwardTaxable, outwardCgst, outwardSgst, outwardIgst),
            zeroRated: emptyBlock(),
            nilExempted: emptyBlock(),
            reverseCharge: buildBlock(rcTaxable, rcCgst, rcSgst, rcIgst),
          },
          itc: {
            available: buildBlock(itcTaxable, itcCgst, itcSgst, itcIgst),
            reversed: emptyBlock(),
            net: buildBlock(itcTaxable, itcCgst, itcSgst, itcIgst),
          },
          netTaxPayable: {
            cgst: netCgst.toFixed(2),
            sgst: netSgst.toFixed(2),
            igst: netIgst.toFixed(2),
            total: netTotal.toFixed(2),
          },
          invoiceCount: outwardCount.length,
          billCount: inwardCount.length,
        };
      },
      [tag, `gstr3b:${from}:${to}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
