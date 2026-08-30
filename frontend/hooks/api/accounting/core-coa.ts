"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { coreKeys } from "./core-keys";

export interface AccountTreeNode {
  id: number;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string | null;
  isSystem: boolean;
  isActive: boolean;
  description: string | null;
  parentAccountId: number | null;
  hasActivity: boolean;
  children: AccountTreeNode[];
}

export interface CoaTemplate {
  key: string;
  label: string;
  country: string;
  accountCount: number;
}

export interface SetupStep {
  key: string;
  label: string;
  done: boolean;
}

export function useCoaTree() {
  const can = useCan("accounting:accounts:read");
  return useQuery<{ items: AccountTreeNode[] }, Error>({
    queryKey: coreKeys.coaTree(),
    queryFn: () => apiClient.get<{ items: AccountTreeNode[] }>("/accounting/coa/tree"),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCoaTemplates() {
  const can = useCan("accounting:accounts:read");
  return useQuery<{ items: CoaTemplate[] }, Error>({
    queryKey: coreKeys.coaTemplates(),
    queryFn: () => apiClient.get<{ items: CoaTemplate[] }>("/accounting/coa/templates"),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useSetupStatus() {
  const can = useCan("accounting:settings:read");
  return useQuery<{ steps: SetupStep[] }, Error>({
    queryKey: coreKeys.setupStatus(),
    queryFn: () => apiClient.get<{ steps: SetupStep[] }>("/accounting/settings/setup-status"),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useDeactivateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; isActive: false }, Error, void>({
    mutationKey: [...coreKeys.all, "deactivate-account", accountId],
    mutationFn: () =>
      apiClient.post<{ id: number; isActive: false }>(`/accounting/coa/${accountId}/deactivate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useActivateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; isActive: true }, Error, void>({
    mutationKey: [...coreKeys.all, "activate-account", accountId],
    mutationFn: () =>
      apiClient.post<{ id: number; isActive: true }>(`/accounting/coa/${accountId}/activate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useDeleteAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; isActive: boolean }, Error, void>({
    mutationKey: [...coreKeys.all, "delete-account", accountId],
    mutationFn: () =>
      apiClient.delete<{ id: number; isActive: boolean }>(`/accounting/coa/${accountId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation<{ templateKey: string; inserted: number; skipped: number }, Error, { templateKey: string }>({
    mutationKey: [...coreKeys.all, "apply-template"],
    mutationFn: (body) =>
      apiClient.post<{ templateKey: string; inserted: number; skipped: number }>(
        "/accounting/coa/templates/apply",
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useSubmitJournalApproval(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, void>({
    mutationKey: [...coreKeys.all, "submit-approval", entryId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(`/accounting/journal/${entryId}/submit-approval`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useApproveJournal(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, { note?: string }>({
    mutationKey: [...coreKeys.all, "approve-journal", entryId],
    mutationFn: (body) =>
      apiClient.post<{ id: number; status: string }>(`/accounting/journal/${entryId}/approve`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useRejectJournal(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, { note?: string }>({
    mutationKey: [...coreKeys.all, "reject-journal", entryId],
    mutationFn: (body) =>
      apiClient.post<{ id: number; status: string }>(`/accounting/journal/${entryId}/reject`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}
