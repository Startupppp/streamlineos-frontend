"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  endDate?: string | null;
}

export function useSetRecurrence(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: [...queryKeyBase, "projects", projectId, "tickets", ticketId, "recurrence"],
    mutationFn: (rule: RecurrenceRule | null) =>
      apiClient.patch(`/build/${projectId}/tickets/${ticketId}`, {
        isRecurring: rule !== null,
        recurrenceRule: rule,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.ticket(ticketId) }),
  });
}
