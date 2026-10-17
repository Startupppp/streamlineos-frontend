"use client";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeyBase } from "@/lib/query-keys/base";


const ticketUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.ticketUpdateResultContract),
);

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  endDate?: string | null;
}

interface SetRecurrenceInput {
  version: number;
  rule: RecurrenceRule | null;
}

export function useSetRecurrence(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: [...queryKeyBase, "projects", projectId, "tickets", ticketId, "recurrence"],
    mutationFn: ({ version, rule }: SetRecurrenceInput) =>
      apiClient.patch(`/build/${projectId}/tickets/${ticketId}`, {
        version,
        isRecurring: rule !== null,
        recurrenceRule: rule,
      }, undefined, ticketUpdateResultLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.ticket(projectId, ticketId) }),
  });
}
