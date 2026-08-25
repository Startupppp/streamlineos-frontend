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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { useHrAutomationRuns } from "@/hooks/api/hr/hr-automations";
import type { HrAutomationRun, HrAutomationRunStatus } from "@/types/hr/automations";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_COLORS: Record<HrAutomationRunStatus, string> = {
  success: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  partial: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  failed: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  skipped: "bg-muted text-muted-foreground border-border",
};

function RunRow({ run }: { run: HrAutomationRun }) {
  const [expanded, setExpanded] = useState(false);

  function handleToggle() {
    setExpanded((prev) => !prev);
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full items-center justify-start gap-3 rounded-none px-3 py-2.5 text-left text-sm font-normal hover:bg-muted/50"
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={`text-micro font-medium px-1.5 py-0.5 rounded border ${STATUS_COLORS[run.status]}`}>
          {run.status}
        </span>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <TruncatedText text={run.triggerEvent} className="text-xs text-muted-foreground" />
          {run.depth > 0 && <span className="shrink-0 ml-1 text-micro bg-muted px-1 rounded">depth {run.depth}</span>}
        </div>
        <span className="text-micro text-muted-foreground shrink-0">
          {run.durationMs != null ? `${run.durationMs}ms` : "—"}
        </span>
        <span className="text-micro text-muted-foreground shrink-0">
          {format(new Date(run.createdAt), "MMM d, HH:mm:ss")}
        </span>
      </Button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
          {run.error && (
            <div className="text-xs text-status-danger-ink bg-status-danger-surface rounded p-2 font-mono">{run.error}</div>
          )}
          {run.actionResults && run.actionResults.length > 0 && (
            <div className="space-y-1">
              <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">Action Results</p>
              {run.actionResults.map((ar, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${ar.ok ? "bg-status-success-fill" : "bg-status-danger-fill"}`} />
                  <span className="font-mono text-micro text-muted-foreground">{ar.type}</span>
                  {ar.error && <span className="text-status-danger-ink">{ar.error}</span>}
                  {ar.data && (
                    <pre className="text-micro text-muted-foreground overflow-x-auto">{JSON.stringify(ar.data, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
          {run.eventPayload && (
            <div>
              <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-1">Event Payload</p>
              <pre className="text-micro font-mono bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(run.eventPayload, null, 2)}</pre>
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
  const [page, setPage] = useState(1);
  const { data: runsData, isLoading } = useHrAutomationRuns(ruleId, { page, limit: 20 });
  const runs = runsData?.data;
  const pagination = runsData?.pagination;

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

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

        {pagination && pagination.totalPages > 1 && (
          <TablePagination
            page={page}
            pageSize={pagination.limit}
            total={pagination.total}
            onPageChange={handlePageChange}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
