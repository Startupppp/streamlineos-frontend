"use client";

import { Loader2 } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketTimeTracker } from "./ticket-time-tracker";
import { WatcherList } from "./watcher-list";
import { TicketGitLinks } from "./ticket-git-links";
import type { RecurrenceRule } from "@/hooks/api/projects/recurring";

interface TicketDetailRightPanelProps {
  displayKey: string;
  saving: boolean;
  ticket: {
    id: number;
    status?: string | null;
    priority?: string | null;
    type?: string | null;
    points?: number | null;
    sprintId?: number | null;
    epicId?: number | null;
    moduleId?: number | null;
    cycleId?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    timeSpent?: string | null;
    originalEstimate?: string | null;
    link?: string | null;
    labels?: Array<{
      label?: { id: number; name: string; color: string | null } | null;
    }>;
    assignees?: Array<{
      userId: string;
      user?: {
        firstName?: string | null;
        lastName?: string | null;
        image?: string | null;
      } | null;
    }>;
    assignee?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
    } | null;
    reporter?: {
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
      email?: string | null;
    } | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    isRecurring?: boolean | null;
    recurrenceRule?: RecurrenceRule | null;
  };
  ticketId: number;
  projectId: number;
  sprints: Array<{ id: number; name: string; status?: string | null }>;
  statuses?: Array<{ name: string; id: number }>;
  onAutoSave: (field: Record<string, unknown>) => void;
  onToggleCollapse?: () => void;
}

export function TicketDetailRightPanel({
  displayKey,
  saving,
  ticket,
  ticketId,
  projectId,
  sprints,
  statuses,
  onAutoSave,
  onToggleCollapse,
}: TicketDetailRightPanelProps) {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="hidden h-5 px-1.5 font-mono text-[11px] md:inline-flex">
              {displayKey}
            </Badge>
            <StatusBadge status={ticket.status ?? "TODO"} />
            <PriorityBadge priority={ticket.priority ?? "MEDIUM"} showLabel size="sm" />
            {saving && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving
              </span>
            )}
          </div>
          {onToggleCollapse ? (
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              icon={XIcon}
              iconSize={16}
              className="h-9 w-9 shrink-0 touch-manipulation text-muted-foreground hover:text-foreground md:h-8 md:w-8"
              onClick={onToggleCollapse}
              aria-label="Close details panel"
            />
          ) : null}
        </div>
      </div>

      <TicketSidebar
        ticket={ticket}
        ticketId={ticketId}
        projectId={projectId}
        sprints={sprints}
        statuses={statuses}
        onAutoSave={onAutoSave}
      />

      <div className="space-y-4 bg-card px-4 py-3">
        <TicketGitLinks projectId={projectId} ticketId={ticketId} />
        <TicketTimeTracker
          ticketId={ticketId}
          projectId={projectId}
          timeSpent={ticket.timeSpent ?? null}
        />
        <WatcherList projectId={projectId} ticketId={ticketId} />
      </div>
    </div>
  );
}
