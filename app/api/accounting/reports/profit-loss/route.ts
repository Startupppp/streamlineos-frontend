import type { NextRequest } from "next/server";
import { and, eq, gte, inArray, lte, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withModuleAbility, parseQuery, ok, err } from "@/lib/api/helpers";
import { profitLossQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { from, to } = parseQuery(req, profitLossQuerySchema);
    if (!from || !to) return err("from and to are required", 400);

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const tag = orgScopedTag(CacheTag.profitLoss, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const rows = await db
          .select({
            accountId: ledgerAccounts.id,
            code: ledgerAccounts.code,
            name: ledgerAccounts.name,
            accountType: ledgerAccounts.accountType,
            debit: sum(journalLines.debit),
            credit: sum(journalLines.credit),
          })
          .from(ledgerAccounts)
          .innerJoin(journalLines, eq(journalLines.accountId, ledgerAccounts.id))
          .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
          .where(
            and(
              eq(ledgerAccounts.orgId, session.orgId),
              inArray(ledgerAccounts.accountType, ["INCOME", "EXPENSE"]),
              gte(journalEntries.entryDate, fromStr),
              lte(journalEntries.entryDate, toStr),
              eq(journalEntries.status, "POSTED"),
            ),
          )
          .groupBy(ledgerAccounts.id, ledgerAccounts.code, ledgerAccounts.name, ledgerAccounts.accountType);

        const income = rows
          .filter((r) => r.accountType === "INCOME")
          .map((r) => ({
            accountId: r.accountId,
            code: r.code,
            name: r.name,
            accountType: "INCOME" as const,
            amount: (Number(r.credit ?? 0) - Number(r.debit ?? 0)).toFixed(2),
          }))
          .sort((a, b) => a.code.localeCompare(b.code));
        const expense = rows
          .filter((r) => r.accountType === "EXPENSE")
          .map((r) => ({
            accountId: r.accountId,
            code: r.code,
            name: r.name,
            accountType: "EXPENSE" as const,
            amount: (Number(r.debit ?? 0) - Number(r.credit ?? 0)).toFixed(2),
          }))
          .sort((a, b) => a.code.localeCompare(b.code));

        const totalIncome = income.reduce((acc, r) => acc + Number(r.amount), 0);
        const totalExpense = expense.reduce((acc, r) => acc + Number(r.amount), 0);
        const netIncome = (totalIncome - totalExpense).toFixed(2);

        return {
          from: fromStr,
          to: toStr,
          income,
          expense,
          totalIncome: totalIncome.toFixed(2),
          totalExpense: totalExpense.toFixed(2),
          netIncome,
        };
      },
      [tag, `pnl:${fromStr}:${toStr}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
