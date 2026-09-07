"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLeadLayout } from "./use-lead-layout";
import { useSalesTeamCapacity } from "@/hooks/api/leads";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { DensityMode } from "@/lib/design-tokens";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import type { Lead, LeadPriority, PipelineStatus } from "@/types/leads";
import { toLeadRecords } from "./lead-record";
import { LeadRowControls } from "./lead-row-controls";
import { useLeadMutations, type ConversionDetails } from "./use-lead-mutations";

const RecordList = dynamic(
  () => import("@/components/renderer/record-list").then((m) => ({ default: m.RecordList })),
  { ssr: false, loading: () => <DataTableSkeleton rows={12} columns={8} className="flex-1" /> },
);

const BulkActionsBar = dynamic(
  () => import("./lead-actions").then((m) => ({ default: m.BulkActionsBar })),
  { ssr: false },
);

const ConversionModal = dynamic(
  () => import("./lead-actions").then((m) => ({ default: m.ConversionModal })),
  { ssr: false },
);

const LostModal = dynamic(
  () => import("./lead-actions").then((m) => ({ default: m.LostModal })),
  { ssr: false },
);

interface LeadListViewProps {
  leads: Lead[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  density: DensityMode;
  canCreate: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  canDelete: boolean;
  canCreateDeal: boolean;
  activeFilterLabels: string[];
  onClearFilters: () => void;
  onCreateLead: () => void;
}

interface PendingLead {
  leadId: number;
  leadName: string;
}

export function LeadListView({
  leads,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  isError,
  onRetry,
  density,
  canCreate,
  canUpdate,
  canAssign,
  canDelete,
  canCreateDeal,
  activeFilterLabels,
  onClearFilters,
  onCreateLead,
}: LeadListViewProps) {
  const router = useRouter();
  const layout = useLeadLayout();
  const money = useOrgDisplay();
  const mutations = useLeadMutations();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [converting, setConverting] = useState<PendingLead | null>(null);
  const [losing, setLosing] = useState<PendingLead | null>(null);

  const { data: teamCapacity } = useSalesTeamCapacity();
  const teamMembers = useMemo(
    () => (teamCapacity ?? []).map(({ id, name, image }) => ({ id, name, image })),
    [teamCapacity],
  );

  const rows = useMemo(() => toLeadRecords(leads), [leads]);
  const leadById = useMemo(() => new Map(leads.map((lead) => [String(lead.id), lead])), [leads]);
  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);
  const canSelect = canUpdate || canAssign || canDelete;

  const selection = useMemo(
    () => ({
      selected: new Set<string | number>([...selectedIds].map(String)),
      onChange: (next: Set<string | number>) => setSelectedIds(new Set([...next].map(Number))),
    }),
    [selectedIds],
  );

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleStatusChange = useCallback(
    (lead: Lead, status: PipelineStatus) => {
      if (status === "CONVERTED") {
        setConverting({ leadId: lead.id, leadName: lead.name });
        return;
      }
      if (status === "LOST") {
        setLosing({ leadId: lead.id, leadName: lead.name });
        return;
      }
      mutations.setStatus(lead.id, status);
    },
    [mutations],
  );

  const handlePriorityChange = useCallback(
    (leadId: number, priority: LeadPriority) => mutations.setPriority(leadId, priority),
    [mutations],
  );

  const handleAssign = useCallback(
    (leadId: number, userId: string) => mutations.assign(leadId, userId),
    [mutations],
  );

  const handleBulkDelete = useCallback(
    (leadIds: number[]) => {
      mutations.bulkDelete(leadIds, () => {
        if (page > 1) onPageChange(1);
      });
    },
    [mutations, page, onPageChange],
  );

  const handleConversionClose = useCallback(() => setConverting(null), []);
  const handleLostClose = useCallback(() => setLosing(null), []);

  const handleConversionSubmit = useCallback(
    (details: ConversionDetails) => {
      if (!converting) return;
      mutations.convert(converting.leadId, details);
      setConverting(null);
    },
    [converting, mutations],
  );

  const handleLostSubmit = useCallback(
    ({ lostReason }: { lostReason: string; lostNotes: string }) => {
      if (!losing) return;
      mutations.markLost(losing.leadId, lostReason);
      setLosing(null);
    },
    [losing, mutations],
  );

  const renderActions = useCallback(
    (row: Record<string, unknown>) => {
      const lead = leadById.get(String(row.id));
      if (!lead) return null;
      return (
        <LeadRowControls
          lead={lead}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onAssign={handleAssign}
          teamMembers={teamMembers}
          canUpdate={canUpdate}
          canAssign={canAssign}
        />
      );
    },
    [
      leadById,
      handleStatusChange,
      handlePriorityChange,
      handleAssign,
      teamMembers,
      canUpdate,
      canAssign,
    ],
  );

  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => router.push(`/crm/leads/${String(row.id)}`),
    [router],
  );

  const isFiltered = activeFilterLabels.length > 0;

  if (isLoading)
    return <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />;

  if (isError)
    return (
      <ErrorState
        className={CONTENT_FILL_PANEL}
        title="Couldn't load leads"
        description="The lead list didn't load. Check your connection and try again."
        onRetry={onRetry}
      />
    );

  if (leads.length === 0)
    return (
      <EmptyState
        className={CONTENT_FILL_PANEL}
        illustration={<EmptyLeadsIllustration />}
        title="No leads yet"
        description={
          isFiltered
            ? "No results match your filters."
            : "Leads are the people and companies you are selling to. Add one by hand, or import a CSV to bring your existing list in."
        }
        filtersActive={isFiltered}
        onClearFilters={onClearFilters}
        action={!isFiltered && canCreate ? { label: "Add lead", onClick: onCreateLead } : undefined}
      />
    );

  return (
    <>
      <RecordList
        layout={layout}
        rows={rows}
        getRowKey={(row) => String(row.id)}
        actions={canUpdate || canAssign ? renderActions : undefined}
        selection={canSelect ? selection : undefined}
        onRowClick={handleRowClick}
        density={density}
        money={money}
        minWidth="1280px"
        className={CONTENT_FILL_PANEL}
        pagination={{
          mode: "server",
          page,
          pageSize,
          total: totalCount,
          onPageChange,
          onPageSizeChange,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />

      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedIds={selectedIds}
          selectedArray={selectedArray}
          leads={leads}
          teamMembers={teamMembers}
          canUpdate={canUpdate}
          canAssign={canAssign}
          canDelete={canDelete}
          onBulkUpdate={mutations.bulkUpdate}
          onBulkDelete={handleBulkDelete}
          onClearSelection={handleClearSelection}
        />
      )}

      {!!converting && (
        <ConversionModal
          open={true}
          leadName={converting.leadName}
          onClose={handleConversionClose}
          onSubmit={handleConversionSubmit}
          canCreateDeal={canCreateDeal}
        />
      )}

      {!!losing && (
        <LostModal
          open={true}
          leadName={losing.leadName}
          onClose={handleLostClose}
          onSubmit={handleLostSubmit}
        />
      )}
    </>
  );
}
