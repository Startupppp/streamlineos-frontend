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

type ErrorRow = { row: number; field?: string | null; message: string; _idx: number };

const errorColumns: DataTableColumn<ErrorRow>[] = [
  { key: "row", header: "Row", cell: (r) => <span className="tabular-nums text-muted-foreground">{r.row}</span> },
  { key: "field", header: "Field", cell: (r) => <span className="font-mono text-muted-foreground">{r.field ?? "—"}</span> },
  { key: "message", header: "Message", cell: (r) => <span className="text-red-700 dark:text-red-400">{r.message}</span> },
];

interface JobErrorsSheetProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobErrorsSheet({ jobId, open, onOpenChange }: JobErrorsSheetProps) {
  const { data: detail, isLoading } = useHrImportJob(open ? jobId : null);
  const job = detail?.job;
  const rollback = useRollbackImportJob();
  const errorRows: ErrorRow[] = (job?.errors ?? []).map((e, i) => ({ ...e, _idx: i }));

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>Import Details</SheetTitle>
          {job && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {job.fileName}
            </p>
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

          {job && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 mb-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Valid rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-emerald-800 dark:text-emerald-300">{job.validRows}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-3">
                  <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 mb-0.5">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Error rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-red-800 dark:text-red-300">{job.errorRows}</p>
                </div>
              </div>

              {job.errorRows > 0 && errorRows.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Validation errors ({errorRows.length})
                  </p>
                  <DataTable
                    data={errorRows}
                    columns={errorColumns}
                    getRowKey={(row) => row._idx}
                  />
                </div>
              )}

              {job.errorRows === 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-3 py-2">
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
