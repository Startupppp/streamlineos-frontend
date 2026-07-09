"use client";

import { use, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useProject } from "@/hooks/api";
import { useViews, useCreateView } from "@/hooks/api/projects";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { ListView } from "@/features/projects/views/list-view";
import { TableView } from "@/features/projects/views/table-view";
import { CalendarView } from "@/features/projects/views/calendar-view";
import { GanttView } from "@/features/projects/views/gantt-view";
import { WorkloadView } from "@/features/projects/views/workload-view";
import {
  ViewSwitcher,
  type ViewType,
} from "@/features/projects/views/view-switcher";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { DisplayOptionsPanel, DEFAULT_DISPLAY_OPTIONS } from "@/features/projects/views/display-options-panel";
import type { DisplayOptions } from "@/features/projects/shared/types";
import { CreateTicketDialog } from "@/features/projects/tickets/create-ticket-dialog";
import { SaveViewDialog } from "@/features/projects/views/save-view-dialog";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Bookmark, X } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import type { KanbanTicket } from "@/features/projects/shared/types";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const view = (searchParams.get("view") as ViewType) ?? "board";
  const [hideCompleted, setHideCompleted] = useState(true);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(DEFAULT_DISPLAY_OPTIONS);

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

  const { data: views } = useViews(projectId);
  const createView = useCreateView();
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
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [viewId, views, searchParams, router]);

  const activeView = viewId ? views?.find((v) => v.id.toString() === viewId) : null;

  const handleClearView = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("viewId");
    appliedViewIdRef.current = null;
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSaveView = useCallback(() => {
    const name = saveViewName.trim();
    if (!name) return;
    const filters: Record<string, string> = {};
    if (q) filters.q = q;
    if (filterStatus) filters.status = filterStatus;
    if (filterPriority) filters.priority = filterPriority;
    if (filterType) filters.type = filterType;
    if (filterAssigneeId) filters.assigneeId = filterAssigneeId;
    createView.mutate(
      { projectId, name, filters, layoutType: view as "board" | "list" | "table" | "calendar" | "gantt" },
      {
        onSuccess: (created) => {
          toast.success("View saved");
          setSaveViewOpen(false);
          setSaveViewName("");
          if (created && typeof created === "object" && "id" in created && typeof (created as Record<string, unknown>).id === "number") {
            const next = new URLSearchParams(searchParams.toString());
            next.set("viewId", String((created as Record<string, number>).id));
            router.replace(`?${next.toString()}`, { scroll: false });
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [saveViewName, q, filterStatus, filterPriority, filterType, filterAssigneeId, view, projectId, createView, searchParams, router]);

  const handleViewChange = useCallback(
    (v: ViewType) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("view", v);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSaveViewNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSaveViewName(e.target.value),
    [],
  );

  const allTickets: KanbanTicket[] = useMemo(() => {
    if (!data) return [];
    return (data.tickets || []).map((t) => {
      const raw = t as typeof t & {
        cycleId?: number | null;
        cycle?: { id: number; name: string; status: string; startDate: string; endDate: string } | null;
      };
      return {
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
        cycleId: raw.cycleId ?? null,
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
          .filter((l) => !!l.label)
          .map((l) => ({
            label: {
              id: l.label!.id,
              name: l.label!.name,
              color: l.label!.color,
            },
          })),
        cycle: raw.cycle
          ? {
              id: raw.cycle.id,
              name: raw.cycle.name,
              status: raw.cycle.status,
              startDate: raw.cycle.startDate,
              endDate: raw.cycle.endDate,
            }
          : null,
      };
    });
  }, [data]);

  const filteredTickets = useMemo(() => {
    let tickets = hideCompleted
      ? allTickets.filter((t) => t.status !== "DONE")
      : allTickets;
    if (q) {
      const lower = q.toLowerCase();
      tickets = tickets.filter((t) => t.title.toLowerCase().includes(lower));
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
    return tickets;
  }, [allTickets, hideCompleted, q, filterStatus, filterPriority, filterType, filterAssigneeId, filterLabels, filterCycle]);

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

  const statuses =
    data && "statuses" in data
      ? (data.statuses as { id: number; name: string; color: string | null; order: number; wipLimit?: number | null; type?: string | null }[])
      : undefined;

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

  const doneCount = allTickets.filter((t) => t.status === "DONE").length;

  const handleExportCsv = useCallback(() => {
    exportToCsv(
      `${data?.key ?? "export"}-tickets.csv`,
      filteredTickets.map((t) => ({
        id: t.id,
        number: `#${t.ticketNumber}`,
        title: t.title,
        status: t.status,
        priority: t.priority ?? "",
        type: t.type ?? "",
        assignee: t.assigneeId ?? "",
        dueDate: t.dueDate ?? "",
      })),
    );
  }, [data?.key, filteredTickets]);

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
      contentClassName="!p-0"
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={
        <div className="flex min-h-8 w-full flex-wrap items-center gap-2 sm:gap-3">
          <ViewSwitcher activeView={view} onViewChange={handleViewChange} />
          <DisplayOptionsPanel options={displayOptions} onChange={setDisplayOptions} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportCsv}
            className="h-8 w-8 shrink-0 bg-card"
            aria-label="Export tickets"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSaveViewName("");
              setSaveViewOpen(true);
            }}
            className="h-8 w-8 shrink-0 bg-card"
            aria-label="Save view"
          >
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
          {activeView && (
            <Badge
              variant="secondary"
              className="h-6 shrink-0 cursor-default gap-1 bg-card pl-2 pr-1 text-xs font-normal"
            >
              View: {activeView.name}
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
          <TicketFilterBar
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
      {view === "board" && (
        <div className="h-full w-full px-3 pb-1">
          <KanbanBoard
            tickets={filteredTickets}
            projectId={projectId}
            projectKey={data.key}
            statuses={statuses}
            wipLimits={wipLimits}
            onTicketSelect={handleTicketSelect}
            displayOptions={displayOptions}
          />
        </div>
      )}
      {view === "list" && (
        <div className="h-full min-h-0 overflow-y-auto px-4 pb-2 pt-0">
          <ListView tickets={filteredTickets} onTicketClick={handleTicketSelect} groupBy={displayOptions.groupBy !== "none" ? displayOptions.groupBy : undefined} projectKey={data.key} projectStatuses={statuses} displayOptions={displayOptions} />
        </div>
      )}
      {view === "table" && (
        <div className="h-full min-h-0 overflow-y-auto px-4 pb-2 pt-0">
          <TableView tickets={filteredTickets} onTicketClick={handleTicketSelect} projectKey={data.key} projectStatuses={statuses} />
        </div>
      )}
      {view === "calendar" && (
        <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-2 pt-0">
          <CalendarView tickets={filteredTickets} onTicketClick={handleTicketSelect} />
        </div>
      )}
      {view === "gantt" && (
        <div className="h-full min-h-0 flex flex-col overflow-hidden px-4 pb-2 pt-0">
          <GanttView tickets={filteredTickets} projectId={projectId} onTicketClick={handleTicketSelect} />
        </div>
      )}
      {view === "workload" && (
        <div className="h-full min-h-0 flex flex-col overflow-hidden px-4 pb-2 pt-0">
          <WorkloadView tickets={filteredTickets} projectId={projectId} members={members} />
        </div>
      )}

      <SaveViewDialog
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        viewName={saveViewName}
        onViewNameChange={handleSaveViewNameChange}
        onSave={handleSaveView}
        isSaving={createView.isPending}
        activeLayout={view}
      />
    </PageWrapper>
  );
}
