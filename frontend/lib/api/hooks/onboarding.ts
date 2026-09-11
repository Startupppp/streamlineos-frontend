"use client";
import type { z } from "zod";
import type { bankDetailsContract as bankDetailsContractDef } from "@/lib/api/hooks/onboarding-schema";
import type { personalDetailsContract as personalDetailsContractDef } from "@/lib/api/hooks/onboarding-schema";

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
const onboardingSuccessContract = lazyContract(() =>
  import("@/lib/api/hooks/onboarding-schema").then((m) => m.onboardingSuccessContract),
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

export type PersonalDetails = z.infer<typeof personalDetailsContractDef>;

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
      apiClient.patch<{ success: true }>(
        "/onboarding/personal-details",
        payload,
        undefined,
        onboardingSuccessContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.onboardingFlow.personalDetails(),
      });
    },
  });
}

export type BankDetailsPayload = z.infer<typeof bankDetailsContractDef>;

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
      apiClient.patch<{ success: true }>(
        "/onboarding/bank-details",
        payload,
        undefined,
        onboardingSuccessContract,
      ),
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
    mutationFn: () =>
      apiClient.post<{ success: true }>(
        "/onboarding/submit",
        undefined,
        undefined,
        onboardingSuccessContract,
      ),
  });
}
