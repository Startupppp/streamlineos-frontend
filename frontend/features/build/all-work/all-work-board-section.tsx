"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/features/build/views/kanban-board";
import { PmPanel } from "@/features/build/shared/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ProjectChip } from "./project-chip";
import { toKanbanTicket, type ProjectGroup } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

interface BoardProjectSectionProps {
  group: ProjectGroup;
}

function BoardProjectSection({ group }: BoardProjectSectionProps) {
  const router = useRouter();
  const kanbanTickets = useMemo(() => group.tickets.map(toKanbanTicket), [group.tickets]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const ticket = group.tickets.find((t) => t.id === id);
      if (!ticket) return;
      router.push(
        getTicketDetailHref(group.projectId, group.projectKey, ticket.ticketNumber),
      );
    },
    [router, group.projectId, group.projectKey, group.tickets],
  );

  return (
    <PmPanel className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 min-w-0 items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <ProjectChip
          projectId={group.projectId}
          projectKey={group.projectKey}
          projectName={group.projectName}
        />
        <TruncatedText text={group.projectName} className="text-label font-semibold text-foreground" />
        <Badge
          variant="secondary"
          className="h-5 shrink-0 rounded-md bg-primary/10 px-1.5 text-micro font-medium tabular-nums text-primary"
        >
          {group.tickets.length}
        </Badge>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-0 sm:px-3 sm:pt-3">
        <KanbanBoard
          tickets={kanbanTickets}
          projectId={group.projectId}
          projectKey={group.projectKey}
          onTicketSelect={handleTicketSelect}
        />
      </div>
    </PmPanel>
  );
}

interface AllWorkBoardSectionProps {
  groups: ProjectGroup[];
}

export function AllWorkBoardSection({ groups }: AllWorkBoardSectionProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {groups.map((group) => (
        <BoardProjectSection key={group.projectId} group={group} />
      ))}
    </div>
  );
}
