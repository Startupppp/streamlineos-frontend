"use client";

import { useState, useMemo, useCallback } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { CsvUploadDialog } from "@/components/crm/csv-upload-dialog";
import { LeadTableView } from "@/components/crm/lead-table-view";
import { LeadExportDialog } from "@/components/crm/lead-export-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useLeadBoard, useLeadStats, useCreateLead, useUpdateLeadStatus,
} from "@/lib/hooks/trpc-hooks";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LeadsStatsBar } from "./_components/leads-stats-bar";
import { LeadsToolbar } from "./_components/leads-toolbar";
import { LeadsKanban } from "./_components/leads-kanban";
import { LeadDetailSheet } from "./_components/lead-detail-sheet";
import { CreateLeadDialog } from "./_components/create-lead-dialog";
import { isLeadSource, isLeadPriority, STATUS_CONFIG } from "./_components/leads-constants";
import type { BoardLead, LeadStatus } from "./_components/leads-types";

export default function LeadsPipelinePage() {
  const { data: board, isLoading: boardLoading, refetch: refetchBoard } = useLeadBoard();
  const { data: stats, isLoading: statsLoading } = useLeadStats();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const [view, setView] = useState<"table" | "kanban">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("leads-view") as "table" | "kanban") || "table";
    }
    return "table";
  });

  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();

  const { data: tableData, isLoading: tableLoading } = api.leads.getAll.useQuery({
    search: debouncedSearchQuery || undefined,
    sortBy: sortColumn as "name" | "email" | "company" | "status" | "priority" | "source" | "score" | "potentialValue" | "createdAt",
    sortOrder: sortDirection,
    page: tablePage,
    limit: pageSize,
    status: statusFilter as "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST" | undefined,
    priority: priorityFilter as "HOT" | "WARM" | "COLD" | undefined,
    source: sourceFilter as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other" | undefined,
  }, { enabled: view === "table" });

  const { data: teamCapacity } = api.leads.getSalesTeamCapacity.useQuery(undefined, { enabled: view === "table" });
  const teamMembers = useMemo(
    () => (teamCapacity || []).map(m => ({ id: m.id, name: m.name, image: m.image })),
    [teamCapacity],
  );

  const updateLeadMutation = api.leads.update.useMutation({
    onSuccess: () => { refetchBoard(); },
    onError: (err) => toast.error(err.message),
  });
  const assignLead = api.leads.assign.useMutation({
    onSuccess: () => { refetchBoard(); toast.success("Lead assigned"); },
    onError: (err) => toast.error(err.message),
  });
  const bulkUpdateMutation = api.leads.bulkUpdate.useMutation({
    onSuccess: (data) => { refetchBoard(); toast.success(`${data.updated} leads updated`); },
    onError: (err) => toast.error(err.message),
  });
  const bulkDeleteMutation = api.leads.bulkDelete.useMutation({
    onSuccess: (data) => { refetchBoard(); toast.success(`${data.deleted} leads deleted`); },
    onError: (err) => toast.error(err.message),
  });

  const createLead = useCreateLead();
  const updateStatus = useUpdateLeadStatus();

  const isAdmin = true; // HR/CEO check already handled by middleware

  const handleSort = useCallback((col: string) => {
    if (sortColumn === col) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
    setTablePage(1);
  }, [sortColumn]);

  const handleViewChange = useCallback((v: "table" | "kanban") => {
    setView(v);
    localStorage.setItem("leads-view", v);
  }, []);

  const filteredBoard = useMemo(() => {
    if (!board) return null;
    if (!debouncedSearchQuery) return board;
    const q = debouncedSearchQuery.toLowerCase();
    const filtered: Record<string, typeof board[keyof typeof board]> = {};
    for (const [status, leads] of Object.entries(board)) {
      filtered[status] = leads.filter((l: BoardLead) =>
        l.name.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.company?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [board, debouncedSearchQuery]);

  const handleCreateLead = useCallback(async (formData: FormData) => {
    const name = (formData.get("name") as string)?.trim();
    if (!name) { toast.error("Name is required"); return; }

    const potentialValueRaw = (formData.get("potentialValue") as string)?.trim();
    const investmentInterestRaw = (formData.get("investmentInterest") as string)?.trim();

    if (potentialValueRaw && (isNaN(Number(potentialValueRaw)) || Number(potentialValueRaw) < 0)) {
      toast.error("Potential value must be a valid positive number"); return;
    }
    if (investmentInterestRaw && (isNaN(Number(investmentInterestRaw)) || Number(investmentInterestRaw) < 0)) {
      toast.error("Investment interest must be a valid positive number"); return;
    }

    const data = {
      name,
      email: (formData.get("email") as string)?.trim() || undefined,
      phone: (formData.get("phone") as string)?.trim() || undefined,
      company: (formData.get("company") as string)?.trim() || undefined,
      source: isLeadSource(formData.get("source")) ? formData.get("source") as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other" : "other",
      potentialValue: potentialValueRaw || undefined,
      investmentInterest: investmentInterestRaw || undefined,
      priority: isLeadPriority(formData.get("priority")) ? formData.get("priority") as "HOT" | "WARM" | "COLD" : "WARM" as const,
      notes: (formData.get("notes") as string)?.trim() || undefined,
      city: (formData.get("city") as string)?.trim() || undefined,
      referredBy: (formData.get("referredBy") as string)?.trim() || undefined,
    };

    try {
      await createLead.mutateAsync(data);
      toast.success("Lead created successfully");
      setCreateOpen(false);
    } catch {
      toast.error("Failed to create lead");
    }
  }, [createLead]);

  const handleMoveStatus = useCallback(async (leadId: number, status: LeadStatus, expectedStatus?: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ leadId, status, expectedStatus });
      toast.success(`Lead moved to ${STATUS_CONFIG[status].label}`);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to update status");
      refetchBoard();
    }
  }, [updateStatus, refetchBoard]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const leadId = parseInt(draggableId);
    const newStatus = destination.droppableId as LeadStatus;
    if (source.droppableId !== destination.droppableId) {
      handleMoveStatus(leadId, newStatus, source.droppableId as LeadStatus);
    }
  }, [handleMoveStatus]);

  if (boardLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-96" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Lead Pipeline"
          description="Track and manage your sales leads through the conversion funnel"
        />
        <div className="flex items-center gap-2">
          <LeadExportDialog />
          <CsvUploadDialog onSuccess={() => refetchBoard()} />
          <CreateLeadDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreateLead}
            isPending={createLead.isPending}
          />
        </div>
      </motion.div>

      {stats && (
        <motion.div variants={fadeUp}>
          <LeadsStatsBar stats={stats} />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <LeadsToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          view={view}
          onViewChange={handleViewChange}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          sourceFilter={sourceFilter}
          onStatusFilterChange={(v) => { setStatusFilter(v); setTablePage(1); }}
          onPriorityFilterChange={(v) => { setPriorityFilter(v); setTablePage(1); }}
          onSourceFilterChange={(v) => { setSourceFilter(v); setTablePage(1); }}
          onClearFilters={() => { setStatusFilter(undefined); setPriorityFilter(undefined); setSourceFilter(undefined); setTablePage(1); }}
        />
      </motion.div>

      {/* Table View */}
      {view === "table" && (
        <motion.div variants={fadeUp}>
          <LeadTableView
            leads={tableData?.leads || []}
            totalCount={tableData?.totalCount || 0}
            page={tableData?.page || 1}
            totalPages={tableData?.totalPages || 1}
            pageSize={pageSize}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onPageChange={setTablePage}
            onPageSizeChange={(size) => { setPageSize(size); setTablePage(1); }}
            onStatusChange={(id, status, extra) => {
              if (status === "CONVERTED" && extra) {
                updateLeadMutation.mutate({ id, notes: extra.conversionNotes, investmentInterest: extra.investmentInterest, potentialValue: extra.estimatedAmount || undefined });
                updateStatus.mutate({ leadId: id, status: "CONVERTED" as const });
              } else if (status === "LOST" && extra) {
                updateStatus.mutate({ leadId: id, status: "LOST" as const, lostReason: extra.lostReason });
              } else {
                updateStatus.mutate({ leadId: id, status: status as "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST" });
              }
            }}
            onPriorityChange={(id, priority) => updateLeadMutation.mutate({ id, priority: priority as "HOT" | "WARM" | "COLD" })}
            onAssign={(id, userId) => assignLead.mutate({ leadId: id, assignedToId: userId })}
            onBulkUpdate={(ids, update) => bulkUpdateMutation.mutate({ leadIds: ids, update: update as { status?: "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST"; priority?: "HOT" | "WARM" | "COLD"; assignedToId?: string } })}
            onBulkDelete={(ids) => bulkDeleteMutation.mutate({ leadIds: ids })}
            teamMembers={teamMembers}
            isLoading={tableLoading}
            isAdmin={isAdmin}
          />
        </motion.div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <motion.div variants={fadeUp}>
          <LeadsKanban
            filteredBoard={filteredBoard as Record<string, BoardLead[]> | null}
            onDragEnd={handleDragEnd}
            onOpenLead={setSelectedLeadId}
            onMoveStatus={handleMoveStatus}
          />
        </motion.div>
      )}

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onMoveStatus={handleMoveStatus}
      />
    </motion.div>
  );
}
