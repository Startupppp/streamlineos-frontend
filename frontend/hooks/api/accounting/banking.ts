"use client";

import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingBankingQueryKeys } from "@/lib/query-keys/accounting-banking";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  BankAccountBalance,
  BankAccountPage,
  BankAccountSummary,
  CreateBankAccountInput,
  ImportStatementInput,
  ListBankAccountsParams,
  MatchKind,
  MatchSuggestionsResponse,
  ReconciliationProof,
  RecordedMatch,
  SaveCsvMappingInput,
  StatementDetail,
  StatementImportResult,
  StatementMappingPreset,
  StatementPage,
  UnreconciledParams,
  UnreconciledView,
  UpdateBankAccountInput,
} from "@/types/accounting/accounting-banking";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const ENTITY_STALE = 60 * 1000;
const VOLATILE_STALE = 15 * 1000;
const STANDARD_LIST_STALE = 30 * 1000;
const SLOW_LIST_STALE = 2 * 60 * 1000;
const CATALOG_STALE = 30 * 60 * 1000;

function queryParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}

export function useBankAccounts(
  params: ListBankAccountsParams = {},
  options?: QueryOpts<BankAccountPage>,
) {
  const canRead = useCan("accounting:banking:read");
  const request = queryParams({ ...params });
  return useQuery<BankAccountPage, Error>({
    queryKey: accountingBankingQueryKeys.accountingBanking.accounts(request),
    queryFn: ({ signal }) =>
      apiClient.get<BankAccountPage>(
        "/accounting/banking/accounts",
        request,
        signal,
      ),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useBankAccount(
  bankAccountId: string,
  options?: QueryOpts<BankAccountSummary>,
) {
  const canRead = useCan("accounting:banking:read");
  return useQuery<BankAccountSummary, Error>({
    queryKey:
      accountingBankingQueryKeys.accountingBanking.account(bankAccountId),
    queryFn: ({ signal }) =>
      apiClient.get<BankAccountSummary>(
        `/accounting/banking/accounts/${bankAccountId}`,
        undefined,
        signal,
      ),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!bankAccountId && (options?.enabled ?? true),
  });
}

export function useBankAccountBalance(
  bankAccountId: string,
  asOf: string,
  options?: QueryOpts<BankAccountBalance>,
) {
  const canRead = useCan("accounting:banking:read");
  return useQuery<BankAccountBalance, Error>({
    queryKey: accountingBankingQueryKeys.accountingBanking.accountBalance(
      bankAccountId,
      asOf,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<BankAccountBalance>(
        `/accounting/banking/accounts/${bankAccountId}/balance`,
        { asOf },
        signal,
      ),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!bankAccountId && !!asOf && (options?.enabled ?? true),
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    BankAccountSummary,
    Error,
    CreateBankAccountInput
  >("accounting:banking:manage", {
    mutationKey: ["accounting", "banking", "accounts", "create"],
    mutationFn: (input) =>
      apiClient.post<BankAccountSummary>("/accounting/banking/accounts", input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.accountsAll,
      });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    BankAccountSummary,
    Error,
    { bankAccountId: string; input: UpdateBankAccountInput }
  >("accounting:banking:manage", {
    mutationKey: ["accounting", "banking", "accounts", "update"],
    mutationFn: ({ bankAccountId, input }) =>
      apiClient.patch<BankAccountSummary>(
        `/accounting/banking/accounts/${bankAccountId}`,
        input,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.accountsAll,
      });
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.account(
          variables.bankAccountId,
        ),
      });
    },
  });
}

export function useSaveCsvMapping() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    BankAccountSummary,
    Error,
    { bankAccountId: string; input: SaveCsvMappingInput }
  >("accounting:banking:manage", {
    mutationKey: ["accounting", "banking", "accounts", "csvMapping"],
    mutationFn: ({ bankAccountId, input }) =>
      apiClient.put<BankAccountSummary>(
        `/accounting/banking/accounts/${bankAccountId}/csv-mapping`,
        input,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.accountsAll,
      });
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.account(
          variables.bankAccountId,
        ),
      });
    },
  });
}

export function useStatementMappingPresets(
  options?: QueryOpts<{ presets: StatementMappingPreset[] }>,
) {
  const canRead = useCan("accounting:banking:read");
  return useQuery<{ presets: StatementMappingPreset[] }, Error>({
    queryKey: accountingBankingQueryKeys.accountingBanking.mappingPresets(),
    queryFn: ({ signal }) =>
      apiClient.get<{ presets: StatementMappingPreset[] }>(
        "/accounting/banking/statements/mapping-presets",
        undefined,
        signal,
      ),
    staleTime: CATALOG_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useBankStatements(
  params: { bankProfileId?: string; page?: number; pageSize?: number } = {},
  options?: QueryOpts<StatementPage>,
) {
  const canRead = useCan("accounting:banking:read");
  const request = queryParams({ ...params });
  return useQuery<StatementPage, Error>({
    queryKey: accountingBankingQueryKeys.accountingBanking.statements(request),
    queryFn: ({ signal }) =>
      apiClient.get<StatementPage>(
        "/accounting/banking/statements",
        request,
        signal,
      ),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useBankStatement(
  statementId: string,
  params: { page?: number; pageSize?: number } = {},
  options?: QueryOpts<StatementDetail>,
) {
  const canRead = useCan("accounting:banking:read");
  const request = queryParams({ ...params });
  return useQuery<StatementDetail, Error>({
    queryKey: [
      ...accountingBankingQueryKeys.accountingBanking.statement(statementId),
      request,
    ],
    queryFn: ({ signal }) =>
      apiClient.get<StatementDetail>(
        `/accounting/banking/statements/${statementId}`,
        request,
        signal,
      ),
    staleTime: VOLATILE_STALE,
    ...options,
    enabled: canRead && !!statementId && (options?.enabled ?? true),
  });
}

export function useImportBankStatement() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    StatementImportResult,
    Error,
    ImportStatementInput
  >("accounting:banking:import", {
    mutationKey: ["accounting", "banking", "statements", "import"],
    mutationFn: (input) =>
      apiClient.post<StatementImportResult>(
        "/accounting/banking/statements/imports",
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.all,
      });
    },
  });
}

export function useReconciliationProof(
  statementId: string,
  options?: QueryOpts<ReconciliationProof>,
) {
  const canRead = useCan("accounting:banking:read");
  return useQuery<ReconciliationProof, Error>({
    queryKey:
      accountingBankingQueryKeys.accountingBanking.reconciliation(statementId),
    queryFn: ({ signal }) =>
      apiClient.get<ReconciliationProof>(
        `/accounting/banking/statements/${statementId}/reconciliation`,
        undefined,
        signal,
      ),
    staleTime: VOLATILE_STALE,
    ...options,
    enabled: canRead && !!statementId && (options?.enabled ?? true),
  });
}

export function useMarkStatementReconciled() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ReconciliationProof, Error, string>(
    "accounting:banking:reconcile",
    {
      mutationKey: ["accounting", "banking", "statements", "reconcile"],
      mutationFn: (statementId) =>
        apiClient.post<ReconciliationProof>(
          `/accounting/banking/statements/${statementId}/reconcile`,
          {},
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: accountingBankingQueryKeys.accountingBanking.all,
        });
      },
    },
  );
}

export function useMatchSuggestions(
  statementLineId: string,
  params: { limit?: number } = {},
  options?: QueryOpts<MatchSuggestionsResponse>,
) {
  const canReconcile = useCan("accounting:banking:reconcile");
  const request = queryParams({ ...params });
  return useQuery<MatchSuggestionsResponse, Error>({
    queryKey: [
      ...accountingBankingQueryKeys.accountingBanking.suggestions(
        statementLineId,
      ),
      request,
    ],
    queryFn: ({ signal }) =>
      apiClient.get<MatchSuggestionsResponse>(
        `/accounting/banking/statement-lines/${statementLineId}/suggestions`,
        request,
        signal,
      ),
    staleTime: VOLATILE_STALE,
    ...options,
    enabled: canReconcile && !!statementLineId && (options?.enabled ?? true),
  });
}

export function useMatchStatementLine() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    RecordedMatch,
    Error,
    { statementLineId: string; kind: MatchKind; id: string }
  >("accounting:banking:reconcile", {
    mutationKey: ["accounting", "banking", "statementLines", "match"],
    mutationFn: ({ statementLineId, kind, id }) =>
      apiClient.post<RecordedMatch>(
        `/accounting/banking/statement-lines/${statementLineId}/match`,
        { kind, id },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.all,
      });
    },
  });
}

export function useUnmatchStatementLine() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { statementLineId: string; removed: true },
    Error,
    string
  >("accounting:banking:reconcile", {
    mutationKey: ["accounting", "banking", "statementLines", "unmatch"],
    mutationFn: (statementLineId) =>
      apiClient.delete<{ statementLineId: string; removed: true }>(
        `/accounting/banking/statement-lines/${statementLineId}/match`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.all,
      });
    },
  });
}

export function useUnreconciled(
  params: UnreconciledParams,
  options?: QueryOpts<UnreconciledView>,
) {
  const canRead = useCan("accounting:banking:read");
  const request = queryParams({ ...params });
  return useQuery<UnreconciledView, Error>({
    queryKey:
      accountingBankingQueryKeys.accountingBanking.unreconciled(request),
    queryFn: ({ signal }) =>
      apiClient.get<UnreconciledView>(
        "/accounting/banking/unreconciled",
        request,
        signal,
      ),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled:
      canRead &&
      !!params.accountId &&
      !!params.asOf &&
      (options?.enabled ?? true),
  });
}
