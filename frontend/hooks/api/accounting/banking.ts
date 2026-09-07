"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@/hooks/api/accounting/banking-schema";
import { reconSuccessContract } from "@/hooks/api/accounting/banking-reconciliation-schema";
import { bankingKeys } from "@/hooks/api/accounting/banking-keys";
import type {
  BankImportResult,
  BankTransaction,
  BankTransfer,
  BankTxnStatus,
  ConfirmMatchInput,
  CreateBankAccountInput,
  CreateBankImportInput,
  CreateRuleInput,
  CreateTransferInput,
  IgnoreInput,
  ListBankAccountsParams,
  ListRulesParams,
  ListTransfersParams,
  ListTxnParams,
  OptimisticContext,
  ReconciliationRule,
  ReconciliationTxn,
  ReconciliationWorkspace,
  UnmatchInput,
} from "@/hooks/api/accounting/banking-types";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { toQuery, type CursorPage } from "@/hooks/api/accounting/cursor-page";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export * from "@/hooks/api/accounting/banking-types";
export { bankingKeys } from "@/hooks/api/accounting/banking-keys";

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
