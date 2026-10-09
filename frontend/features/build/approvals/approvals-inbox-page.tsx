"use client";

import { useCallback } from "react";
import { Clock, ListChecks } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DecideDialog } from "./decide-dialog";
import { ApprovalBulkActionBar } from "./approval-bulk-action-bar";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { ENTITY_OPTIONS, STATUS_OPTIONS } from "./approvals-constants";
import type { ApprovalInboxItem } from "@/types/projects";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import {
  INBOX_TABLE_HEADERS,
  ApprovalsInboxMobileCard,
} from "./approvals-inbox-columns";
import { useApprovalsInboxPage } from "./use-approvals-inbox-page";

export function ApprovalsInboxPage() {
  const {
    canDecide,
    canManage,
    searchInputRef,
    isOnline,
    listFilters,
    statusFilter,
    typeFilter,
    fromFilter,
    toFilter,
    searchDisplay,
    isLoading,
    isError,
    error,
    pageNumber,
    hasPrevious,
    hasMore,
    filteredItems,
    queueTarget,
    decideTarget,
    selection,
    setSelection,
    isBulkPending,
    pending,
    overdue,
    ownerOf,
    columns,
    handleDecideClick,
    handleRetry,
    handleDecideDialogChange,
    handleReturnFocus,
    handleStatusChange,
    handleTypeChange,
    handleDateRangeChange,
    handleClearSelection,
    isRowSelectable,
    handleNextPage,
    handlePreviousPage,
    handleBulkCancel,
  } = useApprovalsInboxPage();

  const renderMobileCard = useCallback(
    (row: ApprovalInboxItem) => (
      <ApprovalsInboxMobileCard
        row={row}
        ownerOf={ownerOf}
        onDecide={canDecide ? handleDecideClick : undefined}
      />
    ),
    [canDecide, handleDecideClick, ownerOf],
  );

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Approvals waiting for your decision across all projects"
      filters={
        <BuildListToolbar
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusFilter}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "type",
              label: "Type",
              active: listFilters.isActive("type"),
              control: (
                <BuildFilterSelect
                  label="Type"
                  value={typeFilter}
                  onValueChange={handleTypeChange}
                  options={ENTITY_OPTIONS}
                />
              ),
            },
            {
              id: "dateRange",
              label: "Date",
              active:
                listFilters.isActive("from") || listFilters.isActive("to"),
              control: (
                <DateRangePicker
                  from={fromFilter === "all" ? undefined : fromFilter}
                  to={toFilter === "all" ? undefined : toFilter}
                  onChange={handleDateRangeChange}
                />
              ),
            },
          ]}
          search={{
            value: searchDisplay,
            onValueChange: listFilters.setSearch,
            placeholder: "Search approvals…",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          {isLoading ? (
            <StatCardGridSkeleton cols={2} />
          ) : (
            <StatCardGrid cols={2}>
              <StatCard
                label="Pending on page"
                value={pending}
                icon={ListChecks}
                tone="amber"
                index={0}
              />
              <StatCard
                label="Overdue on page"
                value={overdue}
                icon={Clock}
                tone="red"
                index={1}
              />
            </StatCardGrid>
          )}
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          {!isOnline && (
            <p className="text-sm text-muted-foreground px-4 py-2 bg-muted/50 rounded-md mb-2">
              You&apos;re offline — results may not be up to date
            </p>
          )}
          {canManage && (
            <ApprovalBulkActionBar
              selectedCount={selection.size}
              isPending={isBulkPending}
              onCancelSelected={handleBulkCancel}
              onClear={handleClearSelection}
            />
          )}
          <BuildListSurface<ApprovalInboxItem>
            permission="build:approvals:view"
            rows={filteredItems}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => `${row.projectId}-${row.id}`}
            minWidth="680px"
            mobileCard={renderMobileCard}
            loadingHeaders={INBOX_TABLE_HEADERS}
            loadingRows={12}
            selection={{
              selected: selection,
              onChange: setSelection,
              isRowSelectable,
              getRowLabel: (row) => row.title,
            }}
            pagination={{
              mode: "cursor",
              pageSize: 25,
              pageNumber,
              hasPrevious,
              hasMore,
              onNext: handleNextPage,
              onPrevious: handlePreviousPage,
            }}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals waiting"
                description="You have no pending approvals across your projects."
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals match your filters"
                description="Try adjusting the filters to see more approvals."
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <DecideDialog
        open={!!decideTarget}
        onOpenChange={handleDecideDialogChange}
        projectId={decideTarget?.projectId ?? 0}
        approvalId={decideTarget?.approvalId ?? 0}
        revision={
          queueTarget?.projectId === decideTarget?.projectId &&
          queueTarget?.approvalId === decideTarget?.approvalId
            ? queueTarget?.revision
            : undefined
        }
        onCloseAutoFocus={handleReturnFocus}
      />
    </PageWrapper>
  );
}
