"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  bankAccountContract,
  bankAccountsPageContract,
  bankTransactionListContract,
  bankImportCreateContract,
  reconWorkspaceContract,
  reconRuleListContract,
  reconRuleContract,
  bankTransferListContract,
  bankTransferContract,
  type BankAccountRecord,
  type BankAccountsPage,
  type BankAccountType as BankAccountTypeValue,
} from "@/hooks/api/accounting/banking-schema";
import { z } from "zod";

const reconSuccessContract = z.object({ success: z.literal(true) });
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type { BankAccountType } from "@/hooks/api/accounting/banking-schema";
export type BankTxnStatus = "UNMATCHED" | "SUGGESTED" | "MATCHED" | "RECONCILED" | "IGNORED";
export type MatchType =
  | "CUSTOMER_PAYMENT"
  | "VENDOR_PAYMENT"
  | "MANUAL_JOURNAL"
  | "BANK_FEE"
  | "TRANSFER";

export type { BankAccountRecord as BankAccount } from "@/hooks/api/accounting/banking-schema";

export interface BankTransaction {
  id: number;
  orgId: string;
  bankAccountId: number;
  importId: number | null;
  txnDate: string;
  description: string | null;
  reference: string | null;
  counterparty: string | null;
  amount: string;
  balanceAfter: string | null;
  fingerprint: string;
  status: BankTxnStatus;
  matchedJournalEntryId: number | null;
  createdAt: string;
}

export interface ReconciliationSuggestedMatch {
  id: number;
  orgId: string;
  bankTransactionId: number;
  journalEntryId: number | null;
  matchedType: string;
  matchedRecordId: number | null;
  amount: string;
  confidence: string | null;
  isConfirmed: boolean;
  confirmedByMembershipId: number | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface ReconciliationTxn extends BankTransaction {
  suggestedMatches?: ReconciliationSuggestedMatch[];
}

export interface ReconciliationWorkspace {
  unmatched: ReconciliationTxn[];
  suggested: ReconciliationTxn[];
  reconciledCount: number;
  ledgerBalance: string | null;
  bankBalance: string;
}

export interface ReconciliationRuleCondition {
  field: "description" | "counterparty" | "amount";
  op: "contains" | "equals" | "gt" | "lt";
  value: string;
}

export type ReconciliationRuleAction =
  | { type: "categorize"; accountPurposeOrId: string | number; memo?: string }
  | { type: "transfer" }
  | { type: "fee" };

export interface ReconciliationRule {
  id: number;
  orgId: string;
  name: string;
  priority: number;
  conditions: ReconciliationRuleCondition[];
  action: ReconciliationRuleAction;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransfer {
  id: number;
  orgId: string;
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: string;
  transferDate: string;
  reference: string | null;
  journalEntryId: number | null;
  createdByMembershipId: number | null;
  createdAt: string;
}

export interface BankImportResult {
  importedCount: number;
  duplicateCount: number;
  errors: string[];
}

const accountingBase = [...accountingAndSupportQueryKeys.accounting.all] as const;

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
  return useQuery<BankAccountsPage, Error>({
    queryKey: bankingKeys.accounts(params),
    queryFn: ({ signal }) =>
      apiClient.get("/finance/bank-accounts", toQuery(params), signal, bankAccountsPageContract),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useBankAccount(id: number) {
  const can = useCan("accounting:banking:read");
  return useQuery<BankAccountRecord, Error>({
    queryKey: bankingKeys.account(id),
    queryFn: ({ signal }) =>
      apiClient.get(`/finance/bank-accounts/${id}`, undefined, signal, bankAccountContract),
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
      apiClient.get(
        `/finance/bank-accounts/${bankAccountId}/transactions`,
        toQuery(params), signal, bankTransactionListContract,
      ),
    staleTime: 30_000,
    enabled: can,
  });
}

export interface CreateBankAccountInput {
  name: string;
  accountType: BankAccountTypeValue;
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
  return useAuthorizedMutation<BankAccountRecord, Error, CreateBankAccountInput>("accounting:banking:manage", {
    mutationKey: ["banking", "createAccount"],
    mutationFn: (data) => apiClient.post("/finance/bank-accounts", data, undefined, bankAccountContract),
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
    mutationFn: (data) => apiClient.post("/finance/bank-imports", data, undefined, bankImportCreateContract),
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
      apiClient.get(
        `/finance/reconciliation/${bankAccountId}`, undefined, signal, reconWorkspaceContract,
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
  return useAuthorizedMutation<{ success: true }, Error, ConfirmMatchInput, OptimisticContext>("accounting:banking:reconcile", {
    mutationKey: ["banking", "confirmMatch", bankAccountId],
    mutationFn: (data) =>
      apiClient.post(`/finance/reconciliation/${bankAccountId}/match`, data, undefined, reconSuccessContract),
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
  return useAuthorizedMutation<{ success: true }, Error, UnmatchInput, OptimisticContext>("accounting:banking:reconcile", {
    mutationKey: ["banking", "unmatch", bankAccountId],
    mutationFn: (data) =>
      apiClient.post(`/finance/reconciliation/${bankAccountId}/unmatch`, data, undefined, reconSuccessContract),
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
  return useAuthorizedMutation<{ success: true }, Error, IgnoreInput, OptimisticContext>("accounting:banking:reconcile", {
    mutationKey: ["banking", "ignore", bankAccountId],
    mutationFn: (data) =>
      apiClient.post(`/finance/reconciliation/${bankAccountId}/ignore`, data, undefined, reconSuccessContract),
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
      apiClient.get(
        `/finance/reconciliation/${bankAccountId}/rules`,
        toQuery(params), signal, reconRuleListContract,
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
      apiClient.post(
        `/finance/reconciliation/${bankAccountId}/rules`,
        data, undefined, reconRuleContract,
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
  return useAuthorizedMutation<{ success: true }, Error, number>("accounting:banking:reconcile", {
    mutationKey: ["banking", "deleteRule", bankAccountId],
    mutationFn: (ruleId) =>
      apiClient.delete(
        `/finance/reconciliation/${bankAccountId}/rules/${ruleId}`,
        undefined, undefined, reconSuccessContract,
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
      apiClient.get("/finance/transfers", toQuery(params), signal, bankTransferListContract),
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
    mutationFn: (data) => apiClient.post("/finance/transfers", data, undefined, bankTransferContract),
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
