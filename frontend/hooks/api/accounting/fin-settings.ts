"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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
  const can = useCan("accounting:settings:read");
  return useQuery<AccountingSettings, Error>({
    queryKey: finSettingsKeys.settings(),
    queryFn: ({ signal }) => apiClient.get<AccountingSettings>("/accounting/settings", undefined, signal),
    staleTime: 120_000,
    enabled: can,
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
  const can = useCan("accounting:settings:read");
  return useQuery<SetupStatus, Error>({
    queryKey: finSettingsKeys.setupStatus(),
    queryFn: ({ signal }) => apiClient.get<SetupStatus>("/accounting/settings/setup-status", undefined, signal),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useNumberSequences() {
  const can = useCan("accounting:settings:read");
  return useQuery<{ items: NumberSequence[] }, Error>({
    queryKey: finSettingsKeys.sequences(),
    queryFn: ({ signal }) => apiClient.get<{ items: NumberSequence[] }>("/accounting/settings/sequences", undefined, signal),
    staleTime: 300_000,
    enabled: can,
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
  const can = useCan("accounting:settings:manage");
  return useQuery<{ items: SystemAccountMapping[] }, Error>({
    queryKey: finSettingsKeys.systemAccounts(),
    queryFn: ({ signal }) =>
      apiClient.get<{ items: SystemAccountMapping[] }>("/accounting/settings/system-accounts", undefined, signal),
    staleTime: 300_000,
    enabled: can,
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
