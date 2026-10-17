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
  return useAuthorizedMutation<TicketLabel, Error, { labelId: number; name?: string; color?: string }, TicketLabel[] | undefined>("build:manage", {
    mutationKey: ["projects", "labels", "update"],
    mutationFn: ({ labelId, ...data }) =>
      apiClient.patch<TicketLabel>(`/build/labels/${labelId}`, data, undefined, ticketLabelContract),
    onMutate: async ({ labelId, name, color }) => {
      const key = buildWorkQueryKeys.projects.labels();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TicketLabel[]>(key);
      qc.setQueryData<TicketLabel[]>(key, (old) =>
        old ? old.map((l) => (l.id === labelId ? { ...l, ...(name !== undefined && { name }), ...(color !== undefined && { color }) } : l)) : old,
      );
      return previous;
    },
    onSuccess: (data) => {
      qc.setQueryData<TicketLabel[]>(buildWorkQueryKeys.projects.labels(), (old) =>
        old ? old.map((l) => (l.id === data.id ? data : l)) : old,
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(buildWorkQueryKeys.projects.labels(), ctx);
    },
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number, TicketLabel[] | undefined>("build:manage", {
    mutationKey: ["projects", "labels", "delete"],
    mutationFn: (labelId: number) =>
      apiClient.delete<void>(`/build/labels/${labelId}`, undefined, undefined, noContentContract),
    onMutate: async (labelId) => {
      const key = buildWorkQueryKeys.projects.labels();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TicketLabel[]>(key);
      qc.setQueryData<TicketLabel[]>(key, (old) => old ? old.filter((l) => l.id !== labelId) : old);
      return previous;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(buildWorkQueryKeys.projects.labels(), ctx);
    },
  });
}
