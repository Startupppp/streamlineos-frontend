"use client";

import { useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CommentDraft } from "@/hooks/api/build/comment-drafts";
import { formatTicketKey } from "@/features/build/shared/format-ticket-key";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { TicketTypeIcon } from "@/features/build/shared/ticket-type-icon";
import { getStatusDotClass, getStatusBadgeClass } from "@/features/build/shared/status-badge";
import { priorityConfig, statusConfig } from "@/features/build/shared/types";

interface CommentDraftRowProps {
  draft: CommentDraft;
  onOpen: (draft: CommentDraft) => void;
  onDelete: (id: number) => void;
}

const PRIORITY_ICONS = {
  URGENT: AlertTriangle,
  HIGH: ArrowUp,
  MEDIUM: Minus,
  LOW: ArrowDown,
} as const;

type PriorityKey = keyof typeof PRIORITY_ICONS;

function resolvePriorityKey(priority: string): PriorityKey {
  const key = priority.toUpperCase();
  if (key in PRIORITY_ICONS) return key as PriorityKey;
  return "MEDIUM";
}

function formatStatusLabel(status: string): string {
  return statusConfig[status]?.label ?? status.replace(/_/g, " ");
}

export function CommentDraftRow({ draft, onOpen, onDelete }: CommentDraftRowProps) {
  const ticket = draft.ticket;
  const ticketKey = formatTicketKey(
    ticket.projectKey,
    ticket.ticketNumber,
    ticket.id,
  );
  const age = formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true });
  const snippet = draft.body.trim();
  const status = ticket.status || null;
  const priority = ticket.priority || null;
  const ticketType = ticket.type || null;
  const assignee = ticket.assignee ?? null;
  const projectName = ticket.projectName?.trim() || null;
  const hasMeta = Boolean(status || priority || ticketType || assignee);

  const priorityKey = priority ? resolvePriorityKey(priority) : null;
  const PriorityIcon = priorityKey ? PRIORITY_ICONS[priorityKey] : null;
  const priorityCfg = priorityKey
    ? (priorityConfig[priorityKey] ?? priorityConfig.MEDIUM)
    : null;

  const handleOpen = useCallback(() => {
    onOpen(draft);
  }, [draft, onOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(draft);
      }
    },
    [draft, onOpen],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(draft.id);
    },
    [draft.id, onDelete],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex w-full min-w-0 cursor-pointer items-start gap-2 border-b border-border/70 px-3 py-2.5 text-left last:border-b-0",
        "transition-colors duration-150",
        "hover:bg-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex w-fit max-w-[9rem] shrink-0 items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              <TruncatedText text={ticketKey} className="min-w-0" />
            </span>
            <TruncatedText
              text={ticket.title}
              className="min-w-0 text-[13px] font-medium leading-snug text-foreground"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground/80 sm:text-[11px]">
              {age}
            </span>
            <AnimatedIconButton
              icon={Trash2Icon}
              size="icon-sm"
              variant="ghost"
              iconSize={13}
              className="shrink-0 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100"
              onClick={handleDelete}
              aria-label={`Delete draft for ${ticketKey}`}
            />
          </div>
        </div>

        {projectName ? (
          <TruncatedText
            text={projectName}
            className="mt-0.5 min-w-0 text-[11px] text-muted-foreground/80"
          />
        ) : null}

        {snippet ? (
          <TruncatedText
            text={snippet}
            lines={3}
            className="mt-1 min-w-0 text-xs leading-relaxed text-muted-foreground"
          />
        ) : null}

        {hasMeta ? (
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {ticketType ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <TicketTypeIcon type={ticketType} size="sm" />
                <span className="capitalize">{ticketType.toLowerCase()}</span>
              </span>
            ) : null}

            {priority && PriorityIcon && priorityCfg ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-medium",
                  priorityCfg.color,
                )}
              >
                <PriorityIcon className="h-3 w-3 shrink-0" />
                {priorityCfg.label}
              </span>
            ) : null}

            {status ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  getStatusBadgeClass(status),
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full", getStatusDotClass(status))}
                  aria-hidden="true"
                />
                {formatStatusLabel(status)}
              </span>
            ) : null}

            {assignee ? (
              <span className="inline-flex min-w-0 max-w-[8.5rem] items-center gap-1 text-[10px] text-muted-foreground">
                <Avatar className="h-3.5 w-3.5 shrink-0">
                  <AvatarImage src={resolveImageUrl(assignee.image)} />
                  <AvatarFallback className="bg-primary/10 text-[7px] font-medium text-primary">
                    {getUserInitials(assignee)}
                  </AvatarFallback>
                </Avatar>
                <TruncatedText
                  text={getUserDisplayName(assignee)}
                  className="min-w-0 font-medium"
                />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
