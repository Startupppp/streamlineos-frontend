"use client";

import { use, useMemo, useCallback } from "react";
import { useProject } from "@/hooks/api";
import { GanttView } from "@/features/projects/views/gantt-view";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function TimelinePage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);

  const tickets = useMemo(() => {
    if (!data?.tickets) return [];
    return data.tickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status ?? "TODO",
      type: t.type ?? "TASK",
      startDate: t.startDate ?? null,
      dueDate: t.dueDate ?? null,
      ticketNumber: t.ticketNumber,
      sequenceId: t.sequenceId ?? null,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            firstName: t.assignee.firstName ?? null,
            lastName: t.assignee.lastName ?? null,
          }
        : null,
    }));
  }, [data]);

  const handleTicketClick = useCallback((_: number) => {}, []);

  if (isLoading) {
    return (
      <PageWrapper title="Timeline" subtitle="Loading..." noInternalScroll contentClassName="!p-0">
        <div className="px-4 pt-4 pb-4 space-y-1">
          <Skeleton className="h-8 w-full mb-3" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-32 shrink-0" />
              <Skeleton className="h-8 flex-1" />
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="Timeline"
      subtitle="Visual timeline of project tickets and deadlines"
      noInternalScroll
      contentClassName="!p-0"
    >
      <div className="flex h-full min-h-0 flex-col px-4 pb-4 pt-0 sm:px-6">
        <GanttView tickets={tickets} projectId={projectId} onTicketClick={handleTicketClick} />
      </div>
    </PageWrapper>
  );
}
