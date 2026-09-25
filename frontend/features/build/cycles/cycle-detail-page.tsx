"use client";

import { useState, useMemo, useCallback } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api";
import { useCycles, useProjectBoardTickets } from "@/hooks/api/build";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import { KanbanBoard } from "@/features/build/views/kanban-board";
import { ListView } from "@/features/build/views/list-view";
import { ViewSwitcher, parseViewType, type ViewType } from "@/features/build/views/view-switcher";
import { DisplayOptionsPanel, DEFAULT_DISPLAY_OPTIONS } from "@/features/build/views/display-options-panel";
import type { DisplayOptions, KanbanTicket } from "@/features/build/shared/types";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { buildTicketDetailUrl } from "@/features/build/ticket-details/build-ticket-detail-url";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface CycleDetailPageProps {
  projectId: string;
  cycleId: string;
}

export function CycleDetailPage({
  projectId: projectIdStr,
  cycleId: cycleIdStr,
}: CycleDetailPageProps) {
  const projectId = parseInt(projectIdStr);
  const cycleId = parseInt(cycleIdStr);

  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseViewType(searchParams.get("view"));

  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(DEFAULT_DISPLAY_OPTIONS);

  const {
    data: projectData,
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
  const {
    data: cycles,
    isLoading: cyclesLoading,
    isError: cyclesFailed,
    error: cyclesError,
    refetch: refetchCycles,
  } = useCycles(projectId);
  // The board this page renders reads column counts keyed only on projectId.
  // Warming it here keeps it off the far side of the loading guard.
  useTicketColumnCounts(projectId);

  const isLoading = projectLoading || cyclesLoading || ticketsLoading;
  const isError = projectFailed || cyclesFailed || ticketsFailed;
  const loadError = projectError ?? cyclesError ?? ticketsError;
  const pageState = usePageState({
    permission: "build:cycles:view",
    isLoading,
    isError,
    error: loadError,
  });

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
        rank: t.rank ?? undefined,
        epicId: t.epicId ?? undefined,
        assigneeId: t.assigneeId ?? undefined,
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

  const handleRetry = useCallback(() => {
    void refetchProject();
    void refetchCycles();
    void refetchTickets();
  }, [refetchProject, refetchCycles, refetchTickets]);

  const handleViewChange = useCallback(
    (v: ViewType) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("view", v);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "error" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper title="Cycle" backHref={`/build/${projectId}/cycles`}>
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (pageState.kind === "loading" || isLoading) {
    return (
      <PageWrapper title="Cycle" noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Cycle" backHref={`/build/${projectId}/cycles`}>
        <ErrorState
          className="flex-1"
          title="Couldn't load this cycle"
          description={getErrorMessage(loadError)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!projectData || (cycles && !cycle)) {
    notFound();
  }

  const cycleTitle = cycle?.name ?? "Cycle";
  const cycleDateRange = cycle
    ? `${formatShortDate(cycle.startDate)} — ${formatShortDate(cycle.endDate)}`
    : undefined;

  return (
    <PageWrapper
      title={cycleTitle}
      subtitle={cycleDateRange}
      backHref={`/build/${projectId}/cycles`}
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
      <div className={cn(PAGE_CHROME_X, "flex min-h-0 flex-1 flex-col")}>
        {cycleTickets.length === 0 ? (
          <EmptyState
            illustrationPreset="ticket"
            title="No tickets in this cycle"
            description="Add tickets to this cycle to track progress here."
          />
        ) : (
          <>
            {view === "board" && (
              <div className="h-full w-full pb-1">
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
              <div className="h-full min-h-0 overflow-y-auto pb-2 pt-0">
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
      </div>
    </PageWrapper>
  );
}
