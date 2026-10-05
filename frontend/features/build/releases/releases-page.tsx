"use client";

import { useState, useCallback, useMemo, useRef, type MouseEvent } from "react";
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
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import {
  useReleases,
  useDeleteRelease,
  type Release,
} from "@/hooks/api/build/releases";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { ReleaseFormSheet } from "./release-form-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
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
  { param: "from" },
  { param: "to" },
] as const;

type ReleaseStatus = "draft" | "released" | "archived";

function isReleaseStatus(value: string): value is ReleaseStatus {
  return value === "draft" || value === "released" || value === "archived";
}

function readDateFilter(value: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

interface ReleasesPageProps {
  projectId: number;
}

export function ReleasesPage({ projectId }: ReleasesPageProps) {
  const listFilters = useBuildListFilters({
    filters: RELEASE_FILTER_DEFINITIONS,
  });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const statusFilterValue = listFilters.value("status");
  const serverStatus = isReleaseStatus(statusFilterValue)
    ? statusFilterValue
    : undefined;
  const fromValue = readDateFilter(listFilters.value("from"));
  const toValue = readDateFilter(listFilters.value("to"));

  const { data, isLoading, isError, error, refetch } = useReleases(projectId, {
    cursor: pager.cursor,
    status: serverStatus,
    q: listFilters.debouncedSearch || undefined,
    from: fromValue,
    to: toValue,
  });

  const canManage = useCan("build:manage");
  const isOnline = useOnlineStatus();
  const deleteRelease = useDeleteRelease(projectId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Release | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Release | null>(null);
  const [contextTarget, setContextTarget] = useState<{
    release: Release;
    x: number;
    y: number;
  } | null>(null);

  const releases = data?.data ?? [];
  const pagination = data?.pagination;

  const stats = useMemo(
    () => ({
      total: releases.length,
      released: releases.filter((r) => r.status === "released").length,
      draft: releases.filter((r) => r.status === "draft").length,
      archived: releases.filter((r) => r.status === "archived").length,
    }),
    [releases],
  );

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

  const handleDeleteTarget = useCallback(
    (r: Release) => setDeleteTarget(r),
    [],
  );

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

  const handleRowContextMenu = useCallback(
    (row: Release, event: MouseEvent) => {
      if (!canManage) return;
      event.preventDefault();
      setContextTarget({ release: row, x: event.clientX, y: event.clientY });
    },
    [canManage],
  );

  const handleContextMenuOpenChange = useCallback((open: boolean) => {
    if (!open) setContextTarget(null);
  }, []);

  const handleContextEdit = useCallback(() => {
    if (!contextTarget) return;
    handleOpenEdit(contextTarget.release);
    setContextTarget(null);
  }, [contextTarget, handleOpenEdit]);

  const handleContextDelete = useCallback(() => {
    if (!contextTarget) return;
    setDeleteTarget(contextTarget.release);
    setContextTarget(null);
  }, [contextTarget]);

  const handleStatusFilterChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      listFilters.setValue("from", range.from);
      listFilters.setValue("to", range.to);
    },
    [listFilters],
  );

  const handleClearSelection = useCallback(() => {
    setContextTarget(null);
  }, []);
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
            <StatCard
              label="This page"
              value={stats.total}
              icon={Tag}
              tone="default"
              index={0}
            />
            <StatCard
              label="Released"
              value={stats.released}
              icon={CheckCircle2}
              tone="emerald"
              index={1}
            />
            <StatCard
              label="Draft"
              value={stats.draft}
              icon={Clock}
              tone="amber"
              index={2}
            />
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
                action={{ label: "New Release", onClick: handleOpenCreate }}
                className={CONTENT_FILL_PANEL}
              />
            }
            filteredEmpty={
              <EmptyState
                illustrationPreset="projects"
                title="No releases match your filters"
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

        <DropdownMenu open={contextTarget !== null} onOpenChange={handleContextMenuOpenChange}>
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
            <DropdownMenuItem onSelect={handleContextEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={handleContextDelete}>
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
