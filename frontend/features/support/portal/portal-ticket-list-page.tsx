"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PlusIcon } from "@animateicons/react/lucide";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalTickets } from "@/hooks/api/support/portal";
import { NewTicketSheet } from "./new-ticket-sheet";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, formatCategoryLabel } from "./portal-ticket-constants";

function TicketCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function PortalTicketListPage() {
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const { data, isLoading, isError, refetch } = usePortalTickets();

  const handleOpenNewTicket = useCallback(() => setNewTicketOpen(true), []);

  return (
    <PageWrapper
      variant="display"
      title="My Support Tickets"
      subtitle="View and manage the support tickets you've raised"
      actions={
        <AnimatedIconButton size="sm" className="h-8 text-xs" onClick={handleOpenNewTicket} icon={PlusIcon} iconClassName="mr-1.5">
          New Ticket
        </AnimatedIconButton>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <TicketCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="ticket"
          title="No support tickets yet"
          description="Raise a ticket if you need help and our support team will get back to you."
          action={{ label: "New Ticket", onClick: handleOpenNewTicket }}
          className="flex-1"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/portal/${ticket.id}`}
              className="group rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <TruncatedText text={ticket.title} lines={2} className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors" />
                <Badge variant="outline" className={STATUS_COLORS[ticket.status]}>
                  {STATUS_LABELS[ticket.status]}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority]}>
                  {ticket.priority}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {formatCategoryLabel(ticket.category)}
                </Badge>
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
              </p>
            </Link>
          ))}
        </div>
      )}

      <NewTicketSheet open={newTicketOpen} onOpenChange={setNewTicketOpen} />
    </PageWrapper>
  );
}
