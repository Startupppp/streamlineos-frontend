"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import {
  onboardingRequirementsSchema,
  type OnboardingRequirements,
} from "../lib/onboarding-requirements-schema";

export function useOnboardingRequirements(country: string, enabled = true) {
  return useQuery({
    queryKey: platformCoreQueryKeys.onboardingFlow.requirements(country),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<unknown>("/onboarding/requirements", {
        country,
      }, signal);
      return onboardingRequirementsSchema.parse(
        res,
      ) satisfies OnboardingRequirements;
    },
    staleTime: 10 * 60_000,
    enabled: enabled && country.length > 0,
  });
}

