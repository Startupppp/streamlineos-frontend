"use client";

import { use, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, AlertCircle, CheckCheck, ListTodo, Timer } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

import {
  useUserOnboarding,
  useCompleteOnboardingTask,
  useOnboardingStatus,
  type OnboardingTask,
} from "@/hooks/api/hr/onboarding";
import { getErrorMessage } from "@/lib/get-error-message";

function ownerRoleVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "NEW_HIRE":
      return "default";
    case "HR":
      return "secondary";
    default:
      return "outline";
  }
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "COMPLETED") return false;
  return new Date(dueDate).getTime() < Date.now();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TaskCard({
  task,
  isPending,
  onToggle,
}: {
  task: OnboardingTask;
  isPending: boolean;
  onToggle: (taskId: number, currentStatus: string) => void;
}) {
  const done = task.status === "COMPLETED";
  const overdue = isOverdue(task.dueDate, task.status);

  const handleClick = useCallback(() => {
    onToggle(task.id, task.status);
  }, [task.id, task.status, onToggle]);

  return (
    <Card className={done ? "opacity-70" : undefined}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {task.canComplete ? (
            <button
              type="button"
              onClick={handleClick}
              disabled={isPending}
              aria-label={done ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as complete`}
              className="mt-0.5 shrink-0 transition-opacity hover:opacity-75 disabled:opacity-50"
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span
              className="mt-0.5 shrink-0 text-muted-foreground"
              aria-label={done ? "Completed" : `Assigned to ${task.ownerRole.replace("_", " ")}`}
              role="img"
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
              <Badge variant={ownerRoleVariant(task.ownerRole)} className="text-[9px] py-0 h-4 shrink-0">
                {task.ownerRole.replace("_", " ")}
              </Badge>
              {overdue && (
                <Badge variant="destructive" className="text-[9px] py-0 h-4 shrink-0">
                  Overdue
                </Badge>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground">{task.description}</p>
            )}

            <div className="flex items-center gap-3 mt-1">
              {task.dueDate && (
                <span className="flex items-center gap-1 text-dense text-muted-foreground">
                  {overdue ? (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  Due {formatDate(task.dueDate)}
                </span>
              )}
              {done && task.completedAt && (
                <span className="text-dense text-green-600 dark:text-green-300">
                  Completed {formatDate(task.completedAt)}
                </span>
              )}
            </div>
          </div>

          {task.canComplete && (
            <LoadingButton
              size="sm"
              variant={done ? "outline" : "default"}
              className="shrink-0 h-7 text-xs"
              isPending={isPending}
              onClick={handleClick}
            >
              {done ? "Mark Pending" : "Mark Complete"}
            </LoadingButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

export default function UserOnboardingPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useUserOnboarding(userId);

  const {
    data: statuses,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useOnboardingStatus();

  const completeTask = useCompleteOnboardingTask();

  const handleToggle = useCallback(
    (taskId: number, currentStatus: string) => {
      const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
      completeTask.mutate(
        { taskId, status: newStatus },
        {
          onSuccess: () =>
            toast.success(newStatus === "COMPLETED" ? "Task marked complete" : "Task marked pending"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [completeTask]
  );

  const handleRetry = useCallback(() => {
    void refetchTasks();
    void refetchStatus();
  }, [refetchTasks, refetchStatus]);

  const isLoading = tasksLoading || statusLoading;
  const isError = tasksError || statusError;

  const employeeStatus = statuses?.find((s) => s.userId === userId);
  const employeeName = employeeStatus?.userName ?? "Employee";

  const taskList = tasks ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedTasks = taskList.filter((t) => t.status === "COMPLETED");
  const pendingTasks = taskList.filter((t) => t.status !== "COMPLETED");
  const overdueTasks = pendingTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < today.getTime()
  );

  const total = taskList.length;
  const completedCount = completedTasks.length;
  const pendingCount = pendingTasks.length;
  const overdueCount = overdueTasks.length;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <PageWrapper
      title={`${employeeName} — Onboarding`}
      subtitle="Track and manage onboarding tasks for this employee."
      backHref="/hr/onboarding"
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load onboarding data. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      ) : taskList.length === 0 ? (
        <EmptyState
          illustration={<EmptyTasksIllustration className="h-24 w-24" />}
          title="No tasks yet"
          description="Onboarding hasn't been initiated for this employee yet."
          compact
        />
      ) : (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{percent}% complete</span>
              <span className="text-muted-foreground">
                {completedCount} of {total} tasks
              </span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>

          <StatCardGrid cols={4}>
            <StatCard label="Total" value={total} icon={ListTodo} />
            <StatCard label="Completed" value={completedCount} icon={CheckCheck} tone="emerald" />
            <StatCard label="Pending" value={pendingCount} icon={Timer} tone="amber" />
            <StatCard label="Overdue" value={overdueCount} icon={AlertCircle} tone="red" />
          </StatCardGrid>

          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pending ({pendingCount})
              </h3>
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isPending={completeTask.isPending}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Completed ({completedCount})
              </h3>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isPending={completeTask.isPending}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
