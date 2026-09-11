"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { PlusIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  useHelpdeskTickets,
  HELPDESK_CATEGORY_LABELS,
  type HelpdeskTicket,
  type TicketStatus,
  type HelpdeskListParams,
} from "@/hooks/api/hr/helpdesk";
import { CreateTicketDialog } from "./create-ticket-dialog";
import { TicketDetailSheet } from "./ticket-detail-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_COLORS: Record<TicketStatus, string> = {
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-status-info-surface text-status-info-ink",
  IN_REVIEW: "bg-status-warning-surface text-status-warning-ink",
  DONE: "bg-status-success-surface text-status-success-ink",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  TODO: "Open",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Resolved",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-status-info-ink",
  HIGH: "text-status-warning-ink",
  URGENT: "text-status-danger-ink",
};

const MY_TICKETS_PAGE_SIZE = 20;

export function MyTicketsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const currentCursor = cursorHistory[pageIndex];
  const params: HelpdeskListParams = { limit: MY_TICKETS_PAGE_SIZE, cursor: currentCursor };

  const { data, isLoading, isError, error, refetch } = useHelpdeskTickets(params);

  const handleNextPage = useCallback(() => {
    if (!data?.pagination.nextCursor) return;
    setCursorHistory((prev) => {
      const next = [...prev];
      next[pageIndex + 1] = data.pagination.nextCursor ?? undefined;
      return next;
    });
    setPageIndex((i) => i + 1);
  }, [data, pageIndex]);

  const handlePrevPage = useCallback(() => {
    if (pageIndex <= 0) return;
    setPageIndex((i) => i - 1);
  }, [pageIndex]);

  const displayPage = pageIndex + 1;

  function handleCreateOpen() {
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <AnimatedIconButton
          icon={PlusIcon}
          iconSize={14}
          iconClassName="mr-1.5"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          New Request
        </AnimatedIconButton>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          compact
          title="Couldn't load your requests"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : !data || data.data.length === 0 ? (
        <EmptyState illustrationPreset="default" title="No tickets yet" description="Submit a request when you need HR support." action={{ label: "New Request", onClick: handleCreateOpen }} className="py-16" />
      ) : (
        <>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {data.data.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicketId(ticket.id)}
              />
            ))}
          </div>
          {(pageIndex > 0 || data.pagination.hasMore) && (
            <CursorPageControls
              page={displayPage}
              hasNext={data.pagination.hasMore}
              disabled={isLoading}
              onPrevious={handlePrevPage}
              onNext={handleNextPage}
            />
          )}
        </>
      )}

      <CreateTicketDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <TicketDetailSheet
        ticketId={selectedTicketId}
        isAdmin={false}
        onClose={() => setSelectedTicketId(null)}
      />
    </div>
  );
}

function TicketRow({ ticket, onClick }: { ticket: HelpdeskTicket; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={cn("text-micro font-semibold px-1.5 py-0.5 rounded-full", STATUS_COLORS[ticket.status])}>
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="text-micro text-muted-foreground capitalize">
            {ticket.category ? (HELPDESK_CATEGORY_LABELS[ticket.category as keyof typeof HELPDESK_CATEGORY_LABELS] ?? ticket.category) : "Other"}
          </span>
          {ticket.isConfidential && (
            <Badge variant="secondary" className="text-micro h-4 px-1">Confidential</Badge>
          )}
        </div>
        <TruncatedText text={ticket.title} className="text-sm font-medium text-foreground" />
        <p className="text-dense text-muted-foreground mt-0.5">
          {format(new Date(ticket.createdAt), "MMM d, yyyy")}
          <span className={cn("ml-2 font-medium", PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
        </p>
      </div>
    </button>
  );
}
