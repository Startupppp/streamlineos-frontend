"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const ticketLabelListContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketLabelListContract),
);
const ticketLabelContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketLabelContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface TicketLabel {
  id: number;
  orgId: string;
  name: string;
  color: string;
}

export function useOrgLabels() {
  const canView = useCan("build:view");
  return useQuery<TicketLabel[]>({
    queryKey: buildWorkQueryKeys.projects.labels(),
    queryFn: ({ signal }) => apiClient.get<TicketLabel[]>("/build/labels", undefined, signal, ticketLabelListContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "labels", "create"],
    mutationFn: (data: { name: string; color: string }) =>
      apiClient.post<TicketLabel>("/build/labels", data, undefined, ticketLabelContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.labels() }),
  });
}

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
