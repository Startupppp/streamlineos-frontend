"use client";

import { useCallback, useMemo, useState } from "react";
import { useProject, useTickets, useUpdateTicket } from "@/hooks/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
} from "@/features/projects/shared/pm-chrome";
import { TriageRow } from "./triage-row";
import type { Ticket } from "@/types/projects";

const TRIAGE_STATUS = "TODO";
const ACCEPT_STATUS = "IN_PROGRESS";
const DECLINE_STATUS = "CANCELLED";
const PAGE_LIMIT = 50;

interface TriagePageProps {
  projectId: number;
}

export function TriagePage({ projectId }: TriagePageProps) {
  const router = useRouter();
  const {
    data: ticketPage,
    isLoading: ticketsLoading,
    isError,
    refetch,
  } = useTickets(projectId, {
    status: TRIAGE_STATUS,
    limit: PAGE_LIMIT,
    orderBy: "created",
    orderDir: "asc",
  });
  const { data: project, isLoading: projectLoading } = useProject(projectId);

  const updateTicket = useUpdateTicket(projectId);
  const [pendingAccept, setPendingAccept] = useState<Set<number>>(new Set());
  const [pendingDecline, setPendingDecline] = useState<Set<number>>(new Set());

  const isLoading = projectLoading || ticketsLoading;
  const tickets = useMemo(() => ticketPage?.data ?? [], [ticketPage?.data]);

  const handleAccept = useCallback(
    (ticketId: number) => {
      setPendingAccept((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, status: ACCEPT_STATUS },
        {
          onSuccess: () => {
            setPendingAccept((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.success("Ticket moved to In Progress");
          },
          onError: (err) => {
            setPendingAccept((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [updateTicket],
  );

  const handleDecline = useCallback(
    (ticketId: number) => {
      setPendingDecline((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, status: DECLINE_STATUS },
        {
          onSuccess: () => {
            setPendingDecline((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.success("Ticket declined");
          },
          onError: (err) => {
            setPendingDecline((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [updateTicket],
  );

  const handleOpen = useCallback(
    (ticket: Ticket) => {
      const href = getTicketDetailHref(
        projectId,
        project?.key,
        ticket.ticketNumber,
      );
      router.push(href);
    },
    [router, projectId, project?.key],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Triage" subtitle="Review and process incoming issues">
        <PmPageShell>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Triage" subtitle="Review and process incoming issues">
        <PmPageShell>
          <EmptyState
            illustrationPreset="alert"
            title="Failed to load triage queue"
            description="Something went wrong fetching tickets."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1"
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const total = ticketPage?.total ?? 0;

  return (
    <PageWrapper
      title="Triage"
      subtitle={
        total > 0
          ? `${total} issue${total !== 1 ? "s" : ""} awaiting triage`
          : "Review and process incoming issues"
      }
    >
      <PmPageShell>
        {tickets.length === 0 ? (
          <EmptyState
            illustrationPreset="tasks"
            title="Nothing to triage"
            description="All issues have been processed. New issues added to the backlog will appear here."
            className="flex-1"
            compact={false}
          />
        ) : (
          <PmSection index={0}>
            <PmStaggerList className="flex flex-col gap-2.5">
              {tickets.map((ticket) => (
                <TriageRow
                  key={ticket.id}
                  ticket={ticket}
                  projectKey={project?.key}
                  isAccepting={pendingAccept.has(ticket.id)}
                  isDeclining={pendingDecline.has(ticket.id)}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onOpen={handleOpen}
                  isSelected={false}
                />
              ))}
            </PmStaggerList>
            {total > PAGE_LIMIT ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Showing first {PAGE_LIMIT} of {total} issues
              </p>
            ) : null}
          </PmSection>
        )}
      </PmPageShell>
    </PageWrapper>
  );
}
