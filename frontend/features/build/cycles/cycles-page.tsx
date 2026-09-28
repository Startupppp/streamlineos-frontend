"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@animateicons/react/lucide";
import { toast } from "sonner";
import {
  useBulkUpdateTickets,
  useProjectBoardTickets,
} from "@/hooks/api/build/tickets";
import {
  useCyclePage,
  useDeleteCycle,
  useUpdateCycle,
  type CycleListFilters,
} from "@/hooks/api/build/advanced";
import { useProject } from "@/hooks/api/build/projects";
import { isCompletedTicketStatus } from "@/features/build/shared/completed-status";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { WifiOff } from "lucide-react";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatDistanceToNow } from "date-fns";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CycleCard } from "./cycle-card";
import { CycleFormSheet } from "./cycle-form-sheet";
import { CycleCompletionSheet } from "./cycle-completion-sheet";
import { CyclePlanningSheet } from "./cycle-planning-sheet";
import { CycleVelocityPanel } from "./cycle-velocity-panel";
import type { Cycle, CycleStatus } from "@/types/projects";

type CyclesPageProps = { projectId: number };

const CYCLE_PAGE_SIZE = 25;

const CYCLE_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "draft", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

const CYCLE_FILTER_DEFINITIONS = [
  { param: "status", options: CYCLE_STATUS_OPTIONS.map((o) => o.value) },
  { param: "from" },
  { param: "to" },
] as const;

function nextCycleStatus(status: CycleStatus): CycleStatus {
  if (status === "draft") return "active";
  if (status === "active") return "completed";
  return "active";
}

function statusActionLabel(status: CycleStatus): string {
  if (status === "draft") return "Start";
  if (status === "active") return "Complete";
  return "Reopen";
}

export function CyclesPage({ projectId }: CyclesPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Cycle | null>(null);
  const [statusTarget, setStatusTarget] = useState<Cycle | null>(null);
  const [planningTarget, setPlanningTarget] = useState<Cycle | null>(null);
  const [completionTarget, setCompletionTarget] = useState<Cycle | null>(null);
  const [completionMoveTo, setCompletionMoveTo] = useState<"backlog" | "next">(
    "backlog",
  );
  const [deleteTarget, setDeleteTarget] = useState<Cycle | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const canManage = useCan("build:cycles:manage");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters({
    filters: CYCLE_FILTER_DEFINITIONS,
  });
  const isOnline = useOnlineStatus();
  const statusFilterValue = listFilters.value("status");
  const fromFilterValue = listFilters.value("from");
  const toFilterValue = listFilters.value("to");
  const dateFilterFrom =
    fromFilterValue !== BUILD_FILTER_ALL ? fromFilterValue : undefined;
  const dateFilterTo =
    toFilterValue !== BUILD_FILTER_ALL ? toFilterValue : undefined;
  const cycleFilters: CycleListFilters = {
    status:
      statusFilterValue !== BUILD_FILTER_ALL
        ? (statusFilterValue as "draft" | "active" | "completed")
        : undefined,
    q: listFilters.debouncedSearch || undefined,
    from: dateFilterFrom,
    to: dateFilterTo,
    cursor: listFilters.cursor ?? undefined,
    limit: CYCLE_PAGE_SIZE,
  };
  const {
    error,
    refetch,
    isError,
    isLoading,
    dataUpdatedAt,
    data: cyclePage,
  } = useCyclePage(projectId, cycleFilters);
  const cycles = cyclePage?.data;
  const hasMoreCycles = cyclePage?.pagination.hasMore ?? false;
  const nextCycleCursor = cyclePage?.pagination.nextCursor ?? null;
  const [visitedCursors, setVisitedCursors] = useState<(string | null)[]>([]);
  const urlCursor = listFilters.cursor;

  useEffect(() => {
    if (urlCursor === null) setVisitedCursors([]);
  }, [urlCursor]);

  const handleNextPage = useCallback(() => {
    if (!nextCycleCursor) return;
    setVisitedCursors((current) => [...current, urlCursor]);
    listFilters.setCursor(nextCycleCursor);
  }, [listFilters, nextCycleCursor, urlCursor]);

  const handlePreviousPage = useCallback(() => {
    setVisitedCursors((current) => {
      const previous = current[current.length - 1] ?? null;
      listFilters.setCursor(previous);
      return current.slice(0, -1);
    });
  }, [listFilters]);
  const { data: tickets = [] } = useProjectBoardTickets(projectId);
  const { data: projectData } = useProject(projectId);
  const projectStatuses = projectData?.statuses ?? [];
  const updateCycle = useUpdateCycle();
  const bulkUpdateTickets = useBulkUpdateTickets(projectId);
  const deleteCycle = useDeleteCycle();
  const pageState = usePageState({
    error,
    isError,
    isLoading,
    permission: "build:cycles:view",
  });

  const activeCycles = (cycles ?? []).filter(
    (cycle) => cycle.status === "active",
  );
  const upcomingCycles = (cycles ?? []).filter(
    (cycle) => cycle.status === "draft",
  );
  const completedCycles = (cycles ?? []).filter(
    (cycle) => cycle.status === "completed",
  );
  const displayedCycles = [
    ...activeCycles,
    ...upcomingCycles,
    ...completedCycles,
  ];
  const hasCycles = displayedCycles.length > 0;

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

  const handleEditByIndex = useCallback(
    (index: number) => {
      const cycle = displayedCycles[index];
      if (!cycle) return;
      setEditTarget(cycle);
      setFormOpen(true);
    },
    [displayedCycles],
  );

  const handleNoSelection = useCallback(() => {}, []);

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

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

  useBuildListKeyboard({
    itemCount: displayedCycles.length,
    onOpen: handleEditByIndex,
    onEdit: handleEditByIndex,
    onCreate: canManage ? handleOpenCreate : undefined,
    onClearSelection: handleNoSelection,
    onShortcutHelp: handleShortcutHelp,
    enabled: pageState.kind === "ready",
    searchInputRef,
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showCompleted = searchParams.get("completed") === "1";

  const handleToggleCompleted = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (showCompleted) next.delete("completed");
    else next.set("completed", "1");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams, showCompleted]);

  const handleEdit = useCallback((cycle: Cycle) => {
    setEditTarget(cycle);
    setFormOpen(true);
  }, []);

  const handleFormOpenChange = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleConfirmStatus = useCallback(() => {
    if (!statusTarget) return;
    const action = statusActionLabel(statusTarget.status);
    updateCycle.mutate(
      {
        projectId,
        cycleId: statusTarget.id,
        version: statusTarget.version,
        status: nextCycleStatus(statusTarget.status),
      },
      {
        onSuccess: () => {
          toast.success(`${action} cycle succeeded`);
          setStatusTarget(null);
        },
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }, [projectId, statusTarget, updateCycle]);

  const handleConfirmCompletion = useCallback(
    async (targetCycleId: number | null) => {
      if (!completionTarget) return;
      const incompleteTicketIds = tickets
        .filter(
          (ticket) =>
            ticket.cycleId === completionTarget.id &&
            !isCompletedTicketStatus(ticket.status, projectStatuses),
        )
        .map((ticket) => ticket.id);
      try {
        if (incompleteTicketIds.length > 0) {
          await bulkUpdateTickets.mutateAsync({
            ticketIds: incompleteTicketIds,
            cycleId: targetCycleId,
          });
        }
        updateCycle.mutate(
          {
            projectId,
            cycleId: completionTarget.id,
            version: completionTarget.version,
            status: "completed",
          },
          {
            onSuccess: () => {
              toast.success("Cycle completed");
              setCompletionTarget(null);
              setCompletionMoveTo("backlog");
            },
            onError: (mutationError) =>
              toast.error(getErrorMessage(mutationError)),
          },
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [bulkUpdateTickets, completionTarget, projectId, tickets, updateCycle],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCycle.mutate(
      { projectId, cycleId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Cycle deleted");
          setDeleteTarget(null);
        },
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }, [deleteCycle, deleteTarget, projectId]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const {
    iconRef: completedChevronRef,
    hoverHandlers: completedChevronHoverHandlers,
  } = useAnimatedIcon();

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  ) {
    return (
      <PageWrapper title="Cycles">
        <PageState
          resolution={pageState}
          loading={null}
          onRetry={handleRetry}
          className="flex-1"
        >
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Cycles">
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  const renderCycleCard = (cycle: Cycle) => (
    <CycleCard
      key={cycle.id}
      cycle={cycle}
      projectId={projectId}
      canManage={canManage}
      onEdit={handleEdit}
      onChangeStatus={setStatusTarget}
      onPlan={setPlanningTarget}
      onComplete={(cycle) => {
        setCompletionMoveTo("backlog");
        setCompletionTarget(cycle);
      }}
      onDelete={setDeleteTarget}
    />
  );

  const statusAction = statusTarget
    ? statusActionLabel(statusTarget.status)
    : "Update";

  return (
    <PageWrapper
      title="Cycles"
      subtitle="Time-box work into focused iterations"
      actions={
        canManage ? (
          <AnimatedIconButton
            size="sm"
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1"
            onClick={handleOpenCreate}
          >
            New Cycle
          </AnimatedIconButton>
        ) : undefined
      }
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search cycles",
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
                  value={listFilters.value("status")}
                  onValueChange={handleStatusFilterChange}
                  options={CYCLE_STATUS_OPTIONS}
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
                  from={dateFilterFrom}
                  to={dateFilterTo}
                  onChange={handleDateRangeChange}
                  placeholder="Filter by cycle dates…"
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      {hasCycles ? (
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          {!isOnline ? (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
              data-testid="offline-banner"
            >
              <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                You&apos;re offline — these cycles may be out of date.
                {dataUpdatedAt ? (
                  <span data-testid="offline-banner-freshness">
                    {" "}
                    Last updated{" "}
                    {formatDistanceToNow(new Date(dataUpdatedAt), {
                      addSuffix: true,
                    })}
                    .
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
          {activeCycles.length > 0 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Active
              </p>
              <div className="grid gap-3">
                {activeCycles.map(renderCycleCard)}
              </div>
            </section>
          ) : null}

          {activeCycles.length > 0 && upcomingCycles.length > 0 ? (
            <div className="border-t border-border" />
          ) : null}

          {upcomingCycles.length > 0 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Upcoming
              </p>
              <div className="grid gap-3">
                {upcomingCycles.map(renderCycleCard)}
              </div>
            </section>
          ) : null}

          {completedCycles.length > 0 ? (
            <>
              {activeCycles.length > 0 || upcomingCycles.length > 0 ? (
                <div className="border-t border-border" />
              ) : null}
              <section>
                <button
                  type="button"
                  onClick={handleToggleCompleted}
                  aria-expanded={showCompleted}
                  aria-controls="completed-cycles"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                  {...completedChevronHoverHandlers}
                >
                  {showCompleted ? (
                    <ChevronDownIcon ref={completedChevronRef} size={12} />
                  ) : (
                    <ChevronRightIcon ref={completedChevronRef} size={12} />
                  )}
                  Completed ({completedCycles.length})
                </button>
                {showCompleted ? (
                  <div id="completed-cycles" className="grid gap-3">
                    {completedCycles.map(renderCycleCard)}
                  </div>
                ) : null}
              </section>
            </>
          ) : null}
          <CycleVelocityPanel projectId={projectId} />
          <TablePagination
            mode="cursor"
            rowCount={displayedCycles.length}
            hasMore={hasMoreCycles}
            hasPrevious={visitedCursors.length > 0}
            onNext={handleNextPage}
            onPrevious={handlePreviousPage}
          />
        </div>
      ) : !isOnline ? (
        <div
          className="relative flex flex-1 flex-col items-center justify-center py-12"
          data-testid="offline-state"
        >
          <div className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-8 text-center shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/[0.06] shadow-sm">
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                You&apos;re offline
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Results may not be up to date. Reconnect to see the latest
                cycles.
              </p>
              {dataUpdatedAt ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="offline-freshness"
                >
                  Last updated{" "}
                  {formatDistanceToNow(new Date(dataUpdatedAt), {
                    addSuffix: true,
                  })}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyCalendarIllustration />}
          title={
            listFilters.isFiltered
              ? "No cycles match your filters"
              : "No cycles yet"
          }
          description={
            listFilters.isFiltered
              ? undefined
              : "Create your first cycle to start planning work in time-boxed iterations."
          }
          filtersActive={listFilters.isFiltered}
          onClearFilters={listFilters.clearAll}
          action={
            listFilters.isFiltered || !canManage
              ? undefined
              : { label: "Create First Cycle", onClick: handleOpenCreate }
          }
        />
      )}

      {canManage ? (
        <CycleFormSheet
          projectId={projectId}
          cycles={cycles ?? []}
          cycle={editTarget}
          open={formOpen}
          onOpenChange={handleFormOpenChange}
        />
      ) : null}

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={`${statusAction} cycle?`}
        description={
          statusTarget?.status === "completed"
            ? "This cycle will return to the active section."
            : statusTarget?.status === "active"
              ? "This cycle will move to the completed section and can be reopened later."
              : "This cycle will become the active cycle for the project."
        }
        confirmLabel={statusAction}
        isPending={updateCycle.isPending}
        onConfirm={handleConfirmStatus}
      />

      <CyclePlanningSheet
        cycle={planningTarget}
        tickets={tickets}
        projectId={projectId}
        open={planningTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPlanningTarget(null);
        }}
      />

      <CycleCompletionSheet
        cycle={completionTarget}
        nextCycle={upcomingCycles.find(
          (cycle) => cycle.id !== completionTarget?.id,
        )}
        tickets={tickets}
        projectStatuses={projectStatuses}
        moveTo={completionMoveTo}
        isPending={bulkUpdateTickets.isPending || updateCycle.isPending}
        onMoveToChange={setCompletionMoveTo}
        onCancel={() => setCompletionTarget(null)}
        onConfirm={handleConfirmCompletion}
      />

      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete cycle?"
        description={`${deleteTarget?.name ?? "This cycle"} will be permanently deleted. Its tickets will remain in the project without a cycle.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteCycle.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
