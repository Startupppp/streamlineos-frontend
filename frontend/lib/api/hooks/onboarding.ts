"use client";
import type { z } from "zod";
import type { bankDetailsContract as bankDetailsContractDef } from "@/lib/api/hooks/onboarding-schema";
import type { onboardingCompletionContract as onboardingCompletionContractDef } from "@/lib/api/hooks/onboarding-schema";
import type { personalDetailsContract as personalDetailsContractDef } from "@/lib/api/hooks/onboarding-schema";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
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
const onboardingCompletionContract = lazyContract(() =>
  import("@/lib/api/hooks/onboarding-schema").then((m) => m.onboardingCompletionContract),
);

export interface PersonalDetailsPayload {
  phone: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
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
  return useMutation({
    mutationKey: ["onboarding", "personal-details"],
    mutationFn: (payload: PersonalDetailsPayload) =>
      apiClient.patch<{ success: true }>(
        "/onboarding/personal-details",
        payload,
        undefined,
        onboardingSuccessContract,
      ),
  });
}

export type BankDetailsPayload = z.infer<typeof bankDetailsContractDef>;

export type BankDetails = BankDetailsPayload;

export type BankDetailsQueryOptions = Omit<
  UseQueryOptions<BankDetails, Error>,
  "queryKey" | "queryFn"
>;

export function useBankDetailsQuery(options?: BankDetailsQueryOptions) {
  return useQuery({
    queryKey: platformCoreQueryKeys.onboardingFlow.bankDetails(),
    queryFn: ({ signal }) => apiClient.get<BankDetails>("/onboarding/bank-details", undefined, signal, bankDetailsContract),
    staleTime: 30_000,
    ...options,
  });
}

export function useBankDetailsMutation() {
  return useMutation({
    mutationKey: ["onboarding", "bank-details"],
    mutationFn: (payload: BankDetailsPayload) =>
      apiClient.patch<{ success: true }>(
        "/onboarding/bank-details",
        payload,
        undefined,
        onboardingSuccessContract,
      ),
  });
}

export type OnboardingCompletion = z.infer<typeof onboardingCompletionContractDef>;

export function useSubmitOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["onboarding", "complete"],
    mutationFn: () =>
      apiClient.post<OnboardingCompletion>(
        "/onboarding/complete",
        undefined,
        undefined,
        onboardingCompletionContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.onboardingFlow.session(),
      });
    },
  });
}
