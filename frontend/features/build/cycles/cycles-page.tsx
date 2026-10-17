"use client";

import { PlusIcon } from "@animateicons/react/lucide";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { WifiOff } from "lucide-react";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CycleCard } from "./cycle-card";
import { CyclesSkeleton } from "./cycles-skeleton";
import { CyclesSections } from "./cycles-sections";
import { CyclesDialogs } from "./cycles-dialogs";
import { useCyclesPage, CYCLE_STATUS_OPTIONS } from "./use-cycles-page";
import type { Cycle } from "@/types/projects";
import { formatDistanceToNow } from "date-fns";

type CyclesPageProps = { projectId: number };

export function CyclesPage({ projectId }: CyclesPageProps) {
  const {
    pageState,
    isOnline,
    dataUpdatedAt,
    listFilters,
    searchInputRef,
    activeCycles,
    upcomingCycles,
    completedCycles,
    displayedCycles,
    hasCycles,
    hasMoreCycles,
    visitedCursors,
    canManage,
    cycles,
    tickets,
    projectStatuses,
    formOpen,
    editTarget,
    statusTarget,
    planningTarget,
    completionTarget,
    completionMoveTo,
    deleteTarget,
    shortcutHelpOpen,
    showCompleted,
    completedChevronRef,
    completedChevronHoverHandlers,
    dateFilterFrom,
    dateFilterTo,
    updateIsPending,
    bulkIsPending,
    deleteIsPending,
    handleOpenCreate,
    handleEdit,
    handleFormOpenChange,
    handleStatusFilterChange,
    handleDateRangeChange,
    handleToggleCompleted,
    handleRetry,
    handleConfirmStatus,
    handleConfirmCompletion,
    handleConfirmDelete,
    handleNextPage,
    handlePreviousPage,
    setStatusTarget,
    setPlanningTarget,
    setCompletionTarget,
    setCompletionMoveTo,
    setDeleteTarget,
    setShortcutHelpOpen,
  } = useCyclesPage(projectId);

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
    return <CyclesSkeleton />;
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
      onComplete={(c) => { setCompletionMoveTo("backlog"); setCompletionTarget(c); }}
      onDelete={setDeleteTarget}
    />
  );

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
              active: listFilters.isActive("from") || listFilters.isActive("to"),
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
        <CyclesSections
          projectId={projectId}
          isOnline={isOnline}
          dataUpdatedAt={dataUpdatedAt}
          activeCycles={activeCycles}
          upcomingCycles={upcomingCycles}
          completedCycles={completedCycles}
          displayedCycles={displayedCycles}
          showCompleted={showCompleted}
          hasMoreCycles={hasMoreCycles}
          hasPrevious={visitedCursors.length > 0}
          pageNumber={visitedCursors.length + 1}
          completedChevronRef={completedChevronRef}
          completedChevronHoverHandlers={completedChevronHoverHandlers}
          onToggleCompleted={handleToggleCompleted}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          renderCycleCard={renderCycleCard}
        />
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
              <p className="text-sm font-medium text-foreground">
                You&apos;re offline
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Results may not be up to date. Reconnect to see the latest cycles.
              </p>
              {dataUpdatedAt ? (
                <p className="text-xs text-muted-foreground" data-testid="offline-freshness">
                  Last updated{" "}
                  {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyCalendarIllustration />}
          title={listFilters.isFiltered ? "No cycles match your filters" : "No cycles yet"}
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

      <CyclesDialogs
        projectId={projectId}
        cycles={cycles ?? []}
        upcomingCycles={upcomingCycles}
        tickets={tickets}
        projectStatuses={projectStatuses}
        canManage={canManage}
        formOpen={formOpen}
        editTarget={editTarget}
        statusTarget={statusTarget}
        planningTarget={planningTarget}
        completionTarget={completionTarget}
        completionMoveTo={completionMoveTo}
        deleteTarget={deleteTarget}
        shortcutHelpOpen={shortcutHelpOpen}
        updateIsPending={updateIsPending}
        bulkIsPending={bulkIsPending}
        deleteIsPending={deleteIsPending}
        onFormOpenChange={handleFormOpenChange}
        onStatusOpenChange={(open) => { if (!open) setStatusTarget(null); }}
        onPlanningOpenChange={(open) => { if (!open) setPlanningTarget(null); }}
        onCompletionCancel={() => setCompletionTarget(null)}
        onCompletionMoveToChange={setCompletionMoveTo}
        onDeleteOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onShortcutHelpOpenChange={setShortcutHelpOpen}
        onConfirmStatus={handleConfirmStatus}
        onConfirmCompletion={handleConfirmCompletion}
        onConfirmDelete={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
