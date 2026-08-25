"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Trash2Icon } from "@animateicons/react/lucide";
import {
  useHelpdeskTickets,
  useHelpdeskRoutingRules,
  useDeleteHelpdeskRouting,
  HELPDESK_CATEGORIES,
  HELPDESK_CATEGORY_LABELS,
  type HelpdeskTicket,
  type TicketStatus,
} from "@/hooks/api/hr/helpdesk";
import { TicketDetailSheet } from "./ticket-detail-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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

function DeleteRoutingButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      variant="ghost"
      size="icon"
      aria-label="Delete routing rule"
      className="h-6 w-6 text-destructive hover:text-destructive"
      isPending={isPending}
      onClick={onClick}
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </LoadingButton>
  );
}

const QUEUE_PAGE_SIZE = 25;

export function QueueTab() {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const params: Record<string, unknown> = { page, pageSize: QUEUE_PAGE_SIZE };
  if (statusFilter !== "all") params.status = statusFilter;
  if (categoryFilter !== "all") params.category = categoryFilter;

  const { data, isLoading } = useHelpdeskTickets(params);
  const { data: routingRules } = useHelpdeskRoutingRules();
  const deleteRouting = useDeleteHelpdeskRouting();

  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleCategoryFilterChange = useCallback((value: string) => {
    setCategoryFilter(value);
    setPage(1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const handleDeleteRouting = async (ruleId: number) => {
    try {
      await deleteRouting.mutateAsync(ruleId);
      toast.success("Routing rule removed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="TODO">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="DONE">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
          <SelectTrigger className={cn("w-44", FILTER_SELECT_TRIGGER)}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {HELPDESK_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {HELPDESK_CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {data ? `${data.total} ticket${data.total !== 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No tickets found</p>
          <p className="text-xs text-muted-foreground mt-1">Adjust filters or wait for new submissions.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {data.items.map((ticket) => (
              <AdminTicketRow
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicketId(ticket.id)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-dense text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={page <= 1}
                  onClick={handlePrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={page >= totalPages}
                  onClick={handleNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Routing Rules</p>
        <p className="text-xs text-muted-foreground">Auto-assign tickets by category to a specific HR agent.</p>
        {routingRules && routingRules.length > 0 ? (
          <div className="divide-y divide-border">
            {routingRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between py-2">
                <span className="text-xs">
                  <span className="font-medium">{HELPDESK_CATEGORY_LABELS[rule.category as keyof typeof HELPDESK_CATEGORY_LABELS] ?? rule.category}</span>
                  <span className="text-muted-foreground"> → {rule.assigneeName ?? rule.assigneeUserId}</span>
                </span>
                <DeleteRoutingButton
                  isPending={deleteRouting.isPending}
                  onClick={() => handleDeleteRouting(rule.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No routing rules configured.</p>
        )}
      </div>

      <TicketDetailSheet
        ticketId={selectedTicketId}
        isAdmin
        onClose={() => setSelectedTicketId(null)}
      />
    </div>
  );
}

function AdminTicketRow({ ticket, onClick }: { ticket: HelpdeskTicket; onClick: () => void }) {
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
          {ticket.authorName ?? "Employee"} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}
          <span className={cn("ml-2 font-medium", PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
        </p>
      </div>
    </button>
  );
}
