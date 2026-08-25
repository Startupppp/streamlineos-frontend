"use client";

import { useResignationProgress } from "@/hooks/api/hr";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PROGRESS_STEPS = [
  { step: "SUBMITTED", label: "Submitted" },
  { step: "PENDING_HR", label: "HR Review" },
  { step: "HR_APPROVED", label: "HR Approved" },
  { step: "FINAL_APPROVED", label: "FINAL Approved" },
  { step: "COMPLETED", label: "Completed" },
];

export function ProgressTimeline({ id }: { id: number }) {
  const { data, isLoading } = useResignationProgress(id, true);

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const steps = data?.steps ?? PROGRESS_STEPS.map((s, i) => ({
    ...s,
    status: i === 0 ? ("current" as const) : ("pending" as const),
  }));

  return (
    <div className="px-4 py-3">
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <div key={step.step} className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-colors shrink-0",
                  step.status === "completed"
                    ? "bg-emerald-500 border-emerald-500"
                    : step.status === "current"
                    ? "bg-background border-primary ring-2 ring-primary/30"
                    : "bg-background border-input"
                )}
              />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-5 mt-0.5",
                    step.status === "completed"
                      ? "bg-emerald-500"
                      : "bg-border"
                  )}
                />
              )}
            </div>

            <div className="flex items-center gap-2 pb-1 min-w-0 -mt-0.5">
              <span
                className={cn(
                  "text-dense leading-tight",
                  step.status === "completed"
                    ? "text-emerald-700 dark:text-emerald-300 font-medium"
                    : step.status === "current"
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {step.status === "completed" && step.timestamp && (
                <span className="text-micro text-muted-foreground tabular-nums shrink-0">
                  {format(new Date(step.timestamp), "MMM d")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
