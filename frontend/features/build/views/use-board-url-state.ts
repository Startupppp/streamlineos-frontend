"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api";
import { useViews, useCreateView, useProjectBoardTickets } from "@/hooks/api/build";
import { hydrateDisplayOptions, useDisplayOptions } from "./use-display-options";
import { parseViewType, type ViewType } from "./view-switcher";
import { type SaveViewMeta } from "./save-view-dialog";
import { INITIAL_FILTERS, type FilterState as WorkloadFilterState } from "./workload-types";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { KanbanTicket } from "@/features/build/shared/types";
import {
  filterHiddenCompletedTickets,
  getCompletedStatusNames,
} from "@/features/build/shared/completed-status";
import { buildTicketDetailUrl } from "@/features/build/ticket-details/build-ticket-detail-url";

export type ProjectStatus = {
  id: number;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number | null;
  type?: string | null;
};

export type BoardMember = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
};

export function useBoardUrlState(projectId: number) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const view: ViewType = parseViewType(searchParams.get("view"));
  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;
  const commentParam = searchParams.get("comment");
  const highlightCommentId = commentParam ? parseInt(commentParam) : null;
  const viewId = searchParams.get("viewId");
  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";
  const filterLabels = searchParams.get("labels") ?? "";
  const filterCycle = searchParams.get("cycle") ?? "";
  const filterSprint = searchParams.get("sprint") ?? "";
  const filterModule = searchParams.get("module") ?? "";
  const createParamOpen = searchParams.get("create") === "1";
  const createCycleParam = searchParams.get("cycleId");
  const createDefaultCycleId =
    createCycleParam === null
      ? undefined
      : createCycleParam === "none" || createCycleParam === ""
        ? null
        : Number.isFinite(Number(createCycleParam))
          ? Number(createCycleParam)
          : undefined;

  const { data: boardTickets, isLoading: ticketsLoading } = useProjectBoardTickets(projectId);
  const { data } = useProject(projectId);
  const { data: views } = useViews(projectId);
  const createView = useCreateView();
  const appliedViewIdRef = useRef<string | null>(null);

  const [displayOptions, setDisplayOptions] = useDisplayOptions(projectId);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [workloadFilters, setWorkloadFilters] = useState<WorkloadFilterState>(INITIAL_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (!viewId || !views) return;
    if (appliedViewIdRef.current === viewId) return;
    const savedView = views.find((v) => v.id.toString() === viewId);
    if (!savedView) return;
    appliedViewIdRef.current = viewId;
    const next = new URLSearchParams(searchParams.toString());
    if (savedView.filters && typeof savedView.filters === "object") {
      for (const [k, val] of Object.entries(savedView.filters)) {
        if (typeof val === "string" && val) next.set(k, val);
        else next.delete(k);
      }
    }
    if (savedView.layoutType) next.set("view", savedView.layoutType);
    if (savedView.displayOptions && Object.keys(savedView.displayOptions).length > 0) {
      setDisplayOptions(hydrateDisplayOptions(savedView.displayOptions));
    }
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [viewId, views, searchParams, router, setDisplayOptions]);

  const activeView = viewId ? views?.find((v) => v.id.toString() === viewId) : null;

  const allTickets: KanbanTicket[] = useMemo(() => {
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
      sprintId: t.sprintId ?? undefined,
      cycleId: t.cycleId ?? null,
      moduleId: t.moduleId ?? null,
      dueDate: t.dueDate ?? null,
      startDate: t.startDate ?? null,
      updatedAt: t.updatedAt != null ? String(t.updatedAt) : null,
      sequenceId: t.sequenceId ?? null,
      assignees: t.assignees,
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
      labels: (t.labels || []).flatMap((l) =>
        l.label
          ? [{ label: { id: l.label.id, name: l.label.name, color: l.label.color } }]
          : [],
      ),
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

  const statuses =
    data && "statuses" in data
      ? (data.statuses as ProjectStatus[])
      : undefined;

  const filteredTickets = useMemo(() => {
    let tickets = filterHiddenCompletedTickets(allTickets, hideCompleted, statuses);
    if (displayOptions.completedIssues !== "all") {
      if (displayOptions.completedIssues === "none") {
        tickets = filterHiddenCompletedTickets(tickets, true, statuses);
      } else {
        const cutoff = new Date();
        if (displayOptions.completedIssues === "last-day") cutoff.setDate(cutoff.getDate() - 1);
        else if (displayOptions.completedIssues === "last-week") cutoff.setDate(cutoff.getDate() - 7);
        else if (displayOptions.completedIssues === "last-month") cutoff.setMonth(cutoff.getMonth() - 1);
        const completedStatuses = getCompletedStatusNames(statuses);
        tickets = tickets.filter(
          (t) =>
            !completedStatuses.has(t.status) ||
            !t.updatedAt ||
            new Date(t.updatedAt) >= cutoff,
        );
      }
    }
    if (q) {
      const lower = q.toLowerCase();
      tickets = tickets.filter((t) => {
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
      tickets = tickets.filter((t) => statusSet.has(t.status));
    }
    if (filterPriority) {
      const prioritySet = new Set(filterPriority.split(",").filter(Boolean));
      tickets = tickets.filter((t) => t.priority != null && prioritySet.has(t.priority));
    }
    if (filterType) {
      const typeSet = new Set(filterType.split(",").filter(Boolean));
      tickets = tickets.filter((t) => typeSet.has(t.type));
    }
    if (filterAssigneeId) {
      const assigneeSet = new Set(filterAssigneeId.split(",").filter(Boolean));
      tickets = tickets.filter((t) =>
        assigneeSet.has("__unassigned__")
          ? !t.assigneeId
          : t.assigneeId != null && assigneeSet.has(t.assigneeId),
      );
    }
    if (filterLabels) {
      const labelIds = new Set(filterLabels.split(",").filter(Boolean).map(Number));
      tickets = tickets.filter((t) =>
        (t.labels ?? []).some((l) => l.label && labelIds.has(l.label.id)),
      );
    }
    if (filterCycle) {
      const cycleIds = new Set(filterCycle.split(",").filter(Boolean).map(Number));
      tickets = tickets.filter((t) => t.cycleId != null && cycleIds.has(t.cycleId));
    }
    if (filterSprint) {
      const sprintIds = new Set(filterSprint.split(",").filter(Boolean).map(Number));
      tickets = tickets.filter((t) => t.sprintId != null && sprintIds.has(t.sprintId));
    }
    if (filterModule) {
      const moduleIds = new Set(filterModule.split(",").filter(Boolean).map(Number));
      tickets = tickets.filter((t) => t.moduleId != null && moduleIds.has(t.moduleId));
    }
    return tickets;
  }, [allTickets, hideCompleted, q, filterStatus, filterPriority, filterType, filterAssigneeId, filterLabels, filterCycle, filterSprint, filterModule, data, displayOptions.completedIssues, statuses]);

  const members: BoardMember[] = useMemo(() => {
    if (!data?.members) return [];
    return data.members.flatMap((m) => {
      if (!m.user) return [];
      return [
        {
          id: m.user.id,
          name: m.user.name ?? null,
          firstName: m.user.firstName ?? null,
          lastName: m.user.lastName ?? null,
          image: m.user.image ?? null,
        },
      ];
    });
  }, [data]);

  const wipLimits = useMemo<Record<string, number>>(() => {
    if (!statuses) return {};
    const result: Record<string, number> = {};
    for (const s of statuses) {
      if (s.wipLimit != null) result[s.name] = s.wipLimit;
    }
    return result;
  }, [statuses]);

  const doneCount = useMemo(() => {
    const completedStatuses = getCompletedStatusNames(statuses);
    return allTickets.filter((t) => completedStatuses.has(t.status)).length;
  }, [allTickets, statuses]);

  const hasActiveFilters = !!(
    q ||
    filterStatus ||
    filterPriority ||
    filterType ||
    filterAssigneeId ||
    filterLabels ||
    filterCycle ||
    filterSprint ||
    filterModule
  );
  const showEmptyFilterState =
    hasActiveFilters && filteredTickets.length === 0 && allTickets.length > 0;

  const handleClearView = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("viewId");
    appliedViewIdRef.current = null;
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSaveView = useCallback(
    (meta?: SaveViewMeta) => {
      const name = saveViewName.trim();
      if (!name) return;
      const filters: Record<string, string> = {};
      if (q) filters.q = q;
      if (filterStatus) filters.status = filterStatus;
      if (filterPriority) filters.priority = filterPriority;
      if (filterType) filters.type = filterType;
      if (filterAssigneeId) filters.assigneeId = filterAssigneeId;
      if (filterLabels) filters.labels = filterLabels;
      if (filterCycle) filters.cycle = filterCycle;
      createView.mutate(
        {
          projectId,
          name,
          filters,
          layoutType: view === "workload" ? "board" : view,
          ...(meta ? { visibility: meta.visibility, displayOptions: meta.displayOptions } : {}),
        },
        {
          onSuccess: (created) => {
            toast.success("View saved");
            setSaveViewOpen(false);
            setSaveViewName("");
            if (
              created &&
              typeof created === "object" &&
              "id" in created &&
              typeof created.id === "number"
            ) {
              const next = new URLSearchParams(searchParams.toString());
              next.set("viewId", String(created.id));
              router.replace(`?${next.toString()}`, { scroll: false });
            }
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [saveViewName, q, filterStatus, filterPriority, filterType, filterAssigneeId, filterLabels, filterCycle, view, projectId, createView, searchParams, router],
  );

  const handleViewChange = useCallback(
    (v: ViewType) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("view", v);
      router.replace(`?${p.toString()}`, { scroll: false });
      setSelectedIds(new Set());
    },
    [router, searchParams],
  );

  const handleSaveViewNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSaveViewName(e.target.value),
    [],
  );

  const handleWorkloadFilterChange = useCallback(
    <K extends keyof WorkloadFilterState>(key: K, value: WorkloadFilterState[K]) => {
      setWorkloadFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleClearWorkloadFilters = useCallback(() => {
    setWorkloadFilters(INITIAL_FILTERS);
  }, []);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, data?.key, id, allTickets);
      if (href) router.push(href);
    },
    [router, projectId, data?.key, allTickets],
  );

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(
      projectId,
      data.key,
      selectedTicketId,
      allTickets,
      highlightCommentId,
    );
    if (href) router.replace(href);
  }, [selectedTicketId, data, allTickets, projectId, highlightCommentId, router]);

  const handleClearSearch = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("q");
    next.delete("status");
    next.delete("priority");
    next.delete("type");
    next.delete("assigneeId");
    next.delete("labels");
    next.delete("cycle");
    next.delete("sprint");
    next.delete("module");
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleOpenSaveView = useCallback(() => {
    setSaveViewName("");
    setSaveViewOpen(true);
  }, []);

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      const next = new URLSearchParams(searchParams.toString());
      next.delete("create");
      next.delete("cycleId");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    setSelectedIds(sel);
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    view,
    q,
    filterStatus,
    filterPriority,
    filterType,
    filterAssigneeId,
    filterLabels,
    filterCycle,
    filterSprint,
    filterModule,
    selectedTicketId,
    highlightCommentId,
    viewId,
    createParamOpen,
    createDefaultCycleId,
    activeView,
    displayOptions,
    setDisplayOptions,
    hideCompleted,
    setHideCompleted,
    workloadFilters,
    saveViewOpen,
    setSaveViewOpen,
    saveViewName,
    createView,
    selectedIds,
    ticketsLoading,
    allTickets,
    filteredTickets,
    statuses,
    members,
    wipLimits,
    doneCount,
    showEmptyFilterState,
    handleViewChange,
    handleClearSearch,
    handleClearView,
    handleCreateOpenChange,
    handleOpenSaveView,
    handleSaveViewNameChange,
    handleSaveView,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleTicketSelect,
    handleSelectionChange,
    handleClearSelection,
  };
}
