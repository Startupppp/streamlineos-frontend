"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { DataTableColumn } from "@/components/ui/data-table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useFormSubmissions, useUpdateSubmission } from "@/hooks/api/build/forms";
import { getErrorMessage } from "@/lib/get-error-message";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import type {
  FormSubmission,
  FormSubmissionStatus,
} from "@/types/projects/forms";

const STATUS_VARIANT: Record<
  FormSubmissionStatus,
  "default" | "secondary" | "destructive"
> = {
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

function SubmissionActionsCell({
  row,
  canManage,
  onView,
  onStatusUpdate,
}: SubmissionActionsCellProps) {
  function handleView() {
    onView(row);
  }
  function handleProcess() {
    onStatusUpdate(row, "processed");
  }
  function handleReject() {
    onStatusUpdate(row, "rejected");
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={handleView}
      >
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

export function FormSubmissionsTab({
  projectId,
  formId,
}: FormSubmissionsTabProps) {
  const canManage = useCan("build:forms:manage");
  const [viewTarget, setViewTarget] = useState<FormSubmission | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFormSubmissions(projectId, formId);
  const updateSubmission = useUpdateSubmission(projectId, formId);

  const handleStatusUpdate = useCallback(
    (submission: FormSubmission, status: FormSubmissionStatus) => {
      updateSubmission.mutate(
        { submissionId: submission.id, status },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateSubmission],
  );

  const handleViewOpen = useCallback((row: FormSubmission) => {
    setViewTarget(row);
  }, []);

  const handleViewClose = useCallback((open: boolean) => {
    if (!open) setViewTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => void fetchNextPage(), [fetchNextPage]);

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
        <Badge variant={STATUS_VARIANT[row.status]}>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "convertedTicketId",
      header: "Ticket",
      cell: (row) =>
        row.convertedTicketId ? (
          <Badge variant="outline" className="text-xs">
            Converted
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Submitted",
      cell: (row) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.createdAt.slice(0, 10)}
        </span>
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

  const items = Array.isArray(data)
    ? data
    : (data?.pages.flatMap((page) => page.data) ?? []);

  const renderMobileCard = useCallback(
    (row: FormSubmission) => (
      <BuildMobileCard
        eyebrow={`#${row.id}`}
        title={row.submittedByName ?? "Anonymous"}
        status={
          <Badge variant={STATUS_VARIANT[row.status]}>
            {STATUS_LABEL[row.status]}
          </Badge>
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
    ),
    [canManage, handleViewOpen, handleStatusUpdate],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3">
      <BuildListSurface<FormSubmission>
        permission="build:forms:manage"
        rows={items}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        error={error}
        getRowKey={(row) => row.id}
        minWidth="640px"
        mobileCard={renderMobileCard}
        loadingHeaders={FORM_SUBMISSION_TABLE_HEADERS}
        loadingRows={12}
        pagination={{
          mode: "cursor",
          pageSize: 25,
          hasMore: Boolean(hasNextPage),
          hasPrevious: false,
          onNext: handleNextPage,
        }}
        isFetchingMore={isFetchingNextPage}
        empty={
          <EmptyState
            className="min-h-0 flex-1"
            illustrationPreset="documents"
            title="No submissions yet"
            description="Submissions will appear here once the form is filled out."
          />
        }
        onRetry={handleRetry}
        className="flex min-h-0 flex-1 flex-col"
      />

      <Dialog open={!!viewTarget} onOpenChange={handleViewClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission #{viewTarget?.id}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96 py-1">
            <div className="space-y-2">
              {viewTarget &&
                Object.entries(viewTarget.values).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex gap-3 text-sm py-1 border-b last:border-0"
                  >
                    <span className="font-normal text-muted-foreground min-w-[130px] capitalize shrink-0">
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
