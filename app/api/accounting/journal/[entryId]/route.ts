import { and, asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withRoles, ok, err } from "@/lib/api/helpers";

type Params = { params: Promise<{ entryId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { entryId } = await params;
  const id = Number(entryId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid entry id", 400);

  return withRoles(["OWNER", "CEO", "HR"], async (session) => {
    const headerRows = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.orgId, session.orgId)))
      .limit(1);
    const header = headerRows[0];
    if (!header) return err("Journal entry not found", 404);

    const lines = await db
      .select({
        id: journalLines.id,
        entryId: journalLines.entryId,
        accountId: journalLines.accountId,
        debit: journalLines.debit,
        credit: journalLines.credit,
        description: journalLines.description,
        lineOrder: journalLines.lineOrder,
        accountCode: ledgerAccounts.code,
        accountName: ledgerAccounts.name,
      })
      .from(journalLines)
      .innerJoin(ledgerAccounts, eq(journalLines.accountId, ledgerAccounts.id))
      .where(eq(journalLines.entryId, id))
      .orderBy(asc(journalLines.lineOrder));

    return ok({ ...header, lines });
  });
}
