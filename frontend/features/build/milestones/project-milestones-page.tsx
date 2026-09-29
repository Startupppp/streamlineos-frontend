"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TablePagination } from "@/components/ui/table-pagination";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { Diamond, CheckCircle2, Clock, AlertCircle, X, WifiOff } from "lucide-react";
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
  useUpdateMilestone,
  type ProjectMilestone,
} from "@/hooks/api/build/milestones";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import { MilestoneUpsertSheet } from "@/features/build/milestones/milestone-upsert-sheet";
import { MilestoneCard } from "@/features/build/milestones/milestone-card";
import {
  toMilestoneStatus,
  toMilestoneTargetDate,
} from "@/features/build/milestones/milestone-status";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isPast, isToday } from "date-fns";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_TOOLBAR,
} from "@/components/pm-chrome";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

function readDateFilter(value: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

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
  const canManage = useCan("build:manage");
  const updateMilestone = useUpdateMilestone(projectId);
  const listFilters = useBuildListFilters({ filters: MILESTONE_FILTER_DEFINITIONS });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();
  const { data: membersPage } = useOrgMembers(1, 100);
  const members = useMemo(() => membersPage?.data ?? [], [membersPage]);
  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "Any owner" },
      ...members.map((m) => ({ value: String(m.membershipId), label: getUserDisplayName(m) })),
    ],
    [members],
  );

  const statusFilterValue = listFilters.value("status");
  const serverStatus =
    statusFilterValue !== BUILD_FILTER_ALL
      ? (statusFilterValue as "PENDING" | "ACHIEVED" | "MISSED")
      : undefined;
  const fromValue = readDateFilter(listFilters.value("from"));
  const toValue = readDateFilter(listFilters.value("to"));
  const ownerIdValue = listFilters.value("ownerId");
  const ownerId = /^\d+$/.test(ownerIdValue) ? Number(ownerIdValue) : undefined;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectMilestones(projectId, {
    cursor: pager.cursor,
    status: serverStatus,
    q: listFilters.debouncedSearch || undefined,
    from: fromValue,
    to: toValue,
    ownerId,
  });
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
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<Set<number>>(new Set<number>());

  const milestones = data?.data ?? [];
  const pagination = data?.pagination;

  const achieved = milestones.filter((m) => m.status === "ACHIEVED").length;
  const pending = milestones.filter((m) => m.status === "PENDING").length;
  const overdue = milestones.filter((m) => {
    const d = toMilestoneTargetDate(m.targetDate);
    return d !== null && isPast(d) && !isToday(d) && m.status === "PENDING";
  }).length;

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

  const handleClearSelection = useCallback(() => {
    setSelectedMilestoneIds(new Set<number>());
  }, []);
  const handleMilestoneSelect = useCallback(
    (m: ProjectMilestone, checked: boolean) => {
      setSelectedMilestoneIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(m.id); else next.delete(m.id);
        return next;
      });
    },
    [],
  );
  const handleBulkStatusChange = useCallback(
    (status: string) => {
      const typed = toMilestoneStatus(status);
      const targets = Array.from(selectedMilestoneIds)
        .map((milestoneId) => milestones.find((m) => m.id === milestoneId))
        .filter((m): m is ProjectMilestone => m !== undefined);
      let settled = 0;
      const failures: string[] = [];
      const report = () => {
        settled += 1;
        if (settled < targets.length) return;
        if (failures.length === 0) {
          toast.success(`${targets.length} milestones updated`);
          return;
        }
        toast.error(
          `${targets.length - failures.length} of ${targets.length} milestones updated. Failed: ${failures.join(", ")}`,
        );
      };
      targets.forEach((target) => {
        updateMilestone.mutate({ milestoneId: target.id, version: target.version, status: typed }, {
          onSuccess: report,
          onError: (err) => {
            failures.push(`${target.name} — ${getErrorMessage(err)}`);
            report();
          },
        });
      });
      setSelectedMilestoneIds(new Set<number>());
    },
    [selectedMilestoneIds, updateMilestone, milestones],
  );
  const handleOpenByIndex = useCallback(
    (index: number) => {
      const m = milestones[index];
      if (m) handleEditTarget(m);
    },
    [milestones, handleEditTarget],
  );
  const handleEditByIndex = useCallback(
    (index: number) => {
      const m = milestones[index];
      if (m) handleEditTarget(m);
    },
    [milestones, handleEditTarget],
  );
  useBuildListKeyboard({
    itemCount: milestones.length,
    onOpen: handleOpenByIndex,
    onEdit: handleEditByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

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

  const handleOwnerFilterChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value === BUILD_FILTER_ALL ? "" : value),
    [listFilters],
  );

  const filterToolbar = (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search milestones…",
        label: "Search milestones",
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
              options={MILESTONE_STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "owner",
          label: "Owner",
          active: listFilters.isActive("ownerId"),
          control: (
            <BuildFilterSelect
              label="Owner"
              value={ownerId !== undefined ? String(ownerId) : BUILD_FILTER_ALL}
              onValueChange={handleOwnerFilterChange}
              options={ownerOptions}
            />
          ),
        },
        {
          id: "date-range",
          label: "Date range",
          active: listFilters.isActive("from") || listFilters.isActive("to"),
          control: (
            <DateRangePicker
              from={fromValue}
              to={toValue}
              onChange={handleDateRangeChange}
              placeholder="Filter by target date…"
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
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper
        title="Milestones"
        subtitle="Key checkpoints and target dates for this project"
      >
        <PmPageShell>
          <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
            {null}
          </PageState>
        </PmPageShell>
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

  return (
    <PageWrapper
      title="Milestones"
      subtitle="Key checkpoints and target dates for this project"
      actions={canManage ? <NewMilestoneButton onClick={handleOpenCreate} /> : undefined}
      filters={filterToolbar}
    >
      <PmPageShell>
          {!isOnline ? (
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2">
              <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-xs text-muted-foreground">
                You&apos;re offline — results may not be up to date.
              </p>
            </div>
          ) : null}
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              <StatCard label="This page" value={milestones.length} icon={Diamond} tone="default" index={0} />
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
            {selectedMilestoneIds.size > 0 && (
              <div className={cn(PM_TOOLBAR, "mb-2 rounded-lg border border-border/80 bg-card px-3 py-2")}>
                <span className="text-sm font-medium">{selectedMilestoneIds.size} selected</span>
                <div className="flex items-center gap-2">
                  <Select onValueChange={handleBulkStatusChange}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Set status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACHIEVED">Achieved</SelectItem>
                      <SelectItem value="MISSED">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" aria-label="Clear selection" onClick={handleClearSelection}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {milestones.length > 0 ? (
              <>
                <PmStaggerList className="space-y-2.5" aria-label="Project milestones">
                  {milestones.map((m) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      onEdit={handleEditTarget}
                      onDelete={canManage ? handleDeleteTarget : undefined}
                      selected={selectedMilestoneIds.has(m.id)}
                      onSelect={handleMilestoneSelect}
                    />
                  ))}
                </PmStaggerList>
                {(pagination?.hasMore || pager.hasPrevious) ? (
                  <TablePagination
                    mode="cursor"
                    rowCount={milestones.length}
                    hasMore={pagination?.hasMore ?? false}
                    hasPrevious={pager.hasPrevious}
                    onNext={() => pager.goNext(pagination?.nextCursor)}
                    onPrevious={pager.goPrevious}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="projects"
                  title="No milestones yet"
                  description={
                    listFilters.isFiltered
                      ? undefined
                      : "Add milestones to track key checkpoints and target dates."
                  }
                  filtersActive={listFilters.isFiltered}
                  onClearFilters={listFilters.clearAll}
                  action={listFilters.isFiltered || !canManage ? undefined : { label: "Add Milestone", onClick: handleOpenCreate }}
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
          description={`"${deleteTarget?.name ?? ""}" will be permanently deleted.`}
          confirmLabel="Delete"
          destructive
          isPending={deleteMilestone.isPending}
          onConfirm={handleDelete}
        />
      </PmPageShell>
    </PageWrapper>
  );
}
