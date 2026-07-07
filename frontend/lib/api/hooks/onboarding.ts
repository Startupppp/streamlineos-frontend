"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

export function usePersonalInfoMutation() {
  return useMutation({
    mutationKey: ["onboarding", "personal-details"],
    mutationFn: (payload: PersonalDetailsPayload) =>
      apiClient.patch<void>("/onboarding/personal-details", payload),
  });
}

export interface BankDetailsPayload {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch?: string;
  taxId?: string;
}

export function useBankDetailsMutation() {
  return useMutation({
    mutationKey: ["onboarding", "bank-details"],
    mutationFn: (payload: BankDetailsPayload) =>
      apiClient.patch<void>("/onboarding/bank-details", payload),
  });
}

export function useSubmitOnboardingMutation() {
  return useMutation({
    mutationKey: ["onboarding", "submit"],
    mutationFn: () => apiClient.post<void>("/onboarding/submit"),
  });
}
