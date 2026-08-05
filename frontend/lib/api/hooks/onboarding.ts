"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
    queryKey: queryKeys.onboardingFlow.personalDetails(),
    queryFn: () =>
      apiClient.get<PersonalDetails>("/onboarding/personal-details"),
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
        queryKey: queryKeys.onboardingFlow.personalDetails(),
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
    queryKey: queryKeys.onboardingFlow.bankDetails(),
    queryFn: () => apiClient.get<BankDetails>("/onboarding/bank-details"),
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
        queryKey: queryKeys.onboardingFlow.bankDetails(),
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
