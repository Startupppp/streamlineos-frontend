"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { TicketLabel } from "@/types/projects";

const ticketLabelContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketLabelContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "labels", "update"],
    mutationFn: ({ labelId, ...data }: { labelId: number; name?: string; color?: string }) =>
      apiClient.patch<TicketLabel>(`/build/labels/${labelId}`, data, undefined, ticketLabelContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.labels() }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "labels", "delete"],
    mutationFn: (labelId: number) =>
      apiClient.delete<void>(`/build/labels/${labelId}`, undefined, undefined, noContentContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.labels() }),
  });
}
