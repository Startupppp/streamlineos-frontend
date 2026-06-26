import type { NextRequest } from "next/server";
import { and, asc, eq, lte, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withModuleAbility, parseQuery, ok } from "@/lib/api/helpers";
import { balanceSheetQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import type { AccountType, BalanceSheetRow } from "@/types/accounting";

type AccountRow = {
  accountId: number;
  code: string;
  name: string;
  accountType: AccountType;
  debit: string | null;
  credit: string | null;
};

function rowsForType(rows: AccountRow[], type: AccountType, normalDebit: boolean): BalanceSheetRow[] {
  return rows
    .filter((row) => row.accountType === type)
    .map((row) => {
      const debit = Number(row.debit ?? 0);
      const credit = Number(row.credit ?? 0);
      const balance = normalDebit ? debit - credit : credit - debit;
      return {
        accountId: row.accountId,
        code: row.code,
        name: row.name,
        accountType: type,
        balance: balance.toFixed(2),
      };
    })
    .filter((row) => Math.abs(Number(row.balance)) >= 0.005)
    .sort((a, b) => a.code.localeCompare(b.code));
}

function sumRows(rows: BalanceSheetRow[]): number {
  return rows.reduce((acc, row) => acc + Number(row.balance), 0);
}

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { asOf } = parseQuery(req, balanceSheetQuerySchema);

    const tag = orgScopedTag(CacheTag.balanceSheet, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const rows: AccountRow[] = await db
          .select({
            accountId: ledgerAccounts.id,
            code: ledgerAccounts.code,
            name: ledgerAccounts.name,
            accountType: ledgerAccounts.accountType,
            debit: sum(journalLines.debit),
            credit: sum(journalLines.credit),
          })
          .from(ledgerAccounts)
          .leftJoin(journalLines, eq(journalLines.accountId, ledgerAccounts.id))
          .leftJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
          .where(
            and(
              eq(ledgerAccounts.orgId, session.orgId),
              lte(journalEntries.entryDate, asOf),
              eq(journalEntries.status, "POSTED"),
            ),
          )
          .groupBy(ledgerAccounts.id, ledgerAccounts.code, ledgerAccounts.name, ledgerAccounts.accountType)
          .orderBy(asc(ledgerAccounts.code));

        const assets = rowsForType(rows, "ASSET", true);
        const liabilities = rowsForType(rows, "LIABILITY", false);
        const equity = rowsForType(rows, "EQUITY", false);

        const incomeRows = rowsForType(rows, "INCOME", false);
        const expenseRows = rowsForType(rows, "EXPENSE", true);
        const retainedEarnings = sumRows(incomeRows) - sumRows(expenseRows);

        const totalAssets = sumRows(assets);
        const totalLiabilities = sumRows(liabilities);
        const totalEquity = sumRows(equity) + retainedEarnings;

        return {
          asOf,
          assets,
          liabilities,
          equity,
          retainedEarnings: retainedEarnings.toFixed(2),
          totalAssets: totalAssets.toFixed(2),
          totalLiabilities: totalLiabilities.toFixed(2),
          totalEquity: totalEquity.toFixed(2),
          balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        };
      },
      [tag, `bs:${asOf}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
