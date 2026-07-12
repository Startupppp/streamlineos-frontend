"use client";

import { use, useMemo, useCallback, useState, useEffect } from "react";
import { useProject, useSprints } from "@/hooks/api";
import { useBulkUpdateTickets } from "@/hooks/api/projects";
import type { BulkUpdateTicketsInput } from "@/hooks/api/projects";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/features/projects/tickets/create-ticket-dialog";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BacklogTicket } from "@/features/projects/backlog/backlog-ticket-row";
import { BulkActionBar } from "@/features/projects/backlog/bulk-action-bar";
import { TicketTypeIcon } from "@/features/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { StatusBadge } from "@/features/projects/shared/status-badge";
import { formatTicketKey } from "@/features/projects/shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function BacklogPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
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

  const tickets = useMemo(() => data?.tickets || [], [data?.tickets]);

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
    (update: Partial<Pick<BulkUpdateTicketsInput, "assigneeId" | "status" | "sprintId" | "priority">>) => {
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
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    setSelectedIds(sel);
  }, []);

  const handleRowClick = useCallback(
    (ticket: BacklogTicket) => handleTicketSelect(ticket.id),
    [handleTicketSelect],
  );

  const columns = useMemo<DataTableColumn<BacklogTicket>[]>(
    () => [
      {
        key: "id",
        header: "ID",
        className: "w-[80px] font-mono text-[11px] text-muted-foreground",
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
        className: "max-w-md",
        cell: (ticket) => (
          <span className="text-[11px] font-medium line-clamp-1">{ticket.title}</span>
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
                <AvatarFallback className="text-[8px]">
                  {getUserInitials(ticket.assignee)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] truncate">{getUserDisplayName(ticket.assignee)}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: "created",
        header: "Created",
        className: "hidden lg:table-cell w-[110px] text-[11px] text-muted-foreground",
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
        <DataTableSkeleton rows={8} columns={7} />
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="Backlog"
      subtitle="Manage and prioritize unscheduled work"
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={<TicketFilterBar members={members} showSprintFilter={false} />}
    >
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          members={members}
          sprints={sprints ?? []}
          onBulkStatus={handleBulkStatus}
          onBulkPriority={handleBulkPriority}
          onBulkAssignee={handleBulkAssignee}
          onBulkSprint={handleBulkSprint}
          onClear={handleClearSelection}
        />
      )}

      <DataTable
        data={filteredTickets}
        columns={columns}
        getRowKey={(ticket) => ticket.id}
        onRowClick={handleRowClick}
        selection={{ selected: selectedIds, onChange: handleSelectionChange }}
        minWidth="640px"
        emptyState={
          <EmptyState
            illustrationPreset="projects"
            title="No tickets found"
            description={tickets.length === 0 ? "Create a ticket to get started." : "No tickets match the active filters."}
            compact
            className="min-h-[200px] border-0 bg-transparent"
          />
        }
      />
    </PageWrapper>
  );
}
