"use client";

import { memo } from "react";
import { NoPermissionState } from "@/components/shared";
import { useCanState } from "@/hooks/api/access";
import { CheckCircle, XCircle, Clock, SkipForward } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCrmAutomationRuns } from "@/hooks/api/crm";
import { cn } from "@/lib/utils";
import type { AutomationRunStatus } from "@/types/crm";

interface RunHistoryDrawerProps {
  ruleId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<AutomationRunStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  queued: { label: "Queued", icon: Clock, color: "text-muted-foreground" },
  running: { label: "Running", icon: Clock, color: "text-primary" },
  success: { label: "Success", icon: CheckCircle, color: "text-status-success-ink" },
  failed: { label: "Failed", icon: XCircle, color: "text-status-danger-ink" },
  skipped: { label: "Skipped", icon: SkipForward, color: "text-status-warning-ink" },
};

export const RunHistoryDrawer = memo(function RunHistoryDrawer({ ruleId, open, onOpenChange }: RunHistoryDrawerProps) {
  const { data, isLoading, error } = useCrmAutomationRuns(ruleId, 1);
  const runs = data?.runs ?? [];

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:automations:manage") === "denied")
    return <NoPermissionState permission="crm:automations:manage" />;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[440px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="shrink-0 px-5 py-4 border-b">
          <SheetTitle className="text-base">Run History</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-5 py-4 space-y-3">
          {error ? (
            <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
          ) : isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No runs yet.</p>
          ) : (
            runs.map((run) => {
              const cfg = statusConfig[run.status as AutomationRunStatus] ?? statusConfig.queued;
              const Icon = cfg.icon;
              return (
                <div key={run.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                      <span className="text-xs font-medium">{run.eventKey}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-micro h-4 px-1.5", cfg.color)}
                    >
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="text-dense text-muted-foreground flex gap-3">
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    <span className="capitalize">{run.entityType} {run.entityId}</span>
                  </div>
                  {run.error && (
                    <p className="text-dense text-status-danger-ink bg-status-danger-surface rounded px-2 py-1">{run.error}</p>
                  )}
                  {run.steps && run.steps.length > 0 && (
                    <div className="space-y-1 pl-2 border-l-2 border-border ml-2">
                      {run.steps.map((step) => (
                        <div key={step.nodeId} className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", {
                            "bg-status-success-fill": step.status === "ok",
                            "bg-status-danger-fill": step.status === "error",
                            "bg-status-warning-fill": step.status === "skipped",
                          })} />
                          <span className="text-micro text-muted-foreground">{step.type}</span>
                          {step.message && <span className="text-micro text-muted-foreground">— {step.message}</span>}
                          {step.branchTaken && (
                            <span className="text-micro text-primary font-medium">→ {step.branchTaken}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
});
