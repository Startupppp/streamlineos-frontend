"use client";

import { use, useMemo, useCallback } from "react";
import { useRouter, notFound } from "next/navigation";
import { useProject, useProjectBoardTickets } from "@/hooks/api/projects";
import { GanttView } from "@/features/projects/views/gantt-view";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import {
  PmPageShell,
  PmPanel,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function TimelinePage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr, 10);
  const router = useRouter();
  const { data, isLoading: projectLoading } = useProject(projectId);
  const { data: boardTickets, isLoading: ticketsLoading } =
    useProjectBoardTickets(projectId);
  const isLoading = projectLoading || ticketsLoading;

  const tickets = useMemo(() => {
    if (!boardTickets) return [];
    return boardTickets.map((t) => ({
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
  }, [boardTickets]);

  const handleTicketClick = useCallback(
    (ticketId: number) => {
      const href = buildTicketDetailUrl(
        projectId,
        data?.key,
        ticketId,
        tickets,
      );
      if (href) router.push(href);
    },
    [router, projectId, data?.key, tickets],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Timeline" noInternalScroll contentClassName="!p-0">
        <PmPageShell className={cn(PAGE_CHROME_X, "pt-0")}>
          <div className={cn(PM_TOOLBAR, "h-10 animate-pulse bg-muted/40")} />
          <PmPanel className="flex min-h-0 flex-1 flex-col p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="h-4 w-28 shrink-0 rounded-md sm:w-40" />{" "}
                <Skeleton
                  className="h-7 rounded-md"
                  style={{
                    width: `${28 + ((i * 11) % 48)}%`,
                    marginLeft: `${(i * 6) % 24}%`,
                  }}
                />
              </div>
            ))}
          </PmPanel>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="Timeline"
      subtitle="Visual schedule of work items, dependencies, and milestones"
      noInternalScroll
      contentClassName="!p-0"
    >
      <PmPageShell className={cn(PAGE_CHROME_X, "h-full min-h-0 pt-0")}>
        <GanttView
          tickets={tickets}
          projectId={projectId}
          onTicketClick={handleTicketClick}
        />
      </PmPageShell>
    </PageWrapper>
  );
}
