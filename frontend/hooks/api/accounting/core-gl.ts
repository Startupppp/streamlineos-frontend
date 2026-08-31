"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { coreKeys, toQuery } from "./core-keys";

export interface GlRow {
  entryId?: number;
  entryNumber: string;
  date: string;
  description: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface GlResponse {
  openingBalance: string;
  closingBalance: string;
  rows: GlRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GlAccount {
  id: number;
  code: string;
  name: string;
  accountType: string;
  totalDebit: string;
  totalCredit: string;
}

export interface GlParams {
  accountId?: number;
  from: string;
  to: string;
  clientId?: number;
  vendorId?: number;
  projectId?: number;
  departmentId?: string;
  page?: number;
  pageSize?: number;
}

export interface GlAccountsParams {
  from: string;
  to: string;
  type?: string;
}

export function useGeneralLedger(params: GlParams) {
  const can = useCan("accounting:general-ledger:read");
  return useQuery<GlResponse, Error>({
    queryKey: coreKeys.gl(params),
    queryFn: () =>
      apiClient.get<GlResponse>("/accounting/general-ledger", toQuery(params)),
    staleTime: 30_000,
    enabled: can && !!params.from && !!params.to,
  });
}

export function useGlAccounts(params: GlAccountsParams) {
  const can = useCan("accounting:general-ledger:read");
  return useQuery<{ items: GlAccount[] }, Error>({
    queryKey: coreKeys.glAccounts(params),
    queryFn: () =>
      apiClient.get<{ items: GlAccount[] }>("/accounting/general-ledger/accounts", toQuery(params)),
    staleTime: 60_000,
    enabled: can && !!params.from && !!params.to,
  });
}
