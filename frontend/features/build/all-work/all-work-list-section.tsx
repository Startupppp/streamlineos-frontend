"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ListView } from "@/features/build/views/list-view";
import { PmPanel } from "@/features/build/shared/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ProjectChip } from "./project-chip";
import type { AllWorkTicket } from "@/types/projects";
import { getTicketDetailHref } from "@/features/build/shared/format-ticket-key";

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
      const ticket = group.tickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      router.push(
        getTicketDetailHref(group.projectId, group.projectKey, ticket.ticketNumber),
      );
    },
    [router, group.projectId, group.projectKey, group.tickets],
  );

  return (
    <PmPanel>
      <div className="flex min-w-0 items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
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
      <ListView
        tickets={group.tickets.map(toListTicket)}
        onTicketClick={handleTicketClick}
        projectKey={group.projectKey}
        projectId={group.projectId}
      />
    </PmPanel>
  );
});

export const AllWorkListSection = memo(function AllWorkListSection({
  groups,
}: AllWorkListSectionProps) {
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <ProjectSection key={group.projectId} group={group} />
      ))}
    </div>
  );
});
