import type { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectWithDetails, Ticket } from "@/types/projects";
import {
  patchAllWorkCollections,
  patchTicketCollections,
} from "./ticket-cache";
import {
  settleStatusTransition,
  type StatusTransition,
} from "./ticket-status-queue";

export function reconcileStatusTransition(
  queryClient: QueryClient,
  projectId: number,
  ticketId: number,
  transition: StatusTransition | undefined,
  succeeded: boolean,
): void {
  if (!transition) return;
  const settled = settleStatusTransition(transition, succeeded);
  patchTicketCollections(queryClient, projectId, (ticket) =>
    ticket.id === ticketId ? { ...ticket, status: settled.toStatus } : ticket,
  );
  patchAllWorkCollections(queryClient, projectId, (ticket) =>
    ticket.id === ticketId ? { ...ticket, status: settled.toStatus } : ticket,
  );
  queryClient.setQueryData<Ticket | null>(
    buildWorkQueryKeys.projects.ticket(projectId, ticketId),
    (current) => (current ? { ...current, status: settled.toStatus } : current),
  );
  queryClient.setQueryData<ProjectWithDetails | null>(
    buildWorkQueryKeys.projects.detail(projectId),
    (current) =>
      current?.tickets
        ? {
            ...current,
            tickets: current.tickets.map((ticket) =>
              ticket.id === ticketId
                ? { ...ticket, status: settled.toStatus }
                : ticket,
            ),
          }
        : current,
  );
  if (settled.fromStatus !== settled.toStatus)
    for (const [key, counts] of queryClient.getQueriesData<
      Record<string, number>
    >({
      queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
    })) {
      if (!counts) continue;
      queryClient.setQueryData<Record<string, number>>(key, {
        ...counts,
        [settled.fromStatus]: Math.max(
          0,
          (counts[settled.fromStatus] ?? 0) - 1,
        ),
        [settled.toStatus]: (counts[settled.toStatus] ?? 0) + 1,
      });
    }
}
