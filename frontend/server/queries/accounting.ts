import "server-only";

import { serverApiClient } from "@/lib/api/server-client";
import type { ListResponse } from "@/lib/api/list-response";
import type { Account, AccountType, JournalEntry, TrialBalanceRow } from "@/types/accounting";

interface ListAccountsParams {
  page: number;
  pageSize: number;
  q?: string;
  type?: AccountType;
  activeOnly?: boolean;
}

export async function listLedgerAccounts(
  orgId: string,
  params: ListAccountsParams,
): Promise<ListResponse<Account>> {
  return serverApiClient.get<ListResponse<Account>>("/accounting/accounts", {
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    type: params.type,
    activeOnly: params.activeOnly,
  });
}

interface ListJournalParams {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  sourceType?: string;
}

export async function listJournalEntries(
  orgId: string,
  params: ListJournalParams,
): Promise<ListResponse<JournalEntry>> {
  return serverApiClient.get<ListResponse<JournalEntry>>("/accounting/journal", {
    page: params.page,
    pageSize: params.pageSize,
    from: params.from,
    to: params.to,
    sourceType: params.sourceType,
  });
}

interface TrialBalanceSnapshot {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}

export async function getTrialBalanceSnapshot(
  orgId: string,
  asOf: string,
): Promise<TrialBalanceSnapshot> {
  return serverApiClient.get<TrialBalanceSnapshot>("/accounting/reports/trial-balance", { asOf });
}
