"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { FormRenderer } from "./form-renderer";
import { SUBMISSION_STATUS_COLORS, SUBMISSION_STATUS_LABELS } from "../lib/field-type-meta";
import { useUpdateSubmissionStatus } from "../hooks/use-hr-form-submissions";
import type { HrFormSubmission, HrFormSubmissionStatus } from "../lib/types";

interface SubmissionsDataTableProps {
  formId: number;
  submissions: HrFormSubmission[];
  canManage: boolean;
}

export function SubmissionsDataTable({ formId, submissions, canManage }: SubmissionsDataTableProps) {
  const [viewSub, setViewSub] = useState<HrFormSubmission | null>(null);
  const updateStatus = useUpdateSubmissionStatus(formId);

  async function handleStatusChange(submissionId: number, status: HrFormSubmissionStatus) {
    try {
      await updateStatus.mutateAsync({ submissionId, status });
      toast.success("Status updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleViewClick(sub: HrFormSubmission) {
    setViewSub(sub);
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) setViewSub(null);
  }

  const columns: DataTableColumn<HrFormSubmission>[] = [
    {
      key: "submittedBy",
      header: "Submitted by",
      cell: (row) => (
        <TruncatedText text={row.submittedByName ?? row.submittedBy ?? "Anonymous"} className="min-w-0 max-w-[180px] text-sm" />
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) =>
        canManage ? (
          <Select
            value={row.status}
            onValueChange={(v) => handleStatusChange(row.id, v as HrFormSubmissionStatus)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUBMISSION_STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={"text-[11px] " + (SUBMISSION_STATUS_COLORS[row.status] ?? "")}>
            {SUBMISSION_STATUS_LABELS[row.status] ?? row.status}
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      cell: (row) => (
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleViewClick(row)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        className="flex-1 min-h-0"
        data={submissions}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          </div>
        }
      />

      <Sheet open={viewSub !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base">Submission #{viewSub?.id}</SheetTitle>
          </SheetHeader>
          {viewSub && (
            <FormRenderer
              fields={viewSub.formSchemaSnapshot}
              onSubmit={async () => {}}
              isPending={false}
              readOnly
              initialData={viewSub.data}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
