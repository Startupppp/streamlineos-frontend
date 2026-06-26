import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lte, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  ledgerAccounts,
  journalEntries,
  journalLines,
} from "@/lib/db/schema/accounting";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";
import type { AccountType } from "@/types/accounting";

interface ListAccountsParams {
  page: number;
  pageSize: number;
  q?: string;
  type?: AccountType;
  activeOnly?: boolean;
}

export async function listLedgerAccounts(orgId: string, params: ListAccountsParams) {
  const conds = [eq(ledgerAccounts.orgId, orgId)];
  if (params.type) conds.push(eq(ledgerAccounts.accountType, params.type));
  if (params.activeOnly) conds.push(eq(ledgerAccounts.isActive, true));
  if (params.q) {
    const escaped = params.q.replaceAll("%", "\\%").replaceAll("_", "\\_");
    conds.push(ilike(ledgerAccounts.name, `%${escaped}%`));
  }

  const { offset, limit } = paginateOffset({ page: params.page, pageSize: params.pageSize });
  const [items, totalRows] = await Promise.all([
    db.select().from(ledgerAccounts).where(and(...conds)).orderBy(asc(ledgerAccounts.code)).offset(offset).limit(limit),
    db.select({ c: count() }).from(ledgerAccounts).where(and(...conds)),
  ]);

  return buildListResponse(items, Number(totalRows[0]?.c ?? 0), {
    page: params.page,
    pageSize: params.pageSize,
  });
}

interface ListJournalParams {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  sourceType?: string;
}

export async function listJournalEntries(orgId: string, params: ListJournalParams) {
  const conds = [eq(journalEntries.orgId, orgId)];
  if (params.from) conds.push(gte(journalEntries.entryDate, params.from));
  if (params.to) conds.push(lte(journalEntries.entryDate, params.to));
  if (params.sourceType) conds.push(eq(journalEntries.sourceType, params.sourceType));

  const { offset, limit } = paginateOffset({ page: params.page, pageSize: params.pageSize });
  const [items, totalRows] = await Promise.all([
    db.select().from(journalEntries).where(and(...conds)).orderBy(desc(journalEntries.entryDate), asc(journalEntries.id)).offset(offset).limit(limit),
    db.select({ c: count() }).from(journalEntries).where(and(...conds)),
  ]);

  return buildListResponse(items, Number(totalRows[0]?.c ?? 0), {
    page: params.page,
    pageSize: params.pageSize,
  });
}

const NORMAL_DEBIT: ReadonlyArray<string> = ["ASSET", "EXPENSE"];

export async function getTrialBalanceSnapshot(orgId: string, asOf: string) {
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
        eq(ledgerAccounts.orgId, orgId),
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
}
