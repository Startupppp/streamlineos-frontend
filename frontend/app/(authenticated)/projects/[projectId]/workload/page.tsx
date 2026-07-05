"use client";

import { use, useMemo } from "react";
import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { WorkloadView } from "@/features/projects/views/workload-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/api/projects/projects";
import type { KanbanTicket } from "@/features/projects/shared/types";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function WorkloadPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data, isLoading } = useProject(projectId);

  const tickets = useMemo<KanbanTicket[]>(() => {
    if (!data?.tickets) return [];
    return data.tickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status ?? "TODO",
      type: t.type ?? "TASK",
      priority: t.priority ?? undefined,
      points: t.points ?? undefined,
      timeSpent: t.timeSpent ?? undefined,
      ticketNumber: t.ticketNumber,
      order: t.order ?? undefined,
      epicId: t.epicId ?? undefined,
      assigneeId: t.assigneeId ?? undefined,
      sprintId: t.sprintId ?? undefined,
      dueDate: t.dueDate ?? null,
      startDate: t.startDate ?? null,
      sequenceId: t.sequenceId ?? null,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            firstName: t.assignee.firstName ?? undefined,
            lastName: t.assignee.lastName ?? undefined,
            image: t.assignee.image ?? null,
          }
        : null,
      labels: (t.labels ?? [])
        .filter((l) => !!l.label)
        .map((l) => ({
          label: {
            id: l.label!.id,
            name: l.label!.name,
            color: l.label!.color,
          },
        })),
    }));
  }, [data]);

  const members = useMemo(() => {
    if (!data?.members) return [];
    return data.members
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user!.id,
        name: m.user!.name ?? null,
        firstName: m.user!.firstName ?? null,
        lastName: m.user!.lastName ?? null,
        image: m.user!.image ?? null,
      }));
  }, [data]);

  if (isLoading) {
    return (
      <PageWrapper title="Workload">
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper title="Workload" subtitle={`Team capacity for ${data.name}`}>
      <WorkloadView tickets={tickets} projectId={projectId} members={members} />
    </PageWrapper>
  );
}
