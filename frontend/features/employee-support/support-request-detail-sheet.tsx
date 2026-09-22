"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserInitials } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { formatDateTime, formatShortDate } from "@/lib/date-utils";
import {
  SUPPORT_QUEUES,
  SUPPORT_QUEUE_LABELS,
  helpdeskCategoryLabel,
  isSupportQueue,
  type SupportQueue,
} from "@/lib/employee-support";
import { useAddMySupportComment, useMySupportRequest } from "@/hooks/api/employee-self-service/support";
import {
  useAddSupportQueueComment,
  useSupportQueueTicket,
  useUpdateSupportQueueTicket,
} from "@/hooks/api/hr/helpdesk";
import type { HelpdeskTicketDetail, TicketStatus } from "@/hooks/api/hr/helpdesk-schema";
import {
  ConfidentialBadge,
  QueueBadge,
  REQUEST_STATUS_LABELS,
  RequestPriorityBadge,
  RequestStatusBadge,
  SlaMarker,
} from "./support-request-badges";

const STATUSES: readonly TicketStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

function isTicketStatus(value: string): value is TicketStatus {
  return STATUSES.some((status) => status === value);
}

export type SupportRequestSurface = "self" | "agent";

interface SupportRequestDetailSheetProps {
  ticketId: number | null;
  surface: SupportRequestSurface;
  canWork: (queue: SupportQueue) => boolean;
  onClose: () => void;
}

function neverWorkable(): boolean {
  return false;
}

function SelfDetail(props: Omit<SupportRequestDetailSheetProps, "surface">) {
  const query = useMySupportRequest(props.ticketId);
  const addComment = useAddMySupportComment(props.ticketId);

  function handleComment(body: string) {
    return addComment.mutateAsync({ body });
  }

  return (
    <DetailBody
      ticketId={props.ticketId}
      ticket={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={query.refetch}
      canWork={neverWorkable}
      onComment={handleComment}
      isCommenting={addComment.isPending}
      onClose={props.onClose}
    />
  );
}

function AgentDetail(props: Omit<SupportRequestDetailSheetProps, "surface">) {
  const query = useSupportQueueTicket(props.ticketId);
  const addComment = useAddSupportQueueComment(props.ticketId);
  const update = useUpdateSupportQueueTicket(props.ticketId);

  function handleComment(body: string) {
    return addComment.mutateAsync({ body });
  }

  function handleUpdate(patch: { status?: TicketStatus; queue?: SupportQueue }) {
    return update.mutateAsync(patch);
  }

  return (
    <DetailBody
      ticketId={props.ticketId}
      ticket={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={query.refetch}
      canWork={props.canWork}
      onComment={handleComment}
      isCommenting={addComment.isPending}
      onUpdate={handleUpdate}
      isUpdating={update.isPending}
      onClose={props.onClose}
    />
  );
}

export function SupportRequestDetailSheet(props: SupportRequestDetailSheetProps) {
  const { surface, ...rest } = props;
  return surface === "self" ? <SelfDetail {...rest} /> : <AgentDetail {...rest} />;
}

interface DetailBodyProps {
  ticketId: number | null;
  ticket: HelpdeskTicketDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => unknown;
  canWork: (queue: SupportQueue) => boolean;
  onComment: (body: string) => Promise<unknown>;
  isCommenting: boolean;
  onUpdate?: (patch: { status?: TicketStatus; queue?: SupportQueue }) => Promise<unknown>;
  isUpdating?: boolean;
  onClose: () => void;
}

function DetailBody({
  ticketId,
  ticket,
  isLoading,
  isError,
  error,
  onRetry,
  canWork,
  onComment,
  isCommenting,
  onUpdate,
  isUpdating = false,
  onClose,
}: DetailBodyProps) {
  const [commentBody, setCommentBody] = useState("");
  const open = ticketId !== null;
  const workable = ticket !== undefined && onUpdate !== undefined && canWork(ticket.queue);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onClose();
  }

  function handleCommentChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setCommentBody(event.target.value);
  }

  async function handleSubmitComment() {
    const body = commentBody.trim();
    if (!body) return;
    try {
      await onComment(body);
      setCommentBody("");
      toast.success("Reply posted");
    } catch (submitError) {
      toast.error(getErrorMessage(submitError));
    }
  }

  async function handleStatusChange(value: string) {
    if (!onUpdate || !isTicketStatus(value)) return;
    try {
      await onUpdate({ status: value });
      toast.success(`Status set to ${REQUEST_STATUS_LABELS[value]}`);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError));
    }
  }

  async function handleQueueChange(value: string) {
    if (!onUpdate || !isSupportQueue(value)) return;
    try {
      await onUpdate({ queue: value });
      toast.success(`Moved to the ${SUPPORT_QUEUE_LABELS[value]} queue`);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError));
    }
  }

  function handleRetry() {
    void onRetry();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <SheetTitle className="sr-only">Loading request</SheetTitle>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError || !ticket ? (
          <div className="flex flex-1 flex-col p-6">
            <SheetTitle className="sr-only">Request unavailable</SheetTitle>
            <ErrorState
              className="flex-1"
              title="Couldn't load this request"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <RequestStatusBadge status={ticket.status} />
                <QueueBadge queue={ticket.queue} />
                <RequestPriorityBadge priority={ticket.priority} />
                {ticket.isConfidential ? <ConfidentialBadge /> : null}
                <SlaMarker ticket={ticket} />
              </div>
              <SheetTitle className="mt-2 text-base leading-snug">{ticket.title}</SheetTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {helpdeskCategoryLabel(ticket.category)} · opened by {ticket.authorName ?? "Employee"} on{" "}
                {formatShortDate(ticket.createdAt)}
                {ticket.assigneeName ? ` · assigned to ${ticket.assigneeName}` : " · unassigned"}
              </p>
            </SheetHeader>

            <SheetBody className="divide-y divide-border p-0">
              {ticket.description ? (
                <div className="px-6 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description}</p>
                </div>
              ) : null}

              <div className="px-6 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service level</p>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">First response due</dt>
                  <dd className="font-mono tabular-nums">{formatDateTime(ticket.firstResponseDueAt)}</dd>
                  <dt className="text-muted-foreground">First responded</dt>
                  <dd className="font-mono tabular-nums">{ticket.firstRespondedAt ? formatDateTime(ticket.firstRespondedAt) : "Not yet"}</dd>
                  <dt className="text-muted-foreground">Resolution due</dt>
                  <dd className="font-mono tabular-nums">{formatDateTime(ticket.slaDueAt)}</dd>
                  {ticket.escalatedAt ? (
                    <>
                      <dt className="text-muted-foreground">Escalated</dt>
                      <dd className="font-mono tabular-nums">{formatDateTime(ticket.escalatedAt)}</dd>
                    </>
                  ) : null}
                </dl>
              </div>

              {workable ? (
                <div className="px-6 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work this request</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={ticket.status} onValueChange={handleStatusChange} disabled={isUpdating}>
                      <SelectTrigger className="w-40" aria-label="Status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {REQUEST_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={ticket.queue} onValueChange={handleQueueChange} disabled={isUpdating}>
                      <SelectTrigger className="w-40" aria-label="Queue">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                        {SUPPORT_QUEUES.map((queue) => (
                          <SelectItem key={queue} value={queue}>
                            {SUPPORT_QUEUE_LABELS[queue]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              <div className="px-6 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Conversation ({ticket.comments.length})
                </p>
                {ticket.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No replies yet.</p>
                ) : (
                  <div className="space-y-4">
                    {ticket.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-7 shrink-0">
                          {comment.authorImage ? <AvatarImage src={resolveImageUrl(comment.authorImage)} /> : null}
                          <AvatarFallback className="text-micro">{getUserInitials({ name: comment.authorName })}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-foreground">{comment.authorName ?? "Team"}</span>
                            <span className="text-micro text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SheetBody>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4 sm:flex-col">
              <Textarea
                value={commentBody}
                onChange={handleCommentChange}
                placeholder="Write a reply"
                rows={3}
                className="mb-2 resize-none"
                aria-label="Reply"
              />
              <LoadingButton size="sm" isPending={isCommenting} loadingText="Posting" disabled={!commentBody.trim()} onClick={handleSubmitComment}>
                Post reply
              </LoadingButton>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
