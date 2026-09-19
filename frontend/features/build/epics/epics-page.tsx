"use client";

import { use, useCallback } from "react";
import {
  useProject,
  useUpdateTicket,
  useDeleteTicket,
  useCreateTicket,
  useProjectBoardTickets,
} from "@/hooks/api/build";
import { CreateEpicDialog } from "@/features/build/epics/create-epic-dialog";
import { EpicCard } from "@/features/build/epics/epic-card";
import { EpicStoryRow } from "@/features/build/epics/epic-story-row";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
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
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export function EpicsPage({ params }: PageProps) {
  const canCreate = useCan("build:tickets:create");
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

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
  const isLoading = projectLoading || ticketsLoading;
  const isError = projectFailed || ticketsFailed;
  const loadError = projectError ?? ticketsError;

  const handleRetry = useCallback(() => {
    void refetchProject();
    void refetchTickets();
  }, [refetchProject, refetchTickets]);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();

  const tickets = boardTickets ?? [];
  const epics = tickets.filter((t) => t.type === "EPIC");
  const stories = tickets.filter((t) => t.type === "STORY");
  const tasks = tickets.filter((t) => t.type === "TASK");

  const handleDeleteEpic = useCallback((epicId: number) => {
    const children = tickets.filter(t => t.type !== "EPIC" && t.epicId === epicId);
    const unlinkPromises = children.map(t =>
      updateTicket.mutateAsync({ ticketId: t.id, epicId: undefined })
    );
    Promise.all(unlinkPromises)
      .then(() => {
        deleteTicket.mutate(
          { ticketId: epicId },
          {
            onSuccess: () => toast.success("Epic deleted"),
            onError: (error) => toast.error(getErrorMessage(error)),
          }
        );
      })
      .catch(() => {
        toast.error("Failed to unlink stories from epic");
      });
  }, [tickets, updateTicket, deleteTicket]);

  const handleLinkStory = useCallback((storyId: number, epicId: number) => {
    updateTicket.mutate({ ticketId: storyId, epicId });
  }, [updateTicket]);

  const handleCreateStory = useCallback((title: string, epicId: number) => {
    createTicket.mutate(
      { projectId, title, type: "STORY", epicId },
      {
        onSuccess: () => toast.success("Story created"),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [createTicket, projectId]);

  if (project?.settings?.modules?.epics === false) {
    return <ModuleDisabledState moduleName="Epics" projectId={projectId} />;
  }

  if (isLoading) {
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

  if (isError) {
    return (
      <PageWrapper
        title="Epics"
        subtitle="Organize related stories and tasks into larger themes"
      >
        <PmPageShell>
          <ErrorState
            className="flex-1"
            title="Couldn't load epics"
            description={getErrorMessage(loadError)}
            onRetry={handleRetry}
          />
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
    >
      <PmPageShell>
        <div
          className="flex min-h-0 flex-1 flex-col gap-4"
          aria-live="polite"
          aria-atomic="true"
        >
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              <StatCard label="Epics" value={epics.length} icon={Layers} tone="default" index={0} />
              <StatCard label="Stories" value={stories.length} icon={BookOpen} tone="default" index={1} />
              <StatCard label="Tasks" value={tasks.length} icon={Wrench} tone="default" index={2} />
              <StatCard
                label="Completed"
                value={tickets.filter((t) => completedStatusNames.has(t.status)).length}
                icon={CheckCircle2}
                tone="emerald"
                index={3}
              />
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            {epics.length === 0 ? (
              <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="projects"
                  title="No epics yet"
                  description="Create your first epic to organize related stories and tasks."
                />
            ) : (
              <PmStaggerList className="space-y-2.5">
                {epics.map((epic) => (
                  <EpicCard
                    key={epic.id}
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
                ))}
              </PmStaggerList>
            )}
          </PmSection>

          {unlinkedStories.length > 0 ? (
            <PmSection index={2} className="shrink-0">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
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
          ) : null}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
