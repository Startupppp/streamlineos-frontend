"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { setupStatusContract } from "@/hooks/api/accounting/core-coa-schema";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  accountingSettingsContract,
  sequenceListContract,
  sequenceContract,
  systemAccountListContract,
  upsertSystemAccountContract,
  updatePaymentTermsContract,
} from "@/hooks/api/accounting/fin-settings-schema";

const finSettingsKeys = {
  all: [...accountingAndSupportQueryKeys.accounting.all, "fin-settings"] as const,
  settings: () => [...accountingAndSupportQueryKeys.accounting.all, "fin-settings", "settings"] as const,
  setupStatus: () => [...accountingAndSupportQueryKeys.accounting.all, "fin-settings", "setup-status"] as const,
  sequences: () => [...accountingAndSupportQueryKeys.accounting.all, "fin-settings", "sequences"] as const,
  systemAccounts: () => [...accountingAndSupportQueryKeys.accounting.all, "fin-settings", "system-accounts"] as const,
  paymentTerms: () => [...accountingAndSupportQueryKeys.accounting.all, "fin-settings", "payment-terms"] as const,
};

export function useAccountingSettings() {
  const can = useCan("accounting:settings:read");
  return useQuery<AccountingSettings, Error>({
    queryKey: finSettingsKeys.settings(),
    queryFn: ({ signal }) => apiClient.get("/accounting/settings", undefined, signal, accountingSettingsContract),
    staleTime: 120_000,
    enabled: can,
  });
}

export function useUpdateAccountingSettings() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingSettings, Error, UpdateSettingsInput>("accounting:settings:manage", {
    mutationKey: ["accounting", "settings", "update"],
    mutationFn: (data) =>
      apiClient.patch("/accounting/settings", data, undefined, accountingSettingsContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}

export function useSetupStatus() {
  const can = useCan("accounting:settings:read");
  return useQuery<SetupStatus, Error>({
    queryKey: finSettingsKeys.setupStatus(),
    queryFn: ({ signal }) => apiClient.get("/accounting/settings/setup-status", undefined, signal, setupStatusContract),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useNumberSequences() {
  const can = useCan("accounting:settings:read");
  return useQuery<{ items: NumberSequence[] }, Error>({
    queryKey: finSettingsKeys.sequences(),
    queryFn: ({ signal }) => apiClient.get("/accounting/settings/sequences", undefined, signal, sequenceListContract),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useUpdateNumberSequence(entityType: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NumberSequence, Error, UpdateSequenceInput>("accounting:settings:manage", {
    mutationKey: ["accounting", "settings", "sequences", entityType, "update"],
    mutationFn: (data) =>
      apiClient.patch(
        `/accounting/settings/sequences/${entityType}`,
        data, undefined, sequenceContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}

export function useSystemAccounts() {
  const can = useCan("accounting:settings:read");
  return useQuery<{ items: SystemAccountMapping[] }, Error>({
    queryKey: finSettingsKeys.systemAccounts(),
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/settings/system-accounts", undefined, signal, systemAccountListContract),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useUpsertSystemAccount(purpose: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<SystemAccountMapping, Error, { accountId: number }>("accounting:settings:manage", {
    mutationKey: ["accounting", "settings", "system-accounts", purpose, "upsert"],
    mutationFn: (data) =>
      apiClient.put(
        `/accounting/settings/system-accounts/${purpose}`,
        data, undefined, upsertSystemAccountContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}

export function useUpdatePaymentTerms() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ terms: PaymentTerm[] }, Error, UpdatePaymentTermsInput>("accounting:settings:manage", {
    mutationKey: ["accounting", "settings", "payment-terms", "update"],
    mutationFn: (data) =>
      apiClient.patch("/accounting/settings/payment-terms", data, undefined, updatePaymentTermsContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: finSettingsKeys.all });
    },
  });
}
