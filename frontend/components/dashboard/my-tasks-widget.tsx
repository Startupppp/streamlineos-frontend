"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { WidgetCard } from "@/components/ui/widget-card";
import { usePersonalDashboard } from "@/hooks/api/dashboard";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
};

export function MyTasksWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const tasks = data?.myTasks ?? [];

  return (
    <WidgetCard
      icon={ListChecks}
      title="My Tasks"
      link={{
        href: "/projects/my-work",
        label: "View all",
        ariaLabel: "View all tasks",
      }}
      isLoading={isLoading}
      error={error}
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
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.projectName && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {task.projectName}
                    </span>
                  )}
                  {task.priority && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
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
                        "text-[10px] font-medium",
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
              <Badge variant="outline" className="text-[10px] shrink-0">
                {task.status.replace(/_/g, " ")}
              </Badge>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
