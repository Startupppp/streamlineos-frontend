"use client";

import { useState, useCallback, useMemo, type MouseEvent } from "react";
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
import { Tag, CheckCircle2, Archive, Clock, Pencil } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import {
  useReleases,
  useDeleteRelease,
  type Release,
} from "@/hooks/api/projects/releases";
import { useCan } from "@/hooks/api/access";
import { ReleaseFormSheet } from "./release-form-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/projects/shared/pm-chrome";
import {
  TABLE_TITLE_CELL,
  TEXT_ONE_LINE,
  TEXT_FLEX_CHILD,
} from "@/features/projects/shared/text-overflow";

const STATUS_CONFIG: Record<
  Release["status"],
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  released: {
    label: "Released",
    className:
      "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  archived: {
    label: "Archived",
    className:
      "text-muted-foreground border-border bg-muted dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  },
};

function statusSort(r: Release): number {
  return r.status === "released" ? 0 : r.status === "draft" ? 1 : 2;
}

interface ReleasesPageProps {
  projectId: number;
}

function NewReleaseButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      size="sm"
      className="gap-1 text-[11px]"
      onClick={onClick}
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={14} />
      New Release
    </Button>
  );
}

function DeleteReleaseButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClick();
    },
    [onClick],
  );
  return (
    <Button
      size="icon"
      variant="ghost"
      className="w-7 text-destructive hover:text-destructive"
      onClick={handleClick}
      aria-label="Delete release"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={12} />
    </Button>
  );
}

export function ReleasesPage({ projectId }: ReleasesPageProps) {
  const {
    data: releases,
    isLoading,
    isError,
    refetch,
  } = useReleases(projectId);
  const deleteRelease = useDeleteRelease(projectId);
  const canManage = useCan("projects:releases:manage");

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
        sortable: true,
        sortValue: (r) => r.name,
        className: TABLE_TITLE_CELL,
        cell: (r) => (
          <div className={cn(TEXT_FLEX_CHILD, "space-y-0.5 overflow-hidden")}>
            <p
              className={cn(
                TEXT_ONE_LINE,
                "text-xs font-medium text-foreground",
              )}
              title={r.name}
            >
              {r.name}
            </p>
            <p
              className={cn(
                TEXT_ONE_LINE,
                "font-mono text-[10px] text-muted-foreground",
              )}
              title={r.version}
            >
              {r.version}
            </p>
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
            <Badge
              variant="outline"
              className={cn("h-5 py-0 text-[10px]", cfg.className)}
            >
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
            <span className="text-xs tabular-nums text-muted-foreground">
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
            <PmPanel className={PM_FILL_PANEL}>
              <DataTable
                className="min-h-0 flex-1 border-0 bg-transparent shadow-none"
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
            </PmPanel>
          )}
        </PmSection>

        {sheetOpen ? (
          <ReleaseFormSheet
            projectId={projectId}
            release={editTarget ?? undefined}
            onClose={handleCloseSheet}
          />
        ) : null}

        <AlertDialog open={!!deleteTarget} onOpenChange={handleAlertOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete release?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{deleteTarget?.name} {deleteTarget?.version}&rdquo; will
                be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteRelease.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleConfirmDelete}
                disabled={deleteRelease.isPending}
              >
                {deleteRelease.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PmPageShell>
    </PageWrapper>
  );
}
