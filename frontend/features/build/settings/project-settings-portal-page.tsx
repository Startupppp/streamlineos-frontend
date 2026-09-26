"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  useClientVisibility,
  useUpdateTicketVisibility,
  useUpdateMilestoneVisibility,
} from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { PmPageShell, PmPanel, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

interface ProjectSettingsPortalPageProps {
  projectId: number;
}

interface TicketRowProps {
  ticket: { id: number; ticketNumber: number; title: string; clientVisible: boolean };
  onToggle: (ticketId: number, clientVisible: boolean) => void;
  isPending: boolean;
  canManage: boolean;
}

function TicketVisibilityRow({ ticket, onToggle, isPending, canManage }: TicketRowProps) {
  const handleToggle = useCallback(
    (checked: boolean) => onToggle(ticket.id, checked),
    [onToggle, ticket.id],
  );

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm truncate">
          #{ticket.ticketNumber} {ticket.title}
        </span>
      </div>
      <Switch
        checked={ticket.clientVisible}
        onCheckedChange={handleToggle}
        disabled={isPending || !canManage}
        aria-label={`${ticket.clientVisible ? "Hide" : "Show"} ticket #${ticket.ticketNumber} from client portal`}
      />
    </div>
  );
}

interface MilestoneRowProps {
  milestone: { id: number; name: string; clientVisible: boolean };
  onToggle: (milestoneId: number, clientVisible: boolean) => void;
  isPending: boolean;
  canManage: boolean;
}

function MilestoneVisibilityRow({ milestone, onToggle, isPending, canManage }: MilestoneRowProps) {
  const handleToggle = useCallback(
    (checked: boolean) => onToggle(milestone.id, checked),
    [onToggle, milestone.id],
  );

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm truncate">{milestone.name}</span>
      </div>
      <Switch
        checked={milestone.clientVisible}
        onCheckedChange={handleToggle}
        disabled={isPending || !canManage}
        aria-label={`${milestone.clientVisible ? "Hide" : "Show"} milestone ${milestone.name} from client portal`}
      />
    </div>
  );
}

export function ProjectSettingsPortalPage({ projectId }: ProjectSettingsPortalPageProps) {
  const canManage = useCan("build:clientvisibility:manage");
  const ticketPager = useCursorPager();
  const milestonePager = useCursorPager();
  const { data, isLoading, isError, error, refetch } = useClientVisibility(projectId, {
    ticketCursor: ticketPager.cursor,
    milestoneCursor: milestonePager.cursor,
  });
  const updateTicket = useUpdateTicketVisibility(projectId);
  const updateMilestone = useUpdateMilestoneVisibility(projectId);

  const tickets = data?.tickets.data ?? [];
  const ticketPagination = data?.tickets.pagination;
  const milestones = data?.milestones.data ?? [];
  const milestonePagination = data?.milestones.pagination;
  const isEmpty = !isLoading && !isError && tickets.length === 0 && milestones.length === 0 && !ticketPager.hasPrevious && !milestonePager.hasPrevious;

  const pageState = usePageState({
    permission: "build:clientvisibility:manage",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  const handleTicketToggle = useCallback(
    (ticketId: number, clientVisible: boolean) => {
      updateTicket.mutate(
        { ticketId, clientVisible },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [updateTicket],
  );

  const handleMilestoneToggle = useCallback(
    (milestoneId: number, clientVisible: boolean) => {
      updateMilestone.mutate(
        { milestoneId, clientVisible },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [updateMilestone],
  );

  const handleRefetch = useCallback(() => void refetch(), [refetch]);

  return (
    <PageWrapper
      title="Client Portal"
      subtitle="Control which tickets and milestones are visible to external clients"
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          }
          empty={
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="projects"
              title="No portal content yet"
              description="Add tickets or milestones to this project to control client visibility."
            />
          }
          onRetry={handleRefetch}
          className="flex-1"
        >
          {(tickets.length > 0 || ticketPager.hasPrevious) ? (
            <PmSection index={0}>
              <PmPanel className="flex min-h-0 flex-col p-0" solid>
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Tickets</p>
                </div>
                <div className="px-4 py-2">
                  {tickets.map((ticket) => (
                    <TicketVisibilityRow
                      key={ticket.id}
                      ticket={ticket}
                      onToggle={handleTicketToggle}
                      isPending={updateTicket.isPending}
                      canManage={canManage}
                    />
                  ))}
                </div>
                {(ticketPagination?.hasMore || ticketPager.hasPrevious) ? (
                  <div className="px-4 pb-2">
                    <TablePagination
                      mode="cursor"
                      rowCount={tickets.length}
                      hasMore={ticketPagination?.hasMore ?? false}
                      hasPrevious={ticketPager.hasPrevious}
                      onNext={() => ticketPager.goNext(ticketPagination?.nextCursor)}
                      onPrevious={ticketPager.goPrevious}
                    />
                  </div>
                ) : null}
              </PmPanel>
            </PmSection>
          ) : null}
          {(milestones.length > 0 || milestonePager.hasPrevious) ? (
            <PmSection index={1}>
              <PmPanel className="flex min-h-0 flex-col p-0" solid>
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Milestones</p>
                </div>
                <div className="px-4 py-2">
                  {milestones.map((milestone) => (
                    <MilestoneVisibilityRow
                      key={milestone.id}
                      milestone={milestone}
                      onToggle={handleMilestoneToggle}
                      isPending={updateMilestone.isPending}
                      canManage={canManage}
                    />
                  ))}
                </div>
                {(milestonePagination?.hasMore || milestonePager.hasPrevious) ? (
                  <div className="px-4 pb-2">
                    <TablePagination
                      mode="cursor"
                      rowCount={milestones.length}
                      hasMore={milestonePagination?.hasMore ?? false}
                      hasPrevious={milestonePager.hasPrevious}
                      onNext={() => milestonePager.goNext(milestonePagination?.nextCursor)}
                      onPrevious={milestonePager.goPrevious}
                    />
                  </div>
                ) : null}
              </PmPanel>
            </PmSection>
          ) : null}
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
