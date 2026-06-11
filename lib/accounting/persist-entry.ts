import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { nextEntryNumber } from "./numbering";

export type DraftLine = {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string | null;
};

export type DraftEntry = {
  orgId: string;
  entryDate: string;
  description?: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceEvent: string | null;
  createdBy: string;
  lines: DraftLine[];
};

function assertBalanced(lines: DraftLine[]): void {
  const debit = lines.reduce((acc, l) => acc + l.debit, 0);
  const credit = lines.reduce((acc, l) => acc + l.credit, 0);
  const diff = Math.abs(Math.round((debit - credit) * 100) / 100);
  if (diff > 0.009) {
    throw new Error(`Unbalanced journal entry: debit=${debit} credit=${credit} diff=${diff}`);
  }
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error(`Negative amount in journal line: ${JSON.stringify(line)}`);
    }
    if ((line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
      throw new Error(`Journal line must have exactly one of debit or credit > 0: ${JSON.stringify(line)}`);
    }
  }
}

export type PersistedEntry = {
  id: number;
  entryNumber: string;
};

export async function persistJournalEntry(draft: DraftEntry): Promise<PersistedEntry> {
  assertBalanced(draft.lines);

  if (draft.sourceId !== null && draft.sourceEvent !== null) {
    const existing = await db
      .select({ id: journalEntries.id, entryNumber: journalEntries.entryNumber })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.orgId, draft.orgId),
          eq(journalEntries.sourceType, draft.sourceType),
          eq(journalEntries.sourceId, draft.sourceId),
          eq(journalEntries.sourceEvent, draft.sourceEvent),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
  }

  const year = new Date(draft.entryDate).getUTCFullYear();
  const codeToId = new Map<string, number>();
  const distinctCodes = Array.from(new Set(draft.lines.map((l) => l.accountCode)));
  const rows = await db
    .select({ id: ledgerAccounts.id, code: ledgerAccounts.code })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.orgId, draft.orgId));
  for (const row of rows) codeToId.set(row.code, row.id);

  for (const code of distinctCodes) {
    if (!codeToId.has(code)) {
      throw new Error(`Account code ${code} not found for org ${draft.orgId}. Seed COA first.`);
    }
  }

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const entryNumber = await nextEntryNumber(draft.orgId, year);
    try {
      const inserted = await db
        .insert(journalEntries)
        .values({
          orgId: draft.orgId,
          entryNumber,
          entryDate: draft.entryDate,
          description: draft.description ?? null,
          sourceType: draft.sourceType,
          sourceId: draft.sourceId,
          sourceEvent: draft.sourceEvent,
          createdBy: draft.createdBy,
        })
        .returning({ id: journalEntries.id, entryNumber: journalEntries.entryNumber });

      const entry = inserted[0];
      if (!entry) throw new Error("Insert journal entry returned no rows");

      const lineRows = draft.lines.map((line, idx) => {
        const accountId = codeToId.get(line.accountCode);
        if (accountId === undefined) {
          throw new Error(`Account code ${line.accountCode} missing from map`);
        }
        return {
          entryId: entry.id,
          accountId,
          debit: line.debit.toFixed(4),
          credit: line.credit.toFixed(4),
          description: line.description ?? null,
          lineOrder: idx,
        };
      });
      await db.insert(journalLines).values(lineRows);

      return entry;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isUniqueViolation = message.includes("uniq_je_org_number") || message.includes("23505");
      if (!isUniqueViolation || attempt === maxAttempts - 1) throw err;
    }
  }
  throw new Error(`Failed to allocate journal entry number after ${maxAttempts} attempts`);
}
