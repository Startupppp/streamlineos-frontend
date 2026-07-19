"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { useCan } from "@/hooks/api/access";
import { useFormSubmissions, useUpdateSubmission } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { FormSubmission, FormSubmissionStatus } from "@/types/projects/forms";

const STATUS_VARIANT: Record<FormSubmissionStatus, "default" | "secondary" | "destructive"> = {
  submitted: "secondary",
  processed: "default",
  rejected: "destructive",
};

const STATUS_LABEL: Record<FormSubmissionStatus, string> = {
  submitted: "Submitted",
  processed: "Processed",
  rejected: "Rejected",
};

interface FormSubmissionsTabProps {
  projectId: number;
  formId: number;
}

export function FormSubmissionsTab({ projectId, formId }: FormSubmissionsTabProps) {
  const canManage = useCan("projects:forms:manage");
  const [viewTarget, setViewTarget] = useState<FormSubmission | null>(null);

  const { data, isLoading, isError, refetch } = useFormSubmissions(projectId, formId);
  const updateSubmission = useUpdateSubmission(projectId, formId);

  function handleStatusUpdate(submission: FormSubmission, status: FormSubmissionStatus) {
    updateSubmission.mutate(
      { submissionId: submission.id, status },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleViewOpen(row: FormSubmission) {
    setViewTarget(row);
  }

  function handleViewClose(open: boolean) {
    if (!open) setViewTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<FormSubmission>[] = [
    {
      key: "submittedByName",
      header: "Submitter",
      cell: (row) =>
        row.submittedByName ? (
          <span className="text-sm">{row.submittedByName}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Anonymous</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
      ),
    },
    {
      key: "convertedTicketId",
      header: "Ticket",
      cell: (row) =>
        row.convertedTicketId ? (
          <Badge variant="outline" className="text-xs">Converted</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Submitted",
      cell: (row) => (
        <span className="text-xs text-muted-foreground tabular-nums">{row.createdAt.slice(0, 10)}</span>
      ),
      sortable: true,
      sortValue: (row) => row.createdAt,
    },
    {
      key: "actions",
      header: "",
      className: "w-40",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleViewOpen(row)}>
            View
          </Button>
          {canManage && row.status === "submitted" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-green-700 hover:text-green-800"
                onClick={() => handleStatusUpdate(row, "processed")}
              >
                Process
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => handleStatusUpdate(row, "rejected")}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const items = data ?? [];

  return (
    <div className="pt-3 space-y-3">
      {isLoading ? (
        <DataTableSkeleton rows={12} columns={6} />
      ) : isError ? (
        <ErrorState compact onRetry={handleRetry} />
      ) : items.length === 0 ? (
        <EmptyState
          illustrationPreset="documents"
          title="No submissions yet"
          description="Submissions will appear here once the form is filled out."
        />
      ) : (
        <DataTable data={items} columns={columns} getRowKey={(row) => row.id} minWidth="640px" />
      )}

      <Dialog open={!!viewTarget} onOpenChange={handleViewClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission #{viewTarget?.id}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96 py-1">
            <div className="space-y-2">
              {viewTarget &&
                Object.entries(viewTarget.values).map(([key, val]) => (
                  <div key={key} className="flex gap-3 text-sm py-1 border-b last:border-0">
                    <span className="font-medium text-muted-foreground min-w-[130px] capitalize shrink-0">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-foreground break-all">
                      {Array.isArray(val)
                        ? (val as unknown[]).join(", ")
                        : String(val ?? "—")}
                    </span>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
