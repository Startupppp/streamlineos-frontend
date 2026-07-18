"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useClientOnboardingItems, useToggleOnboardingItem } from "@/hooks/api/crm/clients";
import { formatDate } from "./utils";
import type { OnboardingItem } from "@/types/crm";

export function ClientOnboardingTab({ clientId }: { clientId: number }) {
  const { data, isLoading } = useClientOnboardingItems(clientId);
  const toggleMutation = useToggleOnboardingItem();

  const handleToggle = useCallback(
    (item: OnboardingItem) => {
      const completed = !item.completedAt;
      toggleMutation.mutate(
        { id: item.id, completed, clientId },
        { onError: () => toast.error("Failed to update item") },
      );
    },
    [toggleMutation, clientId],
  );

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No onboarding items"
        description="Onboarding checklist items will appear here once added."
        compact
        className="py-10"
      />
    );
  }

  const completedCount = data.filter((i) => i.completedAt).length;
  const percentage =
    data.length > 0 ? Math.round((completedCount / data.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {completedCount} of {data.length} completed
        </span>
        <span className="text-xs font-medium text-foreground">{percentage}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="space-y-1 mt-2">
        {data.map((item: OnboardingItem) => {
          const isCompleted = Boolean(item.completedAt);
          const handleItemToggle = () => handleToggle(item);

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/30 transition-colors"
            >
              <Checkbox
                id={`onboarding-${item.id}`}
                checked={isCompleted}
                onCheckedChange={handleItemToggle}
                disabled={toggleMutation.isPending}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`onboarding-${item.id}`}
                  className={cn(
                    "text-[11px] font-medium cursor-pointer",
                    isCompleted && "line-through text-muted-foreground",
                  )}
                >
                  {item.title}
                </label>
                {item.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  {item.assignee?.name && (
                    <span className="text-[10px] text-muted-foreground">
                      {item.assignee.name}
                    </span>
                  )}
                  {item.dueDate && (
                    <span className="text-[10px] text-muted-foreground">
                      Due {formatDate(item.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              {isCompleted ? (
                <CheckSquare className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
