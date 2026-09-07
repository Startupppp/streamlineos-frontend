"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
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
import {
  useSuggestReply,
  useImproveReply,
  useTranslateDraft,
  useGenerateHandoffSummary,
  useAnalyzeTicket,
} from "@/hooks/api/support/ai";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { TicketRiskBadge } from "@/features/support/inbox/ticket-risk-badge";
import { TicketPresence } from "@/features/support/inbox/ticket-presence";
import { TicketSnoozeControl } from "@/features/support/inbox/ticket-snooze-control";
import type { SupportTicket, SupportTicketStatus } from "@/types/support";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-status-info-surface text-status-info-ink",
  HIGH: "bg-status-warning-surface text-status-warning-ink",
  URGENT: "bg-status-danger-surface text-status-danger-ink",
};

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TicketDetailHeaderProps {
  ticket: SupportTicket;
  onBack: () => void;
  onInsertReply?: (body: string) => void;
  replyDraftContent?: string;
}

export function TicketDetailHeader({ ticket, onBack, onInsertReply, replyDraftContent }: TicketDetailHeaderProps) {
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

  const canViewTicket = useCan("support:tickets:view");

  const suggestReply = useSuggestReply(ticket.id);
  const improveReply = useImproveReply(ticket.id);
  const translateDraft = useTranslateDraft(ticket.id);
  const handoffSummary = useGenerateHandoffSummary(ticket.id);
  const analyzeTicket = useAnalyzeTicket(ticket.id);

  const aiActions = useMemo<AiAction[]>(() => [
    {
      key: "suggest-reply",
      label: "Suggest reply",
      description: "Generate a reply based on the ticket context",
      run: async () => {
        const result = await suggestReply.mutateAsync();
        if (result?.type === "reply") return { text: result.payload.body };
        return { text: "" };
      },
      onApply: onInsertReply,
      applyLabel: "Insert reply",
    },
    {
      key: "improve-reply",
      label: "Improve reply",
      description: "Rewrite and polish the current draft",
      run: async () => {
        const result = await improveReply.mutateAsync({ content: replyDraftContent ?? "" });
        return { text: result.improved };
      },
      onApply: onInsertReply,
      applyLabel: "Apply improved reply",
    },
    {
      key: "translate-draft",
      label: "Translate draft",
      description: "Translate the current draft to English",
      run: async () => {
        const result = await translateDraft.mutateAsync({ language: "English", content: replyDraftContent });
        return { text: result.translatedText };
      },
      onApply: onInsertReply,
      applyLabel: "Use translation",
    },
    {
      key: "handoff-summary",
      label: "Handoff brief",
      description: "Summarize this ticket for a handoff",
      run: async () => {
        const result = await handoffSummary.mutateAsync();
        if (result?.type === "handoff_summary") return { text: result.payload.summary };
        return { text: "" };
      },
    },
    {
      key: "summarize-thread",
      label: "Summarize thread",
      description: "Condense the full conversation into key points",
      run: async () => {
        const results = await analyzeTicket.mutateAsync();
        const found = results?.find((s) => s.type === "summary");
        if (found?.type === "summary") return { text: found.payload.text };
        return { text: "" };
      },
    },
  ], [suggestReply, improveReply, translateDraft, handoffSummary, analyzeTicket, onInsertReply, replyDraftContent]);

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
            <Star className={cn("h-3.5 w-3.5", isFollowing && "fill-amber-400 text-status-warning-ink")} />
          </Button>
          <div className="min-w-0">
            <TruncatedText text={toTitleCase(ticket.title)} className="text-sm font-bold" />
            <TruncatedText text={`#${ticket.id}${ticket.client?.name ? ` - ${ticket.client.name}` : ""}`} className="text-dense text-muted-foreground" />
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
          {canViewTicket && (
            <AiActionsMenu
              actions={aiActions}
              menuLabel="AI assist"
              align="end"
              defaultSurface="popover"
            />
          )}
          <Select value={ticket.queueId ? String(ticket.queueId) : "none"} onValueChange={handleQueueValueChange}>
            <SelectTrigger className="h-9 text-sm w-[130px]">
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
            <SelectTrigger className="h-9 text-sm w-[120px]">
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
