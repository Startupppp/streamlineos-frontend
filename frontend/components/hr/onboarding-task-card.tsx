"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { OnboardingTask } from "@/hooks/api/hr/onboarding";


export interface OnboardingTaskCardProps {
  task: OnboardingTask;
  onToggle: (taskId: number, newStatus: "COMPLETED" | "PENDING") => void;
  isToggling: boolean;
}


function ownerBadgeClass(ownerRole: string): string {
  switch (ownerRole.toUpperCase()) {
    case "NEW_HIRE":
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300";
    case "IT":
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300";
    case "HR":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
    case "MANAGER":
      return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ownerBadgeLabel(ownerRole: string): string {
  switch (ownerRole.toUpperCase()) {
    case "NEW_HIRE":
      return "You";
    case "IT":
      return "IT";
    case "HR":
      return "HR";
    case "MANAGER":
      return "Manager";
    default:
      return ownerRole;
  }
}

function formatDueDate(dateStr: string): { label: string; overdue: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`,
      overdue: true,
    };
  } else if (diffDays === 0) {
    return { label: "Due today", overdue: false };
  } else if (diffDays === 1) {
    return { label: "Due tomorrow", overdue: false };
  } else {
    return {
      label: `Due in ${diffDays} days`,
      overdue: false,
    };
  }
}


export function OnboardingTaskCard({ task, onToggle, isToggling }: OnboardingTaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === "COMPLETED";

  const handleToggle = useCallback(() => {
    onToggle(task.id, isCompleted ? "PENDING" : "COMPLETED");
  }, [task.id, isCompleted, onToggle]);

  const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isCompleted && "opacity-70"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {task.canComplete ? (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleToggle}
              disabled={isToggling}
              aria-label={isCompleted ? `Mark "${task.title}" as pending` : `Complete "${task.title}"`}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <span
              className="mt-0.5 shrink-0 text-muted-foreground"
              aria-label={isCompleted ? "Completed" : `Assigned to ${ownerBadgeLabel(task.ownerRole)}`}
              role="img"
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className={cn(
                  "text-sm font-semibold leading-snug",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </p>

              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-micro font-medium shrink-0",
                  ownerBadgeClass(task.ownerRole)
                )}
              >
                {ownerBadgeLabel(task.ownerRole)}
              </span>
            </div>

            {dueInfo && (
              <p
                className={cn(
                  "text-dense mt-0.5",
                  dueInfo.overdue && !isCompleted
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                )}
              >
                {dueInfo.label}
              </p>
            )}

            {task.description && (
              <div className="mt-1">
                {expanded ? (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {task.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      className="inline-flex items-center gap-0.5 text-dense text-primary mt-1 hover:underline"
                      aria-label="Collapse description"
                    >
                      <ChevronUp className="h-3 w-3" />
                      Less
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-0.5 text-dense text-primary mt-0.5 hover:underline"
                    aria-label="Expand description"
                  >
                    <ChevronDown className="h-3 w-3" />
                    Details
                  </button>
                )}
              </div>
            )}
          </div>

          {isCompleted && (
            <Badge variant="secondary" className="text-micro shrink-0 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300">
              Done
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
