"use client";

import { useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  useHrImportJob,
  useRollbackImportJob,
} from "@/hooks/api/hr/import-export";

interface JobErrorsSheetProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobErrorsSheet({ jobId, open, onOpenChange }: JobErrorsSheetProps) {
  const { data: detail, isLoading } = useHrImportJob(open ? jobId : null);
  const job = detail?.job;
  const rollback = useRollbackImportJob();

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

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          )}

          {job && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 mb-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Valid rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-emerald-800">{job.validRows}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-1.5 text-red-700 mb-0.5">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Error rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-red-800">{job.errorRows}</p>
                </div>
              </div>

              {job.errorRows > 0 && job.errors && job.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Validation errors ({job.errors.length})
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Row</th>
                          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Field</th>
                          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.errors.map((err, idx) => (
                          <tr key={idx} className="border-t border-border/60">
                            <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                              {err.row}
                            </td>
                            <td className="px-2 py-1.5 font-mono text-muted-foreground">
                              {err.field ?? "—"}
                            </td>
                            <td className="px-2 py-1.5 text-red-700">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {job.errorRows === 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
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
        </div>

        {job?.status === "committed" && (
          <SheetFooter className="px-6 py-4 border-t border-border shrink-0">
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
