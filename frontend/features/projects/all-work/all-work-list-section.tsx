"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ListView } from "@/features/projects/views/list-view";
import { ProjectChip } from "./project-chip";
import type { AllWorkTicket } from "@/types/projects";

interface ProjectGroup {
  projectId: number;
  projectKey: string;
  projectName: string;
  tickets: AllWorkTicket[];
}

interface AllWorkListSectionProps {
  groups: ProjectGroup[];
}

function toListTicket(t: AllWorkTicket) {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority,
    points: t.points,
    ticketNumber: t.ticketNumber,
    sequenceId: t.sequenceId,
    assigneeId: t.assigneeId,
    cycleId: t.cycleId,
    sprintId: t.sprintId,
    dueDate: t.dueDate,
    startDate: t.startDate,
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          name: t.assignee.name ?? undefined,
          firstName: t.assignee.firstName ?? undefined,
          lastName: t.assignee.lastName ?? undefined,
          email: t.assignee.email ?? undefined,
          image: t.assignee.image ?? null,
        }
      : null,
    labels: t.labels.map((l) => ({
      label: { id: l.id, name: l.name, color: l.color },
    })),
  };
}

const ProjectSection = memo(function ProjectSection({
  group,
}: {
  group: ProjectGroup;
}) {
  const router = useRouter();

  const handleTicketClick = useCallback(
    (ticketId: number) => {
      router.push(`/projects/${group.projectId}?ticket=${ticketId}`);
    },
    [router, group.projectId]
  );

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-4">
        <ProjectChip
          projectId={group.projectId}
          projectKey={group.projectKey}
          projectName={group.projectName}
        />
        <span className="text-sm font-semibold text-foreground">{group.projectName}</span>
        <Badge variant="secondary" className="text-xs">{group.tickets.length}</Badge>
      </div>
      <ListView
        tickets={group.tickets.map(toListTicket)}
        onTicketClick={handleTicketClick}
        projectKey={group.projectKey}
        projectId={group.projectId}
      />
    </div>
  );
});

export const AllWorkListSection = memo(function AllWorkListSection({
  groups,
}: AllWorkListSectionProps) {
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <ProjectSection key={group.projectId} group={group} />
      ))}
    </div>
  );
});
