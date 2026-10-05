"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/cycles";
import {
  useProjectBoardTickets,
  useBulkUpdateTickets,
} from "@/hooks/api/build/tickets";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { buildTicketDetailUrl } from "@/features/build/ticket-details/build-ticket-detail-url";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useCan } from "@/hooks/api/access";
import type { ListSelection } from "@/features/build/views/list-view-shared";
import { toast } from "sonner";
import {
  parseViewType,
  type ViewType,
} from "@/features/build/views/view-switcher";
import { DEFAULT_DISPLAY_OPTIONS } from "@/features/build/views/display-options-model";
import type {
  DisplayOptions,
  KanbanTicket,
} from "@/features/build/shared/types";

export function useCycleDetail(projectId: number, cycleId: number) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestLeave = useNavigationLeave();
  const view = parseViewType(searchParams.get("view"));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters({
    filters: [{ param: "status" }, { param: "from" }, { param: "to" }],
  });

  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(
    DEFAULT_DISPLAY_OPTIONS,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );

  const canUpdate = useCan("build:tickets:update");
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const handleSelectionChange = useCallback(
    (sel: Set<string | number>) => setSelectedIds(sel),
    [],
  );

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const listSelection: ListSelection = {
    selected: selectedIds,
    onChange: handleSelectionChange,
  };

  const handleBulkStatus = useCallback(
    (v: string) => {
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), status: v },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds],
  );

  const handleBulkPriority = useCallback(
    (v: string) => {
      const priority = toBulkPriority(v);
      if (!priority) return;
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), priority },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds],
  );

  const handleBulkAssignee = useCallback(
    (v: string) => {
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), assigneeId: v || undefined },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds],
  );

  const handleBulkCycle = useCallback(
    (v: string) => {
      bulkUpdate.mutate(
        {
          ticketIds: [...selectedIds].map(Number),
          cycleId: parseInt(v) || null,
        },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds],
  );

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
  } = useProjectBoardTickets(projectId, {
    cycle: String(cycleId),
    q: listFilters.debouncedSearch || undefined,
  });
  const {
    data: cycles,
    isLoading: cyclesLoading,
    isError: cyclesFailed,
    error: cyclesError,
    refetch: refetchCycles,
  } = useCycles(projectId);
  const { data: membersPage } = useProjectMembers(projectId);
  const members = membersPage?.data ?? [];
  useTicketColumnCounts(projectId, { cycle: String(cycleId) });

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
      version: t.version,
      cycleId: t.cycleId ?? null,
      dueDate: t.dueDate ?? null,
      startDate: t.startDate ?? null,
      sequenceId: t.sequenceId ?? null,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            image: t.assignee.image ?? null,
            name: t.assignee.name ?? undefined,
            email: t.assignee.email ?? undefined,
            lastName: t.assignee.lastName ?? undefined,
            firstName: t.assignee.firstName ?? undefined,
          }
        : null,
      labels: (t.labels || [])
        .filter(
          (l): l is typeof l & { label: NonNullable<(typeof l)["label"]> } =>
            l.label != null,
        )
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
            endDate: t.cycle.endDate,
            startDate: t.cycle.startDate,
          }
        : null,
    }));
  }, [boardTickets]);

  const statusFilter = listFilters.value("status");
  const fromFilter = listFilters.value("from");
  const toFilter = listFilters.value("to");
  const dueDateFrom = fromFilter !== "all" ? fromFilter : null;
  const dueDateTo = toFilter !== "all" ? toFilter : null;
  const cycleTickets = useMemo(
    () =>
      allTickets.filter(
        (t) =>
          (!statusFilter ||
            statusFilter === "all" ||
            t.status === statusFilter) &&
          (!dueDateFrom || (t.dueDate != null && t.dueDate >= dueDateFrom)) &&
          (!dueDateTo || (t.dueDate != null && t.dueDate <= dueDateTo)),
      ),
    [allTickets, statusFilter, dueDateFrom, dueDateTo],
  );

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(
        projectId,
        projectData?.key,
        id,
        allTickets,
      );
      if (href) requestLeave(() => router.push(href));
    },
    [router, projectId, projectData?.key, allTickets, requestLeave],
  );

  const handleRetry = useCallback(() => {
    void refetchProject();
    void refetchCycles();
    void refetchTickets();
  }, [refetchProject, refetchCycles, refetchTickets]);

  useBuildListKeyboard({
    itemCount: cycleTickets.length,
    onOpen: handleTicketSelect,
    onClearSelection: handleClearSelection,
    enabled: pageState.kind === "ready" && view === "list",
    searchInputRef,
  });

  const handleViewChange = useCallback(
    (v: ViewType) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("view", v);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const cycleTitle = cycle?.name ?? "Cycle";
  const cycleDateRange = cycle
    ? `${formatShortDate(cycle.startDate)} — ${formatShortDate(cycle.endDate)}`
    : undefined;

  return {
    view,
    listFilters,
    searchInputRef,
    displayOptions,
    setDisplayOptions,
    selectedIds,
    canUpdate,
    listSelection,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
    handleClearSelection,
    projectData,
    isLoading,
    isError,
    loadError,
    pageState,
    cycle,
    cycles,
    statuses,
    wipLimits,
    allTickets,
    cycleTickets,
    members,
    cycleTitle,
    cycleDateRange,
    handleTicketSelect,
    handleRetry,
    handleViewChange,
  };
}
