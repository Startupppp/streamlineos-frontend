"use client";

import { useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Tag, CheckCircle2, Archive, Clock, Pencil, Trash2 } from "lucide-react";
import {
  useReleases,
  useDeleteRelease,
  type Release,
} from "@/hooks/api/projects/releases";
import { ReleaseFormSheet } from "./release-form-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<Release["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  released: { label: "Released", className: "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  archived: { label: "Archived", className: "text-muted-foreground border-border bg-muted dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30" },
};

function statusSort(r: Release): number {
  return r.status === "released" ? 0 : r.status === "draft" ? 1 : 2;
}

interface ReleasesPageProps {
  projectId: number;
}

export function ReleasesPage({ projectId }: ReleasesPageProps) {
  const { data: releases, isLoading, isError, refetch } = useReleases(projectId);
  const deleteRelease = useDeleteRelease(projectId);

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

  const handleDeleteTarget = useCallback((r: Release) => setDeleteTarget(r), []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRelease.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Release deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete release"),
    });
  }, [deleteTarget, deleteRelease]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const columns = useMemo<DataTableColumn<Release>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        sortable: true,
        sortValue: (r) => r.name,
        cell: (r) => (
          <div>
            <p className="font-medium text-foreground text-xs">{r.name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{r.version}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        sortValue: statusSort,
        cell: (r) => {
          const cfg = STATUS_CONFIG[r.status];
          return (
            <Badge variant="outline" className={cn("text-[10px] py-0 h-5", cfg.className)}>
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        key: "releaseDate",
        header: "Release Date",
        sortable: true,
        sortValue: (r) => r.releaseDate ?? "",
        cell: (r) =>
          r.releaseDate ? (
            <span className="text-xs text-muted-foreground">
              {format(new Date(r.releaseDate), "MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          ),
      },
      {
        key: "ticketCount",
        header: "Tickets",
        sortable: true,
        sortValue: (r) => r.ticketCount,
        cell: (r) => (
          <span className="text-xs tabular-nums text-muted-foreground">{r.ticketCount}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        cell: (r) => (
          <div className="flex items-center gap-1 justify-end">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); handleOpenEdit(r); }}
              aria-label="Edit release"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); handleDeleteTarget(r); }}
              aria-label="Delete release"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ),
        className: "w-16",
      },
    ],
    [handleOpenEdit, handleDeleteTarget],
  );

  return (
    <PageWrapper
      title="Releases"
      eyebrow="Project"
      subtitle="Track versions and shipped features"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Release
        </Button>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total" value={stats.total} icon={Tag} tone="default" index={0} />
          <StatCard label="Released" value={stats.released} icon={CheckCircle2} tone="emerald" index={1} />
          <StatCard label="Draft" value={stats.draft} icon={Clock} tone="amber" index={2} />
          <StatCard label="Archived" value={stats.archived} icon={Archive} tone="default" index={3} />
        </StatCardGrid>

        {isError ? (
          <ErrorState
            title="Failed to load releases"
            description="Could not fetch release data. Please try again."
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
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
              />
            }
          />
        )}
      </div>

      {sheetOpen && (
        <ReleaseFormSheet
          projectId={projectId}
          release={editTarget ?? undefined}
          onClose={handleCloseSheet}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete release?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name} {deleteTarget?.version}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
