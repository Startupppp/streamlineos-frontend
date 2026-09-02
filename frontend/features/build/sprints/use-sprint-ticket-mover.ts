"use client";

import { useCallback } from "react";
import { useBulkUpdateTickets } from "@/hooks/api/build";

const BULK_TICKET_LIMIT = 100;

export function useSprintTicketMover(projectId: number) {
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const moveTickets = useCallback(
    async (ticketIds: number[], sprintId: number | null): Promise<void> => {
      for (let start = 0; start < ticketIds.length; start += BULK_TICKET_LIMIT) {
        await bulkUpdate.mutateAsync({
          ticketIds: ticketIds.slice(start, start + BULK_TICKET_LIMIT),
          sprintId,
        });
      }
    },
    [bulkUpdate],
  );

  return { moveTickets, isPending: bulkUpdate.isPending };
}
