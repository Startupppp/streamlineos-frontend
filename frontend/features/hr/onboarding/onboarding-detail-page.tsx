"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { AlertCircle, CheckCheck, ListTodo, Timer } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

import {
  useUserOnboarding,
  useCompleteOnboardingTask,
  useOnboardingStatus,
} from "@/hooks/api/hr/onboarding";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { OnboardingTaskCard } from "@/features/hr/onboarding/onboarding-task-card";

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

interface OnboardingDetailPageProps {
  userId: string;
}

export function OnboardingDetailPage({ userId }: OnboardingDetailPageProps) {

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorValue,
    refetch: refetchTasks,
  } = useUserOnboarding(userId);

  const {
    data: statuses,
    isLoading: statusLoading,
    isError: statusError,
    error: statusErrorValue,
    refetch: refetchStatus,
  } = useOnboardingStatus();

  const completeTask = useCompleteOnboardingTask();
  const [togglingTaskIds, setTogglingTaskIds] = useState<Set<number>>(new Set());

  const handleToggle = useCallback(
    (taskId: number, currentStatus: string) => {
      const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
      setTogglingTaskIds((currentTaskIds) => new Set(currentTaskIds).add(taskId));
      completeTask.mutate(
        { taskId, status: newStatus },
        {
          onSettled: () =>
            setTogglingTaskIds((currentTaskIds) => {
              const nextTaskIds = new Set(currentTaskIds);
              nextTaskIds.delete(taskId);
              return nextTaskIds;
            }),
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
  const pageState = usePageState({
    permission: "hr:onboarding:tasks:view",
    isLoading,
    isError,
    error: tasksErrorValue ?? statusErrorValue,
    isEmpty: (tasks ?? []).length === 0,
  });

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
      <PageState
        resolution={pageState}
        onRetry={handleRetry}
        className="flex-1"
        loading={<LoadingSkeleton />}
        empty={
          <EmptyState
            illustration={<EmptyTasksIllustration className="h-24 w-24" />}
            title="No tasks yet"
            description="Onboarding hasn't been initiated for this employee yet."
            compact
          />
        }
      >
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
                  <OnboardingTaskCard
                    key={task.id}
                    task={task}
                    isPending={togglingTaskIds.has(task.id)}
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
                  <OnboardingTaskCard
                    key={task.id}
                    task={task}
                    isPending={togglingTaskIds.has(task.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PageState>
    </PageWrapper>
  );
}
