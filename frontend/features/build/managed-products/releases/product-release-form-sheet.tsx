"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import {
  useCreateManagedProductRelease,
  useUpdateManagedProductRelease,
} from "@/hooks/api/build/managed-product-releases";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { ProductReleaseFormFields } from "./product-release-form-fields";
import { releaseFormSchema } from "./product-release-form-schema";
import type { ReleaseFormValues } from "./product-release-form-schema";

interface ProductReleaseFormSheetProps {
  managedProductId: number;
  editTarget?: ManagedProductRelease;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = "product-release-form";

function toFormValues(r: ManagedProductRelease): ReleaseFormValues {
  return {
    name: r.name,
    version: r.version,
    description: r.description ?? "",
    releaseDate: r.releaseDate ?? "",
    status: r.status,
    ownerUserId: r.ownerUserId ?? null,
    qaState: r.qaState ?? null,
    deploymentEvidenceUrl: r.deploymentEvidenceUrl ?? null,
  };
}

export function ProductReleaseFormSheet({
  managedProductId,
  editTarget,
  open,
  onOpenChange,
}: ProductReleaseFormSheetProps) {
  const isEdit = !!editTarget;
  const createRelease = useCreateManagedProductRelease(managedProductId);
  const updateRelease = useUpdateManagedProductRelease(managedProductId);
  const isPending = isEdit ? updateRelease.isPending : createRelease.isPending;

  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: editTarget
      ? toFormValues(editTarget)
      : {
          name: "",
          version: "",
          description: "",
          releaseDate: "",
          status: "draft",
          ownerUserId: null,
          qaState: null,
          deploymentEvidenceUrl: null,
        },
    values: editTarget ? toFormValues(editTarget) : undefined,
  });

  useRegisterDirtyState(form.formState.isDirty && open);

  function handleOpenChange(next: boolean) {
    if (!next && isPending) return;
    if (!next) {
      form.reset();
      setConflictError(null);
    }
    onOpenChange(next);
  }

  function handleCancel() {
    handleOpenChange(false);
  }

  function handleReloadRetry() {
    setConflictError(null);
    onOpenChange(false);
  }

  const handleSubmit = useCallback(
    (values: ReleaseFormValues) => {
      if (isPending) return;
      setConflictError(null);
      const data = {
        name: values.name,
        version: values.version,
        description: values.description || null,
        releaseDate: values.releaseDate || null,
        status: values.status,
        ownerUserId: values.ownerUserId ?? null,
        qaState: values.qaState ?? null,
        deploymentEvidenceUrl: values.deploymentEvidenceUrl || null,
      };
      const onSuccess = () => {
        toast.success(isEdit ? "Release updated." : "Release created.");
        form.reset();
        setConflictError(null);
        onOpenChange(false);
      };
      const onError = (e: unknown) => {
        if (isWriteConflict(e)) {
          setConflictError("This release was changed by someone else while you were editing. Reload to see the latest version, then re-apply your changes.");
        } else {
          toast.error(getErrorMessage(e));
        }
      };
      if (isEdit && editTarget) {
        updateRelease.mutate(
          { releaseId: editTarget.id, expectedRevision: editTarget.recordRevision, ...data },
          { onSuccess, onError },
        );
      } else {
        createRelease.mutate(data, { onSuccess, onError });
      }
    },
    [isPending, isEdit, editTarget, createRelease, updateRelease, form, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{isEdit ? "Edit release" : "New release"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the name, version, date, or status. Dates stay on the calendar."
              : "Name the drop, set a version, and optionally a ship date."}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {conflictError ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="mb-2">{conflictError}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleReloadRetry}>
                Reload and retry
              </Button>
            </div>
          ) : null}
          <Form {...form}>
            <form id={FORM_ID} onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col" noValidate>
              <ProductReleaseFormFields />
            </form>
          </Form>
        </div>
        <SheetFooter className="flex flex-row justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form={FORM_ID}
            size="sm"
            isPending={isPending}
            loadingText={isEdit ? "Saving…" : "Creating…"}
          >
            {isEdit ? "Save changes" : "Create release"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
