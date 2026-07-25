"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TravelRequest } from "@/hooks/api/hr";

export const STATUS_STEPS = [
  { key: "PENDING", label: "Submitted" },
  { key: "MANAGER_APPROVED", label: "Manager Approved" },
  { key: "FINANCE_APPROVED", label: "Finance Approved" },
] as const;

export function getStatusConfig(status: TravelRequest["status"]) {
  switch (status) {
    case "FINANCE_APPROVED":
    case "COMPLETED":
      return {
        label: status === "COMPLETED" ? "Completed" : "Finance Approved",
        className:
          "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "MANAGER_APPROVED":
      return {
        label: "Manager Approved",
        className:
          "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "REJECTED":
      return {
        label: "Rejected",
        className:
          "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
        icon: <XCircle className="h-3 w-3" />,
      };
    default:
      return {
        label: "Pending",
        className:
          "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
        icon: <Clock className="h-3 w-3" />,
      };
  }
}

export function StatusPipeline({ status }: { status: TravelRequest["status"] }) {
  const activeIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-0 mb-6">
      {STATUS_STEPS.map((step, idx) => {
        const isActive = idx <= activeIdx && status !== "REJECTED";
        const isLast = idx === STATUS_STEPS.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                isActive
                  ? "bg-primary/10 border-primary/30 text-foreground"
                  : "bg-muted border-border text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isActive ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
              {step.label}
            </div>
            {!isLast && (
              <div className={cn("flex-1 h-px mx-1", isActive ? "bg-primary/30" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
