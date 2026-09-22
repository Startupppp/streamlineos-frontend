"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/features/build/views/kanban-board";
import type { ListSelection } from "@/features/build/views/list-view-shared";
import { PmPanel } from "@/components/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ProjectChip } from "./project-chip";
import { toKanbanTicket, type TicketGroup } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

function BoardGroupSection({
  group,
  hasMore,
  selection,
}: {
  group: TicketGroup;
  hasMore: boolean;
  selection?: ListSelection;
}) {
  const router = useRouter();
  const kanbanTickets = useMemo(() => group.tickets.map(toKanbanTicket), [group.tickets]);
  const projectId = group.projectId;
  const projectKey = group.projectKey ?? "";

  const handleTicketSelect = useCallback(
    (id: number) => {
      const ticket = group.tickets.find((t) => t.id === id);
      if (!ticket || projectId === undefined) return;
      router.push(getTicketDetailHref(projectId, projectKey, ticket.ticketNumber));
    },
    [router, projectId, projectKey, group.tickets],
  );

  if (projectId === undefined) return null;

  return (
    <PmPanel className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 min-w-0 items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <ProjectChip projectId={projectId} projectKey={projectKey} projectName={group.label} />
        <TruncatedText text={group.label} className="text-label font-semibold text-foreground" />
        <Badge
          variant="secondary"
          className="h-5 shrink-0 rounded-md bg-primary/10 px-1.5 text-micro font-medium tabular-nums text-primary"
        >
          {group.tickets.length}{hasMore ? "+" : ""}
        </Badge>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-0 sm:px-3 sm:pt-3">
        <KanbanBoard
          tickets={kanbanTickets}
          projectId={projectId}
          projectKey={projectKey}
          onTicketSelect={handleTicketSelect}
          selection={selection}
        />
      </div>
    </PmPanel>
  );
}

interface AllWorkBoardSectionProps {
  groups: TicketGroup[];
  hasMore?: boolean;
  tableSelection?: Set<string | number>;
  onSelectionChange?: (sel: Set<string | number>) => void;
}

export function AllWorkBoardSection({
  groups,
  hasMore = false,
  tableSelection,
  onSelectionChange,
}: AllWorkBoardSectionProps) {
  const selection: ListSelection | undefined =
    tableSelection !== undefined && onSelectionChange !== undefined
      ? { selected: tableSelection, onChange: onSelectionChange }
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {groups.map((group) => (
        <BoardGroupSection key={group.id} group={group} hasMore={hasMore} selection={selection} />
      ))}
    </div>
  );
}
