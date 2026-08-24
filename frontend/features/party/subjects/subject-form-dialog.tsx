"use client";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecordForm, type RecordFormValues } from "@/features/renderer";
import { subjectLayout, subjectRecord } from "@/lib/renderer/subject-layout";
import { useCreateSubject, useUpdateSubject } from "@/hooks/api/party/subjects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Subject, SubjectType } from "@/types/party/subjects";

export interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: SubjectType;
  /** Absent for a create. */
  subject?: Subject;
}

/**
 * Create and edit, rendered from the tenant's declaration.
 *
 * `reference` and `status` belong to every subject whatever its type, so they
 * are split back out of the form's flat values here; everything else is a
 * declared field and travels as `values`. This split is the only place the two
 * representations meet on the way in, mirroring `subjectRecord` on the way out.
 */
export function SubjectFormDialog({ open, onOpenChange, type, subject }: SubjectFormDialogProps) {
  const layout = subjectLayout(type);
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();

  const isEdit = !!subject;
  const isSubmitting = createSubject.isPending || updateSubject.isPending;

  function splitValues(submitted: RecordFormValues) {
    const declared: Record<string, unknown> = {};
    for (const field of type.fields) {
      const value = submitted[field.name];
      if (value !== undefined && value.trim()) declared[field.name] = value.trim();
    }

    return {
      reference: submitted.reference?.trim() || undefined,
      status: submitted.status?.trim() || undefined,
      values: declared,
    };
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(submitted: RecordFormValues) {
    const { reference, status, values } = splitValues(submitted);

    if (subject) {
      updateSubject.mutate(
        { subjectId: subject.subjectId, reference: reference ?? null, status: status ?? null, values },
        {
          onSuccess: () => {
            toast.success(`${type.singular} updated`);
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createSubject.mutate(
      { subjectTypeId: type.subjectTypeId, ...(reference ? { reference } : {}), ...(status ? { status } : {}), values },
      {
        onSuccess: () => {
          toast.success(`${type.singular} created`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `Edit ${type.singular.toLowerCase()}` : `New ${type.singular.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              The fields below are the ones your organisation declared for {type.plural.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
          <RecordForm
            layout={layout}
            initial={subject ? subjectRecord(subject) : undefined}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
            submitLabel={isEdit ? "Save changes" : `Create ${type.singular.toLowerCase()}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
