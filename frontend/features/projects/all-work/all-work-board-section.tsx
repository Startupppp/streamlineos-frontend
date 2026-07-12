"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { ProjectChip } from "./project-chip";
import { toKanbanTicket, type ProjectGroup } from "./all-work-ticket-utils";

interface BoardProjectSectionProps {
  group: ProjectGroup;
}

function BoardProjectSection({ group }: BoardProjectSectionProps) {
  const router = useRouter();
  const kanbanTickets = useMemo(() => group.tickets.map(toKanbanTicket), [group.tickets]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      router.push(`/projects/${group.projectId}?ticket=${id}`);
    },
    [router, group.projectId]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ProjectChip
          projectId={group.projectId}
          projectKey={group.projectKey}
          projectName={group.projectName}
        />
        <span className="text-sm font-semibold text-foreground">{group.projectName}</span>
        <Badge variant="secondary" className="text-xs">{group.tickets.length}</Badge>
      </div>
      <KanbanBoard
        tickets={kanbanTickets}
        projectId={group.projectId}
        projectKey={group.projectKey}
        onTicketSelect={handleTicketSelect}
      />
    </div>
  );
}

interface AllWorkBoardSectionProps {
  groups: ProjectGroup[];
}

export function AllWorkBoardSection({ groups }: AllWorkBoardSectionProps) {
  return (
    <div className="flex flex-col gap-6 px-4 pb-4">
      {groups.map((group) => (
        <BoardProjectSection key={group.projectId} group={group} />
      ))}
    </div>
  );
}
