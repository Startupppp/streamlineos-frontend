"use client";

import { useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useHrImportJob,
  useRollbackImportJob,
} from "@/hooks/api/hr/import-export";
import { TruncatedText } from "@/components/ui/truncated-text";

type ErrorRow = { row: number; field?: string | null; message: string; _idx: number };

const errorColumns: DataTableColumn<ErrorRow>[] = [
  { key: "row", header: "Row", cell: (r) => <span className="tabular-nums text-muted-foreground">{r.row}</span> },
  { key: "field", header: "Field", cell: (r) => <span className="font-mono text-muted-foreground">{r.field ?? "—"}</span> },
  { key: "message", header: "Message", cell: (r) => <span className="text-status-danger-ink">{r.message}</span> },
];

interface JobErrorsSheetProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobErrorsSheet({ jobId, open, onOpenChange }: JobErrorsSheetProps) {
  const { data: detail, isLoading, isError, error, refetch } = useHrImportJob(open ? jobId : null);
  const job = detail?.job;
  const rollback = useRollbackImportJob();
  // Every row that ended in error, whichever step it failed at: a row that failed at commit (an email that matches
  // no employee) is only on the row itself, not in the job's validation summary.
  const failedRows = detail?.errorRows ?? [];
  const errorRows: ErrorRow[] =
    failedRows.length > 0
      ? failedRows.map((r, i) => ({ row: r.rowNumber, message: r.error ?? "Failed", _idx: i }))
      : (job?.errors ?? []).map((e, i) => ({ ...e, _idx: i }));

  const handleRollback = useCallback(() => {
    if (!job) return;
    rollback.mutate(
      { jobId: job.id },
      {
        onSuccess: () => {
          toast.success("Import rolled back successfully");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [rollback, job, onOpenChange]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>Import Details</SheetTitle>
          {job && (
            <TruncatedText text={job.fileName} className="text-xs text-muted-foreground mt-0.5" />
          )}
        </SheetHeader>

        <SheetBody className="space-y-4 px-6 py-4">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Couldn't load this import"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
              compact
            />
          )}

          {job && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-status-success-rule bg-status-success-surface p-3">
                  <div className="flex items-center gap-1.5 text-status-success-ink mb-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Valid rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-status-success-ink">{job.validRows}</p>
                </div>
                <div className="rounded-lg border border-status-danger-rule bg-status-danger-surface p-3">
                  <div className="flex items-center gap-1.5 text-status-danger-ink mb-0.5">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Error rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-status-danger-ink">{job.errorRows}</p>
                </div>
              </div>

              {job.errorRows > 0 && errorRows.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Rows with errors ({errorRows.length}{job.errorRows > errorRows.length ? ` of ${job.errorRows}` : ""})
                  </p>
                  <DataTable
                    data={errorRows}
                    columns={errorColumns}
                    getRowKey={(row) => row._idx}
                  />
                </div>
              )}

              {job.errorRows === 0 && (
                <div className="flex items-center gap-2 text-sm text-status-success-ink rounded-lg border border-status-success-rule bg-status-success-surface px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All rows processed without errors
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">
                  {job.status.replace(/_/g, " ")}
                </Badge>
                {job.committedAt && (
                  <span className="text-xs text-muted-foreground">
                    Committed {new Date(job.committedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </>
          )}
        </SheetBody>

        {job?.status === "committed" && (
          <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
            <LoadingButton
              variant="destructive"
              isPending={rollback.isPending}
              loadingText="Rolling back…"
              onClick={handleRollback}
            >
              Rollback import
            </LoadingButton>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
