"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type BankAccountType = "BANK" | "CASH" | "CARD" | "WALLET";
export type BankTxnStatus = "UNMATCHED" | "SUGGESTED" | "MATCHED" | "RECONCILED" | "IGNORED";
export type MatchType =
  | "CUSTOMER_PAYMENT"
  | "VENDOR_PAYMENT"
  | "MANUAL_JOURNAL"
  | "BANK_FEE"
  | "TRANSFER";

export interface BankAccount {
  id: number;
  orgId: string;
  name: string;
  accountType: BankAccountType;
  bankName: string | null;
  accountNumberMasked: string | null;
  ifsc: string | null;
  currency: string;
  ledgerAccountId: number | null;
  openingBalance: string;
  openingBalanceDate: string | null;
  currentBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: number;
  bankAccountId: number;
  txnDate: string;
  description: string;
  reference: string | null;
  counterparty: string | null;
  amount: string;
  status: BankTxnStatus;
  matchType: MatchType | null;
  matchedRecordId: number | null;
  createdAt: string;
}

export interface ReconciliationSuggestedMatch {
  id: number;
  bankTransactionId: number;
  journalEntryId: number | null;
  matchedType: MatchType;
  matchedRecordId: number | null;
  amount: string;
  confidence: string;
  isConfirmed: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export interface ReconciliationTxn extends BankTransaction {
  suggestedMatches?: ReconciliationSuggestedMatch[];
}

export interface ReconciliationWorkspace {
  unmatched: ReconciliationTxn[];
  suggested: ReconciliationTxn[];
  reconciledCount: number;
  ledgerBalance: string;
  bankBalance: string;
}

export interface ReconciliationRuleCondition {
  field: "description" | "counterparty" | "amount";
  op: "contains" | "equals" | "gt" | "lt";
  value: string;
}

export interface ReconciliationRuleAction {
  type: "categorize" | "transfer" | "fee";
  counterAccountId?: number;
  memo?: string;
}

export interface ReconciliationRule {
  id: number;
  bankAccountId: number;
  name: string;
  priority: number;
  conditions: ReconciliationRuleCondition[];
  action: ReconciliationRuleAction;
  isActive: boolean;
  createdAt: string;
}

export interface BankTransfer {
  id: number;
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: string;
  transferDate: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

export interface BankImportResult {
  importedCount: number;
  duplicateCount: number;
  errors: string[];
}

const accountingBase = [...queryKeys.accounting.all] as const;

export const bankingKeys = {
  all: [...accountingBase, "banking"] as const,
  accounts: (params?: object) =>
    [...accountingBase, "banking", "accounts", params] as const,
  account: (id: number) =>
    [...accountingBase, "banking", "accounts", id] as const,
  transactions: (id: number, params?: object) =>
    [...accountingBase, "banking", "transactions", id, params] as const,
  imports: (params?: object) =>
    [...accountingBase, "banking", "imports", params] as const,
  reconciliation: (id: number) =>
    [...accountingBase, "banking", "reconciliation", id] as const,
  rules: (id: number) =>
    [...accountingBase, "banking", "rules", id] as const,
  transfers: (params?: object) =>
    [...accountingBase, "banking", "transfers", params] as const,
};

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface ListBankAccountsParams {
  cursor?: string;
  limit?: number;
}

export function useBankAccounts(params: ListBankAccountsParams = {}) {
  const can = useCan("accounting:banking:read");
  return useQuery<CursorPage<BankAccount>, Error>({
    queryKey: bankingKeys.accounts(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<BankAccount>>("/finance/bank-accounts", toQuery(params), signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useBankAccount(id: number) {
  const can = useCan("accounting:banking:read");
  return useQuery<BankAccount, Error>({
    queryKey: bankingKeys.account(id),
    queryFn: ({ signal }) => apiClient.get<BankAccount>(`/finance/bank-accounts/${id}`, undefined, signal),
    staleTime: 60_000,
    enabled: can,
  });
}

type ListTxnParams = {
  status?: BankTxnStatus;
  from?: string;
  to?: string;
  q?: string;
  cursor?: string;
  limit?: number;
};

export function useBankTransactions(bankAccountId: number, params: ListTxnParams = {}) {
  const can = useCan("accounting:banking:read");
  return useQuery<CursorPage<BankTransaction>, Error>({
    queryKey: bankingKeys.transactions(bankAccountId, params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<BankTransaction>>(
        `/finance/bank-accounts/${bankAccountId}/transactions`,
        toQuery(params), signal,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export interface CreateBankAccountInput {
  name: string;
  accountType: BankAccountType;
  bankName?: string;
  accountNumberMasked?: string;
  ifsc?: string;
  currency: string;
  ledgerAccountId?: number;
  openingBalance: string;
  openingBalanceDate?: string;
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BankAccount, Error, CreateBankAccountInput>("accounting:banking:manage", {
    mutationKey: ["banking", "createAccount"],
    mutationFn: (data) => apiClient.post<BankAccount>("/finance/bank-accounts", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.all });
      toast.success("Bank account created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export interface CreateBankImportInput {
  bankAccountId: number;
  fileName: string;
  columnMapping: {
    date: string;
    description: string;
    amount?: string;
    debit?: string;
    credit?: string;
    reference?: string;
    counterparty?: string;
  };
  rows: string[][];
  dateFormat: string;
  hasHeaderRow: boolean;
}

export function useCreateBankImport() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BankImportResult, Error, CreateBankImportInput>("accounting:banking:import", {
    mutationKey: ["banking", "createImport"],
    mutationFn: (data) => apiClient.post<BankImportResult>("/finance/bank-imports", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.all });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useReconciliationWorkspace(bankAccountId: number) {
  const can = useCan("accounting:banking:reconcile");
  return useQuery<ReconciliationWorkspace, Error>({
    queryKey: bankingKeys.reconciliation(bankAccountId),
    queryFn: ({ signal }) =>
      apiClient.get<ReconciliationWorkspace>(
        `/finance/reconciliation/${bankAccountId}`, undefined, signal,
      ),
    staleTime: 0,
    enabled: can,
  });
}

interface ConfirmMatchInput {
  transactionId: number;
  matchType: MatchType;
  matchedRecordId?: number;
  counterAccountId?: number;
  memo?: string;
}

interface OptimisticContext {
  snapshot: ReconciliationWorkspace | undefined;
}

export function useConfirmMatch(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, ConfirmMatchInput, OptimisticContext>("accounting:banking:reconcile", {
    mutationKey: ["banking", "confirmMatch", bankAccountId],
    mutationFn: (data) =>
      apiClient.post<void>(`/finance/reconciliation/${bankAccountId}/match`, data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
      const snapshot = queryClient.getQueryData<ReconciliationWorkspace>(
        bankingKeys.reconciliation(bankAccountId),
      );
      if (snapshot) {
        const patchedWorkspace: ReconciliationWorkspace = {
          ...snapshot,
          reconciledCount: snapshot.reconciledCount + 1,
          unmatched: snapshot.unmatched.filter((t) => t.id !== vars.transactionId),
          suggested: snapshot.suggested.filter((t) => t.id !== vars.transactionId),
        };
        queryClient.setQueryData(bankingKeys.reconciliation(bankAccountId), patchedWorkspace);
      }
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(bankingKeys.reconciliation(bankAccountId), context.snapshot);
      }
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
    },
  });
}

interface UnmatchInput {
  transactionId: number;
}

export function useUnmatch(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, UnmatchInput, OptimisticContext>("accounting:banking:reconcile", {
    mutationKey: ["banking", "unmatch", bankAccountId],
    mutationFn: (data) =>
      apiClient.post<void>(`/finance/reconciliation/${bankAccountId}/unmatch`, data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
      const snapshot = queryClient.getQueryData<ReconciliationWorkspace>(
        bankingKeys.reconciliation(bankAccountId),
      );
      if (snapshot) {
        const txn = snapshot.unmatched.find((t) => t.id === vars.transactionId)
          ?? snapshot.suggested.find((t) => t.id === vars.transactionId);
        const unmatchedTxn: ReconciliationTxn | undefined = txn
          ? { ...txn, status: "UNMATCHED" satisfies BankTxnStatus }
          : undefined;
        const patchedWorkspace: ReconciliationWorkspace = {
          ...snapshot,
          reconciledCount: Math.max(0, snapshot.reconciledCount - 1),
          suggested: snapshot.suggested.filter((t) => t.id !== vars.transactionId),
          unmatched: unmatchedTxn
            ? [...snapshot.unmatched.filter((t) => t.id !== vars.transactionId), unmatchedTxn]
            : snapshot.unmatched,
        };
        queryClient.setQueryData(bankingKeys.reconciliation(bankAccountId), patchedWorkspace);
      }
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(bankingKeys.reconciliation(bankAccountId), context.snapshot);
      }
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
    },
  });
}

interface IgnoreInput {
  transactionId: number;
}

export function useIgnoreTransaction(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, IgnoreInput, OptimisticContext>("accounting:banking:reconcile", {
    mutationKey: ["banking", "ignore", bankAccountId],
    mutationFn: (data) =>
      apiClient.post<void>(`/finance/reconciliation/${bankAccountId}/ignore`, data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
      const snapshot = queryClient.getQueryData<ReconciliationWorkspace>(
        bankingKeys.reconciliation(bankAccountId),
      );
      if (snapshot) {
        const patchedWorkspace: ReconciliationWorkspace = {
          ...snapshot,
          unmatched: snapshot.unmatched.filter((t) => t.id !== vars.transactionId),
          suggested: snapshot.suggested.filter((t) => t.id !== vars.transactionId),
        };
        queryClient.setQueryData(bankingKeys.reconciliation(bankAccountId), patchedWorkspace);
      }
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(bankingKeys.reconciliation(bankAccountId), context.snapshot);
      }
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
    },
  });
}

export interface ListRulesParams {
  cursor?: string;
  limit?: number;
}

export function useReconciliationRules(bankAccountId: number, params: ListRulesParams = {}) {
  const can = useCan("accounting:banking:reconcile");
  return useQuery<CursorPage<ReconciliationRule>, Error>({
    queryKey: bankingKeys.rules(bankAccountId),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<ReconciliationRule>>(
        `/finance/reconciliation/${bankAccountId}/rules`,
        toQuery(params), signal,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export interface CreateRuleInput {
  name: string;
  priority: number;
  conditions: ReconciliationRuleCondition[];
  action: ReconciliationRuleAction;
  isActive: boolean;
}

export function useCreateReconciliationRule(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ReconciliationRule, Error, CreateRuleInput>("accounting:banking:reconcile", {
    mutationKey: ["banking", "createRule", bankAccountId],
    mutationFn: (data) =>
      apiClient.post<ReconciliationRule>(
        `/finance/reconciliation/${bankAccountId}/rules`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.rules(bankAccountId) });
      toast.success("Rule created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteReconciliationRule(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("accounting:banking:reconcile", {
    mutationKey: ["banking", "deleteRule", bankAccountId],
    mutationFn: (ruleId) =>
      apiClient.delete<void>(
        `/finance/reconciliation/${bankAccountId}/rules/${ruleId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.rules(bankAccountId) });
      toast.success("Rule deleted");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export interface ListTransfersParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
}

export function useTransfers(params: ListTransfersParams = {}) {
  const can = useCan("accounting:banking:read");
  return useQuery<CursorPage<BankTransfer>, Error>({
    queryKey: bankingKeys.transfers(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<BankTransfer>>("/finance/transfers", toQuery(params), signal),
    staleTime: 30_000,
    enabled: can,
  });
}

export interface CreateTransferInput {
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: string;
  transferDate: string;
  reference?: string;
  description?: string;
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BankTransfer, Error, CreateTransferInput>("accounting:banking:manage", {
    mutationKey: ["banking", "createTransfer"],
    mutationFn: (data) => apiClient.post<BankTransfer>("/finance/transfers", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankingKeys.transfers() });
      void queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() });
      toast.success("Transfer created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
