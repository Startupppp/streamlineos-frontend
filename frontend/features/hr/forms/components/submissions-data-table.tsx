"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Submitted by</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  {sub.submittedByName ?? sub.submittedBy ?? "Anonymous"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(sub.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <Select
                      value={sub.status}
                      onValueChange={(v) => handleStatusChange(sub.id, v as HrFormSubmissionStatus)}
                    >
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SUBMISSION_STATUS_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`text-[11px] ${SUBMISSION_STATUS_COLORS[sub.status] ?? ""}`}>
                      {SUBMISSION_STATUS_LABELS[sub.status] ?? sub.status}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleViewClick(sub)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
