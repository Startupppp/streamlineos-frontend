"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHelpdeskTicket,
  useUpdateHelpdeskTicket,
  useAddHelpdeskComment,
  HELPDESK_CATEGORY_LABELS,
  type TicketStatus,
} from "@/hooks/api/hr/helpdesk";
import { getUserInitials } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";

const STATUS_LABELS: Record<TicketStatus, string> = {
  TODO: "Open",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Resolved",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-status-info-surface text-status-info-ink",
  IN_REVIEW: "bg-status-warning-surface text-status-warning-ink",
  DONE: "bg-status-success-surface text-status-success-ink",
};

interface Props {
  ticketId: number | null;
  isAdmin: boolean;
  onClose: () => void;
}

export function TicketDetailSheet({ ticketId, isAdmin, onClose }: Props) {
  const open = ticketId !== null;
  const { data: ticket, isLoading } = useHelpdeskTicket(ticketId ?? 0);
  const updateTicket = useUpdateHelpdeskTicket(ticketId ?? 0);
  const addComment = useAddHelpdeskComment(ticketId ?? 0);

  const [commentBody, setCommentBody] = useState("");
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const handleStatusChange = async (status: string) => {
    if (!ticketId) return;
    try {
      await updateTicket.mutateAsync({ status: status as TicketStatus });
      toast.success("Status updated.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubmitComment = async () => {
    if (!commentBody.trim() || !ticketId) return;
    try {
      await addComment.mutateAsync({ body: commentBody.trim() });
      setCommentBody("");
      toast.success("Comment added.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {isLoading || !ticket ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
              <div className="flex flex-wrap items-start gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
                {ticket.isConfidential && (
                  <Badge variant="secondary" className="text-xs">Confidential</Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {ticket.category ? (HELPDESK_CATEGORY_LABELS[ticket.category as keyof typeof HELPDESK_CATEGORY_LABELS] ?? ticket.category) : "Other"}
                </Badge>
              </div>
              <SheetTitle className="mt-2 text-base leading-snug">{ticket.title}</SheetTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Opened by {ticket.authorName ?? "Employee"} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}
              </p>
            </SheetHeader>

            <SheetBody className="divide-y divide-border p-0">
              {ticket.description && (
                <div className="px-6 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description}</p>
                </div>
              )}

              {isAdmin && (
                <div className="px-6 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Actions</p>
                  <div className="flex items-center gap-3">
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="IN_REVIEW">In Review</SelectItem>
                        <SelectItem value="DONE">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="px-6 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Comments ({ticket.comments.length})
                </p>
                <div className="space-y-4">
                  {ticket.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="w-7 shrink-0">
                        {c.authorImage && <AvatarImage src={resolveImageUrl(c.authorImage)} />}
                        <AvatarFallback className="text-micro">
                          {getUserInitials({ name: c.authorName })}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-foreground">{c.authorName ?? "Team"}</span>
                          <span className="text-micro text-muted-foreground">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SheetBody>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4 sm:flex-col">
              <Textarea
                ref={commentRef}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="mb-2 resize-none"
              />
              <LoadingButton
                size="sm"
                isPending={addComment.isPending}
                loadingText="Posting…"
                disabled={!commentBody.trim()}
                onClick={handleSubmitComment}
              >
                Post Comment
              </LoadingButton>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
