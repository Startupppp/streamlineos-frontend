"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, MessageSquare, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { TicketEntityRef, CommentEntityRef } from "./chat-types";
import { useCan } from "@/hooks/api/access";
import { isApiError } from "@/lib/api-client";
import { useEntityAction } from "./entity-actions-context";
import { useSubmitEntityAction } from "@/hooks/api/chat";
import { ticketPermalinkQueryOptions } from "@/hooks/api/build/comment-permalink";
import { getStatusBadgeClass } from "@/features/build/shared/status-badge";
import { formatTicketKey } from "@/features/build/shared/format-ticket-key";

const TICKET_STATUS_DISPLAY: Record<string, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

/**
 * The reader could not resolve the record — it is gone, or it was never theirs
 * to see. Both look the same on purpose, so scrollback leaks neither.
 */
function UnresolvedPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 my-1 text-dense text-muted-foreground">
      <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
      {label}
    </span>
  );
}

export function TicketPill({ entity, channelId }: { entity: TicketEntityRef; channelId: number }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(
    entity.card?.status ?? entity.status ?? "TODO",
  );
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const submitEntityAction = useSubmitEntityAction();
  const canUpdate = Boolean(
    useEntityAction({ type: "ticket", id: String(entity.id) }, "status"),
  );

  const card = entity.card;
  const ticketKey =
    card?.subtitle ??
    (entity.projectKey && entity.ticketNumber
      ? `${entity.projectKey}-${entity.ticketNumber}`
      : `Ticket #${entity.id}`);
  const hasFullInfo = Boolean(card?.subtitle) || Boolean(entity.projectKey && entity.ticketNumber);
  const ticketTitle = card?.title ?? entity.title;

  const handlePillClick = useCallback(() => {
    if (card?.href) {
      router.push(card.href);
      return;
    }
    if (entity.projectId) router.push(`/build/${entity.projectId}?ticket=${entity.id}`);
  }, [router, card?.href, entity.projectId, entity.id]);

  const handleStatusChange = useCallback(
    async (nextStatus: string) => {
      const prev = currentStatus;
      setCurrentStatus(nextStatus);
      setIsChangingStatus(true);
      try {
        await submitEntityAction.mutateAsync({
          channelId,
          reference: { type: "ticket", id: String(entity.id) },
          actionId: "status",
          input: { status: nextStatus },
        });
      } catch (err) {
        setCurrentStatus(prev);
        const code = isApiError(err) ? err.code : undefined;
        if (code === "CHAT_ACTION_FORBIDDEN") {
          toast.error("You don't have permission to change this ticket's status.");
        } else if (code === "PROJECTS_TICKET_NOT_FOUND") {
          toast.error("This ticket no longer exists.");
        } else if (code === "CHAT_ACTION_TICKET_STATUS_FAILED") {
          toast.error("This status change isn't allowed.");
        } else {
          toast.error("Failed to update ticket status");
        }
      } finally {
        setIsChangingStatus(false);
      }
    },
    [currentStatus, channelId, entity],
  );

  if (entity.card === null) return <UnresolvedPill label="A ticket you can't see" />;

  if (!hasFullInfo) {
    return (
      <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 hover:border-border/80 transition-all duration-150 ease-out motion-reduce:transition-none my-1">
        <button
          type="button"
          onClick={handlePillClick}
          className="flex items-center gap-1.5 font-mono text-dense text-muted-foreground hover:text-foreground"
          aria-label={`Open ${ticketKey}`}
        >
          <Ticket className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          {ticketKey}
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 hover:border-border/80 transition-all duration-150 ease-out motion-reduce:transition-none my-1">
      <button
        type="button"
        onClick={handlePillClick}
        className="flex items-center gap-1 font-mono text-dense text-muted-foreground hover:text-foreground shrink-0"
        aria-label={`Open ticket ${ticketKey}`}
      >
        <Ticket className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        {ticketKey}
      </button>
      {ticketTitle && (
        <button
          type="button"
          onClick={handlePillClick}
          className="text-xs text-foreground/80 hover:underline max-w-[160px] min-w-0"
        >
          <TruncatedText text={ticketTitle} />
        </button>
      )}
      {canUpdate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isChangingStatus}
              className={cn(
                "inline-flex items-center rounded px-1.5 py-px text-micro font-medium cursor-pointer hover:opacity-80 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                getStatusBadgeClass(currentStatus),
              )}
              aria-label="Change ticket status"
            >
              {isChangingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                TICKET_STATUS_DISPLAY[currentStatus] ?? currentStatus
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(s === currentStatus && "font-semibold")}
              >
                {TICKET_STATUS_DISPLAY[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-px text-micro font-medium",
            getStatusBadgeClass(currentStatus),
          )}
        >
          {TICKET_STATUS_DISPLAY[currentStatus] ?? currentStatus}
        </span>
      )}
    </div>
  );
}

export function CommentPill({ entity }: { entity: CommentEntityRef }) {
  const router = useRouter();
  const canViewTickets = useCan("build:tickets:view");
  const { data: ticket } = useQuery({
    ...ticketPermalinkQueryOptions(entity.projectId, entity.ticketId),
    enabled: canViewTickets,
  });

  const href = `/build/${entity.projectId}?ticket=${entity.ticketId}&comment=${entity.id}`;
  const label = ticket
    ? `Comment on ${formatTicketKey(ticket.projectKey, ticket.ticketNumber)}`
    : "Comment";

  const handleClick = useCallback(() => {
    router.push(href);
  }, [router, href]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-2 py-1 shadow-sm hover:shadow-md transition-all duration-150 ease-out motion-reduce:transition-none text-dense text-muted-foreground hover:text-foreground my-1"
      aria-label={label}
    >
      <MessageSquare className="h-3 w-3 shrink-0 text-primary" />
      {label}
    </button>
  );
}

