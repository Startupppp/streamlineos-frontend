"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useHrImportJobs,
  type HrImportEntity,
  type HrImportStatus,
} from "@/hooks/api/hr/import-export";
import { JobErrorsSheet } from "./job-errors-sheet";

interface JobHistoryTableProps {
  entity?: HrImportEntity;
}

const STATUS_BADGE: Record<
  HrImportStatus,
  { label: string; className: string }
> = {
  validating: { label: "Validating", className: "bg-blue-100 text-blue-700 border-blue-200" },
  previewed: { label: "Previewed", className: "bg-amber-100 text-amber-700 border-amber-200" },
  committing: { label: "Committing", className: "bg-blue-100 text-blue-700 border-blue-200" },
  committed: { label: "Committed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rolled_back: { label: "Rolled Back", className: "bg-red-100 text-red-700 border-red-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
};

const ENTITY_LABELS: Record<HrImportEntity, string> = {
  employees: "Employees",
  leave_balances: "Leave Balances",
  attendance: "Attendance",
  assets: "Assets",
  document_metadata: "Documents",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobHistoryTable({ entity }: JobHistoryTableProps) {
  const [errorJobId, setErrorJobId] = useState<string | null>(null);
  const { data, isLoading } = useHrImportJobs(entity);

  const handleViewErrors = useCallback((jobId: string) => {
    setErrorJobId(jobId);
  }, []);

  const handleCloseErrors = useCallback((open: boolean) => {
    if (!open) setErrorJobId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const jobs = data?.data ?? [];

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No import history yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Entity</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">File</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Valid</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Errors</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const badge = STATUS_BADGE[job.status];
              return (
                <tr key={job.id} className="border-t border-border/60 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-medium">
                    {ENTITY_LABELS[job.entity] ?? job.entity}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">
                    {job.fileName}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 h-5 font-medium", badge.className)}
                    >
                      {badge.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums text-emerald-700">
                    {job.validRows}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right tabular-nums text-red-600">
                    {job.errorRows}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(job.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {job.errorRows > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => handleViewErrors(job.id)}
                      >
                        View errors
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <JobErrorsSheet
        jobId={errorJobId ?? ""}
        open={!!errorJobId}
        onOpenChange={handleCloseErrors}
      />
    </>
  );
}
