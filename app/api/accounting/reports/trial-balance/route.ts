import type { NextRequest } from "next/server";
import { and, eq, lte, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withRoles, parseQuery, ok } from "@/lib/api/helpers";
import { trialBalanceQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";

const NORMAL_DEBIT: ReadonlyArray<string> = ["ASSET", "EXPENSE"];

export async function GET(req: NextRequest) {
  return withRoles(["OWNER", "CEO", "HR"], async (session) => {
    const { asOf } = parseQuery(req, trialBalanceQuerySchema);

    const tag = orgScopedTag(CacheTag.trialBalance, session.orgId);
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
          .leftJoin(journalLines, eq(journalLines.accountId, ledgerAccounts.id))
          .leftJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
          .where(
            and(
              eq(ledgerAccounts.orgId, session.orgId),
              lte(journalEntries.entryDate, asOf),
              eq(journalEntries.status, "POSTED"),
            ),
          )
          .groupBy(ledgerAccounts.id, ledgerAccounts.code, ledgerAccounts.name, ledgerAccounts.accountType);

        const tb = rows.map((r) => {
          const debit = Number(r.debit ?? 0);
          const credit = Number(r.credit ?? 0);
          const normalDebit = NORMAL_DEBIT.includes(r.accountType);
          const balance = normalDebit ? debit - credit : credit - debit;
          return {
            accountId: r.accountId,
            code: r.code,
            name: r.name,
            accountType: r.accountType,
            debit: debit.toFixed(2),
            credit: credit.toFixed(2),
            balance: balance.toFixed(2),
          };
        });

        const totalDebit = tb.reduce((acc, r) => acc + Number(r.debit), 0);
        const totalCredit = tb.reduce((acc, r) => acc + Number(r.credit), 0);

        return {
          asOf,
          rows: tb.sort((a, b) => a.code.localeCompare(b.code)),
          totalDebit: totalDebit.toFixed(2),
          totalCredit: totalCredit.toFixed(2),
          balanced: Math.abs(totalDebit - totalCredit) < 0.01,
        };
      },
      [tag, `tb:${asOf}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
