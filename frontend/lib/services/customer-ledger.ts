import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, invoices, payments } from "@/lib/db/schema/crm";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { ACCOUNT_CODES } from "@/lib/accounting/posting-rules";
import type {
  CustomerLedger,
  CustomerLedgerLine,
  CustomerLedgerSummary,
} from "@/types/accounting";

interface LedgerRow {
  date: string;
  entryId: number;
  entryNumber: string;
  sourceType: string;
  sourceId: string | null;
  sourceEvent: string | null;
  entryDescription: string | null;
  lineDescription: string | null;
  debit: string;
  credit: string;
}

async function loadArAccountId(orgId: string): Promise<number | null> {
  const rows = await db
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.orgId, orgId),
        eq(ledgerAccounts.code, ACCOUNT_CODES.accountsReceivable),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

async function loadClientSummary(
  orgId: string,
  clientId: number,
): Promise<{
  id: number;
  name: string;
  state: string | null;
  gstin: string | null;
} | null> {
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      state: clients.state,
      gstin: clients.gstin,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

async function loadInvoiceIds(orgId: string, clientId: number): Promise<number[]> {
  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.clientId, clientId)));
  return rows.map((r) => r.id);
}

async function loadPaymentIds(orgId: string, invoiceIds: number[]): Promise<number[]> {
  if (invoiceIds.length === 0) return [];
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.orgId, orgId), inArray(payments.invoiceId, invoiceIds)));
  return rows.map((r) => r.id);
}

async function loadInvoiceTotals(
  orgId: string,
  clientId: number,
): Promise<{ totalInvoiced: number; totalPaid: number }> {
  const invoiceRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), 0)` })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.clientId, clientId)));

  const paymentRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(and(eq(payments.orgId, orgId), eq(invoices.clientId, clientId)));

  return {
    totalInvoiced: Number(invoiceRows[0]?.total ?? 0),
    totalPaid: Number(paymentRows[0]?.total ?? 0),
  };
}

function buildSourceConds(invoiceIds: number[], paymentIds: number[]) {
  const orParts = [];
  if (invoiceIds.length > 0) {
    orParts.push(
      and(
        eq(journalEntries.sourceType, "invoice"),
        inArray(
          journalEntries.sourceId,
          invoiceIds.map((id) => String(id)),
        ),
      ),
    );
  }
  if (paymentIds.length > 0) {
    orParts.push(
      and(
        eq(journalEntries.sourceType, "payment"),
        inArray(
          journalEntries.sourceId,
          paymentIds.map((id) => String(id)),
        ),
      ),
    );
  }
  return orParts;
}

async function loadLedgerRows(params: {
  orgId: string;
  arAccountId: number;
  invoiceIds: number[];
  paymentIds: number[];
  from?: string;
  to?: string;
}): Promise<LedgerRow[]> {
  const { orgId, arAccountId, invoiceIds, paymentIds, from, to } = params;
  const sourceConds = buildSourceConds(invoiceIds, paymentIds);
  if (sourceConds.length === 0) return [];

  const conds = [
    eq(journalEntries.orgId, orgId),
    eq(journalEntries.status, "POSTED"),
    eq(journalLines.accountId, arAccountId),
  ];
  if (from) conds.push(gte(journalEntries.entryDate, from));
  if (to) conds.push(lte(journalEntries.entryDate, to));

  const orCond = sourceConds.length === 1 ? sourceConds[0] : or(...sourceConds);

  const rows = await db
    .select({
      date: journalEntries.entryDate,
      entryId: journalEntries.id,
      entryNumber: journalEntries.entryNumber,
      sourceType: journalEntries.sourceType,
      sourceId: journalEntries.sourceId,
      sourceEvent: journalEntries.sourceEvent,
      entryDescription: journalEntries.description,
      lineDescription: journalLines.description,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .where(and(...conds, orCond))
    .orderBy(asc(journalEntries.entryDate), asc(journalEntries.id), asc(journalLines.lineOrder));

  return rows;
}

function buildInvoiceLookup(
  invoiceRows: ReadonlyArray<{ id: number; invoiceNumber: string }>,
  paymentRows: ReadonlyArray<{ id: number; invoiceId: number }>,
): { invoiceById: Map<number, string>; paymentToInvoice: Map<number, number> } {
  const invoiceById = new Map<number, string>();
  for (const row of invoiceRows) invoiceById.set(row.id, row.invoiceNumber);
  const paymentToInvoice = new Map<number, number>();
  for (const row of paymentRows) paymentToInvoice.set(row.id, row.invoiceId);
  return { invoiceById, paymentToInvoice };
}

function resolveInvoiceFromSource(
  sourceType: string,
  sourceId: string | null,
  invoiceById: Map<number, string>,
  paymentToInvoice: Map<number, number>,
): { invoiceId: number | null; invoiceNumber: string | null } {
  if (!sourceId) return { invoiceId: null, invoiceNumber: null };
  const numeric = Number(sourceId);
  if (!Number.isInteger(numeric) || numeric <= 0) return { invoiceId: null, invoiceNumber: null };
  if (sourceType === "invoice") {
    const number = invoiceById.get(numeric) ?? null;
    return { invoiceId: numeric, invoiceNumber: number };
  }
  if (sourceType === "payment") {
    const invoiceId = paymentToInvoice.get(numeric);
    if (invoiceId === undefined) return { invoiceId: null, invoiceNumber: null };
    return { invoiceId, invoiceNumber: invoiceById.get(invoiceId) ?? null };
  }
  return { invoiceId: null, invoiceNumber: null };
}

function buildLines(
  rows: ReadonlyArray<LedgerRow>,
  invoiceById: Map<number, string>,
  paymentToInvoice: Map<number, number>,
): CustomerLedgerLine[] {
  let running = 0;
  const lines: CustomerLedgerLine[] = [];
  for (const row of rows) {
    const debit = Number(row.debit ?? 0);
    const credit = Number(row.credit ?? 0);
    running += debit - credit;
    const { invoiceId, invoiceNumber } = resolveInvoiceFromSource(
      row.sourceType,
      row.sourceId,
      invoiceById,
      paymentToInvoice,
    );
    lines.push({
      date: row.date,
      entryId: row.entryId,
      entryNumber: row.entryNumber,
      sourceType: row.sourceType,
      sourceEvent: row.sourceEvent,
      description: row.lineDescription ?? row.entryDescription,
      invoiceId,
      invoiceNumber,
      debit: debit.toFixed(2),
      credit: credit.toFixed(2),
      runningBalance: running.toFixed(2),
    });
  }
  return lines;
}

export interface BuildCustomerLedgerOptions {
  from?: string;
  to?: string;
}

export async function buildCustomerLedger(
  orgId: string,
  clientId: number,
  opts: BuildCustomerLedgerOptions = {},
): Promise<CustomerLedger | null> {
  const client = await loadClientSummary(orgId, clientId);
  if (!client) return null;

  const arAccountId = await loadArAccountId(orgId);
  const invoiceIds = await loadInvoiceIds(orgId, clientId);
  const paymentIds = await loadPaymentIds(orgId, invoiceIds);
  const totals = await loadInvoiceTotals(orgId, clientId);

  let lines: CustomerLedgerLine[] = [];
  if (arAccountId !== null) {
    const ledgerRows = await loadLedgerRows({
      orgId,
      arAccountId,
      invoiceIds,
      paymentIds,
      from: opts.from,
      to: opts.to,
    });
    const invoiceRows = invoiceIds.length
      ? await db
          .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
          .from(invoices)
          .where(inArray(invoices.id, invoiceIds))
      : [];
    const paymentRows = paymentIds.length
      ? await db
          .select({ id: payments.id, invoiceId: payments.invoiceId })
          .from(payments)
          .where(inArray(payments.id, paymentIds))
      : [];
    const { invoiceById, paymentToInvoice } = buildInvoiceLookup(invoiceRows, paymentRows);
    lines = buildLines(ledgerRows, invoiceById, paymentToInvoice);
  }

  const summary: CustomerLedgerSummary = {
    clientId: client.id,
    clientName: client.name,
    state: client.state,
    gstin: client.gstin,
    totalInvoiced: totals.totalInvoiced.toFixed(2),
    totalPaid: totals.totalPaid.toFixed(2),
    outstanding: (totals.totalInvoiced - totals.totalPaid).toFixed(2),
  };

  return { summary, lines };
}
