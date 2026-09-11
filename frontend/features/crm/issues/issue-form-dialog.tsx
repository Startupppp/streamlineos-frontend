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
  /** Absent for a create. */
  record?: IssueRecord;
}

/**
 * Create and edit, rendered from the served description.
 *
 * There is no form here. The controls, their types, their validation and which
 * of them appear on a create are all derived from the layout the server sent,
 * so a record type that grows a field grows a control without this file being
 * touched. What remains is the one thing a description cannot express:
 * converting the renderer's flat strings into the payload the API accepts.
 *
 * `stage` never appears, and not because this file omits it — the description
 * marks it read-only, and `formFields` drops read-only fields. That is what
 * makes the transition route the only way a stage moves, which is what makes the
 * ledger complete rather than conventional.
 */

/** Empty means "not supplied" on create and "clear it" on edit. */
function trimmed(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

/** A date control hands back `YYYY-MM-DD`; the API wants a full instant. */
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

/**
 * Narrowed rather than asserted.
 *
 * The renderer hands back strings and its schema already rejects a value the
 * description does not list, so this only runs on a value that passed — but
 * asserting it would mean a description that lost its options silently posted a
 * severity the API rejects. Falling back to the middle band fails visibly at the
 * boundary instead.
 */
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
      /**
       * `null` rather than `undefined` for the clearable fields on an edit.
       * Somebody removing an owner or a due date is making a real change, and
       * `undefined` would be indistinguishable from not having touched it — so
       * the field would silently keep its old value.
       */
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
              {/*
                Said out loud because it is a rule the form enforces rather than
                a convention: a stage only moves through the ledger.
              */}
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
