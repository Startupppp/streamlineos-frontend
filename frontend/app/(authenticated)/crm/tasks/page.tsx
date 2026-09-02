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
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { type RecordValue } from "@/features/renderer";
import { useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { TASK_LAYOUT, taskRecordFields } from "@/lib/renderer/crm/task-layout";
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
import { useCalendarMemberLookup } from "@/hooks/api/calendar";
import { MyTasksPanel } from "@/features/crm/timeline/my-tasks-panel";
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

/**
 * The follow-up queue.
 *
 * No row is drawn here. The columns, the type and status badges, the urgency
 * verdict, the assignee's name and the mobile card all come from `TASK_LAYOUT`;
 * the buckets stay because they are the queue's own structure — a task list
 * sorted by date is a list, a task list split at "overdue" and "today" is a
 * plan — and each non-empty one holds its own `RecordList`.
 *
 * Two things the description deliberately does not carry ride beside it: the
 * tick that closes a task, in `leading`, because closing one is what this
 * screen is *for* and putting it behind a menu would put the point of the
 * screen last; and the edit/delete menu, in `actions`, because what a row can
 * do depends on the caller rather than on what a task is.
 */
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
  const [density, setDensity] = useDensity();

  const layout = useTenantLayout(TASK_LAYOUT);

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

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const trimmed = search.trim();
    if (trimmed) labels.push(`search "${trimmed}"`);
    if (typeFilter) labels.push(`type ${typeFilter.toLowerCase()}`);
    if (statusFilter) labels.push(`status ${statusFilter.toLowerCase()}`);
    if (entityTypeFilter) labels.push(`linked to ${entityTypeFilter.toLowerCase()}`);
    if (assigneeFilter) labels.push("a specific assignee");
    return labels;
  }, [search, typeFilter, statusFilter, entityTypeFilter, assigneeFilter]);

  const tasksFilters: TasksFilters = {
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    entityType: entityTypeFilter || undefined,
    assigneeId: assigneeFilter || undefined,
    limit: 100,
  };

  const { data, isLoading, isError, refetch } = useTasks(tasksFilters);
  const { data: members = [] } = useCalendarMemberLookup();

  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();

  const memberNames = useMemo(() => {
    const names = new Map<string, string | null>();
    for (const member of members) names.set(member.id, member.name);
    return names;
  }, [members]);

  /*
    A pending completion is folded into the projection rather than tracked by
    the row, so the tick, the status badge and the urgency verdict all move
    together the moment somebody closes a task.
  */
  const bucketRows = useMemo(() => {
    const allTasks = data?.tasks ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? allTasks.filter((task) => task.title.toLowerCase().includes(term))
      : allTasks;

    const groups: Record<TaskBucket, RecordValue[]> = {
      OVERDUE: [],
      TODAY: [],
      THIS_WEEK: [],
      UPCOMING: [],
      NO_DATE: [],
    };

    for (const task of filtered) {
      const status = optimisticCompletedIds.has(task.id) ? "completed" : task.status;
      groups[getTaskBucket(task.dueDate)].push(
        taskRecordFields(
          { ...task, status },
          task.assigneeId ? memberNames.get(task.assigneeId) : null,
        ),
      );
    }

    return groups;
  }, [data?.tasks, search, optimisticCompletedIds, memberNames]);

  const stats = useMemo(() => {
    const allTasks = data?.tasks ?? [];
    return {
      total: allTasks.length,
      overdue: bucketRows.OVERDUE.length,
      today: bucketRows.TODAY.length,
      thisWeek: bucketRows.THIS_WEEK.length,
      completed: allTasks.filter((task) => task.status === "completed").length,
    };
  }, [data?.tasks, bucketRows]);

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

  const handleEdit = useCallback(
    (taskId: number) => {
      const found = (data?.tasks ?? []).find((task) => task.id === taskId);
      if (found) setEditTask(found);
    },
    [data?.tasks],
  );
  const handleEditClose = useCallback((open: boolean) => {
    if (!open) setEditTask(null);
  }, []);
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleCreateOpen = useCallback(() => setCreateOpen(true), []);
  const handleCreateOpenChange = useCallback((open: boolean) => setCreateOpen(open), []);

  const hasAnyTasks = BUCKET_ORDER.some((bucket) => bucketRows[bucket].length > 0);

  return (
    <PageWrapper
      title="Tasks"
      subtitle="Follow-ups and action items"
      actions={
        <Button onClick={handleCreateOpen}>
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
          density={density}
          onDensityChange={setDensity}
          onClearFilters={handleClearFilters}
        />
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        {/* Tasks logged on a customer, deal or subject timeline — same rows, read by assignee. */}
        <MyTasksPanel />

        <StatCardGrid cols={5}>
          <StatCard label="Total" value={stats.total} icon={CheckSquare} tone="default" isLoading={isLoading} />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} tone="red" isLoading={isLoading} />
          <StatCard label="Due Today" value={stats.today} icon={Clock} tone="blue" isLoading={isLoading} />
          <StatCard label="This Week" value={stats.thisWeek} icon={CalendarDays} tone="amber" isLoading={isLoading} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCheck} tone="emerald" isLoading={isLoading} />
        </StatCardGrid>

        {isLoading ? (
          <DataTableSkeleton
            rows={12}
            columns={layout.list.columns.length + 2}
            className="flex-1"
          />
        ) : isError ? (
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
                const rows = bucketRows[bucket];
                if (rows.length === 0) return null;
                return (
                  <TaskBucketSection
                    key={bucket}
                    bucket={bucket}
                    layout={layout}
                    rows={rows}
                    density={density}
                    onComplete={handleComplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ) : activeFilterLabels.length > 0 ? (
          <EmptyState
            illustration={<EmptyTasksIllustration />}
            title="No tasks match these filters"
            description={`Filtering by ${activeFilterLabels.join(", ")}. Clear the filters to see every task.`}
            action={{ label: "Clear filters", onClick: handleClearFilters }}
            actionVariant="outline"
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <EmptyState
            illustration={<EmptyTasksIllustration />}
            title="No tasks yet"
            description="Tasks are the calls, emails and follow-ups you owe a lead, contact or deal. Create one to keep it out of your head."
            action={{ label: "Create task", onClick: handleCreateOpen }}
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
          <DataTableSkeleton
            rows={12}
            columns={TASK_LAYOUT.list.columns.length + 2}
            className="flex-1"
          />
        </PageWrapper>
      }
    >
      <CrmTasksContent />
    </Suspense>
  );
}
