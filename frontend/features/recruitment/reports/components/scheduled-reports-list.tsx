"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useScheduledReports, useDeleteScheduledReport, type ScheduledReport } from "@/hooks/api";

interface ScheduledReportItemProps {
  report: ScheduledReport;
  onDelete: (id: number) => void;
}

function ScheduledReportItem({ report, onDelete }: ScheduledReportItemProps) {
  function handleDelete() {
    onDelete(report.id);
  }
  return (
    <div className="border rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{report.name}</p>
        <p className="text-xs text-muted-foreground">
          {report.schedule === "WEEKLY" ? "Weekly" : "Monthly"} ·{" "}
          {report.reportConfig.entity} ·{" "}
          {report.recipients.slice(0, 2).join(", ")}
          {report.recipients.length > 2 &&
            ` +${report.recipients.length - 2} more`}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  );
}

export function ScheduledReportsList() {
  const { data: reports = [], isLoading, isError, refetch } = useScheduledReports();
  const deleteReport = useDeleteScheduledReport();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = useCallback(() => {
    if (deletingId === null) return;
    deleteReport.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Scheduled report deleted");
        setDeletingId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeletingId(null);
      },
    });
  }, [deletingId, deleteReport]);

  function handleDeleteDialogChange(v: boolean) {
    if (!v) setDeletingId(null);
  }
  function handleCancelDelete() {
    setDeletingId(null);
  }

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (isError) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
        <p className="text-sm font-medium text-foreground">Unable to load scheduled reports</p>
        <p className="text-xs text-muted-foreground mt-1">Try again shortly.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (reports.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold mb-3">Scheduled Reports</h3>
      <div className="space-y-2">
        {reports.map((r) => (
          <ScheduledReportItem key={r.id} report={r} onDelete={setDeletingId} />
        ))}
      </div>
      {deletingId !== null && (
        <AlertDialog open onOpenChange={handleDeleteDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
              <AlertDialogDescription>
                This will stop the scheduled emails for this report.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteReport.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
