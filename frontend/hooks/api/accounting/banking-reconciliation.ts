"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  BankTxnStatus,
  MatchType,
  ReconciliationRule,
  ReconciliationRuleAction,
  ReconciliationRuleCondition,
  ReconciliationTxn,
  ReconciliationWorkspace,
} from "./banking-types";
import { bankingKeys, toQuery } from "./banking-keys";

export function useReconciliationWorkspace(bankAccountId: number) {
  const can = useCan("accounting:banking:reconcile");
  return useQuery<ReconciliationWorkspace, Error>({
    queryKey: bankingKeys.reconciliation(bankAccountId),
    queryFn: () =>
      apiClient.get<ReconciliationWorkspace>(
        `/finance/reconciliation/${bankAccountId}`,
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
  return useMutation<void, Error, ConfirmMatchInput, OptimisticContext>({
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
      queryClient.invalidateQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
    },
  });
}

interface UnmatchInput {
  transactionId: number;
}

export function useUnmatch(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UnmatchInput, OptimisticContext>({
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
      queryClient.invalidateQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
    },
  });
}

interface IgnoreInput {
  transactionId: number;
}

export function useIgnoreTransaction(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, IgnoreInput, OptimisticContext>({
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
      queryClient.invalidateQueries({ queryKey: bankingKeys.reconciliation(bankAccountId) });
    },
  });
}

export type ListRulesParams = {
  cursor?: string;
  limit?: number;
};

export function useReconciliationRules(bankAccountId: number, params: ListRulesParams = {}) {
  const can = useCan("accounting:banking:reconcile");
  return useQuery<CursorPage<ReconciliationRule>, Error>({
    queryKey: bankingKeys.rules(bankAccountId),
    queryFn: () =>
      apiClient.get<CursorPage<ReconciliationRule>>(
        `/finance/reconciliation/${bankAccountId}/rules`,
        toQuery(params),
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
  return useMutation<ReconciliationRule, Error, CreateRuleInput>({
    mutationKey: ["banking", "createRule", bankAccountId],
    mutationFn: (data) =>
      apiClient.post<ReconciliationRule>(
        `/finance/reconciliation/${bankAccountId}/rules`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.rules(bankAccountId) });
      toast.success("Rule created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteReconciliationRule(bankAccountId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["banking", "deleteRule", bankAccountId],
    mutationFn: (ruleId) =>
      apiClient.delete<void>(
        `/finance/reconciliation/${bankAccountId}/rules/${ruleId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.rules(bankAccountId) });
      toast.success("Rule deleted");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
