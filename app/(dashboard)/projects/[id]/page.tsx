"use client";

import { useProject } from "@/lib/hooks/trpc-hooks";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { notFound } from "next/navigation";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { use, useState, useMemo } from "react";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Search, X, Bug, Bookmark, Zap, CheckSquare } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";


interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const { data, isLoading } = useProject(projectId);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterAssignees, setFilterAssignees] = useState<Set<string>>(new Set());

  const allTickets = useMemo(() => {
    if (!data) return [];
    return (data.tickets || []).map((t) => ({
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
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            firstName: t.assignee.firstName ?? undefined,
            lastName: t.assignee.lastName ?? undefined,
            image: t.assignee.image ?? null,
          }
        : null,
      labels: (t.labels || []).map((l) => ({
        label: {
          id: l.label.id,
          name: l.label.name,
          color: l.label.color,
        },
      })),
    }));
  }, [data]);

  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, { id: string; firstName?: string; lastName?: string; image?: string | null }>();
    allTickets.forEach(t => {
      if (t.assignee) map.set(t.assignee.id, t.assignee);
    });
    return Array.from(map.values());
  }, [allTickets]);

  const setHideCompletedAndStore = (value: boolean) => {
    setHideCompleted(value);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col w-full relative">
        <div className="flex-shrink-0 pl-6 pr-3 sm:pl-8 sm:pr-4 md:pl-12 md:pr-8 pt-6 sm:pt-8 md:pt-12 pb-4 mb-4 sm:mb-6 bg-background border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-5 w-72 mt-2" />
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 w-full relative" style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            className="h-full w-full"
            style={{
              overflowX: 'scroll',
              overflowY: 'hidden',
              scrollbarWidth: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
              msOverflowStyle: 'scrollbar',
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          >
            <div className="inline-flex h-full pb-4 gap-3 sm:gap-4 md:gap-4" style={{ minWidth: 'max-content', paddingLeft: '12px', paddingRight: '12px' }}>
              <KanbanBoardSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return notFound();

  const epics = allTickets.filter(t => t.type === "EPIC").map(t => ({ id: t.id, title: t.title }));

  const statuses = "statuses" in data
    ? (data.statuses as Array<{ id: number; name: string; color: string | null; order: number }>)
    : undefined;

  const doneCount = allTickets.filter((t) => t.status === "DONE").length;

  let boardTickets = hideCompleted
    ? allTickets.filter((t) => t.status !== "DONE")
    : allTickets;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    boardTickets = boardTickets.filter(t => t.title.toLowerCase().includes(q));
  }

  if (filterType) {
    boardTickets = boardTickets.filter(t => t.type === filterType);
  }

  if (filterAssignees.size > 0) {
    boardTickets = boardTickets.filter(t => t.assignee && filterAssignees.has(t.assignee.id));
  }

  const hasActiveFilters = searchQuery.trim() || filterType || filterAssignees.size > 0;
  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + (filterType ? 1 : 0) + filterAssignees.size;

  const toggleAssignee = (id: string) => {
    setFilterAssignees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType(null);
    setFilterAssignees(new Set());
  };

  const typeButtons = [
    { type: "TASK", icon: CheckSquare, label: "Task", color: "text-blue-500" },
    { type: "BUG", icon: Bug, label: "Bug", color: "text-red-500" },
    { type: "STORY", icon: Bookmark, label: "Story", color: "text-green-500" },
    { type: "EPIC", icon: Zap, label: "Epic", color: "text-purple-500" },
  ];

  return (
    <div className="h-full flex flex-col w-full relative">
      <div className="flex-shrink-0 pl-6 pr-3 sm:pl-8 sm:pr-4 md:pl-12 md:pr-8 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background sticky top-0 z-50 border-b shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words">{data.name}</h1>
              <div className="flex flex-shrink-0">
                <CreateTicketDialog projectId={projectId} />
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground break-words mt-1">{data.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap" role="search" aria-label="Filter tickets">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 w-40 pl-8 text-sm"
              aria-label="Search tickets"
            />
          </div>

          <div className="flex items-center gap-1">
            {typeButtons.map(({ type, icon: Icon, label, color }) => (
              <button
                key={type}
                onClick={() => setFilterType(filterType === type ? null : type)}
                aria-pressed={filterType === type}
                aria-label={`Filter by ${label}`}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border",
                  filterType === type
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("h-3 w-3", filterType === type ? "text-primary" : color)} />
                {label}
              </button>
            ))}
          </div>

          {uniqueAssignees.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              {uniqueAssignees.slice(0, 8).map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAssignee(a.id)}
                  aria-pressed={filterAssignees.has(a.id)}
                  aria-label={`Filter by ${a.firstName || ""} ${a.lastName || ""}`.trim()}
                  className={cn(
                    "rounded-full transition-all",
                    filterAssignees.has(a.id) ? "ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100"
                  )}
                  title={`${a.firstName || ""} ${a.lastName || ""}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={resolveImageUrl(a.image)} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {a.firstName?.[0]}{a.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
                Clear ({activeFilterCount})
              </button>
            )}
            {hasActiveFilters && (
              <span className="text-xs text-muted-foreground">
                {boardTickets.length} shown
              </span>
            )}
            <Switch
              id="hide-completed"
              checked={hideCompleted}
              onCheckedChange={setHideCompletedAndStore}
            />
            <Label htmlFor="hide-completed" className="text-xs font-normal cursor-pointer flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              Hide done
              {hideCompleted && doneCount > 0 && (
                <span className="text-muted-foreground">({doneCount})</span>
              )}
            </Label>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full relative" style={{ minWidth: 0, overflow: 'hidden' }}>
        <div
          className="h-full w-full kanban-scroll-container"
          style={{
            overflowX: 'scroll',
            overflowY: 'hidden',
            scrollbarWidth: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
            msOverflowStyle: 'scrollbar',
            position: 'relative',
            width: '100%',
            height: '100%'
          }}
        >
          <div className="inline-flex h-full pb-4 gap-3 sm:gap-4 md:gap-4" style={{ minWidth: 'max-content', paddingLeft: '24px', paddingRight: '12px' }}>
            <KanbanBoard
              tickets={boardTickets}
              projectId={projectId}
              statuses={statuses}
              epics={epics}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
