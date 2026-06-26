import type { NextRequest } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { clients, invoices, payments } from "@/lib/db/schema/crm";
import { withModuleAbility, parseQuery, ok } from "@/lib/api/helpers";
import { agedReceivablesQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import type { AgedReceivablesRow } from "@/types/accounting";

const OUTSTANDING_STATUSES: ReadonlyArray<"SENT" | "OVERDUE" | "PAID"> = ["SENT", "OVERDUE", "PAID"];

type RawInvoice = {
  id: number;
  clientId: number | null;
  clientName: string | null;
  total: string;
  dueDate: string | null;
  createdAt: Date | null;
  paid: string | null;
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

    const tag = orgScopedTag(CacheTag.agedReceivables, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const orgInvoices: RawInvoice[] = await db
          .select({
            id: invoices.id,
            clientId: invoices.clientId,
            clientName: clients.name,
            total: invoices.total,
            dueDate: invoices.dueDate,
            createdAt: invoices.createdAt,
            paid: sql<string>`COALESCE((SELECT SUM(${payments.amount}::numeric)::text FROM ${payments} WHERE ${payments.invoiceId} = ${invoices.id} AND ${payments.paymentDate} <= ${asOf}), '0')`,
          })
          .from(invoices)
          .leftJoin(clients, eq(clients.id, invoices.clientId))
          .where(
            and(
              eq(invoices.orgId, session.orgId),
              inArray(invoices.status, OUTSTANDING_STATUSES as unknown as ReadonlyArray<"SENT" | "PAID" | "OVERDUE" | "DRAFT" | "CANCELLED">),
            ),
          );

        const byClient = new Map<number, AgedReceivablesRow>();
        for (const inv of orgInvoices) {
          if (inv.clientId === null) continue;
          const total = Number(inv.total ?? 0);
          const paid = Number(inv.paid ?? 0);
          const outstanding = total - paid;
          if (outstanding <= 0.005) continue;

          const referenceDate = inv.dueDate
            ? new Date(`${inv.dueDate}T23:59:59.999Z`)
            : inv.createdAt ?? asOfDate;
          const daysOverdue = daysBetween(referenceDate, asOfDate);
          const bucket = bucketFor(daysOverdue);

          const existing = byClient.get(inv.clientId) ?? {
            clientId: inv.clientId,
            clientName: inv.clientName ?? `Client #${inv.clientId}`,
            current: "0",
            d1_30: "0",
            d31_60: "0",
            d61_90: "0",
            d91_plus: "0",
            total: "0",
          };

          const current = Number(existing[bucket]);
          const updated: AgedReceivablesRow = { ...existing };
          updated[bucket] = (current + outstanding).toFixed(2);
          updated.total = (Number(existing.total) + outstanding).toFixed(2);
          byClient.set(inv.clientId, updated);
        }

        const rows = Array.from(byClient.values()).sort((a, b) => Number(b.total) - Number(a.total));

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
      [tag, `ar-aging:${asOf}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
