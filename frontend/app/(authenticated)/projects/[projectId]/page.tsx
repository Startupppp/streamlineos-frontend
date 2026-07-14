"use client";

import { use, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useProject, useSprints, useBulkUpdateTickets } from "@/hooks/api";
import type { BulkUpdateTicketsInput } from "@/hooks/api";
import { useViews, useCreateView, useProjectBoardTickets } from "@/hooks/api/projects";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { ListView } from "@/features/projects/views/list-view";
import { TableView } from "@/features/projects/views/table-view";
import { CalendarView } from "@/features/projects/views/calendar-view";
import { GanttView } from "@/features/projects/views/gantt-view";
import { WorkloadView } from "@/features/projects/views/workload-view";
import {
  ViewSwitcher,
  parseViewType,
  type ViewType,
} from "@/features/projects/views/view-switcher";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { DisplayOptionsPanel } from "@/features/projects/views/display-options-panel";
import { hydrateDisplayOptions, useDisplayOptions } from "@/features/projects/views/use-display-options";
import { CreateTicketDialog } from "@/features/projects/tickets/create-ticket-dialog";
import { SaveViewDialog, type SaveViewMeta } from "@/features/projects/views/save-view-dialog";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadIcon } from "@animateicons/react/lucide";
import { Bookmark, X, Download, SearchX } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import type { KanbanTicket } from "@/features/projects/shared/types";
import {
  filterHiddenCompletedTickets,
  getCompletedStatusNames,
} from "@/features/projects/shared/completed-status";
import { useExportTickets } from "@/hooks/api/projects/import-export";
import { ImportTicketsDialog } from "@/features/projects/tickets/import-tickets-dialog";
import { BulkActionBar } from "@/features/projects/backlog/bulk-action-bar";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { IconHandle } from "@animateicons/react";
import {
  pmSnappy,
  viewSwap,
  viewSwapReduced,
} from "@/features/projects/shared/pm-motion";
import { PM_PANEL, PM_TOOLBAR } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

type AnimatedToolbarIcon = React.ForwardRefExoticComponent<
  { size?: number } & React.RefAttributes<IconHandle>
>;

interface AnimatedToolbarIconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  Icon: AnimatedToolbarIcon;
}

function AnimatedToolbarIconButton({ onClick, ariaLabel, Icon }: AnimatedToolbarIconButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className="h-8 w-8 shrink-0 border-border/70 bg-background/60 backdrop-blur-sm"
      aria-label={ariaLabel}
      {...hoverHandlers}
    >
      <Icon ref={iconRef} size={14} />
    </Button>
  );
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading: projectLoading } = useProject(projectId);
  const { data: boardTickets, isLoading: ticketsLoading } = useProjectBoardTickets(projectId);
  const { data: sprints } = useSprints(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);
  const isLoading = projectLoading || ticketsLoading;
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const viewVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;

  const view = parseViewType(searchParams.get("view"));
  const [hideCompleted, setHideCompleted] = useState(true);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [displayOptions, setDisplayOptions] = useDisplayOptions(projectId);

  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

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

  const { data: views } = useViews(projectId);
  const createView = useCreateView();
  const exportQuery = useExportTickets(projectId);
  const appliedViewIdRef = useRef<string | null>(null);

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

  const handleClearView = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("viewId");
    appliedViewIdRef.current = null;
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSaveView = useCallback((meta?: SaveViewMeta) => {
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
          if (created && typeof created === "object" && "id" in created && typeof created.id === "number") {
            const next = new URLSearchParams(searchParams.toString());
            next.set("viewId", String(created.id));
            router.replace(`?${next.toString()}`, { scroll: false });
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [saveViewName, q, filterStatus, filterPriority, filterType, filterAssigneeId, filterLabels, filterCycle, view, projectId, createView, searchParams, router]);

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
    (e: React.ChangeEvent<HTMLInputElement>) => setSaveViewName(e.target.value),
    [],
  );

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
      order: t.order ?? undefined,
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
      ? (data.statuses as { id: number; name: string; color: string | null; order: number; wipLimit?: number | null; type?: string | null }[])
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
        const ticketKey = data?.key && t.ticketNumber != null
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
        assigneeSet.has("__unassigned__") ? !t.assigneeId : t.assigneeId != null && assigneeSet.has(t.assigneeId)
      );
    }
    if (filterLabels) {
      const labelIds = new Set(filterLabels.split(",").filter(Boolean).map(Number));
      tickets = tickets.filter((t) =>
        (t.labels ?? []).some((l) => l.label && labelIds.has(l.label.id))
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

  const wipLimits = useMemo<Record<string, number>>(() => {
    if (!statuses) return {};
    const result: Record<string, number> = {};
    for (const s of statuses) {
      if (s.wipLimit != null) result[s.name] = s.wipLimit;
    }
    return result;
  }, [statuses]);

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

  const doneCount = useMemo(() => {
    const completedStatuses = getCompletedStatusNames(statuses);
    return allTickets.filter((t) => completedStatuses.has(t.status)).length;
  }, [allTickets, statuses]);

  const hasActiveFilters = !!(q || filterStatus || filterPriority || filterType || filterAssigneeId || filterLabels || filterCycle || filterSprint || filterModule);
  const showEmptyFilterState = hasActiveFilters && filteredTickets.length === 0 && allTickets.length > 0;

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

  const handleBulkUpdate = useCallback(
    (update: Partial<Pick<BulkUpdateTicketsInput, "assigneeId" | "status" | "sprintId" | "priority">>) => {
      if (selectedIds.size === 0) {
        toast.error("No tickets selected");
        return;
      }
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), ...update },
        {
          onSuccess: (d) => {
            toast.success(`${d.updated} ticket${d.updated !== 1 ? "s" : ""} updated`);
            setSelectedIds(new Set());
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [selectedIds, bulkUpdate],
  );

  const handleBulkStatus = useCallback((v: string) => handleBulkUpdate({ status: v }), [handleBulkUpdate]);
  const handleBulkPriority = useCallback(
    (v: string) => {
      if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "URGENT") {
        handleBulkUpdate({ priority: v });
      }
    },
    [handleBulkUpdate],
  );
  const handleBulkAssignee = useCallback((v: string) => handleBulkUpdate({ assigneeId: v }), [handleBulkUpdate]);
  const handleBulkSprint = useCallback(
    (v: string) => handleBulkUpdate({ sprintId: v === "backlog" ? null : Number(v) }),
    [handleBulkUpdate],
  );
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    setSelectedIds(sel);
  }, []);

  const handleExportCurrentView = useCallback(() => {
    if (filteredTickets.length === 0) {
      toast.info("No tickets to export");
      return;
    }
    exportToCsv(
      `${data?.key ?? "export"}-filtered-tickets.csv`,
      filteredTickets.map((t) => ({
        number: t.ticketNumber,
        title: t.title,
        type: t.type,
        status: t.status,
        priority: t.priority ?? "",
        points: t.points ?? "",
        dueDate: t.dueDate ?? "",
        assignee: t.assignee ? getUserDisplayName(t.assignee) : "",
      })),
    );
    toast.success("Exported current view");
  }, [filteredTickets, data?.key]);

  const handleExportAllTickets = useCallback(() => {
    exportQuery.refetch().then(({ data: rows }) => {
      if (!rows || rows.length === 0) {
        toast.info("No tickets to export");
        return;
      }
      exportToCsv(
        `${data?.key ?? "export"}-all-tickets.csv`,
        rows.map((r) => ({
          number: r.number,
          title: r.title,
          type: r.type,
          status: r.status,
          priority: r.priority,
          points: r.points ?? "",
          dueDate: r.dueDate ?? "",
          assignee: r.assignee ?? "",
        })),
      );
    }).catch((err: unknown) => toast.error(getErrorMessage(err)));
  }, [exportQuery, data?.key]);

  const handleOpenImport = useCallback(() => setImportOpen(true), []);

  const createParamOpen = searchParams.get("create") === "1";
  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      const next = new URLSearchParams(searchParams.toString());
      next.delete("create");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title={data.name}
      subtitle={data.description ?? undefined}
      noInternalScroll
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
        <div className={cn(PM_TOOLBAR)}>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
            <ViewSwitcher activeView={view} onViewChange={handleViewChange} />
            <DisplayOptionsPanel viewType={view} options={displayOptions} onChange={setDisplayOptions} />
            <div className="flex items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 border-border/70 bg-background/60 backdrop-blur-sm"
                    aria-label="Export tickets"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={handleExportCurrentView}>
                    Export current view
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportAllTickets}>
                    Export all tickets
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AnimatedToolbarIconButton
                onClick={handleOpenImport}
                ariaLabel="Import tickets"
                Icon={UploadIcon}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSaveViewName("");
                  setSaveViewOpen(true);
                }}
                className="h-8 w-8 shrink-0 border-border/70 bg-background/60 backdrop-blur-sm"
                aria-label="Save view"
              >
                <Bookmark className="h-3.5 w-3.5" />
              </Button>
            </div>
            {activeView && (
              <Badge
                variant="secondary"
                className="h-6 max-w-[12rem] shrink-0 cursor-default gap-1 bg-background/60 pl-2 pr-1 text-xs font-normal backdrop-blur-sm"
              >
                <span className="min-w-0 truncate">View: {activeView.name}</span>
                <button
                  type="button"
                  onClick={handleClearView}
                  aria-label="Clear view"
                  className="ml-0.5 rounded-sm transition-colors hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
          <TicketFilterBar
            className="w-full sm:min-w-0 sm:max-w-xl sm:flex-1"
            align="end"
            members={members}
            statuses={statuses}
            projectId={projectId}
            showSprintFilter={false}
            showDoneToggle
            hideCompleted={hideCompleted}
            onHideCompletedChange={setHideCompleted}
            doneCount={doneCount}
          />
        </div>
      }
    >
      {showEmptyFilterState ? (
        <div className="relative flex h-full flex-1 flex-col items-center justify-center px-4 py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-6 right-1/4 h-36 w-36 rounded-full bg-primary/[0.06] blur-3xl"
          />
          <div
            className={cn(
              PM_PANEL,
              "relative flex w-full max-w-sm flex-col items-center gap-3 px-6 py-8 text-center",
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/[0.06] shadow-sm">
              <SearchX className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No tickets match your filters</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Try adjusting your search or filters to find what you&apos;re looking for.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearSearch}
              className="mt-0.5 h-8 border-border/70 bg-background/60 text-xs backdrop-blur-sm"
            >
              Clear all filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {view === "board" ? (
              <motion.div
                key="board"
                className="flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-1"
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
              >
                <KanbanBoard
                  tickets={filteredTickets}
                  projectId={projectId}
                  projectKey={data.key}
                  statuses={statuses}
                  wipLimits={wipLimits}
                  onTicketSelect={handleTicketSelect}
                  displayOptions={displayOptions}
                  hideCompleted={hideCompleted}
                />
              </motion.div>
            ) : null}
            {view === "list" ? (
              <motion.div
                key="list"
                className="min-h-0 flex-1 overflow-y-auto px-3 pb-1"
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
              >
                <ListView
                  tickets={filteredTickets}
                  onTicketClick={handleTicketSelect}
                  groupBy={displayOptions.groupBy !== "none" ? displayOptions.groupBy : undefined}
                  rowBy={displayOptions.rowBy !== "none" ? displayOptions.rowBy : undefined}
                  projectKey={data.key}
                  projectStatuses={statuses}
                  displayOptions={displayOptions}
                  showEmptyColumns={displayOptions.showEmptyColumns}
                  showEmptyRows={displayOptions.showEmptyRows}
                  projectId={projectId}
                />
              </motion.div>
            ) : null}
            {view === "table" ? (
              <motion.div
                key="table"
                className="min-h-0 flex-1 overflow-y-auto px-3 pb-1"
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
              >
                {selectedIds.size > 0 && (
                  <BulkActionBar
                    selectedCount={selectedIds.size}
                    members={members}
                    sprints={sprints ?? []}
                    onBulkStatus={handleBulkStatus}
                    onBulkPriority={handleBulkPriority}
                    onBulkAssignee={handleBulkAssignee}
                    onBulkSprint={handleBulkSprint}
                    onClear={handleClearSelection}
                  />
                )}
                <TableView
                  tickets={filteredTickets}
                  onTicketClick={handleTicketSelect}
                  projectKey={data.key}
                  projectId={projectId}
                  projectStatuses={statuses}
                  selection={{ selected: selectedIds, onChange: handleSelectionChange }}
                />
              </motion.div>
            ) : null}
            {view === "calendar" ? (
              <motion.div
                key="calendar"
                className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-0"
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
              >
                <CalendarView
                  tickets={filteredTickets}
                  onTicketClick={handleTicketSelect}
                  projectId={projectId}
                  projectStatuses={statuses}
                />
              </motion.div>
            ) : null}
            {view === "gantt" ? (
              <motion.div
                key="gantt"
                className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-0"
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
              >
                <GanttView
                  tickets={filteredTickets}
                  projectId={projectId}
                  onTicketClick={handleTicketSelect}
                />
              </motion.div>
            ) : null}
            {view === "workload" ? (
              <motion.div
                key="workload"
                className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-0"
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
              >
                <WorkloadView
                  tickets={filteredTickets}
                  projectId={projectId}
                  projectKey={data.key}
                  members={members}
                  projectStatuses={statuses}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      <SaveViewDialog
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        viewName={saveViewName}
        onViewNameChange={handleSaveViewNameChange}
        onSave={handleSaveView}
        onSaveWithMeta={handleSaveView}
        displayOptions={{ ...displayOptions }}
        isSaving={createView.isPending}
        activeLayout={view}
      />
      <ImportTicketsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        projectId={projectId}
      />
    </PageWrapper>
  );
}
