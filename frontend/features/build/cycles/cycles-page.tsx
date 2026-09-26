"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { useBulkUpdateTickets, useCycles, useDeleteCycle, useProjectBoardTickets, useUpdateCycle } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CycleCard } from "./cycle-card";
import { CycleFormSheet } from "./cycle-form-sheet";
import { CycleCompletionSheet } from "./cycle-completion-sheet";
import { CyclePlanningSheet } from "./cycle-planning-sheet";
import { CycleVelocityPanel } from "./cycle-velocity-panel";
import type { Cycle, CycleStatus } from "@/types/projects";

type CyclesPageProps = { projectId: number };

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
  const [completionMoveTo, setCompletionMoveTo] = useState<"backlog" | "next">("backlog");
  const [deleteTarget, setDeleteTarget] = useState<Cycle | null>(null);
  const canManage = useCan("build:cycles:manage");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters({
    filters: [{ param: "status" }, { param: "from" }, { param: "to" }],
  });
  const { error, refetch, isError, isLoading, data: cycles } = useCycles(projectId);
  const { data: tickets = [] } = useProjectBoardTickets(projectId);
  const updateCycle = useUpdateCycle();
  const bulkUpdateTickets = useBulkUpdateTickets(projectId);
  const deleteCycle = useDeleteCycle();
  const pageState = usePageState({
    error,
    isError,
    isLoading,
    permission: "build:cycles:view",
  });

  const filteredCycles = useMemo(() => {
    const q = listFilters.debouncedSearch.toLowerCase();
    const statusFilter = listFilters.value("status");
    const fromFilter = listFilters.value("from");
    const toFilter = listFilters.value("to");
    const from = fromFilter !== BUILD_FILTER_ALL ? fromFilter : null;
    const to = toFilter !== BUILD_FILTER_ALL ? toFilter : null;
    return (cycles ?? []).filter((cycle) => {
      if (q && !cycle.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== BUILD_FILTER_ALL && cycle.status !== statusFilter) return false;
      if (from && cycle.endDate < from) return false;
      if (to && cycle.startDate > to) return false;
      return true;
    });
  }, [cycles, listFilters]);

  useBuildListKeyboard({
    itemCount: filteredCycles.length,
    onOpen: useCallback((_i: number) => {}, []),
    onClearSelection: useCallback(() => {}, []),
    enabled: pageState.kind === "ready",
    searchInputRef,
  });

  const activeCycles = filteredCycles.filter((cycle) => cycle.status === "active");
  const upcomingCycles = filteredCycles.filter((cycle) => cycle.status === "draft");
  const completedCycles = filteredCycles.filter((cycle) => cycle.status === "completed");
  const hasCycles = activeCycles.length > 0 || upcomingCycles.length > 0 || completedCycles.length > 0;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showCompleted = searchParams.get("completed") === "1";

  const handleToggleCompleted = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (showCompleted) next.delete("completed");
    else next.set("completed", "1");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, showCompleted]);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

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

  const handleConfirmCompletion = useCallback(async (targetCycleId: number | null) => {
    if (!completionTarget) return;
    const incompleteTicketIds = tickets
      .filter((ticket) => ticket.cycleId === completionTarget.id && ticket.status !== "DONE")
      .map((ticket) => ticket.id);
    try {
      if (incompleteTicketIds.length > 0) {
        await bulkUpdateTickets.mutateAsync({ ticketIds: incompleteTicketIds, cycleId: targetCycleId });
      }
      updateCycle.mutate(
        { projectId, cycleId: completionTarget.id, status: "completed" },
        {
          onSuccess: () => {
            toast.success("Cycle completed");
            setCompletionTarget(null);
            setCompletionMoveTo("backlog");
          },
          onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
        },
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [bulkUpdateTickets, completionTarget, projectId, tickets, updateCycle]);

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

  const { iconRef: completedChevronRef, hoverHandlers: completedChevronHoverHandlers } = useAnimatedIcon();

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Cycles">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
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
              <div key={index} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
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

  const statusAction = statusTarget ? statusActionLabel(statusTarget.status) : "Update";

  return (
    <PageWrapper
      title="Cycles"
      subtitle="Time-box work into focused iterations"
      actions={canManage ? (
        <AnimatedIconButton size="sm" icon={PlusIcon} iconSize={16} iconClassName="mr-1" onClick={handleOpenCreate}>
          New Cycle
        </AnimatedIconButton>
      ) : undefined}
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search cycles",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      {hasCycles ? (
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          {activeCycles.length > 0 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active</p>
              <div className="grid gap-3">{activeCycles.map(renderCycleCard)}</div>
            </section>
          ) : null}

          {activeCycles.length > 0 && upcomingCycles.length > 0 ? <div className="border-t border-border" /> : null}

          {upcomingCycles.length > 0 ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upcoming</p>
              <div className="grid gap-3">{upcomingCycles.map(renderCycleCard)}</div>
            </section>
          ) : null}

          {completedCycles.length > 0 ? (
            <>
              {activeCycles.length > 0 || upcomingCycles.length > 0 ? <div className="border-t border-border" /> : null}
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
                  <div id="completed-cycles" className="grid gap-3">{completedCycles.map(renderCycleCard)}</div>
                ) : null}
              </section>
            </>
          ) : null}
          <CycleVelocityPanel projectId={projectId} />
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyCalendarIllustration />}
          title="No cycles yet"
          description="Create your first cycle to start planning work in time-boxed iterations."
          action={canManage ? { label: "Create First Cycle", onClick: handleOpenCreate } : undefined}
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
        onOpenChange={(open) => { if (!open) setStatusTarget(null); }}
        title={`${statusAction} cycle?`}
        description={statusTarget?.status === "completed"
          ? "This cycle will return to the active section."
          : statusTarget?.status === "active"
            ? "This cycle will move to the completed section and can be reopened later."
            : "This cycle will become the active cycle for the project."}
        confirmLabel={statusAction}
        isPending={updateCycle.isPending}
        onConfirm={handleConfirmStatus}
      />

      <CyclePlanningSheet
        cycle={planningTarget}
        tickets={tickets}
        projectId={projectId}
        open={planningTarget !== null}
        onOpenChange={(open) => { if (!open) setPlanningTarget(null); }}
      />

      <CycleCompletionSheet
        cycle={completionTarget}
        nextCycle={upcomingCycles.find((cycle) => cycle.id !== completionTarget?.id)}
        tickets={tickets}
        moveTo={completionMoveTo}
        isPending={bulkUpdateTickets.isPending || updateCycle.isPending}
        onMoveToChange={setCompletionMoveTo}
        onCancel={() => setCompletionTarget(null)}
        onConfirm={handleConfirmCompletion}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
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
