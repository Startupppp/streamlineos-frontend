"use client";

import { use, useMemo, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api";
import { useProjectBoardTickets } from "@/hooks/api/projects";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ViewSwitcher, type ViewType } from "@/features/projects/views/view-switcher";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";
import { mapBoardTicketToKanban } from "./map-board-ticket";
import { MY_TICKETS_VIEWS, parseMyTicketsView } from "./my-tickets-view";
import { MyTicketsViewBody } from "./my-tickets-view-body";
import { MyTicketsSkeleton } from "./my-tickets-skeleton";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export function MyTicketsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const {
    data,
    isLoading: projectLoading,
    isError: projectError,
    refetch: refetchProject,
  } = useProject(projectId);
  const {
    data: boardTickets,
    isLoading: ticketsLoading,
    isError: ticketsError,
    refetch: refetchTickets,
  } = useProjectBoardTickets(projectId);
  const isLoading = projectLoading || ticketsLoading;
  const isError = projectError || ticketsError;
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = session?.user?.id;
  const view = parseMyTicketsView(searchParams.get("view"));
  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const hasActiveFilters = Boolean(q || filterStatus || filterPriority || filterType);

  const statuses = useMemo(() => {
    if (!data || !("statuses" in data)) return undefined;
    return data.statuses;
  }, [data]);

  const wipLimits = useMemo<Record<string, number>>(() => {
    if (!statuses) return {};
    const result: Record<string, number> = {};
    for (const s of statuses) {
      if (s.wipLimit != null) result[s.name] = s.wipLimit;
    }
    return result;
  }, [statuses]);

  const myTickets = useMemo(() => {
    if (!boardTickets || !userId) return [];
    return boardTickets
      .filter((t) => {
        if (t.assigneeId === userId) return true;
        if (t.assignees?.some((a) => a.userId === userId)) return true;
        if (t.reporterId === userId) return true;
        return false;
      })
      .map(mapBoardTicketToKanban);
  }, [boardTickets, userId]);

  const filteredTickets = useMemo(() => {
    let result = myTickets;
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter((t) => {
        if (t.title.toLowerCase().includes(lower)) return true;
        const ticketKey =
          data?.key && t.ticketNumber != null
            ? `${data.key}-${t.ticketNumber}`.toLowerCase()
            : null;
        if (ticketKey && ticketKey.includes(lower)) return true;
        if (t.sequenceId && t.sequenceId.toLowerCase().includes(lower)) return true;
        return false;
      });
    }
    if (filterStatus) {
      const statusSet = new Set(filterStatus.split(",").filter(Boolean));
      result = result.filter((t) => statusSet.has(t.status));
    }
    if (filterPriority) {
      const prioritySet = new Set(filterPriority.split(",").filter(Boolean));
      result = result.filter((t) => t.priority != null && prioritySet.has(String(t.priority)));
    }
    if (filterType) {
      const typeSet = new Set(filterType.split(",").filter(Boolean));
      result = result.filter((t) => typeSet.has(t.type));
    }
    return result;
  }, [myTickets, q, filterStatus, filterPriority, filterType, data?.key]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, data?.key, id, myTickets);
      if (href) router.push(href);
    },
    [router, projectId, data?.key, myTickets],
  );

  const handleViewChange = useCallback(
    (next: ViewType) => {
      if (next !== "board" && next !== "list" && next !== "table") return;
      const p = new URLSearchParams(searchParams.toString());
      if (next === "table") {
        p.delete("view");
      } else {
        p.set("view", next);
      }
      const qs = p.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const handleRetry = useCallback(() => {
    void refetchProject();
    void refetchTickets();
  }, [refetchProject, refetchTickets]);

  const handleClearFilters = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("q");
    p.delete("status");
    p.delete("priority");
    p.delete("type");
    const qs = p.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(projectId, data.key, selectedTicketId, myTickets);
    if (href) router.replace(href);
  }, [selectedTicketId, data, myTickets, projectId, router]);

  if (isLoading) {
    return (
      <PageWrapper
        title="My Tickets"
        subtitle="Tickets assigned to or reported by you"
        noInternalScroll
        contentClassName="!p-0"
      >
        <PmPageShell className={cn(PAGE_CHROME_X, "min-h-0 flex-1 gap-0 overflow-hidden")} withGlow>
          <PmPanel solid className={cn(PM_FILL_PANEL, "mb-2 mt-2 overflow-auto")}>
            <MyTicketsSkeleton view={view} />
          </PmPanel>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="My Tickets"
        subtitle="Tickets assigned to or reported by you"
        noInternalScroll
        contentClassName="!p-0"
      >
        <PmPageShell className={cn(PAGE_CHROME_X, "min-h-0 flex-1 gap-0 overflow-hidden")} withGlow>
          <ErrorState
            className={cn(PM_FILL_PANEL, "mb-0 mt-2")}
            title="Failed to load tickets"
            description="An error occurred while fetching your tickets. Please try again."
            onRetry={handleRetry}
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="My Tickets"
      subtitle="Tickets assigned to or reported by you"
      noInternalScroll
      contentClassName="!p-0"
      filters={
        <div className={PM_TOOLBAR}>
          <ViewSwitcher
            activeView={view}
            onViewChange={handleViewChange}
            allowedViews={MY_TICKETS_VIEWS}
            layoutId="my-tickets-view-pill"
          />
          <div className="min-w-0 flex-1 sm:flex sm:justify-end">
            <TicketFilterBar showSprintFilter={false} showAssigneeFilter={false} />
          </div>
        </div>
      }
    >
      <PmPageShell className={cn(PAGE_CHROME_X, "min-h-0 flex-1 gap-0 overflow-hidden")} withGlow>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {filteredTickets.length === 0 ? (
            <EmptyState
                className={cn(PM_FILL_PANEL, "mb-0 mt-2")}
                illustrationPreset="ticket"
                title={
                  myTickets.length === 0
                    ? "No tickets assigned to you"
                    : "No tickets match your filters"
                }
                description={
                  myTickets.length === 0
                    ? "Tickets you create or get assigned to will appear here."
                    : "Try adjusting or clearing your filters."
                }
                action={
                  hasActiveFilters && myTickets.length > 0
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : undefined
                }
              />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <MyTicketsViewBody
                view={view}
                tickets={filteredTickets}
                projectId={projectId}
                projectKey={data.key}
                statuses={statuses}
                wipLimits={wipLimits}
                onTicketSelect={handleTicketSelect}
              />
            </div>
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
