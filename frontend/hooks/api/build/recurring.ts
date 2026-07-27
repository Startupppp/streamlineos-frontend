"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  endDate?: string | null;
}

export function useSetRecurrence(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "tickets", ticketId, "recurrence"],
    mutationFn: (rule: RecurrenceRule | null) =>
      apiClient.patch(`/build/${projectId}/tickets/${ticketId}`, {
        isRecurring: rule !== null,
        recurrenceRule: rule,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", projectId, "tickets", ticketId] }),
  });
}
