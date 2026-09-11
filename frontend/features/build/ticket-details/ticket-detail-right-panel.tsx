"use client";

import { useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketTimeTracker } from "./ticket-time-tracker";
import { WatcherList } from "./watcher-list";
import { TicketGitLinks } from "./ticket-git-links";
import type { RecurrenceRule } from "@/hooks/api/build/recurring";

interface TicketDetailRightPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayKey: string;
  saving: boolean;
  ticket: {
    id: number;
    parentTicketId?: number | null;
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
  projectKey?: string | null;
  sprints: Array<{ id: number; name: string; status?: string | null }>;
  statuses?: Array<{ name: string; id: number }>;
  onAutoSave: (field: Record<string, unknown>) => void;
  asideClassName?: string;
}

function TicketDetailRightPanelBody({
  displayKey,
  saving,
  ticket,
  ticketId,
  projectId,
  projectKey,
  sprints,
  statuses,
  onAutoSave,
  onClose,
  hideClose = false,
}: {
  displayKey: string;
  saving: boolean;
  ticket: TicketDetailRightPanelProps["ticket"];
  ticketId: number;
  projectId: number;
  projectKey?: string | null;
  sprints: TicketDetailRightPanelProps["sprints"];
  statuses?: TicketDetailRightPanelProps["statuses"];
  onAutoSave: TicketDetailRightPanelProps["onAutoSave"];
  onClose: () => void;
  hideClose?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 md:border md:border-l-0">
        <div className="relative flex items-center justify-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5">
            <Badge variant="outline" className="hidden h-5 px-1.5 font-mono text-dense md:inline-flex">
              {displayKey}
            </Badge>
            <StatusBadge status={ticket.status ?? "TODO"} />
            <PriorityBadge priority={ticket.priority ?? "MEDIUM"} showLabel size="sm" />
            {saving && (
              <span className="flex items-center gap-1 text-dense text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving
              </span>
            )}
          </div>
          {hideClose ? null : (
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              icon={XIcon}
              iconSize={16}
              className="absolute right-0 top-1/2 h-8 w-8 shrink-0 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close details panel"
            />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
        <TicketSidebar
          ticket={ticket}
          ticketId={ticketId}
          projectId={projectId}
          projectKey={projectKey}
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
    </div>
  );
}

export function TicketDetailRightPanel({
  open,
  onOpenChange,
  displayKey,
  saving,
  ticket,
  ticketId,
  projectId,
  projectKey,
  sprints,
  statuses,
  onAutoSave,
  asideClassName,
}: TicketDetailRightPanelProps) {
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const bodyProps = {
    displayKey,
    saving,
    ticket,
    ticketId,
    projectId,
    projectKey,
    sprints,
    statuses,
    onAutoSave,
    onClose: handleClose,
  };

  return (
    <>
      <Drawer
        open={isMobile && open}
        onOpenChange={onOpenChange}
        shouldScaleBackground={false}
      >
        <DrawerContent
          overlayClassName="z-[110]"
          className={cn(
            "z-[110] flex h-[min(92dvh,40rem)] min-h-0 flex-col gap-0 overflow-hidden rounded-t-xl border border-border bg-card p-0 shadow-lg",
            "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            "motion-reduce:transition-none",
            "[&>[data-slot=drawer-handle]]:mt-2 [&>[data-slot=drawer-handle]]:mb-1 [&>[data-slot=drawer-handle]]:h-1.5 [&>[data-slot=drawer-handle]]:w-10 [&>[data-slot=drawer-handle]]:bg-muted-foreground/25",
          )}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Ticket properties</DrawerTitle>
          </DrawerHeader>
          {isMobile ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <TicketDetailRightPanelBody {...bodyProps} hideClose />
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      <aside
        className={cn(
          "hidden h-full min-h-0 shrink-0 self-stretch overflow-hidden border-border bg-card md:flex md:flex-col md:border-l",
          "transition-[width] ease-in-out",
          shouldReduceMotion ? "duration-0" : "duration-300",
          open ? asideClassName : "w-0 min-w-0",
        )}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          {!isMobile ? (
            <TicketDetailRightPanelBody {...bodyProps} />
          ) : null}
        </div>
      </aside>
    </>
  );
}
