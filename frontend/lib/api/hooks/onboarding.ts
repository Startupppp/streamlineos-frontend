"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const personalDetailsContract = lazyContract(() =>
  import("@/lib/api/hooks/onboarding-schema").then((m) => m.personalDetailsContract),
);
const bankDetailsContract = lazyContract(() =>
  import("@/lib/api/hooks/onboarding-schema").then((m) => m.bankDetailsContract),
);

export interface PersonalDetailsPayload {
  phone: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressPostalCode?: string;
  addressCountry?: string;
}

export interface PersonalDetails {
  phone: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  emergencyName: string | null;
  emergencyRelation: string | null;
  emergencyPhone: string | null;
}

export function usePersonalDetailsQuery() {
  return useQuery({
    queryKey: platformCoreQueryKeys.onboardingFlow.personalDetails(),
    queryFn: ({ signal }) =>
      apiClient.get<PersonalDetails>("/onboarding/personal-details", undefined, signal, personalDetailsContract),
    staleTime: 30_000,
  });
}

export function usePersonalInfoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["onboarding", "personal-details"],
    mutationFn: (payload: PersonalDetailsPayload) =>
      apiClient.patch<void>("/onboarding/personal-details", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.onboardingFlow.personalDetails(),
      });
    },
  });
}

export interface BankDetailsPayload {
  countryCode: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  routingCode: string;
  iban: string;
  swift: string;
  statutory: Record<string, string>;
}

export type BankDetails = BankDetailsPayload;

export function useBankDetailsQuery() {
  return useQuery({
    queryKey: platformCoreQueryKeys.onboardingFlow.bankDetails(),
    queryFn: ({ signal }) => apiClient.get<BankDetails>("/onboarding/bank-details", undefined, signal, bankDetailsContract),
    staleTime: 30_000,
  });
}

export function useBankDetailsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["onboarding", "bank-details"],
    mutationFn: (payload: BankDetailsPayload) =>
      apiClient.patch<void>("/onboarding/bank-details", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.onboardingFlow.bankDetails(),
      });
    },
  });
}

export function useSubmitOnboardingMutation() {
  return useMutation({
    mutationKey: ["onboarding", "submit"],
    mutationFn: () => apiClient.post<void>("/onboarding/submit"),
  });
}
