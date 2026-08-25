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
          "bg-status-success-surface text-status-success-ink border-status-success-rule",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "MANAGER_APPROVED":
      return {
        label: "Manager Approved",
        className:
          "bg-status-info-surface text-status-info-ink border-status-info-rule",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "REJECTED":
      return {
        label: "Rejected",
        className:
          "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
        icon: <XCircle className="h-3 w-3" />,
      };
    default:
      return {
        label: "Pending",
        className:
          "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
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
