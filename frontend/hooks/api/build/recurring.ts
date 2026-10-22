"use client";
import { useQueryClient } from "@tanstack/react-query";
import type { ProjectsTicketsUpdateTicketResponse } from "@/contracts/build-contracts.generated";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeyBase } from "@/lib/query-keys/base";
import type { Ticket } from "@/types/projects";

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
    onSuccess: (response: ProjectsTicketsUpdateTicketResponse) => {
      qc.setQueryData<Ticket | null>(
        buildWorkQueryKeys.projects.ticket(projectId, ticketId),
        (current) => current ? { ...current, updatedAt: response.updatedAt, version: response.version } : current,
      );
    },
  });
}
