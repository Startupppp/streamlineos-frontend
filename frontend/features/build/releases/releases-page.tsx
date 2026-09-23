"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Tag, CheckCircle2, Archive, Clock } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import {
  RELEASES_TABLE_HEADERS,
  ReleaseMobileCard,
  buildReleasesColumns,
} from "./releases-table-columns";

interface ReleasesPageProps {
  projectId: number;
}

export function ReleasesPage({ projectId }: ReleasesPageProps) {
  const {
    data: releases,
    isLoading,
    isError,
    error,
    refetch,
  } = useReleases(projectId);

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const canManage = useCan("build:manage");
  const deleteRelease = useDeleteRelease(projectId);

  const listFilters = useBuildListFilters();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Release | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Release | null>(null);

  const search = listFilters.debouncedSearch.trim().toLowerCase();
  const displayed = useMemo(() => {
    const list = releases ?? [];
    if (!search) return list;
    return list.filter((r) => r.name.toLowerCase().includes(search));
  }, [releases, search]);

  const stats = useMemo(() => {
    const list = releases ?? [];
    return {
      total: list.length,
      released: list.filter((r) => r.status === "released").length,
      draft: list.filter((r) => r.status === "draft").length,
      archived: list.filter((r) => r.status === "archived").length,
    };
  }, [releases]);

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
          }}
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
            <StatCard label="Total" value={stats.total} icon={Tag} tone="default" index={0} />
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
              <DataTableSkeleton
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
            <DataTable
              className={PM_FILL_PANEL}
              data={displayed}
              columns={columns}
              getRowKey={(r) => r.id}
              onRowClick={handleOpenEdit}
              mobileCard={renderMobileCard}
              pagination={{ pageSize: 25 }}
            />
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
