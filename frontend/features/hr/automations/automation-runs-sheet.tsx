"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrAutomationRuns } from "@/hooks/api/hr/hr-automations";
import type { HrAutomationRun, HrAutomationRunStatus } from "@/types/hr/automations";
import { ChevronDown, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<HrAutomationRunStatus, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  partial: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  failed: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  skipped: "bg-muted text-muted-foreground border-border",
};

function RunRow({ run }: { run: HrAutomationRun }) {
  const [expanded, setExpanded] = useState(false);

  function handleToggle() {
    setExpanded((prev) => !prev);
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_COLORS[run.status]}`}>
          {run.status}
        </span>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {run.triggerEvent}
          {run.depth > 0 && <span className="ml-2 text-[10px] bg-muted px-1 rounded">depth {run.depth}</span>}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {run.durationMs != null ? `${run.durationMs}ms` : "—"}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {format(new Date(run.createdAt), "MMM d, HH:mm:ss")}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
          {run.error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded p-2 font-mono">{run.error}</div>
          )}
          {run.actionResults && run.actionResults.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Action Results</p>
              {run.actionResults.map((ar, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${ar.ok ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="font-mono text-[10px] text-muted-foreground">{ar.type}</span>
                  {ar.error && <span className="text-red-600">{ar.error}</span>}
                  {ar.data && (
                    <pre className="text-[10px] text-muted-foreground overflow-x-auto">{JSON.stringify(ar.data, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
          {run.eventPayload && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Event Payload</p>
              <pre className="text-[10px] font-mono bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(run.eventPayload, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  ruleId: number;
  ruleName: string;
  onClose: () => void;
}

export function AutomationRunsSheet({ ruleId, ruleName, onClose }: Props) {
  const { data: runs, isLoading } = useHrAutomationRuns(ruleId);

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>Run History</SheetTitle>
          <SheetDescription className="truncate">{ruleName}</SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-2 px-6 py-4">
          {isLoading && Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
          {!isLoading && (!runs || runs.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-12">No runs yet for this rule.</p>
          )}
          {runs?.map((run) => <RunRow key={run.id} run={run} />)}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
