"use client";

import { use, useMemo } from "react";
import { useProject } from "@/lib/api/hooks";
import { GanttView } from "@/components/projects/gantt-view";
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

  if (isLoading) {
    return (
      <PageWrapper title="Timeline">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper title="Timeline" subtitle={`${tickets.length} tickets`}>
      <div className="h-full overflow-auto px-4 pb-4">
        <GanttView
          tickets={tickets}
          onTicketClick={() => {}}
        />
      </div>
    </PageWrapper>
  );
}
