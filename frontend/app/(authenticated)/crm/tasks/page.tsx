"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckSquare,
  AlertCircle,
  Clock,
  CalendarDays,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  useTasks,
  useCompleteTask,
  useDeleteTask,
  type Task,
  type TaskBucket,
  type TaskType,
  type TaskStatus,
  type TaskEntityType,
  type TasksFilters,
} from "@/hooks/api/tasks";
import { useCalendarOrgMembers } from "@/hooks/api/calendar";
import { TaskBucketSection } from "@/features/crm/tasks/task-bucket-section";
import { CreateTaskDialog } from "@/features/crm/tasks/create-task-dialog";
import { TasksToolbar } from "@/features/crm/tasks/tasks-toolbar";

function getTaskBucket(dueDate: string | null): TaskBucket {
  if (!dueDate) return "NO_DATE";
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  if (due < today) return "OVERDUE";
  if (due >= today && due < tomorrow) return "TODAY";
  if (due <= endOfWeek) return "THIS_WEEK";
  return "UPCOMING";
}

const BUCKET_ORDER: TaskBucket[] = ["OVERDUE", "TODAY", "THIS_WEEK", "UPCOMING", "NO_DATE"];

function isTaskType(v: string): v is TaskType {
  const types: string[] = ["CALL", "EMAIL", "MEETING", "DEMO", "FOLLOW_UP", "REMINDER", "CUSTOM"];
  return types.includes(v);
}

function isTaskStatus(v: string): v is TaskStatus {
  const statuses: string[] = ["pending", "completed", "cancelled"];
  return statuses.includes(v);
}

function isTaskEntityType(v: string): v is TaskEntityType {
  const entityTypes: string[] = ["LEAD", "DEAL", "CONTACT", "PROJECT"];
  return entityTypes.includes(v);
}

function CrmTasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const typeRaw       = searchParams.get("type") ?? "";
  const statusRaw     = searchParams.get("status") ?? "";
  const entityTypeRaw = searchParams.get("entityType") ?? "";
  const assigneeFilter = searchParams.get("assigneeId") ?? "";

  const typeFilter       = isTaskType(typeRaw)       ? typeRaw       : "";
  const statusFilter     = isTaskStatus(statusRaw)   ? statusRaw     : "";
  const entityTypeFilter = isTaskEntityType(entityTypeRaw) ? entityTypeRaw : "";

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<number>>(new Set());

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/crm/tasks?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleTypeFilterChange = useCallback((v: string) => updateFilter("type", v), [updateFilter]);
  const handleStatusFilterChange = useCallback((v: string) => updateFilter("status", v), [updateFilter]);
  const handleEntityTypeFilterChange = useCallback((v: string) => updateFilter("entityType", v), [updateFilter]);
  const handleAssigneeFilterChange = useCallback((v: string) => updateFilter("assigneeId", v), [updateFilter]);
  const handleClearFilters = useCallback(() => {
    setSearch("");
    router.replace("/crm/tasks", { scroll: false });
  }, [router]);
  const handleSearchChange = useCallback((v: string) => setSearch(v), []);

  const tasksFilters: TasksFilters = {
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    entityType: entityTypeFilter || undefined,
    assigneeId: assigneeFilter || undefined,
    limit: 100,
  };

  const { data, isLoading, isError, refetch } = useTasks(tasksFilters);
  const { data: members = [] } = useCalendarOrgMembers();

  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();

  const groupedTasks = useMemo(() => {
    const allTasks = data?.tasks ?? [];
    const filtered = search
      ? allTasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
      : allTasks;

    const groups: Record<TaskBucket, Task[]> = {
      OVERDUE: [],
      TODAY: [],
      THIS_WEEK: [],
      UPCOMING: [],
      NO_DATE: [],
    };

    for (const task of filtered) {
      const bucket = getTaskBucket(task.dueDate);
      groups[bucket].push(task);
    }

    return groups;
  }, [data?.tasks, search]);

  const stats = useMemo(() => {
    const allTasks = data?.tasks ?? [];
    return {
      total: allTasks.length,
      overdue: groupedTasks.OVERDUE.length,
      today: groupedTasks.TODAY.length,
      thisWeek: groupedTasks.THIS_WEEK.length,
      completed: allTasks.filter((t) => t.status === "completed").length,
    };
  }, [data?.tasks, groupedTasks]);

  const handleComplete = useCallback(
    (taskId: number) => {
      setOptimisticCompletedIds((prev) => new Set(prev).add(taskId));
      completeTaskMutation.mutate(
        { taskId },
        {
          onSuccess: () => {
            toast.success("Task completed");
            setOptimisticCompletedIds((prev) => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
          },
          onError: (err) => {
            toast.error(getErrorMessage(err));
            setOptimisticCompletedIds((prev) => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
          },
        },
      );
    },
    [completeTaskMutation],
  );

  const handleDelete = useCallback(
    (taskId: number) => {
      deleteTaskMutation.mutate(taskId, {
        onSuccess: () => toast.success("Task deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteTaskMutation],
  );

  const handleEdit = useCallback((task: Task) => setEditTask(task), []);
  const handleEditClose = useCallback((open: boolean) => {
    if (!open) setEditTask(null);
  }, []);
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleCreateOpen = useCallback(() => setCreateOpen(true), []);
  const handleCreateOpenChange = useCallback((open: boolean) => setCreateOpen(open), []);

  const hasAnyTasks = BUCKET_ORDER.some((b) => groupedTasks[b].length > 0);

  if (isLoading) {
    return (
      <PageWrapper title="Tasks" subtitle="Follow-ups and action items">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <div className="divide-y divide-border/50">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1 max-w-xs" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Tasks"
      subtitle={data ? `${stats.total} tasks` : undefined}
      badge={data ? String(stats.total) : undefined}
      actions={
        <Button onClick={handleCreateOpen} size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          New Task
        </Button>
      }
      filters={
        <TasksToolbar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          entityTypeFilter={entityTypeFilter}
          onEntityTypeFilterChange={handleEntityTypeFilterChange}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={handleAssigneeFilterChange}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
          onClearFilters={handleClearFilters}
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGrid cols={5}>
          <StatCard label="Total" value={stats.total} icon={CheckSquare} tone="default" />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} tone="red" />
          <StatCard label="Due Today" value={stats.today} icon={Clock} tone="blue" />
          <StatCard label="This Week" value={stats.thisWeek} icon={CalendarDays} tone="amber" />
          <StatCard label="Completed" value={stats.completed} icon={CheckCheck} tone="emerald" />
        </StatCardGrid>

        {isError ? (
          <ErrorState
            title="Failed to load tasks"
            description="Could not load tasks. Please try again."
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : hasAnyTasks ? (
          <div className="space-y-3">
            <AnimatePresence>
              {BUCKET_ORDER.map((bucket) => {
                const tasks = groupedTasks[bucket];
                if (tasks.length === 0) return null;
                return (
                  <TaskBucketSection
                    key={bucket}
                    bucket={bucket}
                    tasks={tasks}
                    optimisticCompletedIds={optimisticCompletedIds}
                    onComplete={handleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            illustration={<EmptyTasksIllustration />}
            title="No tasks yet"
            description="Create your first task to track follow-ups and action items."
            action={{ label: "Create Task", onClick: handleCreateOpen }}
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <CreateTaskDialog open={createOpen} onOpenChange={handleCreateOpenChange} />
      <CreateTaskDialog open={!!editTask} onOpenChange={handleEditClose} task={editTask ?? undefined} />
    </PageWrapper>
  );
}

export default function CrmTasksPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper title="Tasks" subtitle="Follow-ups and action items">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] rounded-lg" />
            ))}
          </div>
        </PageWrapper>
      }
    >
      <CrmTasksContent />
    </Suspense>
  );
}
