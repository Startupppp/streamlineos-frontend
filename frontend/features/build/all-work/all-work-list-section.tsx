"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ListView } from "@/features/build/views/list-view";
import type { ListSelection } from "@/features/build/views/list-view-shared";
import { PmPanel } from "@/components/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ProjectChip } from "./project-chip";
import type { AllWorkTicket } from "@/types/projects";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import type { TicketGroup } from "./all-work-ticket-utils";

function toListTicket(t: AllWorkTicket) {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority,
    points: t.points,
    ticketNumber: t.ticketNumber,
    sequenceId: undefined,
    assigneeId: t.assigneeId,
    cycleId: t.cycleId,
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

const GroupSection = memo(function GroupSection({
  group,
  hasMore,
  selection,
}: {
  group: TicketGroup;
  hasMore: boolean;
  selection?: ListSelection;
}) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();

  const handleTicketClick = useCallback(
    (ticketId: number) => {
      const ticket = group.tickets.find((t) => t.id === ticketId);
      if (!ticket || !group.projectId || !group.projectKey) return;
      requestLeave(() =>
        router.push(
          getTicketDetailHref(group.projectId, group.projectKey, ticket.ticketNumber),
        ),
      );
    },
    [router, requestLeave, group.projectId, group.projectKey, group.tickets],
  );

  const firstTicket = group.tickets[0];
  const projectId = group.projectId;
  const projectKey = group.projectKey ?? "";

  return (
    <PmPanel>
      <div className="flex min-w-0 items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        {projectId !== undefined && (
          <ProjectChip
            projectId={projectId}
            projectKey={projectKey}
            projectName={group.label}
          />
        )}
        <TruncatedText text={group.label} className="text-label font-semibold text-foreground" />
        <Badge
          variant="secondary"
          className="h-5 shrink-0 rounded-md bg-primary/10 px-1.5 text-micro font-medium tabular-nums text-primary"
        >
          {group.tickets.length}{hasMore ? "+" : ""}
        </Badge>
      </div>
      <ListView
        tickets={group.tickets.map(toListTicket)}
        onTicketClick={handleTicketClick}
        projectKey={firstTicket?.projectKey ?? projectKey}
        projectId={firstTicket?.projectId ?? projectId ?? 0}
        selection={selection}
      />
    </PmPanel>
  );
});

interface AllWorkListSectionProps {
  groups: TicketGroup[];
  hasMore?: boolean;
  tableSelection?: Set<string | number>;
  onSelectionChange?: (sel: Set<string | number>) => void;
}

export const AllWorkListSection = memo(function AllWorkListSection({
  groups,
  hasMore = false,
  tableSelection,
  onSelectionChange,
}: AllWorkListSectionProps) {
  if (groups.length === 0) return null;

  const selection: ListSelection | undefined =
    tableSelection !== undefined && onSelectionChange !== undefined
      ? { selected: tableSelection, onChange: onSelectionChange }
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <GroupSection key={group.id} group={group} hasMore={hasMore} selection={selection} />
      ))}
    </div>
  );
});
