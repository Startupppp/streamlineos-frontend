"use client";

import { useCallback, useMemo, useRef } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import {
  Diamond,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  WifiOff,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import {
  useProjectMilestones,
  type ProjectMilestone,
} from "@/hooks/api/build/milestones";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useBuildOrgMembers } from "@/hooks/api/build/build-org-members";
import { getUserDisplayName } from "@/lib/person-display";
import { MilestoneUpsertSheet } from "@/features/build/milestones/milestone-upsert-sheet";
import { MilestoneCard } from "@/features/build/milestones/milestone-card";
import { toMilestoneTargetDate } from "@/features/build/milestones/milestone-status";
import { isPast, isToday } from "date-fns";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_TOOLBAR,
} from "@/components/pm-chrome";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MilestonesPageSkeleton } from "./milestones-page-skeleton";
import { MilestonesFilterToolbar } from "./milestones-filter-toolbar";
import { useMilestonesPageActions } from "./use-milestones-page-actions";

const MILESTONE_FILTER_DEFINITIONS = [
  {
    param: "status",
    options: [BUILD_FILTER_ALL, "PENDING", "ACHIEVED", "MISSED"],
  },
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

export function ProjectMilestonesPage({
  projectId: projectIdStr,
}: ProjectMilestonesPageProps) {
  const projectId = Number(projectIdStr);
  const canManage = useCan("build:workspace:manage");
  const listFilters = useBuildListFilters({
    filters: MILESTONE_FILTER_DEFINITIONS,
  });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();
  const { members } = useBuildOrgMembers();
  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "Any owner" },
      ...members.map((m) => ({
        value: String(m.membershipId),
        label: getUserDisplayName(m),
      })),
    ],
    [members],
  );

  const statusFilterValue = listFilters.value("status");
  const serverStatus =
    statusFilterValue !== BUILD_FILTER_ALL &&
    (statusFilterValue === "PENDING" ||
      statusFilterValue === "ACHIEVED" ||
      statusFilterValue === "MISSED")
      ? statusFilterValue
      : undefined;
  const fromValue = readDateFilter(listFilters.value("from"));
  const toValue = readDateFilter(listFilters.value("to"));
  const ownerIdValue = listFilters.value("ownerId");
  const ownerId = /^\d+$/.test(ownerIdValue) ? Number(ownerIdValue) : undefined;

  const { data, isLoading, isError, error, refetch } = useProjectMilestones(
    projectId,
    {
      cursor: pager.cursor,
      status: serverStatus,
      q: listFilters.debouncedSearch || undefined,
      from: fromValue,
      to: toValue,
      ownerId,
    },
  );
  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const milestones: ProjectMilestone[] = data?.data ?? [];
  const pagination = data?.pagination;

  const achieved = milestones.filter((m) => m.status === "ACHIEVED").length;
  const pending = milestones.filter((m) => m.status === "PENDING").length;
  const overdue = milestones.filter((m) => {
    const d = toMilestoneTargetDate(m.targetDate);
    return d !== null && isPast(d) && !isToday(d) && m.status === "PENDING";
  }).length;

  const actions = useMilestonesPageActions({
    projectId,
    milestones,
    searchInputRef,
  });

  const handleMilestonesNext = useCallback(() => {
    pager.goNext(pagination?.nextCursor);
  }, [pager, pagination?.nextCursor]);

  if (isLoading) return <MilestonesPageSkeleton />;

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
          <PageState
            resolution={pageState}
            loading={null}
            onRetry={() => void refetch()}
            className="flex-1"
          >
            {null}
          </PageState>
        </PmPageShell>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Milestones"
      subtitle="Key checkpoints and target dates for this project"
      actions={
        canManage ? (
          <NewMilestoneButton onClick={actions.handleOpenCreate} />
        ) : undefined
      }
      filters={
        <MilestonesFilterToolbar
          listFilters={listFilters}
          ownerOptions={ownerOptions}
          statusFilterValue={statusFilterValue}
          ownerId={ownerId}
          fromValue={fromValue}
          toValue={toValue}
          searchInputRef={searchInputRef}
        />
      }
    >
      <PmPageShell>
        {!isOnline ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2">
            <WifiOff
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <p className="text-xs text-muted-foreground">
              You&apos;re offline — results may not be up to date.
            </p>
          </div>
        ) : null}
        <PmSection index={0} className="shrink-0">
          <StatCardGrid cols={4}>
            <StatCard
              label="This page"
              value={milestones.length}
              icon={Diamond}
              tone="default"
              index={0}
            />
            <StatCard
              label="Achieved"
              value={achieved}
              icon={CheckCircle2}
              tone="emerald"
              index={1}
            />
            <StatCard
              label="Pending"
              value={pending}
              icon={Clock}
              tone="amber"
              index={2}
            />
            <StatCard
              label="Overdue"
              value={overdue}
              icon={AlertCircle}
              tone="red"
              index={3}
            />
          </StatCardGrid>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          {actions.selectedMilestoneIds.size > 0 && (
            <div
              className={cn(
                PM_TOOLBAR,
                "mb-2 rounded-lg border border-border/80 bg-card px-3 py-2",
              )}
            >
              <span className="text-sm font-normal">
                {actions.selectedMilestoneIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Select onValueChange={actions.handleBulkStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Set status…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACHIEVED">Achieved</SelectItem>
                    <SelectItem value="MISSED">Missed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Clear selection"
                  onClick={actions.handleClearSelection}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <BuildPaginatedContent
            ariaLabel="Project milestones"
            footer={
              milestones.length > 0 || pager.hasPrevious ? (
                <TablePagination
                  mode="cursor"
                  rowCount={milestones.length}
                  pageNumber={pager.pageNumber}
                  hasMore={pagination?.hasMore ?? false}
                  hasPrevious={pager.hasPrevious}
                  onNext={handleMilestonesNext}
                  onPrevious={pager.goPrevious}
                />
              ) : null
            }
          >
            <div>
              {milestones.length > 0 ? (
                <PmStaggerList
                  className="space-y-2.5"
                  aria-label="Project milestones"
                >
                  {milestones.map((m) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      onEdit={actions.handleEditTarget}
                      onDelete={
                        canManage ? actions.handleDeleteTarget : undefined
                      }
                      selected={actions.selectedMilestoneIds.has(m.id)}
                      onSelect={actions.handleMilestoneSelect}
                    />
                  ))}
                </PmStaggerList>
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
                  action={
                    listFilters.isFiltered || !canManage
                      ? undefined
                      : {
                          label: "Add Milestone",
                          onClick: actions.handleOpenCreate,
                        }
                  }
                />
              )}
            </div>
          </BuildPaginatedContent>
        </PmSection>

        {actions.createOpen ? (
          <MilestoneUpsertSheet
            projectId={projectId}
            onClose={actions.handleCloseCreate}
          />
        ) : null}
        {actions.editTarget ? (
          <MilestoneUpsertSheet
            projectId={projectId}
            milestone={actions.editTarget}
            onClose={actions.handleCloseEdit}
          />
        ) : null}

        <ConfirmDialog
          open={!!actions.deleteTarget}
          onOpenChange={actions.handleDeleteDialogOpenChange}
          title="Delete milestone?"
          description={`"${actions.deleteTarget?.name ?? ""}" will be permanently deleted.`}
          confirmLabel="Delete"
          destructive
          isPending={actions.deleteMilestone.isPending}
          onConfirm={actions.handleDelete}
        />
      </PmPageShell>
    </PageWrapper>
  );
}
