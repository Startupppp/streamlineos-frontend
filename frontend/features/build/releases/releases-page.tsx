"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { Tag, CheckCircle2, Archive, Clock } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import {
  useReleases,
  useDeleteRelease,
  type Release,
} from "@/hooks/api/build/releases";
import { useCan } from "@/hooks/api/access";
import { ReleaseFormSheet } from "./release-form-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import {
  RELEASES_TABLE_HEADERS,
  ReleaseMobileCard,
  buildReleasesColumns,
} from "./releases-table-columns";

const RELEASE_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "released", label: "Released" },
  { value: "archived", label: "Archived" },
] as const;

const RELEASE_FILTER_DEFINITIONS = [
  { param: "status", options: RELEASE_STATUS_OPTIONS.map((o) => o.value) },
] as const;

interface ReleasesPageProps {
  projectId: number;
}

export function ReleasesPage({ projectId }: ReleasesPageProps) {
  const listFilters = useBuildListFilters({ filters: RELEASE_FILTER_DEFINITIONS });
  const pager = useCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const statusFilterValue = listFilters.value("status");
  const serverStatus =
    statusFilterValue !== BUILD_FILTER_ALL
      ? (statusFilterValue as "draft" | "released" | "archived")
      : undefined;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useReleases(projectId, {
    cursor: pager.cursor,
    status: serverStatus,
    q: listFilters.debouncedSearch || undefined,
  });

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const canManage = useCan("build:manage");
  const deleteRelease = useDeleteRelease(projectId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Release | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Release | null>(null);

  const releases = data?.data ?? [];
  const pagination = data?.pagination;

  const stats = useMemo(() => ({
    total: releases.length,
    released: releases.filter((r) => r.status === "released").length,
    draft: releases.filter((r) => r.status === "draft").length,
    archived: releases.filter((r) => r.status === "archived").length,
  }), [releases]);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((r: Release) => {
    setEditTarget(r);
    setSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
  }, []);

  const handleDeleteTarget = useCallback((r: Release) => setDeleteTarget(r), []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRelease.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Release deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deleteRelease]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleStatusFilterChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleClearSelection = useCallback(() => {}, []);
  const handleOpenByIndex = useCallback(
    (index: number) => {
      const row = releases[index];
      if (row) handleOpenEdit(row);
    },
    [releases, handleOpenEdit],
  );
  const handleEditByIndex = useCallback(
    (index: number) => {
      const row = releases[index];
      if (row) handleOpenEdit(row);
    },
    [releases, handleOpenEdit],
  );
  useBuildListKeyboard({
    itemCount: releases.length,
    onOpen: handleOpenByIndex,
    onEdit: handleEditByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

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
        <PmSection index={0}>
          <StatCardGrid cols={4}>
            <StatCard label="This page" value={stats.total} icon={Tag} tone="default" index={0} />
            <StatCard
              label="Released"
              value={stats.released}
              icon={CheckCircle2}
              tone="emerald"
              index={1}
            />
            <StatCard label="Draft" value={stats.draft} icon={Clock} tone="amber" index={2} />
            <StatCard
              label="Archived"
              value={stats.archived}
              icon={Archive}
              tone="default"
              index={3}
            />
          </StatCardGrid>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton mobileCards
                rows={8}
                headers={RELEASES_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                illustrationPreset="projects"
                title="No releases yet"
                description="Create your first release to track shipped features and versions."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={{ label: "New Release", onClick: handleOpenCreate }}
                className={PM_FILL_PANEL}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <>
              <DataTable
                className={PM_FILL_PANEL}
                data={releases}
                columns={columns}
                getRowKey={(r) => r.id}
                onRowClick={handleOpenEdit}
                mobileCard={renderMobileCard}
              />
              {(pagination?.hasMore || pager.hasPrevious) ? (
                <TablePagination
                  mode="cursor"
                  rowCount={releases.length}
                  hasMore={pagination?.hasMore ?? false}
                  hasPrevious={pager.hasPrevious}
                  onNext={() => pager.goNext(pagination?.nextCursor)}
                  onPrevious={pager.goPrevious}
                />
              ) : null}
            </>
          </PageState>
        </PmSection>

        {sheetOpen ? (
          <ReleaseFormSheet
            projectId={projectId}
            release={editTarget ?? undefined}
            onClose={handleCloseSheet}
          />
        ) : null}

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
