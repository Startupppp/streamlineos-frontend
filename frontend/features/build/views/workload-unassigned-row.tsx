"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { stopEvent, InlineAssignee } from "./card-inline-fields";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { TruncatedText } from "@/components/ui/truncated-text";

interface WorkloadUnassignedRowProps {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string | null;
  expanded: boolean;
  reducedMotion: boolean | null;
  motionDelay: number;
  onToggle: () => void;
}

export function WorkloadUnassignedRow({
  tickets,
  projectId,
  projectKey,
  expanded,
  reducedMotion,
  motionDelay,
  onToggle,
}: WorkloadUnassignedRowProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onToggle();
  }

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        delay: motionDelay,
        duration: 0.2,
        ease: "easeOut",
      }}
    >
      <div
        data-testid="workload-unassigned-row"
        className={cn(
          "flex items-center border-b cursor-pointer hover:bg-muted/30 transition-colors bg-muted/20",
          expanded && "bg-status-warning-surface",
        )}
        role="button"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="w-52 shrink-0 px-4 py-3 flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Users className="h-3 w-3 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Unassigned</span>
        </div>
        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <span className="text-sm font-semibold text-status-warning-ink-strong">
            {tickets.length}
          </span>
        </div>
        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <span className="text-sm text-muted-foreground">—</span>
        </div>
        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <span className="text-sm text-muted-foreground">—</span>
        </div>
        <div className="w-24 shrink-0 px-2 py-3 text-center">
          <span className="text-sm text-muted-foreground">—</span>
        </div>
        <div className="w-24 shrink-0 px-2 py-3 text-center">
          <span className="text-sm text-muted-foreground">—</span>
        </div>
        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <span className="text-sm text-muted-foreground">—</span>
        </div>
        <div className="w-24 shrink-0 px-2 py-3 text-center">
          <span className="text-sm text-muted-foreground">—</span>
        </div>
      </div>

      {tickets.length > 0 && (
        <div
          className={cn(
            "grid transition-[grid-template-rows] ease-in-out",
            reducedMotion ? "duration-0" : "duration-200",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden bg-status-warning-surface">
            {tickets.slice(0, 10).map((ticket) => (
              <div
                key={ticket.id}
                className="group/unassigned flex min-w-0 items-center gap-2 border-b border-border/40 px-8 py-2"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                  #{ticket.ticketNumber}
                </span>
                <TruncatedText
                  text={ticket.title}
                  className="min-w-0 flex-1 text-xs text-foreground"
                />
                {ticket.points != null && (
                  <span className="shrink-0 text-micro tabular-nums text-muted-foreground">
                    {ticket.points}pt
                  </span>
                )}
                <Link
                  href={
                    ticket.ticketNumber != null
                      ? getTicketDetailHref(
                          projectId,
                          projectKey,
                          ticket.ticketNumber,
                        )
                      : `/build/${projectId}`
                  }
                  onMouseDown={stopEvent}
                  onClick={stopEvent}
                  className="shrink-0 opacity-0 group-hover/unassigned:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  aria-label="Open ticket"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
                {ticket.version !== null ? (
                  <span
                    onMouseDown={stopEvent}
                    onClick={stopEvent}
                    onKeyDown={stopEvent}
                    className="shrink-0 opacity-0 group-hover/unassigned:opacity-100 transition-opacity"
                  >
                    <InlineAssignee
                      ticketId={ticket.id}
                      projectId={projectId}
                      version={ticket.version}
                      currentAssigneeId={null}
                      assignee={null}
                    />
                  </span>
                ) : null}
              </div>
            ))}
            {tickets.length > 10 && (
              <div className="px-8 py-1.5 text-xs text-muted-foreground">
                +{tickets.length - 10} more unassigned tickets
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
