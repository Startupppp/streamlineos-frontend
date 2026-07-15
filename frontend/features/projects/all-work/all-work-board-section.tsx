"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { PmPanel } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";
import { ProjectChip } from "./project-chip";
import { toKanbanTicket, type ProjectGroup } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";

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
    <PmPanel className="overflow-visible">
      <div className="flex min-w-0 items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <ProjectChip
          projectId={group.projectId}
          projectKey={group.projectKey}
          projectName={group.projectName}
        />
        <span
          className={cn(TEXT_ONE_LINE, "text-[13px] font-semibold text-foreground")}
          title={group.projectName}
        >
          {group.projectName}
        </span>
        <Badge
          variant="secondary"
          className="h-5 shrink-0 rounded-md bg-primary/10 px-1.5 text-[10px] font-medium tabular-nums text-primary"
        >
          {group.tickets.length}
        </Badge>
      </div>
      <div className="p-2 sm:p-3">
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
    <div className="flex flex-col gap-3 pb-4">
      {groups.map((group) => (
        <BoardProjectSection key={group.projectId} group={group} />
      ))}
    </div>
  );
}
