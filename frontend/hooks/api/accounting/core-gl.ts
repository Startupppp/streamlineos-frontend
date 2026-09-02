"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { coreKeys, toQuery } from "./core-keys";
import {
  glAccountsContract,
  glResponseContract,
  type GlAccount,
  type GlResponse,
} from "./core-gl-schema";

export type { GlAccount, GlResponse, GlRow } from "./core-gl-schema";

export interface GlParams {
  accountId?: number;
  from: string;
  to: string;
  clientId?: number;
  vendorId?: number;
  projectId?: number;
  departmentId?: string;
  cursor?: string;
  limit?: number;
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
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/general-ledger",
        toQuery(params),
        signal,
        glResponseContract,
      ),
    staleTime: 30_000,
    enabled: can && !!params.from && !!params.to,
  });
}

/** The route returns a bare array; the client declared `{ items }` and read `undefined`. */
export function useGlAccounts(params: GlAccountsParams) {
  const can = useCan("accounting:general-ledger:read");
  return useQuery<GlAccount[], Error>({
    queryKey: coreKeys.glAccounts(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/general-ledger/accounts",
        toQuery(params),
        signal,
        glAccountsContract,
      ),
    staleTime: 60_000,
    enabled: can && !!params.from && !!params.to,
  });
}
