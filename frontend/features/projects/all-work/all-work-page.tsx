"use client";

import { useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { List, Table2, LayoutGrid } from "lucide-react";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { TableView } from "@/features/projects/views/table-view";
import { ListView } from "@/features/projects/views/list-view";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { AllWorkListSection } from "./all-work-list-section";
import { ProjectChip } from "./project-chip";
import { useAllWork } from "@/hooks/api/projects";
import { useProjects } from "@/hooks/api/projects";
import type { AllWorkFilters, AllWorkTicket } from "@/types/projects";
import type { KanbanTicket } from "@/features/projects/shared/types";
import { cn } from "@/lib/utils";

type AllWorkView = "list" | "table" | "board";

const VIEW_OPTIONS: { value: AllWorkView; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { value: "list", icon: List, label: "List" },
  { value: "table", icon: Table2, label: "Table" },
  { value: "board", icon: LayoutGrid, label: "Board" },
];

function parseView(raw: string | null): AllWorkView {
  if (raw === "table" || raw === "board") return raw;
  return "list";
}

function AllWorkSkeleton({ view }: { view: AllWorkView }) {
  if (view === "board") {
    return (
      <div className="flex gap-4 px-4 pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-64 flex-shrink-0 space-y-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: 3 }).map((__, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 px-4 pb-4">
      <Skeleton className="h-8 w-full rounded" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded" />
      ))}
    </div>
  );
}

function toKanbanTicket(t: AllWorkTicket): KanbanTicket {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority ?? undefined,
    points: t.points ?? undefined,
    ticketNumber: t.ticketNumber,
    order: t.order ?? undefined,
    epicId: t.epicId ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    sprintId: t.sprintId ?? undefined,
    cycleId: t.cycleId,
    dueDate: t.dueDate,
    startDate: t.startDate,
    sequenceId: t.sequenceId,
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
    labels: t.labels.map((l) => ({
      label: { id: l.id, name: l.name, color: l.color },
    })),
  };
}

function toTableTicket(t: AllWorkTicket) {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority,
    points: t.points,
    ticketNumber: t.ticketNumber,
    sequenceId: t.sequenceId,
    startDate: t.startDate,
    dueDate: t.dueDate,
    assigneeId: t.assigneeId,
    cycleId: t.cycleId,
    sprintId: t.sprintId,
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
    labels: t.labels.map((l) => ({
      label: { id: l.id, name: l.name, color: l.color },
    })),
  };
}

function groupByProject(tickets: AllWorkTicket[]) {
  const map = new Map<number, { projectId: number; projectKey: string; projectName: string; tickets: AllWorkTicket[] }>();
  for (const t of tickets) {
    const existing = map.get(t.projectId);
    if (existing) {
      existing.tickets.push(t);
    } else {
      map.set(t.projectId, {
        projectId: t.projectId,
        projectKey: t.projectKey,
        projectName: t.projectName,
        tickets: [t],
      });
    }
  }
  return Array.from(map.values());
}

interface AllWorkBoardByProjectProps {
  groups: ReturnType<typeof groupByProject>;
}

interface BoardProjectSectionProps {
  group: ReturnType<typeof groupByProject>[number];
}

function BoardProjectSection({ group }: BoardProjectSectionProps) {
  const router = useRouter();
  const kanbanTickets = useMemo(() => group.tickets.map(toKanbanTicket), [group.tickets]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      router.push(`/projects/${group.projectId}?ticket=${id}`);
    },
    [router, group.projectId]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ProjectChip
          projectId={group.projectId}
          projectKey={group.projectKey}
          projectName={group.projectName}
        />
        <span className="text-sm font-semibold text-foreground">{group.projectName}</span>
        <Badge variant="secondary" className="text-xs">{group.tickets.length}</Badge>
      </div>
      <KanbanBoard
        tickets={kanbanTickets}
        projectId={group.projectId}
        projectKey={group.projectKey}
        onTicketSelect={handleTicketSelect}
      />
    </div>
  );
}

function AllWorkBoardByProject({ groups }: AllWorkBoardByProjectProps) {
  return (
    <div className="flex flex-col gap-6 px-4 pb-4">
      {groups.map((group) => (
        <BoardProjectSection key={group.projectId} group={group} />
      ))}
    </div>
  );
}

interface PaginationFooterProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

function PaginationFooter({ page, limit, total, onPageChange }: PaginationFooterProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  function handlePrev() {
    if (page > 1) onPageChange(page - 1);
  }

  function handleNext() {
    if (page < totalPages) onPageChange(page + 1);
  }

  return (
    <div className="shrink-0 flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={page <= 1}
          onClick={handlePrev}
          aria-label="Previous page"
        >
          Prev
        </Button>
        <span className="tabular-nums">
          {page} / {totalPages || 1}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={page >= totalPages}
          onClick={handleNext}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function AllWorkViewSwitcher({
  activeView,
  onViewChange,
}: {
  activeView: AllWorkView;
  onViewChange: (v: AllWorkView) => void;
}) {
  function handleChange(value: string) {
    if (value === "list" || value === "table" || value === "board") {
      onViewChange(value);
    }
  }

  return (
    <Select value={activeView} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[110px] shrink-0 bg-card text-xs" aria-label="Select view">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VIEW_OPTIONS.map((v) => (
          <SelectItem key={v.value} value={v.value} className="text-xs">
            <span className="flex items-center gap-1.5">
              <v.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {v.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AllWorkPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const view = parseView(searchParams.get("view"));
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const scopeParam = searchParams.get("scope");
  const scopeMine = scopeParam === "mine";

  const setParam = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        if (key !== "page") params.delete("page");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const handleViewChange = useCallback(
    (v: AllWorkView) => {
      setParam("view", v);
    },
    [setParam]
  );

  const handleScopeToggle = useCallback(() => {
    setParam("scope", scopeMine ? "" : "mine");
  }, [scopeMine, setParam]);

  const handlePageChange = useCallback(
    (p: number) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(p));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const filters = useMemo<AllWorkFilters>(() => {
    const f: AllWorkFilters = {
      page,
      limit: 50,
    };
    const q = searchParams.get("q");
    if (q) f.search = q;
    const status = searchParams.get("status");
    if (status) f.status = status;
    const priority = searchParams.get("priority");
    if (priority) f.priority = priority;
    const type = searchParams.get("type");
    if (type) f.type = type;
    const assigneeId = searchParams.get("assigneeId");
    if (assigneeId) f.assigneeId = assigneeId;
    const labels = searchParams.get("labels");
    if (labels) f.labelIds = labels;
    const projectIds = searchParams.get("projectIds");
    if (projectIds) f.projectIds = projectIds;
    const dueDateFrom = searchParams.get("dueDateFrom");
    if (dueDateFrom) f.dueDateFrom = dueDateFrom;
    const dueDateTo = searchParams.get("dueDateTo");
    if (dueDateTo) f.dueDateTo = dueDateTo;
    if (scopeMine) f.scope = "mine";
    return f;
  }, [searchParams, page, scopeMine]);

  const { data: allWorkData, isLoading, isError, refetch } = useAllWork(filters);
  const { data: projectsData } = useProjects({ limit: 100 } as Record<string, unknown>);

  const tickets = allWorkData?.data ?? [];
  const total = allWorkData?.total ?? 0;
  const currentPage = allWorkData?.page ?? page;
  const limit = allWorkData?.limit ?? 50;

  const projectGroups = useMemo(() => groupByProject(tickets), [tickets]);

  const hasActiveFilters = useMemo(() => {
    const filterKeys = ["q", "status", "priority", "type", "assigneeId", "labels", "projectIds", "dueDateFrom", "dueDateTo"];
    return filterKeys.some((k) => !!searchParams.get(k)) || scopeMine;
  }, [searchParams, scopeMine]);

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams();
      const v = searchParams.get("view");
      if (v) params.set("view", v);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleTicketClickForTable = useCallback(
    (ticketId: number) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) {
        router.push(`/projects/${ticket.projectId}?ticket=${ticketId}`);
      }
    },
    [tickets, router]
  );

  const shouldReduceMotion = useReducedMotion();

  const allProjects = projectsData?.data ?? [];

  const subtitleText = isLoading
    ? "Loading..."
    : `${total} ticket${total === 1 ? "" : "s"}`;

  return (
    <PageWrapper
      title="All Work"
      subtitle={subtitleText}
      eyebrow="Projects"
      noInternalScroll
      contentClassName="!p-0"
      filters={
        <div className="flex min-h-8 w-full flex-wrap items-center gap-2 sm:gap-3">
          <AllWorkViewSwitcher activeView={view} onViewChange={handleViewChange} />

          <button
            type="button"
            onClick={handleScopeToggle}
            aria-label={scopeMine ? "Showing my tickets – click to show all" : "Show only my tickets"}
            title={scopeMine ? "Showing my tickets" : "Show only my tickets"}
            className={cn(
              "h-8 w-8 rounded-md border flex items-center justify-center shrink-0 transition-colors",
              scopeMine
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
          </button>

          <TicketFilterBar
            members={allProjects
              .flatMap((p) => p.members)
              .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
              .map((m) => ({
                id: m.id,
                name: null,
                firstName: m.firstName,
                lastName: m.lastName,
                image: m.image,
              }))}
            showTypeFilter
            showSprintFilter={false}
            showAssigneeFilter
          />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 overflow-auto">
            <AllWorkSkeleton view={view} />
          </div>
        ) : isError ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <ErrorState
              title="Failed to load work items"
              description="An error occurred while fetching tickets. Please try again."
              onRetry={handleRetry}
            />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              illustrationPreset="projects"
              title={hasActiveFilters ? "No tickets match your filters" : "No tickets yet"}
              description={
                hasActiveFilters
                  ? "Try adjusting or clearing your filters."
                  : "Start by creating a ticket in any project."
              }
              action={
                hasActiveFilters
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : { label: "All Projects", href: "/projects/all" }
              }
            />
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {view === "list" && (
                <motion.div
                  key="list-view"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="py-2"
                >
                  <AllWorkListSection groups={projectGroups} />
                </motion.div>
              )}

              {view === "table" && (
                <motion.div
                  key="table-view"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="px-4 pb-2 pt-0"
                >
                  <TableView
                    tickets={tickets.map(toTableTicket)}
                    onTicketClick={handleTicketClickForTable}
                  />
                </motion.div>
              )}

              {view === "board" && (
                <motion.div
                  key="board-view"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="h-full w-full"
                >
                  <AllWorkBoardByProject groups={projectGroups} />
                </motion.div>
              )}
            </div>

            <PaginationFooter
              page={currentPage}
              limit={limit}
              total={total}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
