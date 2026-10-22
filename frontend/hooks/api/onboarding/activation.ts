"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { lazyContract } from "@/lib/api-envelope";
import type { z } from "zod";
import { activationReportContract, activationStepContract } from "./activation-schema";

export type ActivationStep = z.infer<typeof activationStepContract>;

export type ActivationReport = z.infer<typeof activationReportContract>;

const activationLazy = lazyContract(() =>
  import("./activation-schema").then((m) => m.activationReportContract),
);

export function useActivation() {
  return useQuery({
    queryKey: platformCoreQueryKeys.onboardingFlow.activation(),
    queryFn: ({ signal }) =>
      apiClient.get<ActivationReport>("/onboarding/activation", undefined, signal, activationLazy),
    staleTime: 30_000,
  });
}
