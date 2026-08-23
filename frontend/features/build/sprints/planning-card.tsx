"use client";

import { useCallback } from "react";
import { CheckSquare, AlertTriangle } from "lucide-react";
import { PlusIcon, MinusIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Draggable } from "@hello-pangea/dnd";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/features/build/shared/status-badge";
import { TicketTypeIcon } from "@/features/build/shared/ticket-type-icon";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { formatTicketKey } from "@/features/build/shared/format-ticket-key";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface PlanningTicketUser {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface PlanningTicket {
  id: number;
  title?: string;
  status: string | null;
  points: number | null;
  sprintId?: number | null;
  type?: string | null;
  priority?: string | null;
  ticketNumber?: number | null;
  assignee?: PlanningTicketUser | null;
  assigneeId?: string | null;
}

interface PlanningCardProps {
  ticket: PlanningTicket;
  index: number;
  projectKey?: string | null;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  actionIcon: "plus" | "minus";
  onAction: (id: number) => void;
  isPending?: boolean;
}

export const PlanningCard = function PlanningCard({
  ticket,
  index,
  projectKey,
  isSelected,
  onToggleSelect,
  actionIcon,
  onAction,
  isPending,
}: PlanningCardProps) {
  const handleToggle = useCallback(() => onToggleSelect(ticket.id), [ticket.id, onToggleSelect]);
  const handleAction = useCallback(() => onAction(ticket.id), [ticket.id, onAction]);
  const ticketKey = formatTicketKey(projectKey, ticket.ticketNumber, ticket.id);
  const assigneeName = getUserDisplayName(ticket.assignee ?? null);
  const assigneeInitials = getUserInitials(ticket.assignee ?? null);
  const showDoneWarning = ticket.status === "DONE" || ticket.status === "CANCELLED";

  return (
    <Draggable draggableId={ticket.id.toString()} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          className={cn(
            "p-2 bg-card rounded border text-xs group",
            "flex items-start gap-2 min-w-0",
            dragSnapshot.isDragging && "shadow-md opacity-90",
            isSelected && "border-primary/60 bg-primary/5",
          )}
        >
          <button
            type="button"
            onClick={handleToggle}
            aria-pressed={isSelected}
            aria-label={isSelected ? "Deselect ticket" : "Select ticket"}
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0 rounded border transition-colors flex items-center justify-center",
              isSelected ? "bg-primary border-primary" : "border-border hover:border-primary/60",
            )}
          >
            {isSelected && <CheckSquare className="h-3 w-3 text-primary-foreground" aria-hidden />}
          </button>

          <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              {ticket.type && <TicketTypeIcon type={ticket.type} size="sm" />}
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{ticketKey}</span>
              <TruncatedText text={ticket.title ?? ""} className="min-w-0 flex-1 font-medium" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ticket.status && <StatusBadge status={ticket.status} />}
              {ticket.priority && <PriorityBadge priority={ticket.priority} />}
              {ticket.points != null && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{ticket.points}pt</Badge>
              )}
              {ticket.assignee ? (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                        <AvatarFallback className="text-[8px]">{assigneeInitials}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{assigneeName}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="text-[10px] text-muted-foreground">Unassigned</span>
              )}
              {showDoneWarning && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" aria-label="Closed ticket" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Ticket is already {ticket.status?.toLowerCase()}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AnimatedIconButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  icon={actionIcon === "plus" ? PlusIcon : MinusIcon}
                  iconSize={14}
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={handleAction}
                  disabled={isPending}
                  aria-label={actionIcon === "plus" ? "Add to sprint" : "Remove from sprint"}
                />
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {actionIcon === "plus" ? "Add to sprint" : "Remove from sprint"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </Draggable>
  );
};
