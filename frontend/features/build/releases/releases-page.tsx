"use client";

import { useCallback, useMemo } from "react";
import { Plus, WifiOff } from "lucide-react";
import { Tag, CheckCircle2, Archive, Clock } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReleaseFormSheet } from "./release-form-sheet";
import type { Release } from "@/types/projects";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  RELEASES_TABLE_HEADERS,
  ReleaseMobileCard,
  buildReleasesColumns,
} from "./releases-table-columns";
import { RELEASE_STATUS_OPTIONS } from "./releases-page-model";
import { useReleasesPage } from "./use-releases-page";

interface ReleasesPageProps {
  projectId: number;
}

export function ReleasesPage({ projectId }: ReleasesPageProps) {
  const {
    listFilters,
    pager,
    searchInputRef,
    statusFilterValue,
    fromValue,
    toValue,
    releases,
    pagination,
    stats,
    isLoading,
    isError,
    error,
    canManage,
    isOnline,
    sheetOpen,
    editTarget,
    deleteTarget,
    contextTarget,
    deleteRelease,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseSheet,
    handleDeleteTarget,
    handleAlertOpenChange,
    handleConfirmDelete,
    handleRetry,
    handleRowContextMenu,
    handleContextMenuOpenChange,
    handleContextEdit,
    handleContextDelete,
    handleStatusFilterChange,
    handleDateRangeChange,
  } = useReleasesPage(projectId);

  const columns = useMemo(
    () =>
      buildReleasesColumns({
        canManage,
        onEdit: handleOpenEdit,
        onDelete: handleDeleteTarget,
      }),
    [canManage, handleOpenEdit, handleDeleteTarget],
  );

  const renderMobileCard = useCallback(
    (row: Release) => (
      <ReleaseMobileCard
        release={row}
        canManage={canManage}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteTarget}
      />
    ),
    [canManage, handleOpenEdit, handleDeleteTarget],
  );

  return (
    <PageWrapper
      title="Releases"
      subtitle="Track versions and shipped features"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search releases…",
            label: "Search releases",
            inputRef: searchInputRef,
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusFilterValue}
                  onValueChange={handleStatusFilterChange}
                  options={RELEASE_STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "date-range",
              label: "Date range",
              active:
                listFilters.isActive("from") || listFilters.isActive("to"),
              control: (
                <DateRangePicker
                  from={fromValue}
                  to={toValue}
                  onChange={handleDateRangeChange}
                  placeholder="Filter by release date…"
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
                    id: "new-release",
                    label: "New Release",
                    icon: Plus,
                    primary: true,
                    onSelect: handleOpenCreate,
                  },
                ]
              : []
          }
        />
      }
    >
      <PmPageShell>
        {!isOnline ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2">
            <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              You&apos;re offline — results may not be up to date.
            </p>
          </div>
        ) : null}
        <PmSection index={0}>
          <StatCardGrid cols={4}>
            <StatCard label="This page" value={stats.total} icon={Tag} tone="default" index={0} />
            <StatCard label="Released" value={stats.released} icon={CheckCircle2} tone="emerald" index={1} />
            <StatCard label="Draft" value={stats.draft} icon={Clock} tone="amber" index={2} />
            <StatCard label="Archived" value={stats.archived} icon={Archive} tone="default" index={3} />
          </StatCardGrid>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <BuildListSurface<Release>
            permission="build:view"
            rows={releases}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(r) => r.id}
            onRowClick={handleOpenEdit}
            onRowContextMenu={handleRowContextMenu}
            mobileCard={renderMobileCard}
            pagination={{
              mode: "cursor",
              pageSize: 25,
              pageNumber: pager.pageNumber,
              hasMore: pagination?.hasMore ?? false,
              hasPrevious: pager.hasPrevious,
              onNext: () => pager.goNext(pagination?.nextCursor),
              onPrevious: pager.goPrevious,
            }}
            empty={
              <EmptyState
                illustrationPreset="projects"
                title="No releases yet"
                description="Create your first release to track shipped features and versions."
                action={
                  canManage
                    ? { label: "New Release", onClick: handleOpenCreate }
                    : undefined
                }
                className={CONTENT_FILL_PANEL}
              />
            }
            filteredEmpty={
              <EmptyState
                illustrationPreset="projects"
                title="No releases match your filters"
                filtersActive
                filteredTitle="No releases match your filters"
                description="Try adjusting the filters to see more releases."
                onClearFilters={listFilters.clearAll}
                className={CONTENT_FILL_PANEL}
              />
            }
            loadingHeaders={RELEASES_TABLE_HEADERS}
            loadingRows={8}
            onRetry={handleRetry}
          />
        </PmSection>

        {sheetOpen ? (
          <ReleaseFormSheet
            projectId={projectId}
            release={editTarget ?? undefined}
            onClose={handleCloseSheet}
          />
        ) : null}

        <DropdownMenu
          open={contextTarget !== null}
          onOpenChange={handleContextMenuOpenChange}
        >
          <DropdownMenuTrigger asChild>
            <span
              aria-hidden
              tabIndex={-1}
              className="fixed h-0 w-0"
              style={
                contextTarget === null
                  ? undefined
                  : { left: contextTarget.x, top: contextTarget.y }
              }
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={handleContextEdit}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleContextDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={handleAlertOpenChange}
          title="Delete release?"
          description={`"${deleteTarget?.name ?? ""} ${deleteTarget?.version ?? ""}" will be permanently deleted.`}
          confirmLabel="Delete"
          destructive
          isPending={deleteRelease.isPending}
          onConfirm={handleConfirmDelete}
        />
      </PmPageShell>
    </PageWrapper>
  );
}
