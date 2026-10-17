"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { PriorityBadge } from "../shared/priority-badge";
import { InlineAssignee } from "../views/card-field-assignee";
import { InlinePriority } from "../views/card-field-priority";
import { InlineStatus } from "../views/card-field-status";
import { getTicketDetailHref, formatTicketKey } from "@/components/shared/format-ticket-key";
import { getUserInitials } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import type { ProjectStatusRecord } from "@/types/projects";

interface RelatedTicketCardProps {
  ticket: {
    id: number;
    title: string;
    status: string;
    version: number;
    priority?: string | null;
    ticketNumber?: number | null;
    assigneeId?: string | null;
    projectId?: number | null;
    project?: { key?: string | null } | null;
    assignee?: {
      id: string;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  };
  projectId: number;
  projectKey: string | null | undefined;
  projectStatuses: ProjectStatusRecord[];
  canUpdate: boolean;
  endAction?: ReactNode;
}

export function RelatedTicketCard({
  ticket,
  projectId,
  projectKey,
  projectStatuses,
  canUpdate,
  endAction,
}: RelatedTicketCardProps) {
  const resolvedProjectId = ticket.projectId ?? projectId;
  const resolvedProjectKey = ticket.project?.key ?? projectKey;
  const href =
    ticket.ticketNumber != null
      ? getTicketDetailHref(resolvedProjectId, resolvedProjectKey, ticket.ticketNumber)
      : null;
  const ticketKey = formatTicketKey(resolvedProjectKey, ticket.ticketNumber, ticket.id);

  const metadata = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {canUpdate ? (
        <span onClick={stopPropagation} onKeyDown={stopPropagation}>
          <InlineStatus
            ticketId={ticket.id}
            projectId={resolvedProjectId}
            version={ticket.version}
            currentStatus={ticket.status}
            projectStatuses={projectStatuses}
          />
        </span>
      ) : (
        <StatusBadge
          status={ticket.status}
          customStates={projectStatuses.map((status) => ({
            name: status.name,
            color: status.color ?? "",
            group: status.type ?? "unstarted",
          }))}
        />
      )}
      {canUpdate ? (
        <span onClick={stopPropagation} onKeyDown={stopPropagation}>
          <InlinePriority
            ticketId={ticket.id}
            projectId={resolvedProjectId}
            version={ticket.version}
            currentPriority={ticket.priority}
            showLabel
          />
        </span>
      ) : ticket.priority ? (
        <PriorityBadge priority={ticket.priority} showLabel />
      ) : null}
    </div>
  );

  const assignee = canUpdate ? (
    <span onClick={stopPropagation} onKeyDown={stopPropagation}>
      <InlineAssignee
        ticketId={ticket.id}
        projectId={resolvedProjectId}
        version={ticket.version}
        currentAssigneeId={ticket.assigneeId}
        assignee={ticket.assignee ?? null}
      />
    </span>
  ) : ticket.assignee ? (
    <Avatar className="h-5 w-5 border border-background" aria-label={`Assigned to ${ticket.assignee.name ?? "member"}`}>
      <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
      <AvatarFallback className="text-micro">{getUserInitials(ticket.assignee)}</AvatarFallback>
    </Avatar>
  ) : null;

  return (
    <article className="group relative rounded-lg border border-border/70 bg-card p-3 shadow-xs transition-colors hover:border-primary/35 hover:bg-muted/20">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          {href ? (
            <Link href={href} className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{ticket.title}</p>
            </Link>
          ) : (
            <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{ticket.title}</p>
          )}
          <p className="mt-1 font-mono text-micro tabular-nums text-muted-foreground">{ticketKey}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {assignee}
          {endAction}
        </div>
      </div>
      <div className="mt-2 border-t border-border/60 pt-2">{metadata}</div>
    </article>
  );
}

function stopPropagation(event: React.MouseEvent | React.KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
}
