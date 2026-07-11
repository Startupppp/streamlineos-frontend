"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { getUserInitials } from "@/features/projects/shared/resolve-user-name";

const STATUS_LABELS: Record<TicketStatus, string> = {
  TODO: "Open",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Resolved",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  TODO: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-100 text-blue-600",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto flex flex-col gap-0 p-0">
        {isLoading || !ticket ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-start gap-2 flex-wrap">
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
              <SheetTitle className="text-base mt-2 leading-snug">{ticket.title}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Opened by {ticket.authorName ?? "Employee"} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}
              </p>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {ticket.description && (
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}

              {isAdmin && (
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Admin Actions</p>
                  <div className="flex items-center gap-3">
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-8 w-40 text-xs">
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Comments ({ticket.comments.length})
                </p>
                <div className="space-y-4">
                  {ticket.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        {c.authorImage && <AvatarImage src={c.authorImage} />}
                        <AvatarFallback className="text-[10px]">
                          {getUserInitials({ name: c.authorName })}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-foreground">{c.authorName ?? "Team"}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border">
              <Textarea
                ref={commentRef}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="resize-none mb-2"
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
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
