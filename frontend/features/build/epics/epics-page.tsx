"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useProject, useProjectLabels } from "@/hooks/api/build/projects";
import { useUpdateTicket } from "@/hooks/api/build/ticket-update-mutation";
import {
  useBulkUpdateTickets,
  useCreateTicket,
  useDeleteTicket,
} from "@/hooks/api/build/ticket-create-rank-mutations";
import { useProjectBoardTickets } from "@/hooks/api/build/ticket-queries";
import {
  useCycles,
  useEpicPage,
  type EpicListFilters,
} from "@/hooks/api/build/advanced";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useExportTickets } from "@/hooks/api/build/ticket-import-export";
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
import { usePageState } from "@/hooks/api/use-page-state";
import {
  Layers,
  AlertCircle,
  BookOpen,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ModuleDisabledState } from "@/features/build/shared/module-disabled-state";
import { getCompletedStatusNames } from "@/features/build/shared/completed-status";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useEpicBulkActions } from "@/features/build/epics/use-epic-bulk-actions";
import { EpicsListSection } from "@/features/build/epics/epics-list-section";
import {
  EpicsFilterToolbar,
  EPIC_FILTER_DEFINITIONS,
} from "@/features/build/epics/epics-filter-toolbar";
import { EditEpicDialog } from "@/features/build/epics/edit-epic-dialog";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";

const EPIC_PAGE_SIZE = 25;

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export function EpicsPage({ params }: PageProps) {
  const canCreate = useCan("build:tickets:create");
  const canUpdate = useCan("build:tickets:update");
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters({
    filters: EPIC_FILTER_DEFINITIONS,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const isOnline = useOnlineStatus();

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectFailed,
    error: projectError,
    refetch: refetchProject,
  } = useProject(projectId);
  const {
    data: boardTickets,
    isLoading: ticketsLoading,
    isError: ticketsFailed,
    error: ticketsError,
    refetch: refetchTickets,
  } = useProjectBoardTickets(projectId);
  const { data: cycles } = useCycles(projectId);
  const { data: orgLabels } = useProjectLabels();
  const exportEpics = useExportTickets(projectId);
  const { data: membersPage } = useProjectMembers(projectId);
  const members = membersPage?.data ?? [];

  const statusFilter = listFilters.value("status");
  const ownerFilter = listFilters.value("ownerId");
  const healthFilter = listFilters.value("health");
  const epicFilters: EpicListFilters = {
    q: listFilters.debouncedSearch || undefined,
    status: statusFilter !== BUILD_FILTER_ALL ? statusFilter : undefined,
    ownerId: ownerFilter !== BUILD_FILTER_ALL ? ownerFilter : undefined,
    health:
      healthFilter === "on_track" ||
      healthFilter === "at_risk" ||
      healthFilter === "off_track"
        ? healthFilter
        : undefined,
    cursor: listFilters.cursor ?? undefined,
    limit: EPIC_PAGE_SIZE,
  };
  const {
    data: epicPage,
    isLoading: epicsLoading,
    isError: epicsFailed,
    error: epicsError,
    refetch: refetchEpics,
    dataUpdatedAt: epicsUpdatedAt,
  } = useEpicPage(projectId, epicFilters);

  const isLoading = projectLoading || ticketsLoading || epicsLoading;
  const readFailed = projectFailed || epicsFailed || ticketsFailed;
  const loadError = projectError ?? epicsError ?? ticketsError;

  const handleRetry = useCallback(() => {
    void refetchProject();
    void refetchEpics();
    void refetchTickets();
  }, [refetchEpics, refetchProject, refetchTickets]);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const tickets = boardTickets ?? [];
  const epics = epicPage?.data ?? [];
  const hasMoreEpics = epicPage?.pagination.hasMore ?? false;
  const nextEpicCursor = epicPage?.pagination.nextCursor ?? null;
  const [visitedCursors, setVisitedCursors] = useState<(string | null)[]>([]);
  const urlCursor = listFilters.cursor;

  useEffect(() => {
    if (urlCursor === null) setVisitedCursors([]);
  }, [urlCursor]);

  const handleNextPage = useCallback(() => {
    if (!nextEpicCursor) return;
    setVisitedCursors((current) => [...current, urlCursor]);
    listFilters.setCursor(nextEpicCursor);
  }, [listFilters, nextEpicCursor, urlCursor]);

  const handlePreviousPage = useCallback(() => {
    const previous = visitedCursors[visitedCursors.length - 1] ?? null;
    setVisitedCursors((current) => current.slice(0, -1));
    listFilters.setCursor(previous);
  }, [listFilters, visitedCursors]);

  const allEpics = tickets.filter((t) => t.type === "EPIC");
  const stories = tickets.filter((t) => t.type === "STORY");
  const tasks = tickets.filter((t) => t.type === "TASK");

  const handleDeleteEpic = useCallback(
    (epicId: number) =>
      deleteTicket.mutate(
        { ticketId: epicId },
        {
          onSuccess: () => toast.success("Epic deleted"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
    [deleteTicket],
  );
  const handleLinkStory = useCallback(
    (storyId: number, epicId: number) => {
      const story = tickets.find((t) => t.id === storyId);
      if (!story) return;
      updateTicket.mutate({ ticketId: storyId, version: story.version, epicId });
    },
    [updateTicket, tickets],
  );
  const handleCreateStory = useCallback(
    (title: string, epicId: number) =>
      createTicket.mutate(
        { projectId, title, type: "STORY", epicId },
        {
          onSuccess: () => toast.success("Story created"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
    [createTicket, projectId],
  );

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError: readFailed,
    error: loadError,
  });

  const {
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
  } = useEpicBulkActions({ bulkUpdate, exportEpics });

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCreateOpenChange = useCallback(
    (open: boolean) => setCreateOpen(open),
    [],
  );
  const handleEditByIndex = useCallback(
    (index: number) => {
      const epic = epics[index];
      if (epic) setEditTargetId(epic.id);
    },
    [epics],
  );
  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditTargetId(null);
  }, []);
  const keyboardEditTarget =
    editTargetId === null
      ? null
      : (epics.find((epic) => epic.id === editTargetId) ?? null);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  useBuildListKeyboard({
    itemCount: epics.length,
    onOpen: handleEditByIndex,
    onEdit: handleEditByIndex,
    onCreate: canCreate ? handleOpenCreate : undefined,
    onClearSelection: handleClearSelection,
    onShortcutHelp: handleShortcutHelp,
    enabled: pageState.kind === "ready",
    searchInputRef,
  });

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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
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
              <StatCard
                label="Epics"
                value={allEpics.length}
                icon={Layers}
                tone="default"
                index={0}
              />
              <StatCard
                label="Stories"
                value={stories.length}
                icon={BookOpen}
                tone="default"
                index={1}
              />
              <StatCard
                label="Tasks"
                value={tasks.length}
                icon={Wrench}
                tone="default"
                index={2}
              />
              <StatCard
                label="Completed"
                value={
                  tickets.filter((t) => completedStatusNames.has(t.status))
                    .length
                }
                icon={CheckCircle2}
                tone="emerald"
                index={3}
              />
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
