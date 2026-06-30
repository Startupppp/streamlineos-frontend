"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Clock, Link2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  useUpdateSchedule,
  useDeleteSchedule,
  type WorkflowSchedule,
} from "@/hooks/api/workflows";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function useAllSchedules() {
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "all-schedules"],
    queryFn: () => apiClient.get<WorkflowSchedule[]>("/workflows/schedules"),
    staleTime: 30_000,
  });
}

function CronBadge({ cron }: { cron: string }) {
  return (
    <code className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono border border-slate-200">
      {cron}
    </code>
  );
}

interface ScheduleRowProps {
  schedule: WorkflowSchedule;
  onToggle: (s: WorkflowSchedule) => void;
  onDelete: (s: WorkflowSchedule) => void;
  isToggling: boolean;
}

function ScheduleRow({ schedule, onToggle, onDelete, isToggling }: ScheduleRowProps) {
  function handleToggle() {
    onToggle(schedule);
  }

  function handleDelete() {
    onDelete(schedule);
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            schedule.isEnabled ? "bg-violet-50" : "bg-slate-50",
          )}>
            <Clock className={cn("h-4 w-4", schedule.isEnabled ? "text-violet-600" : "text-slate-400")} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Link
                href={`/workflows/${schedule.workflowId}`}
                className="text-sm font-semibold text-foreground hover:text-violet-600 transition-colors inline-flex items-center gap-1"
              >
                {schedule.workflowId.slice(0, 8)}…
                <Link2 className="h-3 w-3" />
              </Link>
              <CronBadge cron={schedule.cronExpression} />
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                schedule.isEnabled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500",
              )}>
                {schedule.isEnabled ? "Active" : "Paused"}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>TZ: {schedule.timezone}</span>
              {schedule.nextRunAt && (
                <span>Next: {format(new Date(schedule.nextRunAt), "MMM d, HH:mm")}</span>
              )}
              {schedule.lastRunAt && (
                <span>Last: {format(new Date(schedule.lastRunAt), "MMM d, HH:mm")}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleToggle}
              disabled={isToggling}
              aria-label={schedule.isEnabled ? "Pause schedule" : "Activate schedule"}
            >
              {schedule.isEnabled ? (
                <ToggleRight className="h-4 w-4 text-violet-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-slate-400" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete schedule"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchedulerPage() {
  const { data: schedules, isLoading, isError, refetch } = useAllSchedules();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSchedule | null>(null);

  function handleToggle(schedule: WorkflowSchedule) {
    setTogglingId(schedule.id);
    updateSchedule.mutate(
      { workflowId: schedule.workflowId, scheduleId: schedule.id, isEnabled: !schedule.isEnabled },
      {
        onSuccess: () =>
          toast.success(schedule.isEnabled ? "Schedule paused" : "Schedule activated"),
        onError: () => toast.error("Failed to update schedule"),
        onSettled: () => setTogglingId(null),
      },
    );
  }

  function handleDeleteTarget(schedule: WorkflowSchedule) {
    setDeleteTarget(schedule);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteSchedule.mutate(
      { workflowId: deleteTarget.workflowId, scheduleId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Schedule deleted");
          setDeleteTarget(null);
        },
        onError: () => toast.error("Failed to delete schedule"),
      },
    );
  }

  function handleRetry() {
    void refetch();
  }

  const list = schedules ?? [];
  const activeCount = list.filter((s) => s.isEnabled).length;

  return (
    <PageWrapper
      title="Workflow Scheduler"
      subtitle="Manage cron-based workflow schedules"
      actions={
        activeCount > 0 ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
            {activeCount} active
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={6} />
      ) : isError ? (
        <ErrorState title="Failed to load schedules" onRetry={handleRetry} className="flex-1" />
      ) : list.length === 0 ? (
        <div className="flex flex-1 min-h-[60vh]">
          <EmptyState
            title="No schedules configured"
            description="Add cron schedules to your workflows to run them automatically. Open a workflow and add a schedule from the builder."
            className="w-full"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              onToggle={handleToggle}
              onDelete={handleDeleteTarget}
              isToggling={togglingId === schedule.id}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              The schedule{" "}
              <code className="text-xs font-mono">{deleteTarget?.cronExpression}</code> will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
