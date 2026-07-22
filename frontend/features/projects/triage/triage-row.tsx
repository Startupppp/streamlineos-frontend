"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { TicketTypeIcon } from "@/features/projects/shared/ticket-type-icon";
import { formatTicketKey } from "@/features/projects/shared/format-ticket-key";
import { PM_PANEL, PM_ROW } from "@/features/projects/shared/pm-chrome";
import { FLEX_TITLE_SLOT, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import type { Ticket } from "@/types/projects";

interface TriageRowProps {
  ticket: Ticket;
  projectKey: string | null | undefined;
  isAccepting: boolean;
  isDeclining: boolean;
  onAccept: (ticketId: number) => void;
  onDecline: (ticketId: number) => void;
  onOpen: (ticket: Ticket) => void;
  isSelected: boolean;
}

export const TriageRow = memo(function TriageRow({
  ticket,
  projectKey,
  isAccepting,
  isDeclining,
  onAccept,
  onDecline,
  onOpen,
  isSelected,
}: TriageRowProps) {
  const handleAccept = useCallback(() => onAccept(ticket.id), [ticket.id, onAccept]);
  const handleDecline = useCallback(() => onDecline(ticket.id), [ticket.id, onDecline]);
  const handleOpen = useCallback(() => onOpen(ticket), [ticket, onOpen]);
  const isBusy = isAccepting || isDeclining;

  return (
    <div
      className={cn(
        PM_PANEL,
        "flex overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
        isSelected && "border-primary/50 shadow-md",
      )}
    >
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className={cn(PM_ROW, "w-full cursor-pointer border-b-0 text-left gap-3")}
          onClick={handleOpen}
          aria-label={`Open ticket ${formatTicketKey(projectKey, ticket.ticketNumber)}`}
        >
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <TicketTypeIcon type={ticket.type} />
            <span>{formatTicketKey(projectKey, ticket.ticketNumber)}</span>
          </span>

          <span className={FLEX_TITLE_SLOT}>
            <TruncatedText
              text={ticket.title ?? "—"}
              className="text-sm font-medium"
            />
            {ticket.description ? (
              <p className={cn(TEXT_ONE_LINE, "mt-0.5 text-xs text-muted-foreground")}>
                {ticket.description.replace(/<[^>]*>/g, " ").trim()}
              </p>
            ) : null}
          </span>

          <span className="hidden shrink-0 items-center gap-3 sm:flex">
            <PriorityBadge priority={ticket.priority} />
            {ticket.assignee ? (
              <span className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                  <AvatarFallback className="text-[8px]">
                    {getUserInitials(ticket.assignee)}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(TEXT_ONE_LINE, "max-w-[100px] text-xs text-muted-foreground")}>
                  {getUserDisplayName(ticket.assignee)}
                </span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
            {ticket.createdAt ? (
              <span className="text-xs text-muted-foreground">
                {format(new Date(ticket.createdAt), "MMM d")}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 py-2 pr-3">
        <AnimatedIconButton
          icon={CheckIcon}
          iconSize={14}
          iconClassName="mr-1"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAccept}
          disabled={isBusy}
          aria-label="Accept — move to In Progress"
        >
          Accept
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={XIcon}
          iconSize={14}
          iconClassName="mr-1"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={handleDecline}
          disabled={isBusy}
          aria-label="Decline — move to Cancelled"
        >
          Decline
        </AnimatedIconButton>
      </div>
    </div>
  );
});
