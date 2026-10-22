"use client";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useCreateIssue, useUpdateIssue } from "@/hooks/api/crm/issues";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  ISSUE_SEVERITIES,
  type CreateIssueInput,
  type IssueRecord,
  type IssueRecordLayout,
  type IssueSeverity,
  type UpdateIssueInput,
} from "@/types/crm/issues";

export interface IssueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: IssueRecordLayout;
  record?: IssueRecord;
}

function trimmed(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function asInstant(value: string | undefined): string | undefined {
  const text = trimmed(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function asNumber(value: string | undefined): number | undefined {
  const text = trimmed(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asSeverity(value: string | undefined): IssueSeverity {
  const text = trimmed(value);
  return ISSUE_SEVERITIES.find((severity) => severity === text) ?? "medium";
}

export function IssueFormDialog({ open, onOpenChange, layout, record }: IssueFormDialogProps) {
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();

  const isEdit = !!record;
  const isSubmitting = createIssue.isPending || updateIssue.isPending;
  const noun = layout.singular.toLowerCase();

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    const shared = {
      title: values.title?.trim() ?? "",
      severity: asSeverity(values.severity),
      details: trimmed(values.details),
      reference: trimmed(values.reference),
      ownerUserId: trimmed(values.ownerUserId),
      partyId: trimmed(values.partyId),
      dealId: asNumber(values.dealId),
      dueAt: asInstant(values.dueAt),
    };

    if (record) {
      const patch: UpdateIssueInput = {
        title: shared.title,
        severity: shared.severity,
        details: shared.details ?? null,
        reference: shared.reference ?? null,
        ownerUserId: shared.ownerUserId ?? null,
        partyId: shared.partyId ?? null,
        dealId: shared.dealId ?? null,
        dueAt: shared.dueAt ?? null,
      };

      updateIssue.mutate(
        { issueRecordId: record.issueRecordId, ...patch },
        {
          onSuccess: () => {
            toast.success(`${layout.singular} updated`);
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    const input: CreateIssueInput = { recordType: layout.recordType, ...shared };

    createIssue.mutate(input, {
      onSuccess: () => {
        toast.success(`${layout.singular} raised`);
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? `Edit ${noun}` : `New ${noun}`}</DialogTitle>
            <DialogDescription>

              Stage is not edited here — it moves through the record&rsquo;s own
              history, so every move has somebody&rsquo;s name against it.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
          <RecordForm
            layout={layout}
            mode={isEdit ? "edit" : "create"}
            initial={record}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
            submitLabel={isEdit ? "Save changes" : `Raise ${noun}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
