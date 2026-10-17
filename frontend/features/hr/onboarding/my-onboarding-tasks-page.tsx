"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { EmptyTasksIllustration } from "@/components/illustrations";
import { OnboardingProgressRing } from "@/components/hr/onboarding-progress-ring";
import { OnboardingTaskCard } from "@/components/hr/onboarding-task-card";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import {
  useCompleteOnboardingTask,
  useMyOnboarding,
} from "@/hooks/api/hr/onboarding";
import { getErrorMessage } from "@/lib/get-error-message";

function AllDoneBanner() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-status-success-rule bg-status-success-surface px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success-surface">
        <PartyPopper className="h-6 w-6 text-status-success-ink" />
      </div>
      <div>
        <p className="text-lg font-semibold text-status-success-ink">
          You have completed all onboarding tasks!
        </p>
        <p className="mt-1 text-sm text-status-success-ink">
          Welcome aboard - you are all set. Check back here if HR assigns new tasks.
        </p>
      </div>
      <CheckCircle2
        className="h-5 w-5 text-status-success-ink"
        aria-hidden="true"
      />
    </div>
  );
}

export function MyOnboardingTasksPage() {
  const canManageOnboarding = useCan("hr:onboarding:manage");
  const {
    data: onboardingTasks,
    error: onboardingError,
    isLoading,
    isError,
    refetch,
  } = useMyOnboarding();
  const pageState = usePageState({
    permission: "self:onboarding-tasks",
    isLoading,
    isError,
    error: onboardingError,
    isEmpty: (onboardingTasks?.length ?? 0) === 0,
  });

  function handleRetry() {
    void refetch();
  }
  const completeTask = useCompleteOnboardingTask();
  const [togglingTaskIds, setTogglingTaskIds] = useState<Set<number>>(
    new Set(),
  );

  const totalTasks = onboardingTasks?.length ?? 0;
  const completedTasks =
    onboardingTasks?.filter((task) => task.status === "COMPLETED").length ?? 0;
  const percentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const allDone = totalTasks > 0 && completedTasks === totalTasks;

  const previouslyAllDone = useRef(false);
  useEffect(() => {
    if (allDone && !previouslyAllDone.current) {
      toast.success("Congratulations! All onboarding tasks complete!", {
        description: "You are fully onboarded. Welcome to the team!",
        duration: 6000,
      });
    }
    previouslyAllDone.current = allDone;
  }, [allDone]);

  const handleTaskToggle = useCallback(
    (taskId: number, nextStatus: "COMPLETED" | "PENDING") => {
      setTogglingTaskIds((currentTaskIds) =>
        new Set(currentTaskIds).add(taskId),
      );
      completeTask.mutate(
        { taskId, status: nextStatus },
        {
          onSettled: () => {
            setTogglingTaskIds((currentTaskIds) => {
              const nextTaskIds = new Set(currentTaskIds);
              nextTaskIds.delete(taskId);
              return nextTaskIds;
            });
          },
          onError: (mutationError) => {
            toast.error(getErrorMessage(mutationError));
          },
        },
      );
    },
    [completeTask],
  );

  const sortedTasks = onboardingTasks
    ? [
        ...onboardingTasks.filter((task) => task.status !== "COMPLETED"),
        ...onboardingTasks.filter((task) => task.status === "COMPLETED"),
      ]
    : [];

  return (
    <PageWrapper
      title="My Onboarding"
      subtitle="Complete these tasks to finish your onboarding journey"
      actions={
        canManageOnboarding ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/onboarding">All Onboarding</Link>
          </Button>
        ) : undefined
      }
    >
      <PageState
        resolution={pageState}
        onRetry={handleRetry}
        loading={
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, skeletonIndex) => (
                <Skeleton key={skeletonIndex} className="h-16" />
              ))}
            </div>
          </div>
        }
        empty={
          <EmptyState
            illustration={<EmptyTasksIllustration className="h-40 w-40" />}
            title="No onboarding tasks yet"
            description="Your HR team hasn't set up any tasks for you. Check back soon."
          />
        }
      >
        <div className="space-y-4 max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex flex-col items-center gap-2 pb-1 pt-2">
            <OnboardingProgressRing
              percentage={percentage}
              size={128}
              strokeWidth={11}
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {completedTasks}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalTasks}
              </span>{" "}
              tasks completed
            </p>
          </div>

          {allDone ? <AllDoneBanner /> : null}

          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <OnboardingTaskCard
                key={task.id}
                task={task}
                onToggle={handleTaskToggle}
                isToggling={
                  completeTask.isPending && togglingTaskIds.has(task.id)
                }
              />
            ))}
          </div>
        </div>
      </PageState>
    </PageWrapper>
  );
}
