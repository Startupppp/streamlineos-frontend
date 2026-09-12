"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSalesTeamCapacity } from "@/hooks/api/leads";
import type { DensityMode } from "@/lib/design-tokens";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import type { Lead, LeadPriority, PipelineStatus } from "@/types/leads";
import { useLeadMutations, type ConversionDetails } from "./use-lead-mutations";

const LEAD_TABLE_SKELETON_COLUMNS = 8;

const LeadRecordTable = dynamic(
  () => import("./lead-record-table").then((m) => ({ default: m.LeadRecordTable })),
  {
    ssr: false,
    loading: () => (
      <DataTableSkeleton rows={12} columns={LEAD_TABLE_SKELETON_COLUMNS} className="flex-1" />
    ),
  },
);

const BulkActionsBar = dynamic(
  () => import("./lead-bulk-actions-bar").then((m) => ({ default: m.BulkActionsBar })),
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
  totalCount: number | undefined;
  cursorPage: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onResetPage: () => void;
  pageSize: number;
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
  cursorPage,
  hasMore,
  onPrevious,
  onNext,
  onResetPage,
  pageSize,
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
  const mutations = useLeadMutations();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [converting, setConverting] = useState<PendingLead | null>(null);
  const [losing, setLosing] = useState<PendingLead | null>(null);

  const { data: teamCapacity } = useSalesTeamCapacity();
  const teamMembers = useMemo(
    () => (teamCapacity ?? []).map(({ id, name, image }) => ({ id, name, image })),
    [teamCapacity],
  );

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);
  const canSelect = canUpdate || canAssign || canDelete;

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
        if (cursorPage > 1) onResetPage();
      });
    },
    [mutations, cursorPage, onResetPage],
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

  const isFiltered = activeFilterLabels.length > 0;

  if (isLoading)
    return (
      <DataTableSkeleton rows={12} columns={LEAD_TABLE_SKELETON_COLUMNS} className="flex-1" />
    );

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
      <LeadRecordTable
        leads={leads}
        density={density}
        pageSize={pageSize}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        canSelect={canSelect}
        canUpdate={canUpdate}
        canAssign={canAssign}
        teamMembers={teamMembers}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onAssign={handleAssign}
      />

      {(cursorPage > 1 || hasMore) ? (
        <CursorPageControls
          page={cursorPage}
          hasNext={hasMore}
          disabled={isLoading}
          onPrevious={onPrevious}
          onNext={onNext}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={STANDARD_PAGE_SIZE_OPTIONS}
        />
      ) : null}

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
