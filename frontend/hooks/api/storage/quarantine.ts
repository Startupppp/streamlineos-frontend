"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { QuarantineList, QuarantineRecord, QuarantineStatus } from "@/hooks/api/storage/quarantine-schema";

const keys = platformCoreQueryKeys.privacy;
const MANAGE = "storage:quarantine:manage";

const listC = lazyContract(() => import("@/hooks/api/storage/quarantine-schema").then((m) => m.quarantineListContract));
const statusC = lazyContract(() => import("@/hooks/api/storage/quarantine-schema").then((m) => m.quarantineStatusContract));
const deleteC = lazyContract(() => import("@/hooks/api/storage/quarantine-schema").then((m) => m.quarantineDeleteContract));

export interface QuarantineListParams {
  status?: QuarantineStatus;
  cursor?: string;
  limit?: number;
}

export function useQuarantine(params: QuarantineListParams) {
  return useGatedQuery("storage:quarantine:view", {
    queryKey: keys.quarantine(params),
    queryFn: ({ signal }) => apiClient.get<QuarantineList>("/storage/quarantine", params, signal, listC),
    staleTime: 15_000,
  });
}

/** Every loaded page of every filter holds the row; patch them all from the response. */
function patchRecord(qc: QueryClient, id: string, patch: (row: QuarantineRecord) => QuarantineRecord | null) {
  qc.setQueriesData<QuarantineList>({ queryKey: keys.quarantine() }, (page) => {
    if (!page) return page;
    const data = page.data.flatMap((row) => {
      if (row.id !== id) return [row];
      const next = patch(row);
      return next ? [next] : [];
    });
    return { ...page, data };
  });
}

export function useReleaseQuarantined() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ status: "clean" | "infected" }, Error, string>(MANAGE, {
    mutationKey: ["storage", "quarantine", "release"],
    mutationFn: (id) => apiClient.post(`/storage/quarantine/${id}/release`, undefined, undefined, statusC),
    onSuccess: (result, id) => patchRecord(qc, id, (row) => ({ ...row, status: result.status })),
  });
}

export function useRejectQuarantined() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ status: "clean" | "infected" }, Error, { id: string; reason?: string }>(MANAGE, {
    mutationKey: ["storage", "quarantine", "reject"],
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/storage/quarantine/${id}/reject`, reason ? { reason } : {}, undefined, statusC),
    onSuccess: (result, { id, reason }) =>
      patchRecord(qc, id, (row) => ({ ...row, status: result.status, threatName: reason ?? "manual-rejection" })),
  });
}

export function useDeleteQuarantined() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ deleted: boolean }, Error, string>(MANAGE, {
    mutationKey: ["storage", "quarantine", "delete"],
    mutationFn: (id) => apiClient.delete(`/storage/quarantine/${id}`, undefined, undefined, deleteC),
    onSuccess: (_, id) => patchRecord(qc, id, () => null),
  });
}
