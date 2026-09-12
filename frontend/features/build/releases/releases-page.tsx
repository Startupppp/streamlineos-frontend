"use client";

import { useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tag, CheckCircle2, Archive, Clock, Pencil } from "lucide-react";
import {
  useReleases,
  useDeleteRelease,
  type Release,
} from "@/hooks/api/build/releases";
import { useCan } from "@/hooks/api/access";
import { ReleaseFormSheet } from "./release-form-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { TABLE_TITLE_CELL, TEXT_FLEX_CHILD } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  STATUS_CONFIG,
  statusSort,
  NewReleaseButton,
  DeleteReleaseButton,
} from "./releases-page-parts";

interface ReleasesPageProps {
  projectId: number;
}

export function ReleasesPage({ projectId }: ReleasesPageProps) {
  const {
    data: releases,
    isLoading,
    isError,
    refetch,
  } = useReleases(projectId);
  const deleteRelease = useDeleteRelease(projectId);
  const canManage = useCan("build:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Release | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Release | null>(null);

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

  const columns = useMemo<DataTableColumn<Release>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        className: TABLE_TITLE_CELL,
        cell: (r) => (
          <div className={cn(TEXT_FLEX_CHILD, "space-y-0.5 overflow-hidden")}>
            <TruncatedText
              text={r.name}
              className="text-xs font-medium text-foreground"
            />
            <TruncatedText
              text={r.version}
              className="font-mono text-micro text-muted-foreground"
            />
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => {
          const cfg = STATUS_CONFIG[r.status];
          return (
            <Badge
              variant="outline"
              className={cn("h-5 py-0 text-micro", cfg.className)}
            >
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        key: "releaseDate",
        header: "Release Date",
        cell: (r) =>
          r.releaseDate ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {format(new Date(r.releaseDate), "MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: "ticketCount",
        header: "Tickets",
        cell: (r) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {r.ticketCount}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        cell: (r) => (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(r);
              }}
              aria-label={`Edit ${r.name}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <DeleteReleaseButton onClick={() => handleDeleteTarget(r)} />
          </div>
        ),
        className: "w-20",
      },
    ],
    [handleOpenEdit, handleDeleteTarget],
  );

  return (
    <PageWrapper
      title="Releases"
      subtitle="Track versions and shipped features"
      actions={
        canManage ? <NewReleaseButton onClick={handleOpenCreate} /> : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGrid cols={4}>
            <StatCard
              label="Total"
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
          {isError ? (
            <ErrorState
              className={PM_FILL_PANEL}
              title="Failed to load releases"
              description="Could not fetch release data. Please try again."
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              className={PM_FILL_PANEL}
              data={releases ?? []}
              columns={columns}
              getRowKey={(r) => r.id}
              isLoading={isLoading}
              onRowClick={handleOpenEdit}
              emptyState={
                <EmptyState
                  illustrationPreset="projects"
                  title="No releases yet"
                  description="Create your first release to track shipped features and versions."
                  action={{ label: "New Release", onClick: handleOpenCreate }}
                  className={PM_FILL_PANEL}
                />
              }
            />
          )}
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
