"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AccountingSettings,
  NumberSequence,
  PaymentTerm,
  SetupStatus,
  SystemAccountMapping,
  UpdatePaymentTermsInput,
  UpdateSequenceInput,
  UpdateSettingsInput,
} from "@/types/accounting/fin-settings";

const finSettingsKeys = {
  all: [...queryKeys.accounting.all, "fin-settings"] as const,
  settings: () => [...queryKeys.accounting.all, "fin-settings", "settings"] as const,
  setupStatus: () => [...queryKeys.accounting.all, "fin-settings", "setup-status"] as const,
  sequences: () => [...queryKeys.accounting.all, "fin-settings", "sequences"] as const,
  systemAccounts: () => [...queryKeys.accounting.all, "fin-settings", "system-accounts"] as const,
  paymentTerms: () => [...queryKeys.accounting.all, "fin-settings", "payment-terms"] as const,
};

export function useAccountingSettings() {
  return useQuery<AccountingSettings, Error>({
    queryKey: finSettingsKeys.settings(),
    queryFn: () => apiClient.get<AccountingSettings>("/accounting/settings"),
    staleTime: 120_000,
  });
}

export function useUpdateAccountingSettings() {
  const queryClient = useQueryClient();
  return useMutation<AccountingSettings, Error, UpdateSettingsInput>({
    mutationKey: ["accounting", "settings", "update"],
    mutationFn: (data) =>
      apiClient.patch<AccountingSettings>("/accounting/settings", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}

export function useSetupStatus() {
  return useQuery<SetupStatus, Error>({
    queryKey: finSettingsKeys.setupStatus(),
    queryFn: () => apiClient.get<SetupStatus>("/accounting/settings/setup-status"),
    staleTime: 300_000,
  });
}

export function useNumberSequences() {
  return useQuery<{ items: NumberSequence[] }, Error>({
    queryKey: finSettingsKeys.sequences(),
    queryFn: () => apiClient.get<{ items: NumberSequence[] }>("/accounting/settings/sequences"),
    staleTime: 300_000,
  });
}

export function useUpdateNumberSequence(entityType: string) {
  const queryClient = useQueryClient();
  return useMutation<NumberSequence, Error, UpdateSequenceInput>({
    mutationKey: ["accounting", "settings", "sequences", entityType, "update"],
    mutationFn: (data) =>
      apiClient.patch<NumberSequence>(
        `/accounting/settings/sequences/${entityType}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}

export function useSystemAccounts() {
  return useQuery<{ items: SystemAccountMapping[] }, Error>({
    queryKey: finSettingsKeys.systemAccounts(),
    queryFn: () =>
      apiClient.get<{ items: SystemAccountMapping[] }>("/accounting/settings/system-accounts"),
    staleTime: 300_000,
  });
}

export function useUpsertSystemAccount(purpose: string) {
  const queryClient = useQueryClient();
  return useMutation<SystemAccountMapping, Error, { accountId: number }>({
    mutationKey: ["accounting", "settings", "system-accounts", purpose, "upsert"],
    mutationFn: (data) =>
      apiClient.put<SystemAccountMapping>(
        `/accounting/settings/system-accounts/${purpose}`,
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}

export function useUpdatePaymentTerms() {
  const queryClient = useQueryClient();
  return useMutation<{ terms: PaymentTerm[] }, Error, UpdatePaymentTermsInput>({
    mutationKey: ["accounting", "settings", "payment-terms", "update"],
    mutationFn: (data) =>
      apiClient.patch<{ terms: PaymentTerm[] }>("/accounting/settings/payment-terms", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}
