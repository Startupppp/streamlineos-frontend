"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { coreKeys } from "./core-keys";
import {
  coaTreeContract,
  setupStatusContract,
  coaTemplateListContract,
  coaAccountStatusContract,
  coaApplyTemplateContract,
  journalApprovalSubmitContract,
  journalApprovalDecisionContract,
  type AccountTreeNode,
  type SetupStep,
} from "@/hooks/api/accounting/core-coa-schema";
export type { AccountTreeNode, SetupStep };
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface CoaTemplate {
  key: string;
  label: string;
  country: string;
  accountCount: number;
}

export function useCoaTree() {
  const can = useCan("accounting:accounts:read");
  return useQuery<{ items: AccountTreeNode[] }, Error>({
    queryKey: coreKeys.coaTree(),
    queryFn: ({ signal }) => apiClient.get("/accounting/coa/tree", undefined, signal, coaTreeContract),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCoaTemplates() {
  const can = useCan("accounting:accounts:read");
  return useQuery<{ items: CoaTemplate[] }, Error>({
    queryKey: coreKeys.coaTemplates(),
    queryFn: ({ signal }) => apiClient.get("/accounting/coa/templates", undefined, signal, coaTemplateListContract),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useSetupStatus() {
  const can = useCan("accounting:settings:read");
  return useQuery<{ steps: SetupStep[] }, Error>({
    queryKey: coreKeys.setupStatus(),
    queryFn: ({ signal }) => apiClient.get("/accounting/settings/setup-status", undefined, signal, setupStatusContract),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useDeactivateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; isActive: false }, Error, void>("accounting:accounts:manage", {
    mutationKey: [...coreKeys.all, "deactivate-account", accountId],
    mutationFn: () =>
      apiClient.post(`/accounting/coa/${accountId}/deactivate`, undefined, undefined, coaAccountStatusContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useActivateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; isActive: true }, Error, void>("accounting:accounts:manage", {
    mutationKey: [...coreKeys.all, "activate-account", accountId],
    mutationFn: () =>
      apiClient.post(`/accounting/coa/${accountId}/activate`, undefined, undefined, coaAccountStatusContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useDeleteAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; isActive: boolean }, Error, void>("accounting:accounts:manage", {
    mutationKey: [...coreKeys.all, "delete-account", accountId],
    mutationFn: () =>
      apiClient.delete(`/accounting/coa/${accountId}`, undefined, undefined, coaAccountStatusContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ templateKey: string; inserted: number; skipped: number }, Error, { templateKey: string }>("accounting:accounts:manage", {
    mutationKey: [...coreKeys.all, "apply-template"],
    mutationFn: (body) =>
      apiClient.post(
        "/accounting/coa/templates/apply",
        body, undefined, coaApplyTemplateContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useSubmitJournalApproval(entryId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; status: string }, Error, void>("accounting:journal:create", {
    mutationKey: [...coreKeys.all, "submit-approval", entryId],
    mutationFn: () =>
      apiClient.post(`/accounting/journal/${entryId}/submit-approval`, undefined, undefined, journalApprovalSubmitContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useApproveJournal(entryId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; status: string }, Error, { note?: string }>("accounting:journal:approve", {
    mutationKey: [...coreKeys.all, "approve-journal", entryId],
    mutationFn: (body) =>
      apiClient.post(`/accounting/journal/${entryId}/approve`, body, undefined, journalApprovalDecisionContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useRejectJournal(entryId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ id: number; status: string }, Error, { note?: string }>("accounting:journal:approve", {
    mutationKey: [...coreKeys.all, "reject-journal", entryId],
    mutationFn: (body) =>
      apiClient.post(`/accounting/journal/${entryId}/reject`, body, undefined, journalApprovalDecisionContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}
