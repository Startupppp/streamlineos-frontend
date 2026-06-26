import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { journalEntries, journalLines, ledgerAccounts } from "@/lib/db/schema/accounting";
import { withModuleAbility, ok, err } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { persistJournalEntry, type DraftLine } from "@/lib/accounting/persist-entry";

type Params = { params: Promise<{ entryId: string }> };

interface ReverseResponse {
  id: number;
  entryNumber: string;
  created: boolean;
}

function todayIsoDate(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDecimal(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { entryId } = await params;
  const id = Number(entryId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid entry id", 400);

  return withModuleAbility("accounting", "manage", "accounting:journal", async (session) => {
    const headerRows = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.orgId, session.orgId)))
      .limit(1);
    const original = headerRows[0];
    if (!original) return err("Journal entry not found", 404);
    if (original.status !== "POSTED") return err("Only posted entries can be reversed", 409);
    if (original.sourceEvent === "reverse") return err("Cannot reverse a reversing entry", 409);

    const lineRows = await db
      .select({
        debit: journalLines.debit,
        credit: journalLines.credit,
        description: journalLines.description,
        lineOrder: journalLines.lineOrder,
        accountCode: ledgerAccounts.code,
      })
      .from(journalLines)
      .innerJoin(ledgerAccounts, eq(journalLines.accountId, ledgerAccounts.id))
      .where(eq(journalLines.entryId, original.id))
      .orderBy(asc(journalLines.lineOrder));
    if (lineRows.length === 0) return err("Original entry has no lines", 409);

    const reversingLines: DraftLine[] = lineRows.map((line) => ({
      accountCode: line.accountCode,
      debit: parseDecimal(line.credit),
      credit: parseDecimal(line.debit),
      description: `Reverses ${original.entryNumber}: ${line.description ?? ""}`,
    }));

    const sourceIdMatch = original.sourceId === null
      ? isNull(journalEntries.sourceId)
      : eq(journalEntries.sourceId, original.sourceId);
    const existing = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.orgId, session.orgId),
          eq(journalEntries.sourceType, original.sourceType),
          sourceIdMatch,
          eq(journalEntries.sourceEvent, "reverse"),
        ),
      )
      .limit(1);
    const wasExisting = existing.length > 0;

    const persisted = await persistJournalEntry({
      orgId: session.orgId,
      entryDate: todayIsoDate(),
      description: `Reversing entry for ${original.entryNumber}`,
      sourceType: original.sourceType,
      sourceId: original.sourceId,
      sourceEvent: "reverse",
      createdBy: session.user.id,
      lines: reversingLines,
    });

    revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
    if (original.sourceType === "invoice" || original.sourceType === "payment") {
      revalidateTag(orgScopedTag(CacheTag.customerLedger, session.orgId), "default");
    }

    const response: ReverseResponse = {
      id: persisted.id,
      entryNumber: persisted.entryNumber,
      created: !wasExisting,
    };
    return ok(response, wasExisting ? 200 : 201);
  });
}
