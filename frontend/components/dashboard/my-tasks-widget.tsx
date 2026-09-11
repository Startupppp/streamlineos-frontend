"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { WidgetCard } from "@/components/ui/widget-card";
import { usePersonalDashboard } from "@/hooks/api/dashboard";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";

const priorityColors: Record<string, string> = {
  URGENT: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  // A four-step ladder needs four steps. `high` was orange before the
  // migration and there is no orange status, so it collapsed onto `medium`'s
  // amber; the categorical orange restores the rung. The other three keep
  // status tokens, because there the meaning *is* the status.
  HIGH: "bg-category-orange-surface text-category-orange-ink border-category-orange-rule",
  MEDIUM: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  LOW: "bg-muted text-muted-foreground border-border",
};

export function MyTasksWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const tasks = data?.myTasks ?? [];
  const sourceFailed = data?.degraded?.includes("myTasks") ?? false;

  return (
    <WidgetCard
      icon={ListChecks}
      title="My Tasks"
      link={{
        href: "/build/my-work",
        label: "View all",
        ariaLabel: "View all tasks",
      }}
      isLoading={isLoading}
      error={error || sourceFailed}
      errorMessage={
        !error && sourceFailed ? "Couldn't load your tasks." : undefined
      }
      isEmpty={!tasks.length}
      empty={
        <EmptyState
          illustration={<EmptyTasksIllustration className="h-20 w-20" />}
          title="No pending tasks"
          description="You're all caught up."
          compact
        />
      }
    >
      <ul className="space-y-2 overflow-y-auto max-h-64">
        {tasks.map((task) => {
          const isOverdue = task.dueDate
            ? new Date(task.dueDate) < new Date()
            : false;
          return (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <TruncatedText text={task.title} className="text-sm font-medium" />
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.projectName && (
                    <TruncatedText text={task.projectName} className="text-xs text-muted-foreground max-w-[120px]" />
                  )}
                  {task.priority && (
                    <span
                      className={cn(
                        "text-micro font-semibold px-1.5 py-0.5 rounded border",
                        priorityColors[task.priority] ??
                          "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {task.priority}
                    </span>
                  )}
                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-micro font-medium",
                        isOverdue
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {isOverdue ? "Overdue · " : "Due "}
                      {format(new Date(task.dueDate), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-micro shrink-0">
                {task.status.replace(/_/g, " ")}
              </Badge>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
