"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useProject, useSprints } from "@/hooks/api";
import { useBulkUpdateTickets, useProjectBoardTickets } from "@/hooks/api/build";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { TicketFilterBar } from "@/features/build/shared/ticket-filter-bar";
import { buildTicketDetailUrl } from "@/features/build/ticket-details/build-ticket-detail-url";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProjectLoadFallback } from "@/features/build/shared/project-load-fallback";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { BulkActionBar } from "@/features/build/backlog/bulk-action-bar";
import type { Ticket } from "@/types/projects";
import { TicketTypeIcon } from "@/features/build/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { PmPageShell, PM_TOOLBAR, PmPanel } from "@/components/pm-chrome/pm-chrome";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";

const BACKLOG_FILTER_PARAMS = [
  "q",
  "status",
  "priority",
  "type",
  "assigneeId",
  "labels",
  "cycle",
  "projectIds",
  "sprintId",
  "dueDateFrom",
  "dueDateTo",
  "page",
] as const;

interface ProjectBacklogPageProps {
  projectId: string;
}

export function ProjectBacklogPage({ projectId: projectIdStr }: ProjectBacklogPageProps) {
  const projectId = parseInt(projectIdStr);
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
  } = useProjectBoardTickets(projectId);
  const isLoading = projectLoading || ticketsLoading;
  const handleRetryProject = useCallback(() => void refetchProject(), [refetchProject]);
  const handleRetryTickets = useCallback(() => void refetchTickets(), [refetchTickets]);
  const { data: sprints } = useSprints(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";
  const filtersActive = Boolean(
    q || filterStatus || filterPriority || filterType || filterAssigneeId,
  );

  const tickets = useMemo(() => boardTickets ?? [], [boardTickets]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (t) => t.title?.toLowerCase().includes(lower) || t.description?.toLowerCase().includes(lower),
      );
    }
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterPriority) result = result.filter((t) => t.priority === filterPriority);
    if (filterType) result = result.filter((t) => t.type === filterType);
    if (filterAssigneeId) {
      const assigneeSet = new Set(filterAssigneeId.split(",").filter(Boolean));
      result = result.filter((t) =>
        assigneeSet.has("__unassigned__") ? !t.assigneeId : t.assigneeId != null && assigneeSet.has(t.assigneeId),
      );
    }
    return result;
  }, [tickets, q, filterStatus, filterPriority, filterType, filterAssigneeId]);

  const members = useMemo(() => {
    if (!data?.members) return [];
    return data.members
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user!.id,
        name: m.user!.name ?? null,
        firstName: m.user!.firstName ?? null,
        lastName: m.user!.lastName ?? null,
      }));
  }, [data]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, data?.key, id, tickets);
      if (href) router.push(href);
    },
    [router, projectId, data?.key, tickets],
  );

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(projectId, data.key, selectedTicketId, tickets);
    if (href) router.replace(href);
  }, [selectedTicketId, data, tickets, projectId, router]);

  const handleBulkUpdate = useCallback(
    (update: Partial<Pick<BulkUpdateTicketsInput, "assigneeId" | "status" | "sprintId" | "priority" | "parentTicketId">>) => {
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
  const handleBulkSprint = useCallback(
    (v: string) => handleBulkUpdate({ sprintId: v === "backlog" ? null : Number(v) }),
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
    const next = new URLSearchParams(searchParams.toString());
    for (const param of BACKLOG_FILTER_PARAMS) next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [router, searchParams]);

  const handleRowClick = useCallback(
    (ticket: Ticket) => handleTicketSelect(ticket.id),
    [handleTicketSelect],
  );

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

  if (isLoading) {
    return (
      <PageWrapper title="Backlog" subtitle="Loading...">
        <DataTableSkeleton rows={12} columns={7} className="flex-1 min-h-0" />
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

  if (!data) return notFound();

  return (
    <PageWrapper
      title="Backlog"
      subtitle="Manage and prioritize unscheduled work"
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={
        <div className={PM_TOOLBAR}>
          <TicketFilterBar
            className="w-full"
            members={members}
            showSprintFilter={false}
          />
        </div>
      }
    >
      <PmPageShell>
        {selectedIds.size > 0 ? (
          <BulkActionBar
            selectedCount={selectedIds.size}
            members={members}
            sprints={sprints ?? []}
            projectId={projectId}
            excludeIds={selectedIds}
            onBulkStatus={handleBulkStatus}
            onBulkPriority={handleBulkPriority}
            onBulkAssignee={handleBulkAssignee}
            onBulkSprint={handleBulkSprint}
            onBulkParent={handleBulkParent}
            onClear={handleClearSelection}
          />
        ) : null}

        {/*
          A 500 on GET /build/:id/tickets flattens to `[]` here, so the table
          used to render "No tickets yet" over a project with thousands and
          people created duplicates.
        */}
        {ticketsError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load this project's tickets"
            description={getErrorMessage(ticketsErrorValue)}
            onRetry={handleRetryTickets}
          />
        ) : (
        <PmPanel className="min-w-0 flex-1 min-h-0 flex flex-col">
          <DataTable
            data={filteredTickets}
            columns={columns}
            getRowKey={(ticket) => ticket.id}
            onRowClick={handleRowClick}
            selection={{
              selected: selectedIds,
              onChange: handleSelectionChange,
              getRowLabel: (ticket) => ticket.title ?? "",
            }}
            minWidth="640px"
            className="border-0 rounded-none flex-1 min-h-0"
            emptyState={
              <EmptyState
                illustrationPreset="projects"
                title="No tickets yet"
                description={filtersActive ? undefined : "Create a ticket to get started."}
                filtersActive={filtersActive}
                onClearFilters={handleClearFilters}
                compact
                className="min-h-[200px] border-0 bg-transparent"
              />
            }
          />
        </PmPanel>
        )}
      </PmPageShell>
    </PageWrapper>
  );
}
