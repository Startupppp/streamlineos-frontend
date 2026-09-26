"use client";

import { use, useCallback, useRef, useState } from "react";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";
import {
  useProject,
  useUpdateTicket,
  useDeleteTicket,
  useCreateTicket,
  useProjectBoardTickets,
  useBulkUpdateTickets,
  useCycles,
} from "@/hooks/api/build";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build";
import { CreateEpicDialog } from "@/features/build/epics/create-epic-dialog";
import { EpicCard } from "@/features/build/epics/epic-card";
import { EpicStoryRow } from "@/features/build/epics/epic-story-row";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Layers, AlertCircle, BookOpen, Wrench, CheckCircle2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ModuleDisabledState } from "@/features/build/shared/module-disabled-state";
import { getCompletedStatusNames } from "@/features/build/shared/completed-status";
import { useCan } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { PmPageShell, PmPanel, PmSection, PmStaggerList, PM_FILL_PANEL } from "@/components/pm-chrome";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export function EpicsPage({ params }: PageProps) {
  const canCreate = useCan("build:tickets:create");
  const canUpdate = useCan("build:tickets:update");
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters();
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const { data: project, isLoading: projectLoading, isError: projectFailed, error: projectError, refetch: refetchProject } = useProject(projectId);
  const { data: boardTickets, isLoading: ticketsLoading, isError: ticketsFailed, error: ticketsError, refetch: refetchTickets } = useProjectBoardTickets(projectId);
  const { data: cycles } = useCycles(projectId);
  const isLoading = projectLoading || ticketsLoading;
  const loadError = projectError ?? ticketsError;

  const handleRetry = useCallback(() => { void refetchProject(); void refetchTickets(); }, [refetchProject, refetchTickets]);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const tickets = boardTickets ?? [];
  const q = listFilters.debouncedSearch.toLowerCase();
  const statusFilter = listFilters.value("status");
  const ownerFilter = listFilters.value("ownerId");

  const allEpics = tickets.filter((t) => t.type === "EPIC");
  const epics = allEpics.filter(
    (t) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (!statusFilter || statusFilter === "all" || t.status === statusFilter) &&
      (!ownerFilter || ownerFilter === "all" || String(t.assigneeId) === ownerFilter),
  );
  const stories = tickets.filter((t) => t.type === "STORY");
  const tasks = tickets.filter((t) => t.type === "TASK");

  const handleDeleteEpic = useCallback(
    (epicId: number) => deleteTicket.mutate({ ticketId: epicId }, { onSuccess: () => toast.success("Epic deleted"), onError: (e) => toast.error(getErrorMessage(e)) }),
    [deleteTicket],
  );
  const handleLinkStory = useCallback((storyId: number, epicId: number) => updateTicket.mutate({ ticketId: storyId, epicId }), [updateTicket]);
  const handleCreateStory = useCallback(
    (title: string, epicId: number) => createTicket.mutate({ projectId, title, type: "STORY", epicId }, { onSuccess: () => toast.success("Story created"), onError: (e) => toast.error(getErrorMessage(e)) }),
    [createTicket, projectId],
  );

  const pageState = usePageState({ permission: "build:view", isLoading, isError: projectFailed || ticketsFailed, error: loadError });

  const handleEpicSelection = useCallback((id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  }, []);
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkUpdate = useCallback(
    (update: Partial<Pick<BulkUpdateTicketsInput, "status" | "priority" | "assigneeId" | "cycleId">>) => {
      if (selectedIds.size === 0) return;
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), ...update },
        { onSuccess: (d) => { toast.success(`${d.updated} epic${d.updated !== 1 ? "s" : ""} updated`); handleClearSelection(); }, onError: (e) => toast.error(getErrorMessage(e)) },
      );
    },
    [selectedIds, bulkUpdate, handleClearSelection],
  );

  const handleBulkStatus = useCallback((v: string) => handleBulkUpdate({ status: v }), [handleBulkUpdate]);
  const handleBulkPriority = useCallback(
    (v: string) => {
      const priority = toBulkPriority(v);
      if (priority) handleBulkUpdate({ priority });
    },
    [handleBulkUpdate],
  );
  const handleBulkAssignee = useCallback((v: string) => handleBulkUpdate({ assigneeId: v || undefined }), [handleBulkUpdate]);
  const handleBulkCycle = useCallback((v: string) => handleBulkUpdate({ cycleId: parseInt(v) || null }), [handleBulkUpdate]);

  useBuildListKeyboard({ itemCount: epics.length, onOpen: useCallback((_i: number) => {}, []), onClearSelection: handleClearSelection, enabled: pageState.kind === "ready", searchInputRef });

  if (project?.settings?.modules?.epics === false) return <ModuleDisabledState moduleName="Epics" projectId={projectId} />;

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Epics" subtitle="Organize related stories and tasks into larger themes">
        <PmPageShell>
          <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">{null}</PageState>
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
            <div className="space-y-2.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
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
      actions={canCreate ? <CreateEpicDialog projectId={projectId} /> : undefined}
      filters={
        <BuildListToolbar search={{ value: listFilters.search, onValueChange: listFilters.setSearch, placeholder: "Search epics", inputRef: searchInputRef }} onClearAll={listFilters.clearAll} />
      }
    >
      <PmPageShell>
        <div className="flex min-h-0 flex-1 flex-col gap-4" aria-live="polite" aria-atomic="true">
          {canUpdate && selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              members={[]}
              cycles={cycles ?? []}
              statuses={project?.statuses}
              projectId={projectId}
              excludeIds={selectedIds}
              onBulkStatus={handleBulkStatus}
              onBulkPriority={handleBulkPriority}
              onBulkAssignee={handleBulkAssignee}
              onBulkCycle={handleBulkCycle}
              onClear={handleClearSelection}
            />
          )}
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              <StatCard label="Epics" value={epics.length} icon={Layers} tone="default" index={0} />
              <StatCard label="Stories" value={stories.length} icon={BookOpen} tone="default" index={1} />
              <StatCard label="Tasks" value={tasks.length} icon={Wrench} tone="default" index={2} />
              <StatCard label="Completed" value={tickets.filter((t) => completedStatusNames.has(t.status)).length} icon={CheckCircle2} tone="emerald" index={3} />
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            {epics.length === 0 ? (
              <EmptyState className={PM_FILL_PANEL} illustrationPreset="projects" title="No epics yet" description="Create your first epic to organize related stories and tasks." />
            ) : (
              <PmStaggerList className="space-y-2.5">
                {epics.map((epic) => (
                  <div key={epic.id} className="flex items-start gap-2">
                    {canUpdate && (
                      <input type="checkbox" aria-label={`Select epic ${epic.title}`} checked={selectedIds.has(epic.id)} onChange={() => handleEpicSelection(epic.id)} className="mt-4 h-4 w-4 shrink-0 cursor-pointer" />
                    )}
                    <div className="flex-1 min-w-0">
                      <EpicCard
                        epic={epic}
                        stories={tickets.filter((t) => t.type !== "EPIC" && t.epicId === epic.id)}
                        projectId={projectId}
                        projectKey={project?.key}
                        projectStatuses={project?.statuses}
                        unlinkedStories={unlinkedStories}
                        onDeleteEpic={handleDeleteEpic}
                        onLinkStory={handleLinkStory}
                        onCreateStory={handleCreateStory}
                        isDeleting={deleteTicket.isPending}
                      />
                    </div>
                  </div>
                ))}
              </PmStaggerList>
            )}
          </PmSection>

          {unlinkedStories.length > 0 && (
            <PmSection index={2} className="shrink-0">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-status-warning-ink" />
                Stories without Epic
              </h2>
              <PmPanel className="space-y-1 p-2">
                {unlinkedStories.map((story) => (
                  <EpicStoryRow key={story.id} story={story} projectId={projectId} projectKey={project?.key} projectStatuses={project?.statuses} />
                ))}
              </PmPanel>
            </PmSection>
          )}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
