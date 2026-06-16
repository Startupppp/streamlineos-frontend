import type { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { clients, purchaseBills } from "@/lib/db/schema/crm";
import { withModuleAbility, parseQuery, ok } from "@/lib/api/helpers";
import { agedReceivablesQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import type { AgedPayablesRow } from "@/types/accounting";

const OUTSTANDING_STATUSES: ReadonlyArray<"POSTED" | "PARTIALLY_PAID" | "PAID"> = ["POSTED", "PARTIALLY_PAID", "PAID"];

type RawBill = {
  id: number;
  vendorId: number | null;
  vendorName: string | null;
  total: string;
  amountPaid: string;
  dueDate: string | null;
  billDate: string;
};

function bucketFor(daysOverdue: number): "current" | "d1_30" | "d31_60" | "d61_90" | "d91_plus" {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "d1_30";
  if (daysOverdue <= 60) return "d31_60";
  if (daysOverdue <= 90) return "d61_90";
  return "d91_plus";
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const parsed = parseQuery(req, agedReceivablesQuerySchema);
    const asOf = parsed.asOf ?? new Date().toISOString().slice(0, 10);
    const asOfDate = new Date(`${asOf}T23:59:59.999Z`);

    const tag = orgScopedTag(CacheTag.agedPayables, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const bills: RawBill[] = await db
          .select({
            id: purchaseBills.id,
            vendorId: purchaseBills.vendorId,
            vendorName: clients.name,
            total: purchaseBills.total,
            amountPaid: purchaseBills.amountPaid,
            dueDate: purchaseBills.dueDate,
            billDate: purchaseBills.billDate,
          })
          .from(purchaseBills)
          .leftJoin(clients, eq(clients.id, purchaseBills.vendorId))
          .where(
            and(
              eq(purchaseBills.orgId, session.orgId),
              inArray(purchaseBills.status, OUTSTANDING_STATUSES),
            ),
          );

        const byVendor = new Map<number, AgedPayablesRow>();
        for (const bill of bills) {
          if (bill.vendorId === null) continue;
          const total = Number(bill.total ?? 0);
          const paid = Number(bill.amountPaid ?? 0);
          const outstanding = total - paid;
          if (outstanding <= 0.005) continue;

          const referenceDate = bill.dueDate
            ? new Date(`${bill.dueDate}T23:59:59.999Z`)
            : new Date(`${bill.billDate}T23:59:59.999Z`);
          const daysOverdue = daysBetween(referenceDate, asOfDate);
          const bucket = bucketFor(daysOverdue);

          const existing = byVendor.get(bill.vendorId) ?? {
            vendorId: bill.vendorId,
            vendorName: bill.vendorName ?? `Vendor #${bill.vendorId}`,
            current: "0",
            d1_30: "0",
            d31_60: "0",
            d61_90: "0",
            d91_plus: "0",
            total: "0",
          };

          const current = Number(existing[bucket]);
          const updated: AgedPayablesRow = { ...existing };
          updated[bucket] = (current + outstanding).toFixed(2);
          updated.total = (Number(existing.total) + outstanding).toFixed(2);
          byVendor.set(bill.vendorId, updated);
        }

        const rows = Array.from(byVendor.values()).sort((a, b) => Number(b.total) - Number(a.total));

        const totals = rows.reduce(
          (acc, row) => {
            acc.current += Number(row.current);
            acc.d1_30 += Number(row.d1_30);
            acc.d31_60 += Number(row.d31_60);
            acc.d61_90 += Number(row.d61_90);
            acc.d91_plus += Number(row.d91_plus);
            acc.total += Number(row.total);
            return acc;
          },
          { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_plus: 0, total: 0 },
        );

        return {
          asOf,
          rows,
          totals: {
            current: totals.current.toFixed(2),
            d1_30: totals.d1_30.toFixed(2),
            d31_60: totals.d31_60.toFixed(2),
            d61_90: totals.d61_90.toFixed(2),
            d91_plus: totals.d91_plus.toFixed(2),
            total: totals.total.toFixed(2),
          },
        };
      },
      [tag, `ap-aging:${asOf}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
