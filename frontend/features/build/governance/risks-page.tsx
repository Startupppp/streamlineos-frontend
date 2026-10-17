"use client";

import { useCallback } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { GOVERNANCE_PAGE_SIZE } from "@/hooks/api/build/governance";
import type { Risk } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RiskMatrix } from "./risk-matrix";
import { RiskFormSheet } from "./risk-form-sheet";
import {
  PmPageShell,
  PmSection,
  PmPanel,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { RISK_TABLE_HEADERS, RiskMobileCard } from "./risks-table-columns";
import { RiskBulkActionBar } from "./risk-bulk-action-bar";
import { STATUS_OPTIONS, PROBABILITY_OPTIONS, IMPACT_OPTIONS } from "./risks-filter-options";
import { useRisksPage } from "./use-risks-page";

interface RisksPageProps {
  projectId: number;
}

export function RisksPage({ projectId }: RisksPageProps) {
  const {
    canManage,
    listFilters,
    statusValue,
    probabilityValue,
    impactValue,
    matrixCell,
    sheetOpen,
    editRisk,
    deleteTarget,
    data,
    isLoading,
    isError,
    error,
    stats,
    isStatsLoading,
    members,
    createRisk,
    updateRisk,
    riskFieldErrors,
    handleCreate,
    handleUpdate,
    handleDeleteConfirm,
    displayed,
    isFiltered,
    selectedIds,
    setSelectedIds,
    handleBulkStatus,
    handleBulkOwner,
    handleBulkClear,
    openCount,
    highCritCount,
    closedCount,
    columns,
    pageNumber,
    hasPrevious,
    goPrevious,
    handleStatusChange,
    handleProbabilityChange,
    handleImpactChange,
    handleNewRisk,
    handleClearAll,
    handleRetry,
    handleNextPage,
    handleAlertOpenChange,
    handleSheetOpenChange,
    handleCellClick,
    handleEditRow,
    handleDeleteRow,
    ownerOf,
  } = useRisksPage(projectId);

  const renderMobileCard = useCallback(
    (row: Risk) => (
      <RiskMobileCard
        risk={row}
        canManage={canManage}
        ownerOf={ownerOf}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, ownerOf, handleEditRow, handleDeleteRow],
  );

  return (
    <PageWrapper
      title="Risk Register"
      subtitle="Identify, assess, and mitigate project risks"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search risks…",
            label: "Search risks",
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
              id: "probability",
              label: "Probability",
              active: listFilters.isActive("probability"),
              control: (
                <BuildFilterSelect
                  label="Probability"
                  value={probabilityValue}
                  onValueChange={handleProbabilityChange}
                  options={PROBABILITY_OPTIONS}
                />
              ),
            },
            {
              id: "impact",
              label: "Impact",
              active: listFilters.isActive("impact"),
              control: (
                <BuildFilterSelect
                  label="Impact"
                  value={impactValue}
                  onValueChange={handleImpactChange}
                  options={IMPACT_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={handleClearAll}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canManage
              ? [
                  {
                    id: "create",
                    label: "New Risk",
                    icon: Plus,
                    primary: true,
                    onSelect: handleNewRisk,
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
              icon={ShieldAlert}
              tone="default"
              isLoading={isStatsLoading}
            />
            <StatCard
              label="High / Critical"
              value={highCritCount}
              icon={AlertTriangle}
              tone="red"
              isLoading={isStatsLoading}
            />
            <StatCard
              label="Closed"
              value={closedCount}
              icon={CheckCircle2}
              tone="emerald"
              isLoading={isStatsLoading}
            />
          </StatCardGrid>
        </PmSection>

        {!isStatsLoading && !isLoading ? (
          <PmSection index={1} className="shrink-0">
            <PmPanel className="p-3" solid>
              <RiskMatrix
                cells={stats?.matrix ?? []}
                onCellClick={handleCellClick}
                selectedCell={matrixCell}
              />
            </PmPanel>
          </PmSection>
        ) : null}

        <PmSection index={2} className="flex min-h-0 flex-1 flex-col">
          {selectedIds.size > 0 && (
            <RiskBulkActionBar
              selectedCount={selectedIds.size}
              onBulkStatus={handleBulkStatus}
              onBulkOwner={handleBulkOwner}
              members={members}
              onClear={handleBulkClear}
            />
          )}
          <BuildListSurface<Risk>
            permission="build:risks:view"
            rows={displayed}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={isFiltered}
            getRowKey={(row) => row.id}
            minWidth="780px"
            mobileCard={renderMobileCard}
            loadingHeaders={RISK_TABLE_HEADERS}
            loadingRows={12}
            selection={{
              selected: selectedIds,
              onChange: setSelectedIds,
              getRowLabel: (row) => row.title,
            }}
            pagination={{
              mode: "cursor",
              pageSize: GOVERNANCE_PAGE_SIZE,
              pageNumber,
              hasMore: data?.hasMore ?? false,
              hasPrevious,
              onNext: handleNextPage,
              onPrevious: goPrevious,
            }}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="alert"
                title="No risks logged"
                description="Log risks to track probability, impact, and mitigation plans."
                action={
                  canManage
                    ? { label: "New Risk", onClick: handleNewRisk }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="alert"
                title="No risks match your filters"
                description="Try adjusting the filters to see more risks."
                onClearFilters={handleClearAll}
              />
            }
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <RiskFormSheet
        open={sheetOpen || !!editRisk}
        onOpenChange={handleSheetOpenChange}
        mode={editRisk ? "edit" : "create"}
        defaultValues={editRisk ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createRisk.isPending || updateRisk.isPending}
        projectId={projectId}
        serverErrors={riskFieldErrors}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete risk?"
        description={`RISK-${deleteTarget?.riskNumber ?? ""} · ${deleteTarget?.title ?? ""} will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
