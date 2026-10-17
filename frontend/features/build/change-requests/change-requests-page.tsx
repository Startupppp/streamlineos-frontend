"use client";

import { useCallback } from "react";
import { Plus, X } from "lucide-react";
import type { ChangeRequest } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
  PM_TOOLBAR,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import { ChangeRequestSheet } from "./change-request-sheet";
import { CR_STATUSES, CR_STATUS_LABELS } from "./change-request-schema";
import {
  CHANGE_REQUESTS_TABLE_HEADERS,
  ChangeRequestMobileCard,
} from "./change-requests-table-columns";
import { useChangeRequestsPage } from "./use-change-requests-page";

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  ...CR_STATUSES.map((s) => ({ value: s, label: CR_STATUS_LABELS[s] })),
];

const CLIENT_VISIBLE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All visibility" },
  { value: "true", label: "Client visible" },
  { value: "false", label: "Internal only" },
];

const PAGE_SIZE = 25;

interface ChangeRequestsPageProps {
  projectId: number;
}

export function ChangeRequestsPage({ projectId }: ChangeRequestsPageProps) {
  const {
    canCreate,
    canManage,
    listFilters,
    pageNumber,
    hasPrevious,
    goPrevious,
    sheetOpen,
    setSheetOpen,
    editCr,
    deleteTarget,
    setDeleteTarget,
    selectedCrIds,
    setSelectedCrIds,
    statusValue,
    clientVisibleValue,
    impactValue,
    crs,
    pagination,
    isLoading,
    isError,
    error,
    deleteCrIsPending,
    members,
    handleNew,
    handleEdit,
    handleAlertOpenChange,
    handleDelete,
    handleRetry,
    handleKeyboardClear,
    handleBulkStatusChange,
    handleStatusChange,
    handleClientVisibleChange,
    handleImpactChange,
    handleNextPage,
    columns,
  } = useChangeRequestsPage(projectId);

  const renderMobileCard = useCallback(
    (row: ChangeRequest) => (
      <ChangeRequestMobileCard
        cr={row}
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
      title="Change Requests"
      subtitle="Track and manage change requests"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search change requests…",
            label: "Search change requests",
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
              id: "clientVisible",
              label: "Visibility",
              active: listFilters.isActive("clientVisible"),
              control: (
                <BuildFilterSelect
                  label="Visibility"
                  value={clientVisibleValue}
                  onValueChange={handleClientVisibleChange}
                  options={CLIENT_VISIBLE_OPTIONS}
                />
              ),
            },
            {
              id: "impact",
              label: "Impact",
              active: listFilters.isActive("impact"),
              control: (
                <SearchInput
                  placeholder="Filter by impact…"
                  value={impactValue !== BUILD_FILTER_ALL ? impactValue : ""}
                  onValueChange={handleImpactChange}
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
            canCreate
              ? [
                  {
                    id: "new-cr",
                    label: "New Change Request",
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
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {selectedCrIds.size > 0 && (
            <div
              className={cn(
                PM_TOOLBAR,
                "mb-2 rounded-lg border border-border/80 bg-card px-3 py-2",
              )}
            >
              <span className="text-sm font-medium">
                {selectedCrIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleBulkStatusChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Set status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CR_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {CR_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Clear selection"
                  onClick={handleKeyboardClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <BuildListSurface<ChangeRequest>
            permission="build:changerequests:view"
            rows={crs}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            mobileCard={renderMobileCard}
            selection={{
              selected: selectedCrIds,
              onChange: setSelectedCrIds,
              getRowLabel: (row) => `CR-${row.crNumber}: ${row.title}`,
            }}
            pagination={{
              mode: "cursor",
              pageSize: PAGE_SIZE,
              pageNumber,
              hasMore: Boolean(pagination?.hasMore),
              hasPrevious,
              onNext: handleNextPage,
              onPrevious: goPrevious,
            }}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No change requests"
                description="Create a change request to get started."
                action={
                  canCreate
                    ? { label: "New Change Request", onClick: handleNew }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No change requests match your filters"
                description="Try adjusting or clearing the filters."
                onClearFilters={listFilters.clearAll}
              />
            }
            loadingHeaders={CHANGE_REQUESTS_TABLE_HEADERS}
            loadingRows={12}
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <ChangeRequestSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editCr={editCr}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete change request?"
        description={`CR-${deleteTarget?.crNumber ?? ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteCrIsPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
