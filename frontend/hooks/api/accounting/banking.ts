"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingBankingQueryKeys } from "@/lib/query-keys/accounting-banking";
import { useCan } from "@/hooks/api/access";
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
} from "@/types/accounting-banking";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const ENTITY_STALE = 60 * 1000;
const VOLATILE_STALE = 15 * 1000;
const STANDARD_LIST_STALE = 30 * 1000;
const SLOW_LIST_STALE = 2 * 60 * 1000;
const CATALOG_STALE = 30 * 60 * 1000;

const ACCOUNTS_PATH = "/accounting/banking/accounts";
const STATEMENTS_PATH = "/accounting/banking/statements";
const LINES_PATH = "/accounting/banking/statement-lines";

function queryParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
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
    queryFn: () => apiClient.get<BankAccountPage>(ACCOUNTS_PATH, request),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useBankAccount(bankAccountId: string, options?: QueryOpts<BankAccountSummary>) {
  const canRead = useCan("accounting:banking:read");
  return useQuery<BankAccountSummary, Error>({
    queryKey: accountingBankingQueryKeys.accountingBanking.account(bankAccountId),
    queryFn: () => apiClient.get<BankAccountSummary>(`${ACCOUNTS_PATH}/${bankAccountId}`),
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
    queryKey: accountingBankingQueryKeys.accountingBanking.accountBalance(bankAccountId, asOf),
    queryFn: () =>
      apiClient.get<BankAccountBalance>(`${ACCOUNTS_PATH}/${bankAccountId}/balance`, { asOf }),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!bankAccountId && !!asOf && (options?.enabled ?? true),
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation<BankAccountSummary, Error, CreateBankAccountInput>({
    mutationKey: ["accounting", "banking", "accounts", "create"],
    mutationFn: (input) => apiClient.post<BankAccountSummary>(ACCOUNTS_PATH, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.accountsAll });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation<
    BankAccountSummary,
    Error,
    { bankAccountId: string; input: UpdateBankAccountInput }
  >({
    mutationKey: ["accounting", "banking", "accounts", "update"],
    mutationFn: ({ bankAccountId, input }) =>
      apiClient.patch<BankAccountSummary>(`${ACCOUNTS_PATH}/${bankAccountId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.accountsAll });
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.account(variables.bankAccountId),
      });
    },
  });
}

export function useSaveCsvMapping() {
  const queryClient = useQueryClient();
  return useMutation<
    BankAccountSummary,
    Error,
    { bankAccountId: string; input: SaveCsvMappingInput }
  >({
    mutationKey: ["accounting", "banking", "accounts", "csvMapping"],
    mutationFn: ({ bankAccountId, input }) =>
      apiClient.put<BankAccountSummary>(`${ACCOUNTS_PATH}/${bankAccountId}/csv-mapping`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.accountsAll });
      queryClient.invalidateQueries({
        queryKey: accountingBankingQueryKeys.accountingBanking.account(variables.bankAccountId),
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
    queryFn: () =>
      apiClient.get<{ presets: StatementMappingPreset[] }>(`${STATEMENTS_PATH}/mapping-presets`),
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
    queryFn: () => apiClient.get<StatementPage>(STATEMENTS_PATH, request),
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
    queryKey: [...accountingBankingQueryKeys.accountingBanking.statement(statementId), request],
    queryFn: () => apiClient.get<StatementDetail>(`${STATEMENTS_PATH}/${statementId}`, request),
    staleTime: VOLATILE_STALE,
    ...options,
    enabled: canRead && !!statementId && (options?.enabled ?? true),
  });
}

export function useImportBankStatement() {
  const queryClient = useQueryClient();
  return useMutation<StatementImportResult, Error, ImportStatementInput>({
    mutationKey: ["accounting", "banking", "statements", "import"],
    mutationFn: (input) => apiClient.post<StatementImportResult>(`${STATEMENTS_PATH}/imports`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.all });
    },
  });
}

export function useReconciliationProof(
  statementId: string,
  options?: QueryOpts<ReconciliationProof>,
) {
  const canRead = useCan("accounting:banking:read");
  return useQuery<ReconciliationProof, Error>({
    queryKey: accountingBankingQueryKeys.accountingBanking.reconciliation(statementId),
    queryFn: () =>
      apiClient.get<ReconciliationProof>(`${STATEMENTS_PATH}/${statementId}/reconciliation`),
    staleTime: VOLATILE_STALE,
    ...options,
    enabled: canRead && !!statementId && (options?.enabled ?? true),
  });
}

export function useMarkStatementReconciled() {
  const queryClient = useQueryClient();
  return useMutation<ReconciliationProof, Error, string>({
    mutationKey: ["accounting", "banking", "statements", "reconcile"],
    mutationFn: (statementId) =>
      apiClient.post<ReconciliationProof>(`${STATEMENTS_PATH}/${statementId}/reconcile`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.all });
    },
  });
}

export function useMatchSuggestions(
  statementLineId: string,
  params: { limit?: number } = {},
  options?: QueryOpts<MatchSuggestionsResponse>,
) {
  const canReconcile = useCan("accounting:banking:reconcile");
  const request = queryParams({ ...params });
  return useQuery<MatchSuggestionsResponse, Error>({
    queryKey: [...accountingBankingQueryKeys.accountingBanking.suggestions(statementLineId), request],
    queryFn: () =>
      apiClient.get<MatchSuggestionsResponse>(
        `${LINES_PATH}/${statementLineId}/suggestions`,
        request,
      ),
    staleTime: VOLATILE_STALE,
    ...options,
    enabled: canReconcile && !!statementLineId && (options?.enabled ?? true),
  });
}

export function useMatchStatementLine() {
  const queryClient = useQueryClient();
  return useMutation<
    RecordedMatch,
    Error,
    { statementLineId: string; kind: MatchKind; id: string }
  >({
    mutationKey: ["accounting", "banking", "statementLines", "match"],
    mutationFn: ({ statementLineId, kind, id }) =>
      apiClient.post<RecordedMatch>(`${LINES_PATH}/${statementLineId}/match`, { kind, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.all });
    },
  });
}

export function useUnmatchStatementLine() {
  const queryClient = useQueryClient();
  return useMutation<{ statementLineId: string; removed: true }, Error, string>({
    mutationKey: ["accounting", "banking", "statementLines", "unmatch"],
    mutationFn: (statementLineId) =>
      apiClient.delete<{ statementLineId: string; removed: true }>(
        `${LINES_PATH}/${statementLineId}/match`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingBankingQueryKeys.accountingBanking.all });
    },
  });
}

export function useUnreconciled(params: UnreconciledParams, options?: QueryOpts<UnreconciledView>) {
  const canRead = useCan("accounting:banking:read");
  const request = queryParams({ ...params });
  return useQuery<UnreconciledView, Error>({
    queryKey: accountingBankingQueryKeys.accountingBanking.unreconciled(request),
    queryFn: () => apiClient.get<UnreconciledView>("/accounting/banking/unreconciled", request),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && !!params.accountId && !!params.asOf && (options?.enabled ?? true),
  });
}
