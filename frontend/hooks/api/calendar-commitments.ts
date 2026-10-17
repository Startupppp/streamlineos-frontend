"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CalendarCommitmentChain, CommitmentReference } from "./calendar-commitment-schema";

const chainContract = lazyContract(() => import("./calendar-commitment-schema").then((module) => module.calendarCommitmentChainContract));

export function useCalendarCommitmentChain(root: CommitmentReference | null, enabled = true) {
  const { data: session } = useSession();
  const canRead = useCan("calendar:read");
  return useQuery({
    queryKey: [...platformHierarchyQueryKeys.calendar.commitments, root],
    queryFn: ({ signal }) => apiClient.get<CalendarCommitmentChain>("/calendar/commitments/chain", root ?? {}, signal, chainContract),
    enabled: Boolean(root && session?.orgId && session.user?.id) && canRead && enabled,
    staleTime: 15_000,
  });
}

const edgeContract = lazyContract(() => import("./calendar-commitment-schema").then((module) => module.calendarCommitmentEdgeContract));

export function useCreateCalendarCommitmentEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.commitments, "create"],
    mutationFn: (input: {
      from: CommitmentReference;
      to: CommitmentReference;
      kind: "blocks" | "requires" | "funds" | "fulfills" | "staffs";
      evidence: string;
      expectedFromVersion: string;
      expectedToVersion: string;
    }) => apiClient.post<{ id: string; version: number }>(
      "/calendar/commitments/edges",
      input,
      { headers: { "Idempotency-Key": crypto.randomUUID() } },
      edgeContract,
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.commitments }),
  });
}

const removeContract = lazyContract(() => import("./calendar-commitment-schema").then((module) => module.calendarCommitmentRemoveContract));

export function useRemoveCalendarCommitmentEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.commitments, "remove"],
    mutationFn: (input: { id: string; version: number }) => apiClient.delete<{ removed: boolean }>(
      `/calendar/commitments/edges/${encodeURIComponent(input.id)}`,
      { expectedVersion: input.version },
      { headers: { "Idempotency-Key": crypto.randomUUID() } },
      removeContract,
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.commitments }),
  });
}
