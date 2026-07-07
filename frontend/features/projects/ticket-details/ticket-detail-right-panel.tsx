"use client";

import { Loader2, PanelRightClose } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketTimeTracker } from "./ticket-time-tracker";
import { WatcherList } from "./watcher-list";
import type { ProjectMember } from "./types";
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
  members: ProjectMember[];
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
  members,
  sprints,
  statuses,
  onAutoSave,
  onToggleCollapse,
}: TicketDetailRightPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <Badge variant="outline" className="h-5 px-1.5 font-mono text-[11px]">
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
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onToggleCollapse}
              aria-label="Collapse details panel"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <TicketSidebar
          ticket={ticket}
          ticketId={ticketId}
          projectId={projectId}
          members={members}
          sprints={sprints}
          statuses={statuses}
          onAutoSave={onAutoSave}
        />

        <div className="space-y-4 border-t border-border bg-card px-4 py-3">
          <TicketTimeTracker
            ticketId={ticketId}
            projectId={projectId}
            timeSpent={ticket.timeSpent ?? null}
          />
          <WatcherList
            projectId={projectId}
            ticketId={ticketId}
            members={members}
          />
        </div>
      </div>
    </div>
  );
}
