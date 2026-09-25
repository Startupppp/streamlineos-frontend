"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn, DataTableSkeleton } from "@/components/ui/data-table";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";

const FORM_SUBMISSION_TABLE_HEADERS = [
  "Submitter",
  "Status",
  "Ticket",
  "Submitted",
  "Actions",
] as const;
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { useFormSubmissions, useUpdateSubmission } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
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

interface SubmissionActionsCellProps {
  row: FormSubmission;
  canManage: boolean;
  onView: (row: FormSubmission) => void;
  onStatusUpdate: (row: FormSubmission, status: FormSubmissionStatus) => void;
}

function SubmissionActionsCell({ row, canManage, onView, onStatusUpdate }: SubmissionActionsCellProps) {
  function handleView() { onView(row); }
  function handleProcess() { onStatusUpdate(row, "processed"); }
  function handleReject() { onStatusUpdate(row, "rejected"); }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="text-xs" onClick={handleView}>
        View
      </Button>
      {canManage && row.status === "submitted" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-status-success-ink-strong hover:text-status-success-ink-strong"
            onClick={handleProcess}
          >
            Process
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-destructive hover:text-destructive"
            onClick={handleReject}
          >
            Reject
          </Button>
        </>
      )}
    </div>
  );
}

export function FormSubmissionsTab({ projectId, formId }: FormSubmissionsTabProps) {
  const canManage = useCan("build:forms:manage");
  const [viewTarget, setViewTarget] = useState<FormSubmission | null>(null);

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useFormSubmissions(projectId, formId);
  const updateSubmission = useUpdateSubmission(projectId, formId);

  const pageState = usePageState({
    permission: "build:forms:manage",
    isLoading,
    isError,
    error,
  });

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
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-40",
      cell: (row) => (
        <SubmissionActionsCell
          row={row}
          canManage={canManage}
          onView={handleViewOpen}
          onStatusUpdate={handleStatusUpdate}
        />
      ),
    },
  ];

  const items = Array.isArray(data) ? data : data?.pages.flatMap((page) => page.data) ?? [];

  const renderMobileCard = (row: FormSubmission) => (
    <BuildMobileCard
      eyebrow={`#${row.id}`}
      title={row.submittedByName ?? "Anonymous"}
      status={
        <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
      }
      meta={[
        { label: "Submitted", value: row.createdAt.slice(0, 10) },
        { label: "Ticket", value: row.convertedTicketId ? "Converted" : "—" },
      ]}
      actions={
        <SubmissionActionsCell
          row={row}
          canManage={canManage}
          onView={handleViewOpen}
          onStatusUpdate={handleStatusUpdate}
        />
      }
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3">
      <PageState
        resolution={pageState}
        loading={
          <DataTableSkeleton
            mobileCards
            rows={12}
            headers={FORM_SUBMISSION_TABLE_HEADERS}
            className="flex-1 min-h-0"
          />
        }
        onRetry={handleRetry}
        className="flex min-h-0 flex-1 flex-col"
      >
        {items.length === 0 ? (
          <EmptyState
            className="min-h-0 flex-1"
            illustrationPreset="documents"
            title="No submissions yet"
            description="Submissions will appear here once the form is filled out."
          />
        ) : (
          <DataTable
            data={items}
            columns={columns}
            getRowKey={(row) => row.id}
            minWidth="640px"
            mobileCard={renderMobileCard}
            className="min-h-0 flex-1"
            pagination={{
              mode: "cursor",
              pageSize: 25,
              hasMore: Boolean(hasNextPage),
              hasPrevious: false,
              onNext: () => void fetchNextPage(),
            }}
            isLoading={isFetchingNextPage}
          />
        )}
      </PageState>

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
