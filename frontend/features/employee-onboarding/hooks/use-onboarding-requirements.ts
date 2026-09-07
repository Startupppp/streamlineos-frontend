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
    queryFn: ({ signal }) =>
      apiClient.get<OnboardingRequirements>("/onboarding/requirements", {
        country,
      }, signal, onboardingRequirementsSchema),
    staleTime: 10 * 60_000,
    enabled: enabled && country.length > 0,
  });
}

