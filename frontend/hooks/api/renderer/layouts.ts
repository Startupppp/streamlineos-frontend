"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import type { LayoutAdjustment } from "@/lib/renderer/layout-adjustment";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const layoutAdjustmentContract = lazyContract(() =>
  import("@/hooks/api/renderer/layouts-schema").then((m) => m.layoutAdjustmentContract),
);
const layoutAdjustmentSaveContract = lazyContract(() =>
  import("@/hooks/api/renderer/layouts-schema").then((m) => m.layoutAdjustmentSaveContract),
);
const layoutUsageContract = lazyContract(() =>
  import("@/hooks/api/renderer/layouts-schema").then((m) => m.layoutUsageContract),
);
const layoutResetContract = lazyContract(() =>
  import("@/hooks/api/renderer/layouts-schema").then((m) => m.layoutResetContract),
);

export interface LayoutAdjustmentInput {
  readonly order?: readonly string[];
  readonly hidden?: readonly string[];
  readonly groups?: readonly { readonly title: string; readonly fields: readonly string[] }[];
}

export interface LayoutUsage {
  readonly sample: number;
  readonly filled: Record<string, number>;
}

export function useLayoutTenant(): string {
  const { data: session } = useSession();
  return session?.orgId ?? "";
}

export function useLayoutAdjustment(layoutKey: string) {
  const orgId = useLayoutTenant();

  return useQuery({
    queryKey: platformCoreQueryKeys.recordLayouts.adjustment(orgId, layoutKey),
    queryFn: ({ signal }) =>
      apiClient.get<LayoutAdjustment | null>(
        `/renderer/layouts/${encodeURIComponent(layoutKey)}`, undefined, signal, layoutAdjustmentContract,
      ),
    staleTime: 30 * 60_000,
    retry: false,
    enabled: !!orgId && !!layoutKey,
    ...INLINE_READ_ERROR,
  });
}

export function useCanAdjustLayouts(): boolean {
  return useCan("settings:record-layouts:manage");
}

export function useSaveLayoutAdjustment(layoutKey: string) {
  const queryClient = useQueryClient();
  const orgId = useLayoutTenant();

  return useAuthorizedMutation("settings:record-layouts:manage", {
    mutationKey: ["recordLayouts", "save", layoutKey] as const,
    mutationFn: (input: LayoutAdjustmentInput) =>
      apiClient.put<LayoutAdjustment>(
        `/renderer/layouts/${encodeURIComponent(layoutKey)}`,
        input,
        undefined,
        layoutAdjustmentSaveContract,
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(
        platformCoreQueryKeys.recordLayouts.adjustment(orgId, layoutKey),
        saved,
      );
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.recordLayouts.all });
    },
  });
}

export function useResetLayoutAdjustment(layoutKey: string) {
  const queryClient = useQueryClient();
  const orgId = useLayoutTenant();

  return useAuthorizedMutation("settings:record-layouts:manage", {
    mutationKey: ["recordLayouts", "reset", layoutKey] as const,
    mutationFn: () =>
      apiClient.delete<null>(
        `/renderer/layouts/${encodeURIComponent(layoutKey)}`,
        undefined,
        undefined,
        layoutResetContract,
      ),
    onSuccess: () => {
      queryClient.setQueryData(
        platformCoreQueryKeys.recordLayouts.adjustment(orgId, layoutKey),
        null,
      );
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.recordLayouts.all });
    },
  });
}

export function useLayoutUsage(layoutKey: string, options?: { enabled?: boolean }) {
  const orgId = useLayoutTenant();
  const canReadUsage = useCan("settings:record-layouts:manage");

  return useQuery({
    queryKey: platformCoreQueryKeys.recordLayouts.usage(orgId, layoutKey),
    queryFn: ({ signal }) =>
      apiClient.get<LayoutUsage>(
        `/renderer/layouts/${encodeURIComponent(layoutKey)}/usage`, undefined, signal, layoutUsageContract,
      ),
    staleTime: 10 * 60_000,
    enabled: !!orgId && !!layoutKey && canReadUsage && (options?.enabled ?? true),
  });
}
