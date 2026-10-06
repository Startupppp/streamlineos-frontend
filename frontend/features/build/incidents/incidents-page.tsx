"use client";

import { useCallback } from "react";
import { Plus, Siren } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IncidentSheet } from "./incident-sheet";
import type { IncidentsCreateIncidentResponse } from "@/contracts/build-contracts.generated";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import {
  INCIDENTS_TABLE_HEADERS,
  IncidentMobileCard,
} from "./incidents-table-columns";
import { useIncidentsPage } from "./use-incidents-page";

const SEVERITY_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "detected", label: "Detected" },
  { value: "investigating", label: "Investigating" },
  { value: "mitigating", label: "Mitigating" },
  { value: "resolved", label: "Resolved" },
  { value: "postmortem", label: "Post-mortem" },
  { value: "closed", label: "Closed" },
];

const INCIDENTS_LIST_CAP = 100;

interface IncidentsPageProps {
  projectId: number;
}

export function IncidentsPage({ projectId }: IncidentsPageProps) {
  const {
    canManage,
    listFilters,
    sheetOpen,
    setSheetOpen,
    editIncident,
    deleteTarget,
    setDeleteTarget,
    statusValue,
    severityValue,
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    members,
    all,
    openCount,
    slaBreachedCount,
    resolvedCount,
    columns,
    handleRetry,
    handleEdit,
    handleNew,
    handleAlertOpenChange,
    handleDeleteConfirm,
    handleStatusChange,
    handleSeverityChange,
    handleNextPage,
  } = useIncidentsPage({ projectId });

  const renderMobileCard = useCallback(
    (row: IncidentsCreateIncidentResponse) => (
      <IncidentMobileCard
        incident={row}
        canManage={canManage}
        members={members}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />
    ),
    [canManage, members, handleEdit, setDeleteTarget],
  );

  return (
    <PageWrapper
      title="Incidents"
      subtitle="Track incidents and SLA compliance"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search incidents…",
            label: "Search incidents",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "severity",
              label: "Severity",
              active: listFilters.isActive("severity"),
              control: (
                <BuildFilterSelect
                  label="Severity"
                  value={severityValue}
                  onValueChange={handleSeverityChange}
                  options={SEVERITY_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canManage
              ? [
                  {
                    id: "new-incident",
                    label: "New Incident",
                    icon: Plus,
                    primary: true,
                    onSelect: handleNew,
                  },
                ]
              : []
          }
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <StatCardGrid cols={3}>
            <StatCard
              label="Open"
              value={openCount}
              icon={Siren}
              tone="amber"
              isLoading={isLoading}
            />
            <StatCard
              label="SLA Breached"
              value={slaBreachedCount}
              tone="red"
              isLoading={isLoading}
            />
            <StatCard
              label="Resolved"
              value={resolvedCount}
              tone="emerald"
              isLoading={isLoading}
            />
          </StatCardGrid>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          {!isLoading && !isError && all.length >= INCIDENTS_LIST_CAP ? (
            <p className="mb-2 shrink-0 text-micro text-muted-foreground">
              Showing the most recent {INCIDENTS_LIST_CAP} incidents. Narrow the
              status or severity filter to see more.
            </p>
          ) : null}
          <BuildListSurface<IncidentsCreateIncidentResponse>
            permission="build:incidents:view"
            rows={all}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            mobileCard={renderMobileCard}
            loadingHeaders={INCIDENTS_TABLE_HEADERS}
            loadingRows={12}
            pagination={{
              mode: "cursor",
              cursorVariant: "load-more",
              pageSize: 25,
              pageNumber: Array.isArray(data) ? 1 : (data?.pages.length ?? 1),
              hasMore: Boolean(hasNextPage),
              onNext: handleNextPage,
            }}
            isFetchingMore={isFetchingNextPage}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="ticket"
                title="No incidents found"
                description="Create an incident to start tracking."
                action={
                  canManage
                    ? { label: "New Incident", onClick: handleNew }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="ticket"
                title="No incidents match your filters"
                description="Try adjusting the filters to see more incidents."
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <IncidentSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editIncident={editIncident}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete incident?"
        description={`INC-${deleteTarget?.incidentNumber ?? ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
