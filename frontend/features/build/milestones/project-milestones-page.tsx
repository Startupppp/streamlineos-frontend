"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { Diamond, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  useProjectMilestones,
  useDeleteMilestone,
  type ProjectMilestone,
} from "@/hooks/api/build";
import { MilestoneUpsertSheet } from "@/features/build/milestones/milestone-upsert-sheet";
import { MilestoneCard } from "@/features/build/milestones/milestone-card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isPast, isToday } from "date-fns";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";

const MILESTONE_PAGE_SIZE = 20;

const MILESTONE_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "MISSED", label: "Missed" },
] as const;

const MILESTONE_FILTER_DEFINITIONS = [
  { param: "status", options: MILESTONE_STATUS_OPTIONS.map((o) => o.value) },
  { param: "ownerId" },
  { param: "from" },
  { param: "to" },
] as const;

function NewMilestoneButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1.5" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Milestone
    </Button>
  );
}

interface ProjectMilestonesPageProps {
  projectId: string;
}

export function ProjectMilestonesPage({ projectId: projectIdStr }: ProjectMilestonesPageProps) {
  const projectId = Number(projectIdStr);
  const listFilters = useBuildListFilters({ filters: MILESTONE_FILTER_DEFINITIONS });

  const [page, setPage] = useState(1);
  const prevResetKey = useRef(listFilters.resetKey);
  if (prevResetKey.current !== listFilters.resetKey) {
    prevResetKey.current = listFilters.resetKey;
    setPage(1);
  }

  const {
    data: allMilestones,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectMilestones(projectId);
  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });
  const deleteMilestone = useDeleteMilestone(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectMilestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMilestone | null>(null);

  const statusFilterValue = listFilters.value("status");
  const filtered = useMemo(() => {
    const list = allMilestones ?? [];
    let result = list;
    if (statusFilterValue !== BUILD_FILTER_ALL) {
      result = result.filter((m) => m.status === statusFilterValue);
    }
    const q = listFilters.debouncedSearch.trim().toLowerCase();
    if (q) result = result.filter((m) => m.name.toLowerCase().includes(q));
    return result;
  }, [allMilestones, statusFilterValue, listFilters.debouncedSearch]);

  const milestones = useMemo(
    () => filtered.slice((page - 1) * MILESTONE_PAGE_SIZE, page * MILESTONE_PAGE_SIZE),
    [filtered, page],
  );

  const total = allMilestones?.length ?? 0;
  const achieved = allMilestones?.filter((m) => m.status === "ACHIEVED").length ?? 0;
  const pending = allMilestones?.filter((m) => m.status === "PENDING").length ?? 0;
  const overdue =
    allMilestones?.filter((m) => {
      const d = new Date(m.targetDate);
      return isPast(d) && !isToday(d) && m.status === "PENDING";
    }).length ?? 0;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleEditTarget = useCallback((m: ProjectMilestone) => setEditTarget(m), []);
  const handleCloseEdit = useCallback(() => setEditTarget(null), []);
  const handleDeleteTarget = useCallback((m: ProjectMilestone) => setDeleteTarget(m), []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMilestone.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Milestone deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deleteMilestone]);

  const handleClearSelection = useCallback(() => {}, []);
  const handleOpenByIndex = useCallback(
    (index: number) => {
      const m = milestones[index];
      if (m) handleEditTarget(m);
    },
    [milestones, handleEditTarget],
  );
  useBuildListKeyboard({
    itemCount: milestones.length,
    onOpen: handleOpenByIndex,
    onClearSelection: handleClearSelection,
  });

  const handleStatusFilterChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const filterToolbar = (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search milestones…",
        label: "Search milestones",
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
              options={MILESTONE_STATUS_OPTIONS}
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "error" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper title="Milestones">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (isLoading) {
    return (
      <PageWrapper
        title="Milestones"
        actions={<Skeleton className="h-8 w-36 rounded-md" />}
      >
        <PmPageShell>
          <div className="space-y-4">
            <StatCardGridSkeleton cols={4} />
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Milestones"
        subtitle="Key checkpoints and target dates for this project"
      >
        <PmPageShell>
          <ErrorState
            className="flex-1"
            title="Couldn't load milestones"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Milestones"
      subtitle="Key checkpoints and target dates for this project"
      actions={<NewMilestoneButton onClick={handleOpenCreate} />}
      filters={filterToolbar}
    >
      <PmPageShell>
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              <StatCard label="Total" value={total} icon={Diamond} tone="default" index={0} />
              <StatCard
                label="Achieved"
                value={achieved}
                icon={CheckCircle2}
                tone="emerald"
                index={1}
              />
              <StatCard label="Pending" value={pending} icon={Clock} tone="amber" index={2} />
              <StatCard label="Overdue" value={overdue} icon={AlertCircle} tone="red" index={3} />
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            {milestones && milestones.length > 0 ? (
              <>
                <PmStaggerList className="space-y-2.5" aria-label="Project milestones">
                  {milestones.map((m) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      onEdit={handleEditTarget}
                      onDelete={handleDeleteTarget}
                    />
                  ))}
                </PmStaggerList>
                {filtered.length > MILESTONE_PAGE_SIZE ? (
                  <TablePagination
                    page={page}
                    pageSize={MILESTONE_PAGE_SIZE}
                    total={filtered.length}
                    onPageChange={setPage}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="projects"
                  title="No milestones yet"
                  description={
                    listFilters.isFiltered
                      ? undefined
                      : "Add milestones to track key checkpoints and target dates."
                  }
                  filtersActive={listFilters.isFiltered}
                  onClearFilters={listFilters.clearAll}
                  action={listFilters.isFiltered ? undefined : { label: "Add Milestone", onClick: handleOpenCreate }}
                />
            )}
          </PmSection>

        {createOpen ? (
          <MilestoneUpsertSheet projectId={projectId} onClose={handleCloseCreate} />
        ) : null}
        {editTarget ? (
          <MilestoneUpsertSheet
            projectId={projectId}
            milestone={editTarget}
            onClose={handleCloseEdit}
          />
        ) : null}

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={handleDeleteDialogOpenChange}
          title="Delete milestone?"
          description={`“${deleteTarget?.name ?? ""}” will be permanently deleted.`}
          confirmLabel="Delete"
          destructive
          isPending={deleteMilestone.isPending}
          onConfirm={handleDelete}
        />
      </PmPageShell>
    </PageWrapper>
  );
}
