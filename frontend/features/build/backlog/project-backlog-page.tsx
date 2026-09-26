"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useProject, useCycles } from "@/hooks/api";
import { useBulkUpdateTickets, useProjectBoardTickets } from "@/hooks/api/build";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build";
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
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";

const BACKLOG_TABLE_HEADERS = [
  "ID",
  "Title",
  "Status",
  "Priority",
  "Assignee",
  "Created",
] as const;
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import type { Ticket } from "@/types/projects";
import { TicketTypeIcon } from "@/features/build/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { PmPageShell, PM_TOOLBAR, PmPanel } from "@/components/pm-chrome";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { useCan } from "@/hooks/api/access";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";

interface ProjectBacklogPageProps {
  projectId: string;
}

export function ProjectBacklogPage({ projectId: projectIdStr }: ProjectBacklogPageProps) {
  const canUpdate = useCan("build:tickets:update");
  const projectId = parseInt(projectIdStr);
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const { setListParams } = useBuildListUrlState();
  const {
    q,
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    dueDateFrom,
    dueDateTo,
    activeFilterCount,
  } = useTicketFilterParams();
  const filtersActive = Boolean(q) || activeFilterCount > 0;
  const backlogFilters = {
    q: q || undefined,
    status:
      selectedStatuses.length > 0 ? selectedStatuses.join(",") : undefined,
    priority:
      selectedPriorities.length > 0
        ? selectedPriorities.join(",")
        : undefined,
    type: selectedTypes.length > 0 ? selectedTypes.join(",") : undefined,
    assigneeId:
      selectedAssignees.length > 0
        ? selectedAssignees.join(",")
        : undefined,
    labels:
      selectedLabels.length > 0 ? selectedLabels.join(",") : undefined,
    cycle:
      selectedCycles.length > 0 ? selectedCycles.join(",") : undefined,
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
  const isLoading = projectLoading || ticketsLoading;
  const handleRetryProject = useCallback(() => void refetchProject(), [refetchProject]);
  const handleRetryTickets = useCallback(() => void refetchTickets(), [refetchTickets]);
  const { data: cycles } = useCycles(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const tickets = useMemo(() => boardTickets ?? [], [boardTickets]);

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

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, data?.key, id, tickets);
      if (href) requestLeave(() => router.push(href));
    },
    [router, projectId, data?.key, tickets, requestLeave],
  );

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(projectId, data.key, selectedTicketId, tickets);
    if (href) requestLeave(() => router.replace(href));
  }, [selectedTicketId, data, tickets, projectId, requestLeave, router]);

  const handleBulkUpdate = useCallback(
    (update: Partial<Pick<BulkUpdateTicketsInput, "assigneeId" | "status" | "cycleId" | "priority" | "parentTicketId">>) => {
      if (selectedIds.size === 0) { toast.error("No tickets selected"); return; }
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), ...update },
        {
          onSuccess: (d) => {
            toast.success(`${d.updated} ticket${d.updated !== 1 ? "s" : ""} updated`);
            setSelectedIds(new Set());
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [selectedIds, bulkUpdate],
  );

  const handleBulkStatus = useCallback((v: string) => handleBulkUpdate({ status: v }), [handleBulkUpdate]);
  const handleBulkPriority = useCallback(
    (v: string) => {
      if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "URGENT") {
        handleBulkUpdate({ priority: v });
      }
    },
    [handleBulkUpdate],
  );
  const handleBulkAssignee = useCallback((v: string) => handleBulkUpdate({ assigneeId: v }), [handleBulkUpdate]);
  const handleBulkCycle = useCallback(
    (v: string) => handleBulkUpdate({ cycleId: v === "backlog" ? null : Number(v) }),
    [handleBulkUpdate],
  );
  const handleBulkParent = useCallback(
    (parentTicketId: number | null) => handleBulkUpdate({ parentTicketId }),
    [handleBulkUpdate],
  );
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    setSelectedIds(sel);
  }, []);

  const handleClearFilters = useCallback(() => {
    const cleared: Record<string, string | null> = { q: null, page: null };
    for (const param of categoryParams(TICKET_FILTER_SPEC)) cleared[param] = null;
    setListParams(cleared);
  }, [setListParams]);

  const handleRowClick = useCallback(
    (ticket: Ticket) => handleTicketSelect(ticket.id),
    [handleTicketSelect],
  );

  const resolution = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError: ticketsError,
    error: ticketsErrorValue,
    isEmpty: tickets.length === 0,
  });

  const columns = useMemo<DataTableColumn<Ticket>[]>(
    () => [
      {
        key: "id",
        header: "ID",
        className: "w-[80px] font-mono text-dense text-muted-foreground",
        cell: (ticket) => (
          <span className="flex items-center gap-1.5">
            <TicketTypeIcon type={ticket.type} />
            {formatTicketKey(data?.key, ticket.ticketNumber)}
          </span>
        ),
      },
      {
        key: "title",
        header: "Title",
        className: TABLE_TITLE_CELL,
        cell: (ticket) => (
          <TruncatedText text={ticket.title ?? "—"} className="text-dense font-medium" />
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "w-[120px]",
        cell: (ticket) => <StatusBadge status={ticket.status} />,
      },
      {
        key: "priority",
        header: "Priority",
        className: "hidden sm:table-cell w-[100px]",
        headerClassName: "hidden sm:table-cell",
        cell: (ticket) => <PriorityBadge priority={ticket.priority} showLabel />,
      },
      {
        key: "assignee",
        header: "Assignee",
        className: "hidden md:table-cell w-[140px]",
        headerClassName: "hidden md:table-cell",
        cell: (ticket) =>
          ticket.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                <AvatarFallback className="text-micro">
                  {getUserInitials(ticket.assignee)}
                </AvatarFallback>
              </Avatar>
              <TruncatedText text={getUserDisplayName(ticket.assignee)} className="text-dense" />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: "created",
        header: "Created",
        className: "hidden lg:table-cell w-[110px] text-dense text-muted-foreground",
        headerClassName: "hidden lg:table-cell",
        cell: (ticket) =>
          ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d") : "—",
      },
    ],
    [data?.key],
  );

  const renderMobileCard = useCallback(
    (ticket: Ticket) => (
      <BuildMobileCard
        eyebrow={
          <span className="flex items-center gap-1.5">
            <TicketTypeIcon type={ticket.type} />
            {formatTicketKey(data?.key, ticket.ticketNumber)}
          </span>
        }
        title={ticket.title ?? "—"}
        status={<StatusBadge status={ticket.status} />}
        person={{ user: ticket.assignee, role: "Assignee" }}
        meta={[
          {
            label: "Priority",
            value: <PriorityBadge priority={ticket.priority} showLabel />,
          },
          {
            label: "Created",
            value: ticket.createdAt
              ? format(new Date(ticket.createdAt), "MMM d")
              : "—",
          },
        ]}
      />
    ),
    [data?.key],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Backlog" subtitle="Loading...">
        <DataTableSkeleton mobileCards rows={12} headers={BACKLOG_TABLE_HEADERS} className="flex-1 min-h-0" />
      </PageWrapper>
    );
  }

  // A failure to READ the project is not a project that is gone: only the
  // fallback's resolved 404 reaches notFound().
  if (projectError) {
    return (
      <ProjectLoadFallback
        title="Backlog"
        error={projectErrorValue}
        onRetry={handleRetryProject}
      />
    );
  }

  if (!data)
    return (
      <PageWrapper title="Backlog">
        <EmptyState
          className="flex-1"
          illustrationPreset="projects"
          title="Project unavailable"
          description="This project could not be loaded. Pick another project to carry on."
          action={{ label: "All Projects", href: "/build" }}
        />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Backlog"
      subtitle="Manage and prioritize unscheduled work"
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

        <PageState
          resolution={resolution}
          loading={<DataTableSkeleton mobileCards rows={12} headers={BACKLOG_TABLE_HEADERS} className="flex-1 min-h-0" />}
          empty={
            <EmptyState
              className="flex-1"
              illustrationPreset="projects"
              title="No tickets yet"
              description={filtersActive ? undefined : "Create a ticket to get started."}
              filtersActive={filtersActive}
              onClearFilters={handleClearFilters}
            />
          }
          onRetry={handleRetryTickets}
          className="flex-1 min-h-0"
        >
          <PmPanel className="min-w-0 flex-1 min-h-0 flex flex-col">
            <DataTable
              data={tickets}
              columns={columns}
              getRowKey={(ticket) => ticket.id}
              onRowClick={handleRowClick}
              selection={canUpdate ? {
                selected: selectedIds,
                onChange: handleSelectionChange,
                getRowLabel: (ticket) => ticket.title ?? "",
              } : undefined}
              minWidth="640px"
              mobileCard={renderMobileCard}
              className="border-0 rounded-none flex-1 min-h-0"
            />
            <InfiniteScrollSentinel
              hasNextPage={isTruncated}
              isFetchingNextPage={isFetchingMoreTickets}
              onLoadMore={fetchMoreTickets}
              label="Load more tickets"
            />
          </PmPanel>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
