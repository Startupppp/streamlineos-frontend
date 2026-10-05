"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR, optionalSignalRead } from "@/lib/query-error-policy";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { DashboardLayoutGetLayoutResponse } from "@/contracts/build-contracts.generated";

const dashboardLayoutLazy = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.dashboardLayoutGetLayoutResponseSchema),
);
const dashboardLayoutSaveLazy = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.dashboardLayoutSaveLayoutResponseSchema),
);

export type SaveDashboardLayoutInput = Pick<DashboardLayoutGetLayoutResponse, "layoutVersion" | "config">;

export function useDashboardLayout() {
  const canView = useCan("build:dashboard:view");
  const qk = buildWorkQueryKeys.commandCenter.layout();
  return useQuery({
    enabled: canView,
    staleTime: 60_000,
    queryKey: qk,
    queryFn: ({ signal }) =>
      optionalSignalRead(
        apiClient.get(
          "/build/command-center/layout",
          {},
          signal,
          dashboardLayoutLazy,
        ),
      ),
    ...INLINE_READ_ERROR,
  });
}

export function useSaveDashboardLayout() {
  const qc = useQueryClient();
  const qk = buildWorkQueryKeys.commandCenter.layout();
  return useAuthorizedMutation("build:dashboard:manage", {
    mutationKey: ["build", "command-center", "save-layout"],
    mutationFn: (input: SaveDashboardLayoutInput) =>
      apiClient.put<DashboardLayoutGetLayoutResponse>(
        "/build/command-center/layout",
        input,
        undefined,
        dashboardLayoutSaveLazy,
      ),
    onSuccess: (saved) => {
      qc.setQueryData(qk, saved);
    },
  });
}
