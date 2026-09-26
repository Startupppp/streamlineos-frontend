"use client";

import { use, useState, useCallback, useMemo } from "react";
import { format, addDays } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api";
import { useProjectBoardTickets } from "@/hooks/api/build";
import { useWorkloadCapacity } from "@/hooks/api/build/workload-capacity";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import { mapBoardTicketToKanban } from "@/features/build/my-tickets/map-board-ticket";
import { WorkloadView } from "@/features/build/views/workload-view";
import { WorkloadFilterBar } from "@/features/build/views/workload-filter-bar";
import { ViewSwitcher } from "@/features/build/views/view-switcher";
import {
  INITIAL_FILTERS,
  type FilterState as WorkloadFilterState,
} from "@/features/build/views/workload-types";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { ProjectLoadFallback } from "@/features/build/shared/project-load-fallback";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";
import type { ViewType } from "@/features/build/views/view-switcher";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export function WorkloadBoardPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const memberId = searchParams.get("memberId");

  const capacityWindow = useMemo(() => {
    const today = new Date();
    return {
      start: from ?? format(today, "yyyy-MM-dd"),
      end: to ?? format(addDays(today, 13), "yyyy-MM-dd"),
    };
  }, [from, to]);

  const boardFilters = useMemo(
    () => ({ assigneeId: memberId ?? undefined }),
    [memberId],
  );

  const {
    data,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorValue,
    refetch: refetchProject,
  } = useProject(projectId);

  const { data: boardTickets, isLoading: ticketsLoading } =
    useProjectBoardTickets(projectId, boardFilters);

  const capacityByMemberId = useWorkloadCapacity(
    projectId,
    capacityWindow.start,
    capacityWindow.end,
  );

  const allTickets = useMemo(
    () => (boardTickets ? boardTickets.map(mapBoardTicketToKanban) : []),
    [boardTickets],
  );

  const members = useMemo(() => {
    if (!data?.members) return [];
    return data.members.flatMap((member) => {
      if (!member.user) return [];
      return [
        {
          id: member.user.id,
          name: member.user.name ?? null,
          firstName: member.user.firstName ?? null,
          lastName: member.user.lastName ?? null,
          image: member.user.image ?? null,
        },
      ];
    });
  }, [data?.members]);

  const statuses = data?.statuses;

  const createParamOpen = searchParams.get("create") === "1";

  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const [localFilters, setLocalFilters] = useState<WorkloadFilterState>({
    ...INITIAL_FILTERS,
    assigneeId: memberId ?? "all",
  });

  const workloadFilters = useMemo<WorkloadFilterState>(
    () => ({ ...localFilters, assigneeId: memberId ?? "all" }),
    [localFilters, memberId],
  );

  const handleWorkloadFilterChange = useCallback(
    <K extends keyof WorkloadFilterState>(
      key: K,
      value: WorkloadFilterState[K],
    ) => {
      if (key === "assigneeId") {
        const next = new URLSearchParams(searchParams.toString());
        const strValue = String(value);
        if (strValue && strValue !== "all") {
          next.set("memberId", strValue);
        } else {
          next.delete("memberId");
        }
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      } else {
        setLocalFilters((prev) => ({ ...prev, [key]: value }));
      }
    },
    [pathname, router, searchParams],
  );

  const handleClearWorkloadFilters = useCallback(() => {
    setLocalFilters(INITIAL_FILTERS);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("memberId");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      const next = new URLSearchParams(searchParams.toString());
      if (open) {
        next.set("create", "1");
      } else {
        next.delete("create");
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleKeyboardCreate = useCallback(
    () => handleCreateOpenChange(true),
    [handleCreateOpenChange],
  );

  const handleOpenShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const handleShortcutHelpOpenChange = useCallback((open: boolean) => {
    setShortcutHelpOpen(open);
  }, []);

  const handleViewChange = useCallback(
    (view: ViewType) => {
      if (view === "workload") return;
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", view);
      router.push(`/build/${projectId}/issues?${next.toString()}`);
    },
    [projectId, router, searchParams],
  );

  const handleOpenFocusedMember = useCallback(
    (index: number) => {
      const member = members[index];
      if (!member) return;
      const next = new URLSearchParams(searchParams.toString());
      next.set("memberId", member.id);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [members, pathname, router, searchParams],
  );

  const handleClearSelection = useCallback(() => {}, []);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: members.length,
    onOpen: handleOpenFocusedMember,
    onClearSelection: handleClearSelection,
    onCreate: handleKeyboardCreate,
    onShortcutHelp: handleOpenShortcutHelp,
    enabled: true,
  });

  const focusedMemberId =
    focusedIndex === null ? null : (members[focusedIndex]?.id ?? null);

  const handleRetryProject = useCallback(
    () => void refetchProject(),
    [refetchProject],
  );

  const isOnline = useOnlineStatus();

  const resolution = usePageState({
    permission: "build:view",
    isLoading: projectLoading || ticketsLoading,
    isError: projectError,
    error: projectErrorValue,
  });

  if (projectLoading) {
    return (
      <PageWrapper title={<Skeleton className="h-5 w-40" />} noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (resolution.kind !== "ready" && resolution.kind !== "error") {
    return (
      <PageWrapper title="Workload" noInternalScroll>
        <PageState resolution={resolution} loading={<KanbanBoardSkeleton />}>
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (projectError) {
    return (
      <ProjectLoadFallback
        title="Workload"
        error={projectErrorValue}
        onRetry={handleRetryProject}
      />
    );
  }

  if (resolution.kind !== "ready") {
    return (
      <PageWrapper title="Workload" noInternalScroll>
        <PageState resolution={resolution} loading={<KanbanBoardSkeleton />}>
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  const filterLeading = (
    <div className="flex min-w-0 shrink-0 items-center gap-1">
      <ViewSwitcher activeView="workload" onViewChange={handleViewChange} />
    </div>
  );

  return (
    <PageWrapper
      title={data.name}
      subtitle={data.description ?? undefined}
      noInternalScroll
      filtersClassName="!gap-1 !px-3 sm:!gap-1.5 sm:!px-4 lg:!px-6"
      contentClassName="!p-0 flex flex-col"
      className="relative"
      actions={
        <CreateTicketDialog
          projectId={projectId}
          externalOpen={createParamOpen}
          onExternalOpenChange={handleCreateOpenChange}
        />
      }
      filters={
        <WorkloadFilterBar
          className="w-full"
          leading={filterLeading}
          projectId={projectId}
          filters={workloadFilters}
          members={members}
          projectStatuses={statuses}
          onFilterChange={handleWorkloadFilterChange}
          onClearFilters={handleClearWorkloadFilters}
        />
      }
    >
      {!isOnline ? (
        <EmptyState
          className="flex-1"
          illustrationPreset="team"
          title="You are offline"
          description="Showing cached data. Reconnect to see the latest workload."
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-0 px-4 lg:px-6">
          <WorkloadView
            tickets={allTickets}
            projectId={projectId}
            projectKey={data.key}
            members={members}
            filters={workloadFilters}
            onFilterChange={handleWorkloadFilterChange}
            onClearFilters={handleClearWorkloadFilters}
            capacityByMemberId={capacityByMemberId}
            focusedMemberId={focusedMemberId}
          />
        </div>
      )}
      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={handleShortcutHelpOpenChange}
      />
    </PageWrapper>
  );
}
