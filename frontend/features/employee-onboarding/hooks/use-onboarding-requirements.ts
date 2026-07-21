"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  onboardingRequirementsSchema,
  type OnboardingRequirements,
} from "../lib/onboarding-requirements-schema";

export function useOnboardingRequirements(country: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.onboardingFlow.requirements(country),
    queryFn: async () => {
      const res = await apiClient.get<unknown>("/onboarding/requirements", {
        country,
      });
      return onboardingRequirementsSchema.parse(
        res,
      ) satisfies OnboardingRequirements;
    },
    staleTime: 10 * 60_000,
    enabled: enabled && country.length > 0,
  });
}

export function useEnsureOnboardingDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "ensure-documents"],
    mutationFn: (country: string) =>
      apiClient.post<{ countryCode: string; seeded: number }>(
        "/onboarding/requirements/documents",
        { country },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.hr.documentTypes(),
      });
    },
  });
}
