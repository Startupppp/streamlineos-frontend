"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const landingPreferenceReadContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.landingPreferenceGetPreferenceResponseSchema),
);
const landingPreferenceWriteContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.landingPreferenceSetPreferenceResponseSchema),
);

export function useLandingPreference() {
  const canView = useCan("build:view");
  return useQuery({
    enabled: canView,
    staleTime: 5 * 60_000,
    queryKey: buildWorkQueryKeys.landingPreference.mine(),
    queryFn: ({ signal }) =>
      apiClient.get("/build/landing-preference", undefined, signal, landingPreferenceReadContract),
  });
}

export function useSetLandingPreference() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:view", {
    mutationKey: ["build", "landing-preference", "set"],
    mutationFn: (destination: string) =>
      apiClient.put("/build/landing-preference", { destination }, undefined, landingPreferenceWriteContract),
    onSuccess: (data) => {
      queryClient.setQueryData(
        buildWorkQueryKeys.landingPreference.mine(),
        data,
      );
    },
  });
}
