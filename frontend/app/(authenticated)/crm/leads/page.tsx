"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { ImportLinkButton } from "@/features/crm/import/import-link-button";
import { LeadTableView } from "@/features/crm/leads/lead-table-view";
import { LeadExportDialog } from "@/features/crm/leads/lead-export-dialog";
import {
  useLeadBoard,
  useLeadStats,
  useCreateLead,
  useUpdateLeadStatus,
  useLeads,
  useSalesTeamCapacity,
  useUpdateLead,
  useAssignLead,
  useBulkUpdateLeads,
  useBulkDeleteLeads,
} from "@/hooks/api/leads";
import { useCreateDeal } from "@/hooks/api/crm";
import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";
import { useLeadsFilters } from "@/hooks/common/use-leads-filters";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useCan, useScope } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LeadsStatsBar } from "@/features/crm/leads/leads-stats-bar";
import { LeadsToolbar } from "@/features/crm/leads/leads-toolbar";
import { LeadsKanban } from "@/features/crm/leads/leads-kanban";
import { LeadsFunnelView } from "@/features/crm/leads/leads-funnel-view";
import { LeadDetailSheet } from "@/features/crm/leads/lead-detail-sheet";
import { CreateLeadSheet } from "@/features/crm/leads/create-lead-sheet";
import type { CreateLeadFormValues } from "@/features/crm/leads/create-lead-sheet";
import type { BoardLead, LeadStatus } from "@/features/crm/leads/leads-types";

export default function LeadsPipelinePage() {
  const canCreate = useCan("crm:leads:create");
  const canUpdate = useCan("crm:leads:update");
  const canAssign = useCan("crm:leads:assign");
  const canDelete = useCan("crm:leads:delete");
  const canCreateDeal = useCan("crm:deals:create");
  const scope = useScope("crm:leads:view");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data: board, isLoading: boardLoading, isError: boardError, refetch: refetchBoard } = useLeadBoard();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useLeadStats();
  const { open: createOpen, onOpenChange: setCreateOpen } = useQueryParamOpen("create");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const {
    view,
    searchQuery,
    statusFilter,
    priorityFilter,
    sourceFilter,
    sortColumn,
    sortDirection,
    tablePage,
    pageSize,
    setView,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    setSourceFilter,
    setSort,
    setTablePage,
    setPageSize,
  } = useLeadsFilters();

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    ["status", "priority", "source", "q", "page"].forEach((k) => params.delete(k));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const { data: tableData, isLoading: tableLoading } = useLeads({
    search: searchQuery.trim() || undefined,
    sortBy: sortColumn as "name" | "email" | "company" | "status" | "priority" | "source" | "score" | "potentialValue" | "createdAt",
    sortOrder: sortDirection,
    page: tablePage,
    limit: pageSize,
    status: statusFilter as "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST" | undefined,
    priority: priorityFilter as "HOT" | "WARM" | "COLD" | undefined,
    source: sourceFilter as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other" | undefined,
  });

  const { data: leadStatusOptions = [] } = useCrmOptions("lead_status");
  const { data: leadPriorityOptions = [] } = useCrmOptions("priority");
  const { data: leadSourceOptions = [] } = useCrmOptions("source");

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const trimmed = searchQuery.trim();
    if (trimmed) labels.push(`search "${trimmed}"`);
    if (statusFilter)
      labels.push(`status ${resolveOption(leadStatusOptions, statusFilter).label}`);
    if (priorityFilter)
      labels.push(`priority ${resolveOption(leadPriorityOptions, priorityFilter).label}`);
    if (sourceFilter)
      labels.push(`source ${resolveOption(leadSourceOptions, sourceFilter).label}`);
    return labels;
  }, [
    searchQuery,
    statusFilter,
    priorityFilter,
    sourceFilter,
    leadStatusOptions,
    leadPriorityOptions,
    leadSourceOptions,
  ]);

  const handleOpenCreateLead = useCallback(() => setCreateOpen(true), [setCreateOpen]);

  const { data: teamCapacity } = useSalesTeamCapacity();
  const teamMembers = useMemo(
    () =>
      (teamCapacity || []).map((m) => ({
        id: m.id,
        name: m.name,
        image: m.image,
      })),
    [teamCapacity],
  );

  const updateLeadMutation = useUpdateLead();
  const assignLeadMutation = useAssignLead();
  const createDealMutation = useCreateDeal();
  const bulkUpdateMutation = useBulkUpdateLeads();
  const bulkDeleteMutation = useBulkDeleteLeads();

  const createLead = useCreateLead();
  const updateStatus = useUpdateLeadStatus();

  const handleCloseDetail = useCallback(() => setSelectedLeadId(null), []);

  const handleSort = useCallback(
    (col: string) => {
      const newDir =
        sortColumn === col
          ? sortDirection === "asc"
            ? "desc"
            : "asc"
          : "desc";
      setSort(col, newDir);
    },
    [sortColumn, sortDirection, setSort],
  );

  const handleViewChange = useCallback(
    (v: "table" | "kanban" | "funnel") => {
      setView(v);
    },
    [setView],
  );

  const filteredBoard = useMemo<Record<string, BoardLead[]> | null>(() => {
    if (!board) return null;
    const result: Record<string, BoardLead[]> = {};
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      for (const [status, col] of Object.entries(board)) {
        result[status] = col.leads as BoardLead[];
      }
      return result;
    }
    const q = trimmed.toLowerCase();
    for (const [status, col] of Object.entries(board)) {
      result[status] = (col.leads as BoardLead[]).filter(
        (l: BoardLead) =>
          l.name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.company?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [board, searchQuery]);

  const handleCreateLead = useCallback(
    async (values: CreateLeadFormValues) => {
      try {
        await createLead.mutateAsync({
          name: values.name,
          email: values.email,
          phone: values.phone,
          company: values.company,
          city: values.city,
          source: (values.source || "other") as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other",
          potentialValue: values.potentialValue !== undefined ? String(values.potentialValue) : undefined,
          investmentInterest: values.investmentInterest !== undefined ? String(values.investmentInterest) : undefined,
          priority: (values.priority || "WARM") as "HOT" | "WARM" | "COLD",
          notes: values.notes,
          referredBy: values.referredBy,
        });
        toast.success("Lead created successfully");
        setCreateOpen(false);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [createLead, setCreateOpen],
  );

  const handleMoveStatus = useCallback(
    async (leadId: number, status: string, expectedStatus?: string) => {
      try {
        await updateStatus.mutateAsync({ leadId, status: status as LeadStatus, expectedStatus: expectedStatus as LeadStatus | undefined });
        toast.success(`Lead moved to ${status}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    },
    [updateStatus],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const leadId = parseInt(draggableId);
      const newStatus = destination.droppableId as LeadStatus;
      if (source.droppableId !== destination.droppableId) {
        void handleMoveStatus(
          leadId,
          newStatus,
          source.droppableId as LeadStatus,
        );
      }
    },
    [handleMoveStatus],
  );

  const handleStatusChange = useCallback(
    (
      id: number,
      status: string,
      extra?: {
        conversionNotes?: string;
        lostReason?: string;
        estimatedAmount?: string;
        investmentInterest?: string;
        createDeal?: boolean;
        dealName?: string;
      },
    ) => {
      if (status === "CONVERTED" && extra) {
        updateStatus.mutate(
          {
            leadId: id,
            status: "CONVERTED",
            estimatedInvestment:
              extra.estimatedAmount || extra.investmentInterest || undefined,
            conversionNotes: extra.conversionNotes,
          },
          {
            onSuccess: () =>
              toast.success("Lead converted — client account created"),
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );

        if (extra.createDeal && extra.dealName) {
          createDealMutation.mutate(
            {
              name: extra.dealName,
              value: extra.estimatedAmount || undefined,
              stage: "LEAD",
              notes: extra.conversionNotes,
              leadId: id,
            },
            {
              onSuccess: () =>
                toast.success("Deal created from converted lead"),
              onError: (err) =>
                toast.error(getErrorMessage(err)),
            },
          );
        }
      } else if (status === "LOST" && extra) {
        updateStatus.mutate(
          { leadId: id, status: "LOST", lostReason: extra.lostReason },
          {
            onSuccess: () => toast.success("Lead marked as lost"),
            onError: (err) => toast.error(getErrorMessage(err)),
          }
        );
      } else {
        updateStatus.mutate(
          { leadId: id, status: status as LeadStatus },
          {
            onSuccess: () => toast.success("Status updated"),
            onError: (err) => toast.error(getErrorMessage(err)),
          }
        );
      }
    },
    [updateStatus, createDealMutation],
  );

  const handlePriorityChange = useCallback(
    (id: number, priority: string) => {
      updateLeadMutation.mutate(
        { id, priority: priority as "HOT" | "WARM" | "COLD" },
        {
          onSuccess: () => toast.success("Priority updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [updateLeadMutation],
  );

  const handleAssign = useCallback(
    (id: number, userId: string) => {
      assignLeadMutation.mutate(
        { leadId: id, assignedToId: userId },
        {
          onSuccess: () => toast.success("Lead assigned"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [assignLeadMutation],
  );

  const handleBulkUpdate = useCallback(
    (
      ids: number[],
      update: { status?: string; priority?: string; assignedToId?: string },
    ) => {
      bulkUpdateMutation.mutate(
        {
          leadIds: ids,
          update: update as {
            status?:
              | "NEW"
              | "CONTACTED"
              | "INTERESTED"
              | "QUALIFIED"
              | "CONVERTED"
              | "LOST";
            priority?: "HOT" | "WARM" | "COLD";
            assignedToId?: string;
          },
        },
        {
          onSuccess: (data) => toast.success(`${data.updated} leads updated`),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [bulkUpdateMutation],
  );

  const handleBulkDelete = useCallback(
    (ids: number[]) => {
      bulkDeleteMutation.mutate(
        { leadIds: ids },
        {
          onSuccess: (data) => {
            toast.success(`${data.deleted} leads deleted`);
            if (tablePage > 1) setTablePage(1);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [bulkDeleteMutation, tablePage, setTablePage],
  );

  if (boardLoading || statsLoading) {
    return (
      <PageWrapper title="Lead Pipeline" noInternalScroll>
        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          <div className="flex gap-2 shrink-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[52px] flex-1 rounded-lg" />
            ))}
          </div>
          <DataTableSkeleton rows={12} columns={6} />
        </div>
      </PageWrapper>
    );
  }

  if (boardError || statsError) {
    return (
      <PageWrapper title="Lead Pipeline">
        <ErrorState
          title="Failed to load leads"
          description="There was an error loading the lead pipeline. Please try again."
          onRetry={() => void refetchBoard()}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Lead Pipeline"
      subtitle={stats ? `${stats.total} leads` : undefined}
      badge={
        view === "table" && tableData ? String(tableData.totalCount) : undefined
      }
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <LeadExportDialog />
          {canCreate && (
            <>
              <ImportLinkButton entity="leads" label="Import Leads" />
              <CreateLeadSheet
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSubmit={handleCreateLead}
                isPending={createLead.isPending}
              />
            </>
          )}
        </div>
      }
      filters={
        <LeadsToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          view={view}
          onViewChange={handleViewChange}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          sourceFilter={sourceFilter}
          onStatusFilterChange={setStatusFilter}
          onPriorityFilterChange={setPriorityFilter}
          onSourceFilterChange={setSourceFilter}
          onClearFilters={handleClearFilters}
          scope={scope}
        />
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        {stats && (
          <div className="shrink-0">
            <LeadsStatsBar stats={stats} />
          </div>
        )}

        {view === "table" && (
          <div className="flex-1 min-h-0 mt-2">
            <LeadTableView
              leads={tableData?.leads || []}
              totalCount={tableData?.totalCount || 0}
              page={tableData?.page || 1}
              pageSize={pageSize}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onPageChange={setTablePage}
              onPageSizeChange={setPageSize}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onAssign={handleAssign}
              onBulkUpdate={handleBulkUpdate}
              onBulkDelete={handleBulkDelete}
              teamMembers={teamMembers}
              isLoading={tableLoading}
              canUpdate={canUpdate}
              canAssign={canAssign}
              canDelete={canDelete}
              canCreateDeal={canCreateDeal}
              canCreate={canCreate}
              activeFilterLabels={activeFilterLabels}
              onClearFilters={handleClearFilters}
              onCreateLead={handleOpenCreateLead}
            />
          </div>
        )}

        {view === "kanban" && (
          <div className="flex-1 min-h-0 mt-2 overflow-auto">
            <LeadsKanban
              filteredBoard={filteredBoard}
              onDragEnd={handleDragEnd}
              onOpenLead={setSelectedLeadId}
              onMoveStatus={handleMoveStatus}
              canUpdate={canUpdate}
            />
          </div>
        )}

        {view === "funnel" && (
          <div className="flex-1 min-h-0 mt-2 overflow-auto">
            <LeadsFunnelView
              board={filteredBoard}
              searchQuery={searchQuery}
              onClearSearch={handleClearFilters}
              onCreateLead={handleOpenCreateLead}
              canCreate={canCreate}
            />
          </div>
        )}

        <LeadDetailSheet
          leadId={selectedLeadId}
          open={!!selectedLeadId}
          onClose={handleCloseDetail}
          onMoveStatus={handleMoveStatus}
          canUpdate={canUpdate}
        />
      </div>
    </PageWrapper>
  );
}
