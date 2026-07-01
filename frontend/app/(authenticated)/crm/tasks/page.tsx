"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
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

export default function CrmTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const typeFilter = searchParams.get("type") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const entityTypeFilter = searchParams.get("entityType") ?? "";
  const assigneeFilter = searchParams.get("assigneeId") ?? "";

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
    type: (typeFilter as TaskType) || undefined,
    status: (statusFilter as TaskStatus) || undefined,
    entityType: (entityTypeFilter as TaskEntityType) || undefined,
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
            toast.error(err.message || "Failed to complete task");
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
        onError: (err) => toast.error(err.message || "Failed to delete task"),
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

  const statCards = [
    { label: "Total", value: stats.total, color: "text-foreground" },
    { label: "Overdue", value: stats.overdue, color: "text-red-600" },
    { label: "Due Today", value: stats.today, color: "text-blue-600" },
    { label: "This Week", value: stats.thisWeek, color: "text-amber-600" },
    { label: "Completed", value: stats.completed, color: "text-green-600" },
  ];

  const hasAnyTasks = BUCKET_ORDER.some((b) => groupedTasks[b].length > 0);

  if (isLoading) {
    return (
      <PageWrapper
        title="Tasks"
        subtitle="Follow-ups and action items across your pipeline"
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/60 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <div className="divide-y divide-border/50">
                {Array.from({ length: 3 }).map((_, j) => (
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
      subtitle="Follow-ups and action items across your pipeline"
      badge={data ? String(stats.total) : undefined}
      actions={
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleCreateOpen}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </motion.div>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm p-3"
          >
            <p className={cn("text-xl font-bold tabular-nums", stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">Failed to load tasks</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
            Retry
          </Button>
        </div>
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
        <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] rounded-xl border border-dashed border-border/60 bg-muted/20 py-16">
          <CheckSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-[0.9375rem] font-semibold text-foreground mb-1">No tasks yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs text-center">
            Create your first task to track follow-ups and action items.
          </p>
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleCreateOpen}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </motion.div>
        </div>
      )}

      <CreateTaskDialog open={createOpen} onOpenChange={handleCreateOpenChange} />
      <CreateTaskDialog open={!!editTask} onOpenChange={handleEditClose} task={editTask ?? undefined} />
    </PageWrapper>
  );
}
