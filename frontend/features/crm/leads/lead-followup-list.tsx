"use client";

import { useCallback } from "react";
import {
  Phone,
  Mail,
  Calendar,
  Clock,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/api/tasks";

function formatTaskDue(dueDate: string | null): string {
  if (!dueDate) return "No date";
  const d = new Date(dueDate);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  const formatted = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  if (diffDays < 0) return `Overdue · ${formatted}`;
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  return `${formatted} · ${time}`;
}

interface CompleteTaskButtonProps {
  taskId: number;
  onComplete: (taskId: number) => void;
  isPending: boolean;
}

function CompleteTaskButton({
  taskId,
  onComplete,
  isPending,
}: CompleteTaskButtonProps) {
  const handleClick = useCallback(
    () => onComplete(taskId),
    [taskId, onComplete],
  );
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-status-success-ink"
      onClick={handleClick}
      disabled={isPending}
      title="Mark as done"
    >
      <CheckCircle2 className="h-4 w-4" />
    </Button>
  );
}

interface LeadFollowupListProps {
  pendingTasks: Task[];
  doneTasks: Task[];
  tasksLoading: boolean;
  onCompleteTask: (taskId: number) => void;
  isCompletePending: boolean;
}

export function LeadFollowupList({
  pendingTasks,
  doneTasks,
  tasksLoading,
  onCompleteTask,
  isCompletePending,
}: LeadFollowupListProps) {
  return (
    <>
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
            Pending ({pendingTasks.length})
          </p>
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const isOverdue =
                task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40"
                >
                  <div
                    className={cn(
                      "h-8 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                      task.type === "CALL"
                        ? "bg-status-info-surface text-status-info-ink"
                        : task.type === "EMAIL"
                          ? "bg-status-info-surface text-status-info-ink"
                          : task.type === "MEETING"
                            ? "bg-status-warning-surface text-status-warning-ink"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {task.type === "CALL" ? (
                      <Phone className="h-3.5 w-3.5" />
                    ) : task.type === "EMAIL" ? (
                      <Mail className="h-3.5 w-3.5" />
                    ) : task.type === "MEETING" ? (
                      <Calendar className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">
                      {task.title}
                    </p>
                    <p
                      className={cn(
                        "text-micro mt-0.5",
                        isOverdue
                          ? "text-status-danger-ink font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatTaskDue(task.dueDate)}
                    </p>
                    {task.notes && (
                      <p className="text-micro text-muted-foreground mt-1 truncate">
                        {task.notes}
                      </p>
                    )}
                  </div>
                  <CompleteTaskButton
                    taskId={task.id}
                    onComplete={onCompleteTask}
                    isPending={isCompletePending}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {doneTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
            Completed ({doneTasks.length})
          </p>
          <div className="space-y-1.5">
            {doneTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/10 border border-border/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-status-success-ink shrink-0" />
                <TruncatedText text={task.title} className="text-dense text-muted-foreground line-through flex-1" />
                <span className="text-micro text-muted-foreground shrink-0">
                  {task.completedAt
                    ? new Date(task.completedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasksLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3"
            >
              <Skeleton className="h-8 w-7 shrink-0 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        pendingTasks.length === 0 &&
        doneTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarClock className="w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No follow-ups yet</p>
            <p className="text-dense mt-0.5">
              Schedule one above to stay on track
            </p>
          </div>
        )
      )}
    </>
  );
}
