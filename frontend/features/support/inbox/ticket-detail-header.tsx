"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiErrorCode } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateSupportTicket } from "@/hooks/api/support";
import { useSupportQueues } from "@/hooks/api/support/queues";
import { useSupportWatchers, useFollowTicket, useUnfollowTicket } from "@/hooks/api/support/watchers";
import { TicketRiskBadge } from "@/features/support/inbox/ticket-risk-badge";
import { TicketPresence } from "@/features/support/inbox/ticket-presence";
import { TicketSnoozeControl } from "@/features/support/inbox/ticket-snooze-control";
import type { SupportTicket, SupportTicketStatus } from "@/types/support";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TicketDetailHeaderProps {
  ticket: SupportTicket;
  onBack: () => void;
}

export function TicketDetailHeader({ ticket, onBack }: TicketDetailHeaderProps) {
  const { data: session } = useSession();
  const updateTicket = useUpdateSupportTicket();
  const { data: queues } = useSupportQueues();
  const { data: watchers } = useSupportWatchers(ticket.id);
  const followMutation = useFollowTicket();
  const unfollowMutation = useUnfollowTicket();

  const currentUserId = session?.user?.id;
  const isFollowing = useMemo(
    () => (watchers ?? []).some((w) => w.userId === currentUserId),
    [watchers, currentUserId],
  );

  const handleUpdateError = useCallback((err: unknown) => {
    if (getApiErrorCode(err) === "STALE_TICKET") {
      toast.error("This ticket changed since you opened it. Refresh to see the latest.");
      return;
    }
    toast.error(getErrorMessage(err));
  }, []);

  const handleStatusValueChange = useCallback(
    (v: string) => {
      updateTicket.mutate(
        { id: ticket.id, status: v as SupportTicketStatus, expectedUpdatedAt: ticket.updatedAt.toString() },
        { onSuccess: () => toast.success("Status updated"), onError: handleUpdateError },
      );
    },
    [ticket.id, ticket.updatedAt, updateTicket, handleUpdateError],
  );

  const handleQueueValueChange = useCallback(
    (v: string) => {
      updateTicket.mutate(
        {
          id: ticket.id,
          queueId: v === "none" ? null : Number(v),
          expectedUpdatedAt: ticket.updatedAt.toString(),
        },
        { onSuccess: () => toast.success("Queue updated"), onError: handleUpdateError },
      );
    },
    [ticket.id, ticket.updatedAt, updateTicket, handleUpdateError],
  );

  const handleToggleFollow = useCallback(() => {
    if (isFollowing) {
      unfollowMutation.mutate(ticket.id, { onError: handleUpdateError });
    } else {
      followMutation.mutate(ticket.id, { onError: handleUpdateError });
    }
  }, [isFollowing, ticket.id, followMutation, unfollowMutation, handleUpdateError]);

  const isBreached =
    ticket.slaDeadline &&
    new Date(ticket.slaDeadline) < new Date() &&
    !["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <div className="px-4 py-3 border-b border-border/40 shrink-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden h-7 px-2 shrink-0">
            Back
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleToggleFollow}
            aria-label={isFollowing ? "Unfollow ticket" : "Follow ticket"}
            title={isFollowing ? "Unfollow ticket" : "Follow ticket"}
          >
            <Star className={cn("h-3.5 w-3.5", isFollowing && "fill-amber-400 text-amber-400")} />
          </Button>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">{toTitleCase(ticket.title)}</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              #{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
          <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[ticket.priority])}>
            {ticket.priority}
          </Badge>
          <TicketRiskBadge ticketId={ticket.id} />
          <TicketSnoozeControl ticketId={ticket.id} snoozedUntil={ticket.snoozedUntil} />
          {isBreached && (
            <Badge variant="destructive" className="text-xs">
              SLA Breached
            </Badge>
          )}
          <Select value={ticket.queueId ? String(ticket.queueId) : "none"} onValueChange={handleQueueValueChange}>
            <SelectTrigger className="h-7 text-xs w-[130px]">
              <SelectValue placeholder="Queue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No queue</SelectItem>
              {(queues ?? []).map((queue) => (
                <SelectItem key={queue.id} value={String(queue.id)}>
                  {queue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ticket.status} onValueChange={handleStatusValueChange}>
            <SelectTrigger className="h-7 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING">Waiting</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <TicketPresence ticketId={ticket.id} />
    </div>
  );
}
