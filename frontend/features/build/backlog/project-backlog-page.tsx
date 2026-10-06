"use client";

import { useMemo, useCallback, useEffect } from "react";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectBoardTickets } from "@/hooks/api/build/tickets";
import type { Ticket } from "@/types/projects";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { TicketFilterBar } from "@/features/build/shared/ticket-filter-bar";
import {
  TICKET_FILTER_SPEC,
  useTicketFilterParams,
} from "@/features/build/shared/use-ticket-filter-params";
import { categoryParams } from "@/components/list-view/list-filter-spec";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";
import { buildTicketDetailUrl } from "@/features/build/ticket-details/build-ticket-detail-url";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ProjectLoadFallback } from "@/features/build/shared/project-load-fallback";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { PmPageShell, PM_TOOLBAR } from "@/components/pm-chrome";
import { useCan } from "@/hooks/api/access";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import {
  BACKLOG_TABLE_HEADERS,
  getBacklogColumns,
  renderBacklogMobileCard,
} from "./backlog-table-columns";
import { useBacklogBulkActions } from "./use-backlog-bulk-actions";

interface ProjectBacklogPageProps {
  projectId: string;
}

export function ProjectBacklogPage({
  projectId: projectIdStr,
}: ProjectBacklogPageProps) {
  const canUpdate = useCan("build:tickets:update");
  const projectId = parseInt(projectIdStr);
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const { setListParams } = useBuildListUrlState();
  const {
    q, selectedStatuses, selectedPriorities, selectedTypes,
    selectedAssignees, selectedLabels, selectedCycles,
    dueDateFrom, dueDateTo, activeFilterCount,
  } = useTicketFilterParams();
  const filtersActive = Boolean(q) || activeFilterCount > 0;
  const backlogFilters = {
    q: q || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses.join(",") : undefined,
    priority: selectedPriorities.length > 0 ? selectedPriorities.join(",") : undefined,
    type: selectedTypes.length > 0 ? selectedTypes.join(",") : "TASK,BUG,STORY",
    assigneeId: selectedAssignees.length > 0 ? selectedAssignees.join(",") : undefined,
    labels: selectedLabels.length > 0 ? selectedLabels.join(",") : undefined,
    cycle: selectedCycles.length > 0 ? selectedCycles.join(",") : undefined,
    dueDateFrom: dueDateFrom || undefined,
    dueDateTo: dueDateTo || undefined,
  };
  const {
    data,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorValue,
    refetch: refetchProject,
  } = useProject(projectId);
  const projectState = usePageState({
    permission: "build:view",
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorValue,
    isEmpty: !data,
  });
  const {
    data: boardTickets,
    isLoading: ticketsLoading,
    isError: ticketsError,
    error: ticketsErrorValue,
    refetch: refetchTickets,
    isTruncated,
    fetchNextPage: fetchMoreTickets,
    isFetchingNextPage: isFetchingMoreTickets,
  } = useProjectBoardTickets(projectId, backlogFilters);
  const handleRetryProject = useCallback(
    () => void refetchProject(),
    [refetchProject],
  );
  const handleRetryTickets = useCallback(
    () => void refetchTickets(),
    [refetchTickets],
  );
  const { data: cycles } = useCycles(projectId);

  const {
    selectedIds,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
    handleBulkParent,
    handleClearSelection,
    handleSelectionChange,
  } = useBacklogBulkActions(projectId);

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const members = useMemo(() => {
    if (!data?.members) return [];
    return data.members.flatMap((m) => {
      const user = m.user;
      if (!user) return [];
      return [
        {
          id: user.id,
          name: user.name ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
        },
      ];
    });
  }, [data]);

  const tickets = useMemo(() => boardTickets ?? [], [boardTickets]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, data?.key, id, tickets);
      if (href) requestLeave(() => router.push(href));
    },
    [router, projectId, data?.key, tickets, requestLeave],
  );

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(
      projectId,
      data.key,
      selectedTicketId,
      tickets,
    );
    if (href) requestLeave(() => router.replace(href));
  }, [selectedTicketId, data, tickets, projectId, requestLeave, router]);

  const handleClearFilters = useCallback(() => {
    const cleared: Record<string, string | null> = { q: null, page: null };
    for (const param of categoryParams(TICKET_FILTER_SPEC)) cleared[param] = null;
    setListParams(cleared);
  }, [setListParams]);

  const handleRowClick = useCallback(
    (ticket: Ticket) => handleTicketSelect(ticket.id),
    [handleTicketSelect],
  );

  const columns = useMemo(
    () => getBacklogColumns(data?.key),
    [data?.key],
  );
  const renderMobileCard = useCallback(
    (ticket: Ticket) => renderBacklogMobileCard(data?.key, ticket),
    [data?.key],
  );

  if (projectState.kind === "loading") return (
    <PageWrapper title="Backlog" subtitle="Loading...">
      <DataTableSkeleton
        mobileCards
        rows={12}
        headers={BACKLOG_TABLE_HEADERS}
        className="flex-1 min-h-0"
      />
    </PageWrapper>
  );

  if (projectState.kind === "error" || projectState.kind === "not-found") return (
    <ProjectLoadFallback
      title="Backlog"
      error={projectErrorValue}
      onRetry={handleRetryProject}
    />
  );

  if (projectState.kind !== "ready" || !data) return (
    <PageWrapper title="Backlog">
      <PageState
        resolution={projectState}
        loading={null}
        empty={
          <EmptyState
            className="flex-1"
            illustrationPreset="projects"
            title="Project unavailable"
            description="This project could not be loaded. Pick another project to carry on."
            action={{ label: "All Projects", href: "/build/projects" }}
          />
        }
      >
        {null}
      </PageState>
    </PageWrapper>
  );

  return (
    <PageWrapper
      title="Backlog"
      subtitle="Manage and prioritize project work"
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={
        <div className={PM_TOOLBAR}>
          <TicketFilterBar
            className="w-full"
            projectId={projectId}
            members={members}
            statuses={data?.statuses}
          />
        </div>
      }
    >
      <PmPageShell>
        {canUpdate && selectedIds.size > 0 ? (
          <BulkActionBar
            selectedCount={selectedIds.size}
            members={members}
            cycles={cycles ?? []}
            statuses={data?.statuses}
            projectId={projectId}
            excludeIds={selectedIds}
            onBulkStatus={handleBulkStatus}
            onBulkPriority={handleBulkPriority}
            onBulkAssignee={handleBulkAssignee}
            onBulkCycle={handleBulkCycle}
            onBulkParent={handleBulkParent}
            onClear={handleClearSelection}
          />
        ) : null}

        <BuildListSurface<Ticket>
          permission="build:tickets:view"
          rows={tickets}
          columns={columns}
          isLoading={ticketsLoading}
          isError={ticketsError}
          error={ticketsErrorValue}
          isFiltered={filtersActive}
          getRowKey={(ticket) => ticket.id}
          onRowClick={handleRowClick}
          mobileCard={renderMobileCard}
          selection={
            canUpdate
              ? {
                  selected: selectedIds,
                  onChange: handleSelectionChange,
                  getRowLabel: (ticket) => ticket.title ?? "",
                }
              : undefined
          }
          minWidth="640px"
          empty={
            <EmptyState
              className="flex-1"
              illustrationPreset="projects"
              title="No tickets yet"
              description="Create a ticket to get started."
            />
          }
          filteredEmpty={
            <EmptyState
              className="flex-1"
              illustrationPreset="projects"
              title="No tickets yet"
              filtersActive
              onClearFilters={handleClearFilters}
            />
          }
          onRetry={handleRetryTickets}
          loadingHeaders={BACKLOG_TABLE_HEADERS}
          loadingRows={12}
        />
        <InfiniteScrollSentinel
          hasNextPage={isTruncated}
          isFetchingNextPage={isFetchingMoreTickets}
          onLoadMore={fetchMoreTickets}
          label="Load more tickets"
        />
      </PmPageShell>
    </PageWrapper>
  );
}
