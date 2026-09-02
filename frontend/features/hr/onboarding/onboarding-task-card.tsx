"use client";

import { useCallback } from "react";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { formatShortDate } from "@/lib/date-utils";
import type { OnboardingTask } from "@/hooks/api/hr/onboarding";

interface OnboardingTaskCardProps {
  task: OnboardingTask;
  isPending: boolean;
  onToggle: (taskId: number, currentStatus: string) => void;
}

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

export function OnboardingTaskCard({
  task,
  isPending,
  onToggle,
}: OnboardingTaskCardProps) {
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
                <CheckCircle2 className="h-5 w-5 text-status-success-ink" />
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
                <CheckCircle2 className="h-5 w-5 text-status-success-ink" />
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
              <Badge variant={ownerRoleVariant(task.ownerRole)} className="text-micro py-0 h-4 shrink-0">
                {task.ownerRole.replace("_", " ")}
              </Badge>
              {overdue && (
                <Badge variant="destructive" className="text-micro py-0 h-4 shrink-0">
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
                  Due {formatShortDate(task.dueDate) || "—"}
                </span>
              )}
              {done && task.completedAt && (
                <span className="text-dense text-status-success-ink">
                  Completed {formatShortDate(task.completedAt) || "—"}
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
