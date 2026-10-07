"use client";

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import {
  INLINE_READ_ERROR,
  optionalSignalRead,
} from "@/lib/query-error-policy";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { DashboardLayoutGetLayoutResponse } from "@/contracts/build-contracts.generated";

const dashboardLayoutLazy = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.dashboardLayoutGetLayoutResponseSchema,
  ),
);
const dashboardLayoutSaveLazy = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.dashboardLayoutSaveLayoutResponseSchema,
  ),
);

const SAVE_LAYOUT_MUTATION_KEY = [
  "build",
  "command-center",
  "save-layout",
] as const;

type DashboardLayoutConfig = DashboardLayoutGetLayoutResponse["config"];

interface SaveDashboardLayoutInput {
  layoutVersion: number;
  config: DashboardLayoutConfig;
}

interface SaveDashboardLayoutContext {
  previous: DashboardLayoutGetLayoutResponse | undefined;
}

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
  const confirmed = useRef<DashboardLayoutGetLayoutResponse | undefined>(
    undefined,
  );
  const pendingSaves = useRef(0);
  return useAuthorizedMutation<
    DashboardLayoutGetLayoutResponse,
    Error,
    SaveDashboardLayoutInput,
    SaveDashboardLayoutContext
  >("build:dashboard:manage", {
    mutationKey: SAVE_LAYOUT_MUTATION_KEY,
    scope: { id: "build-command-center-layout" },
    mutationFn: (input) =>
      apiClient.put<DashboardLayoutGetLayoutResponse>(
        "/build/command-center/layout",
        input,
        undefined,
        dashboardLayoutSaveLazy,
      ),
    onMutate: async ({ config }) => {
      if (pendingSaves.current === 0)
        confirmed.current =
          qc.getQueryData<DashboardLayoutGetLayoutResponse>(qk);
      pendingSaves.current += 1;
      await qc.cancelQueries({ queryKey: qk, exact: true });
      const previous = qc.getQueryData<DashboardLayoutGetLayoutResponse>(qk);
      if (previous)
        qc.setQueryData<DashboardLayoutGetLayoutResponse>(qk, {
          ...previous,
          config,
        });
      return { previous };
    },
    onSuccess: (saved) => {
      confirmed.current = saved;
      const isLatest = pendingSaves.current === 1;
      qc.setQueryData<DashboardLayoutGetLayoutResponse>(qk, (current) =>
        isLatest || !current
          ? saved
          : {
              ...current,
              layoutVersion: saved.layoutVersion,
              updatedAt: saved.updatedAt,
            },
      );
    },
    onError: (error, _config, context) => {
      const restore = confirmed.current ?? context?.previous;
      if (isApiError(error) && error.status === 409) {
        if (restore) qc.setQueryData(qk, restore);
        void qc.invalidateQueries({ queryKey: qk, exact: true });
        return;
      }
      if (pendingSaves.current === 1 && restore) qc.setQueryData(qk, restore);
    },
    onSettled: () => {
      pendingSaves.current = Math.max(pendingSaves.current - 1, 0);
    },
  });
}
