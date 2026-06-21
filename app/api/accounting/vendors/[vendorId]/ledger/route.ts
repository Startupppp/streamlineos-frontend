import type { NextRequest } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { clients, purchaseBills } from "@/lib/db/schema/crm";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withModuleAbility, parseQuery, ok, err } from "@/lib/api/helpers";
import { listCustomerLedgerQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, entityScopedTag, orgScopedTag } from "@/lib/api/cache-tags";
import type { VendorLedgerLine } from "@/types/accounting";

const AP_ACCOUNT_CODE = "2000";

type RouteContext = { params: Promise<{ vendorId: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { vendorId } = await params;
  const id = Number(vendorId);

  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    if (!Number.isInteger(id) || id <= 0) return err("Invalid vendor id", 400);

    const tag = entityScopedTag(CacheTag.vendorLedger, `${session.orgId}:${id}`);
    const orgTag = orgScopedTag(CacheTag.vendorLedger, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const vendorRows = await db
          .select()
          .from(clients)
          .where(and(eq(clients.id, id), eq(clients.orgId, session.orgId)))
          .limit(1);
        const vendor = vendorRows[0];
        if (!vendor) return null;

        const apAccount = await db
          .select({ id: ledgerAccounts.id })
          .from(ledgerAccounts)
          .where(and(eq(ledgerAccounts.orgId, session.orgId), eq(ledgerAccounts.code, AP_ACCOUNT_CODE)))
          .limit(1);
        const apAccountId = apAccount[0]?.id;

        const billRows = await db
          .select({
            id: purchaseBills.id,
            billNumber: purchaseBills.billNumber,
            total: purchaseBills.total,
            amountPaid: purchaseBills.amountPaid,
          })
          .from(purchaseBills)
          .where(
            and(
              eq(purchaseBills.orgId, session.orgId),
              eq(purchaseBills.vendorId, id),
              inArray(purchaseBills.status, ["POSTED", "PARTIALLY_PAID", "PAID"]),
            ),
          );

        const billIds = billRows.map((b) => String(b.id));
        const billNumberById = new Map<string, string>(billRows.map((b) => [String(b.id), b.billNumber]));
        const totalBilled = billRows.reduce((acc, b) => acc + Number(b.total ?? 0), 0);
        const totalPaid = billRows.reduce((acc, b) => acc + Number(b.amountPaid ?? 0), 0);

        const lines: VendorLedgerLine[] = [];
        if (apAccountId && billIds.length > 0) {
          const journalRows = await db
            .select({
              date: journalEntries.entryDate,
              entryId: journalEntries.id,
              entryNumber: journalEntries.entryNumber,
              sourceType: journalEntries.sourceType,
              sourceEvent: journalEntries.sourceEvent,
              sourceId: journalEntries.sourceId,
              description: journalEntries.description,
              debit: journalLines.debit,
              credit: journalLines.credit,
              lineOrder: journalLines.lineOrder,
            })
            .from(journalLines)
            .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
            .where(
              and(
                eq(journalEntries.orgId, session.orgId),
                eq(journalLines.accountId, apAccountId),
                eq(journalEntries.status, "POSTED"),
                sql`${journalEntries.sourceType} = 'purchase_bill'`,
                inArray(journalEntries.sourceId, billIds),
              ),
            )
            .orderBy(asc(journalEntries.entryDate), asc(journalEntries.id), asc(journalLines.lineOrder));

          let running = 0;
          for (const row of journalRows) {
            const debit = Number(row.debit ?? 0);
            const credit = Number(row.credit ?? 0);
            running += credit - debit;
            const billNumber = row.sourceId ? billNumberById.get(row.sourceId) ?? null : null;
            const billIdNum = row.sourceId ? Number(row.sourceId) : null;
            lines.push({
              date: row.date,
              entryId: row.entryId,
              entryNumber: row.entryNumber,
              sourceType: row.sourceType,
              sourceEvent: row.sourceEvent,
              description: row.description,
              billId: Number.isFinite(billIdNum) ? billIdNum : null,
              billNumber,
              debit: debit.toFixed(2),
              credit: credit.toFixed(2),
              runningBalance: running.toFixed(2),
            });
          }
        }

        return {
          summary: {
            vendorId: vendor.id,
            vendorName: vendor.name,
            state: vendor.state,
            gstin: vendor.gstin,
            totalBilled: totalBilled.toFixed(2),
            totalPaid: totalPaid.toFixed(2),
            outstanding: (totalBilled - totalPaid).toFixed(2),
          },
          lines,
        };
      },
      [tag, orgTag, `vendor-ledger:${id}`],
      { tags: [tag, orgTag], revalidate: 60 },
    );

    const result = await fetcher();
    if (!result) return err("Vendor not found", 404);
    return ok(result);
  });
}
