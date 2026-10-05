"use client";

import { use } from "react";
import { WifiOff, Layers, AlertCircle, BookOpen, Wrench, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateEpicDialog } from "@/features/build/epics/create-epic-dialog";
import { EpicStoryRow } from "@/features/build/epics/epic-story-row";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ModuleDisabledState } from "@/features/build/shared/module-disabled-state";
import { getCompletedStatusNames } from "@/features/build/shared/completed-status";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { EpicsListSection } from "@/features/build/epics/epics-list-section";
import { EpicsFilterToolbar } from "@/features/build/epics/epics-filter-toolbar";
import { EditEpicDialog } from "@/features/build/epics/edit-epic-dialog";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import { useEpicsPage } from "./use-epics-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export function EpicsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const {
    projectId,
    canCreate,
    canUpdate,
    isOnline,
    searchInputRef,
    listFilters,
    project,
    pageState,
    isLoading,
    epicsUpdatedAt,
    tickets,
    epics,
    allEpics,
    stories,
    tasks,
    hasMoreEpics,
    visitedCursors,
    cycles,
    orgLabels,
    members,
    deleteTicket,
    bulkUpdate,
    createOpen,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    keyboardEditTarget,
    handleRetry,
    handleNextPage,
    handlePreviousPage,
    handleDeleteEpic,
    handleLinkStory,
    handleCreateStory,
    handleOpenCreate,
    handleCreateOpenChange,
    handleEditOpenChange,
    handleShortcutHelp,
    selectedIds,
    archiveConfirmOpen,
    handleEpicSelection,
    handleClearSelection,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
    handleBulkParent,
    handleBulkLabel,
    handleBulkArchiveRequest,
    handleArchiveDialogChange,
    handleBulkArchiveConfirm,
    handleBulkExport,
  } = useEpicsPage(projectIdStr);

  if (project?.settings?.modules?.epics === false)
    return <ModuleDisabledState moduleName="Epics" projectId={projectId} />;

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  ) {
    return (
      <PageWrapper
        title="Epics"
        subtitle="Organize related stories and tasks into larger themes"
      >
        <PmPageShell>
          <PageState
            resolution={pageState}
            loading={null}
            onRetry={handleRetry}
            className="flex-1"
          >
            {null}
          </PageState>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Epics">
        <PmPageShell>
          <div className="space-y-4">
            <StatCardGridSkeleton cols={4} className="mb-1" />
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  const unlinkedStories = stories.filter((s) => !s.epicId);
  const completedStatusNames = getCompletedStatusNames(project?.statuses);

  return (
    <PageWrapper
      title="Epics"
      subtitle="Organize related stories and tasks into larger themes"
      actions={
        canCreate ? (
          <CreateEpicDialog
            projectId={projectId}
            open={createOpen}
            onOpenChange={handleCreateOpenChange}
          />
        ) : undefined
      }
      filters={
        <EpicsFilterToolbar
          listFilters={listFilters}
          searchInputRef={searchInputRef}
          projectStatuses={project?.statuses}
          members={members}
        />
      }
    >
      <PmPageShell>
        <div
          className="flex min-h-0 flex-1 flex-col gap-4"
          aria-live="polite"
          aria-atomic="true"
        >
          {!isOnline && epics.length > 0 ? (
            <div
              className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
              data-testid="offline-banner"
            >
              <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                You&apos;re offline — these epics may be out of date.
                {epicsUpdatedAt ? (
                  <span data-testid="offline-banner-freshness">
                    {" "}
                    Last updated{" "}
                    {formatDistanceToNow(new Date(epicsUpdatedAt), {
                      addSuffix: true,
                    })}
                    .
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
          {canUpdate && selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              members={members}
              cycles={cycles ?? []}
              statuses={project?.statuses}
              projectId={projectId}
              excludeIds={selectedIds}
              onBulkStatus={handleBulkStatus}
              onBulkPriority={handleBulkPriority}
              onBulkAssignee={handleBulkAssignee}
              onBulkCycle={handleBulkCycle}
              onBulkParent={handleBulkParent}
              onBulkLabel={handleBulkLabel}
              onBulkArchive={handleBulkArchiveRequest}
              onBulkExport={handleBulkExport}
              labels={orgLabels}
              onClear={handleClearSelection}
            />
          )}
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              {(
                [
                  { label: "Epics", value: allEpics.length, icon: Layers },
                  { label: "Stories", value: stories.length, icon: BookOpen },
                  { label: "Tasks", value: tasks.length, icon: Wrench },
                  { label: "Completed", value: tickets.filter((t) => completedStatusNames.has(t.status)).length, icon: CheckCircle2, tone: "emerald" as const },
                ] as const
              ).map((card, i) => (
                <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={"tone" in card ? card.tone : "default"} index={i} />
              ))}
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            <EpicsListSection
              epics={epics}
              tickets={tickets}
              unlinkedStories={unlinkedStories}
              projectId={projectId}
              projectKey={project?.key}
              projectStatuses={project?.statuses}
              isOnline={isOnline}
              epicsUpdatedAt={epicsUpdatedAt}
              canCreate={canCreate}
              canUpdate={canUpdate}
              isFiltered={listFilters.isFiltered}
              selectedIds={selectedIds}
              hasMore={hasMoreEpics}
              hasPrevious={visitedCursors.length > 0}
              pageNumber={visitedCursors.length + 1}
              isDeleting={deleteTicket.isPending}
              onClearFilters={listFilters.clearAll}
              onOpenCreate={handleOpenCreate}
              onEpicSelection={handleEpicSelection}
              onDeleteEpic={handleDeleteEpic}
              onLinkStory={handleLinkStory}
              onCreateStory={handleCreateStory}
              onNextPage={handleNextPage}
              onPreviousPage={handlePreviousPage}
            />
          </PmSection>

          {unlinkedStories.length > 0 && (
            <PmSection index={2} className="shrink-0">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-status-warning-ink" />
                Stories without Epic
              </h2>
              <PmPanel className="space-y-1 p-2">
                {unlinkedStories.map((story) => (
                  <EpicStoryRow
                    key={story.id}
                    story={story}
                    projectId={projectId}
                    projectKey={project?.key}
                    projectStatuses={project?.statuses}
                  />
                ))}
              </PmPanel>
            </PmSection>
          )}

          <ConfirmDialog
            open={archiveConfirmOpen}
            onOpenChange={handleArchiveDialogChange}
            title={`Archive ${selectedIds.size} epic${selectedIds.size !== 1 ? "s" : ""}?`}
            description="An epic with active sub-tasks outside the selection is reported back and left alone."
            confirmLabel="Archive"
            destructive
            isPending={bulkUpdate.isPending}
            onConfirm={handleBulkArchiveConfirm}
          />

          <ShortcutHelpDialog
            open={shortcutHelpOpen}
            onOpenChange={setShortcutHelpOpen}
          />

          {canUpdate && keyboardEditTarget ? (
            <EditEpicDialog
              epic={keyboardEditTarget}
              projectId={projectId}
              open
              onOpenChange={handleEditOpenChange}
            />
          ) : null}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
