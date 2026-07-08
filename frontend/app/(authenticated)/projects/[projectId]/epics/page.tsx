"use client";

import { use, useCallback } from "react";
import {
  useProject,
  useUpdateTicket,
  useDeleteTicket,
  useCreateTicket,
} from "@/hooks/api/projects";
import { CreateEpicDialog } from "@/features/projects/epics/create-epic-dialog";
import { EpicCard } from "@/features/projects/epics/epic-card";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Layers,
  AlertCircle,
  BookOpen,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function EpicsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: project, isLoading } = useProject(projectId);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();

  const tickets = project?.tickets || [];
  const epics = tickets.filter(t => t.type === "EPIC");
  const stories = tickets.filter(t => t.type === "STORY");
  const tasks = tickets.filter(t => t.type === "TASK");

  const handleDeleteEpic = useCallback((epicId: number) => {
    const children = stories.filter(s => s.epicId === epicId);
    const unlinkPromises = children.map(s =>
      updateTicket.mutateAsync({ ticketId: s.id, epicId: undefined })
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
  }, [stories, updateTicket, deleteTicket]);

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

  if (isLoading) {
    return (
      <PageWrapper title="Epics" subtitle="Loading...">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Epics"
      subtitle="Organize related stories and tasks into larger themes"
      actions={<CreateEpicDialog projectId={projectId} />}
    >
      <div className="space-y-4" aria-live="polite" aria-atomic="true">

        <StatCardGrid cols={4}>
          <StatCard label="Epics" value={epics.length} icon={Layers} tone="default" index={0} />
          <StatCard label="Stories" value={stories.length} icon={BookOpen} color="blue" index={1} />
          <StatCard label="Tasks" value={tasks.length} icon={Wrench} color="cyan" index={2} />
          <StatCard label="Completed" value={tickets.filter(t => t.status === "DONE").length} icon={CheckCircle2} color="green" index={3} />
        </StatCardGrid>

        <div className="space-y-3">
          {epics.length === 0 ? (
            <EmptyState
              illustrationPreset="projects"
              title="No epics yet"
              description="Create your first epic to organize related stories and tasks."
              className="min-h-[40vh]"
            />
          ) : (
            epics.map((epic) => (
              <EpicCard
                key={epic.id}
                epic={epic}
                stories={stories.filter(s => s.epicId === epic.id)}
                projectId={projectId}
                unlinkedStories={stories.filter(s => !s.epicId)}
                onDeleteEpic={handleDeleteEpic}
                onLinkStory={handleLinkStory}
                onCreateStory={handleCreateStory}
                isDeleting={deleteTicket.isPending}
              />
            ))
          )}
        </div>

        {stories.filter(s => !s.epicId).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Stories without Epic
            </h2>
            <Card className="rounded-lg border border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <div className="space-y-1.5">
                  {stories.filter(s => !s.epicId).map((story) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-2.5 bg-muted/40 rounded-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-sm truncate">{story.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{story.status}</Badge>
                      </div>
                      <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </PageWrapper>
  );
}
