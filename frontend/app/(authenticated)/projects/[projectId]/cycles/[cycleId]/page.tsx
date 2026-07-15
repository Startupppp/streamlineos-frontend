"use client";

import { use, useState, useMemo, useCallback } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api";
import { useCycles, useProjectBoardTickets } from "@/hooks/api/projects";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { ListView } from "@/features/projects/views/list-view";
import { ViewSwitcher, parseViewType, type ViewType } from "@/features/projects/views/view-switcher";
import { DisplayOptionsPanel, DEFAULT_DISPLAY_OPTIONS } from "@/features/projects/views/display-options-panel";
import type { DisplayOptions, KanbanTicket } from "@/features/projects/shared/types";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{ projectId: string; cycleId: string }>;
}

export default function CycleDetailPage({ params }: PageProps) {
  const { projectId: projectIdStr, cycleId: cycleIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const cycleId = parseInt(cycleIdStr);

  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseViewType(searchParams.get("view"));

  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(DEFAULT_DISPLAY_OPTIONS);

  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const { data: boardTickets, isLoading: ticketsLoading } = useProjectBoardTickets(projectId);
  const { data: cycles, isLoading: cyclesLoading } = useCycles(projectId);

  const isLoading = projectLoading || cyclesLoading || ticketsLoading;

  const cycle = useMemo(
    () => cycles?.find((c) => c.id === cycleId) ?? null,
    [cycles, cycleId],
  );

  const statuses = useMemo(() => {
    if (!projectData) return undefined;
    return projectData.statuses;
  }, [projectData]);

  const wipLimits = useMemo<Record<string, number>>(() => {
    if (!statuses) return {};
    const result: Record<string, number> = {};
    for (const s of statuses) {
      if (s.wipLimit != null) result[s.name] = s.wipLimit;
    }
    return result;
  }, [statuses]);

  const allTickets = useMemo<KanbanTicket[]>(() => {
    if (!boardTickets) return [];
    return boardTickets.map((t) => ({
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
        cycleId: t.cycleId ?? null,
        dueDate: t.dueDate ?? null,
        startDate: t.startDate ?? null,
        sequenceId: t.sequenceId ?? null,
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              name: t.assignee.name ?? undefined,
              firstName: t.assignee.firstName ?? undefined,
              lastName: t.assignee.lastName ?? undefined,
              email: t.assignee.email ?? undefined,
              image: t.assignee.image ?? null,
            }
          : null,
        labels: (t.labels || [])
          .filter((l): l is typeof l & { label: NonNullable<(typeof l)["label"]> } => l.label != null)
          .map((l) => ({
            label: {
              id: l.label.id,
              name: l.label.name,
              color: l.label.color,
            },
          })),
        cycle: t.cycle
          ? {
              id: t.cycle.id,
              name: t.cycle.name,
              status: t.cycle.status,
              startDate: t.cycle.startDate,
              endDate: t.cycle.endDate,
            }
          : null,
      }));
  }, [boardTickets]);

  const cycleTickets = useMemo(
    () => allTickets.filter((t) => t.cycleId === cycleId),
    [allTickets, cycleId],
  );

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, projectData?.key, id, allTickets);
      if (href) router.push(href);
    },
    [router, projectId, projectData?.key, allTickets],
  );

  const handleViewChange = useCallback(
    (v: ViewType) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("view", v);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Cycle" noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (!projectData || (cycles && !cycle)) {
    notFound();
  }

  const cycleTitle = cycle?.name ?? "Cycle";
  const cycleDateRange = cycle
    ? `${new Date(cycle.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(cycle.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : undefined;

  return (
    <PageWrapper
      title={cycleTitle}
      subtitle={cycleDateRange}
      backHref={`/projects/${projectId}/cycles`}
      noInternalScroll
      contentClassName="!p-0"
      filters={
        <div className="flex min-h-8 w-full flex-wrap items-center gap-2 sm:gap-3">
          <ViewSwitcher activeView={view} onViewChange={handleViewChange} />
          <DisplayOptionsPanel viewType={view} options={displayOptions} onChange={setDisplayOptions} />
          {cycle?.status && (
            <Badge variant="secondary" className="h-6 text-xs capitalize">
              <Calendar className="h-3 w-3 mr-1" />
              {cycle.status}
            </Badge>
          )}
        </div>
      }
    >
      {cycleTickets.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6">
          <EmptyState
            illustrationPreset="ticket"
            title="No tickets in this cycle"
            description="Add tickets to this cycle to track progress here."
          />
        </div>
      ) : (
        <>
          {view === "board" && (
            <div className="h-full w-full px-3 pb-1">
              <KanbanBoard
                tickets={cycleTickets}
                projectId={projectId}
                projectKey={projectData?.key}
                statuses={statuses}
                wipLimits={wipLimits}
                onTicketSelect={handleTicketSelect}
                displayOptions={displayOptions}
              />
            </div>
          )}
          {view === "list" && (
            <div className="h-full min-h-0 overflow-y-auto px-4 pb-2 pt-0">
              <ListView
                tickets={cycleTickets}
                onTicketClick={handleTicketSelect}
                groupBy={displayOptions.groupBy !== "none" ? displayOptions.groupBy : undefined}
                rowBy={displayOptions.rowBy !== "none" ? displayOptions.rowBy : undefined}
                projectKey={projectData?.key}
                projectStatuses={statuses}
                displayOptions={displayOptions}
                showEmptyColumns={displayOptions.showEmptyColumns}
                showEmptyRows={displayOptions.showEmptyRows}
                projectId={projectId}
              />
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
