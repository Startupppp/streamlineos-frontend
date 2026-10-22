import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { Ticket, CursorPageResponse } from "@/types/projects";

export type TicketOrderBy = "created" | "updated" | "priority" | "dueDate" | "number" | "title" | "rank";
export type TicketOrderDir = "asc" | "desc";

export type BoardFilters = {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  assigneeId?: string;
  labels?: string;
  cycle?: string;
  module?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  orderBy?: TicketOrderBy;
  orderDir?: TicketOrderDir;
  cursor?: string;
};

export function projectBoardTicketsQueryOptions(projectId: number, filters?: BoardFilters) {
  return {
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId, view: "board", ...filters }),
    initialPageParam: filters?.cursor ?? NO_CURSOR_YET,
    getNextPageParam: (last: CursorPageResponse<Ticket>) =>
      last.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  };
}

export function ticketByKeyQueryOptions(projectId: number, ticketNumber: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.ticketByKey(projectId, ticketNumber),
    staleTime: 60_000,
  };
}
