"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateModule } from "@/hooks/api/build/modules";
import { useUpdateModule } from "@/hooks/api/build/modules";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { FormSheetChrome } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { formatModuleName } from "@/features/build/modules/lib/module-name";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import type { Module } from "@/types/projects/projects";
import {
  createModuleSchema,
  type CreateModuleForm,
  FORM_DEFAULTS,
} from "./create-module-schema";
import {
  editModuleSchema,
  type EditModuleForm,
  EDIT_FORM_DEFAULTS,
} from "./update-module-schema";
import {
  ModuleCreateFormFields,
  ModuleEditFormFields,
} from "./module-form-fields";

interface BaseProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type ModuleFormSheetProps =
  | (BaseProps & { mode: "create" })
  | (BaseProps & { mode: "edit"; module: Module });

export function ModuleFormSheet(props: ModuleFormSheetProps) {
  const { projectId, open, onOpenChange } = props;
  const isEdit = props.mode === "edit";
  const editingModule = isEdit ? props.module : undefined;

  const createForm = useForm<CreateModuleForm>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: FORM_DEFAULTS,
  });
  const editForm = useForm<EditModuleForm>({
    resolver: zodResolver(editModuleSchema),
    defaultValues: EDIT_FORM_DEFAULTS,
  });

  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule();

  useRegisterDirtyState(
    open &&
      (isEdit ? editForm.formState.isDirty : createForm.formState.isDirty),
  );

  useEffect(() => {
    if (!open) return;
    if (isEdit && editingModule) {
      editForm.reset({
        name: editingModule.name,
        description: editingModule.description ?? "",
        status: editingModule.status,
        startDate: editingModule.startDate ?? "",
        endDate: editingModule.endDate ?? "",
        leadId: editingModule.leadId ?? undefined,
      });
    } else {
      createForm.reset(FORM_DEFAULTS);
    }
  }, [open, isEdit, editingModule, createForm, editForm]);

  const descValue = isEdit
    ? (editForm.watch("description") ?? "")
    : (createForm.watch("description") ?? "");
  const startDateValue = isEdit
    ? (editForm.watch("startDate") ?? "")
    : (createForm.watch("startDate") ?? "");
  const endDateValue = isEdit
    ? (editForm.watch("endDate") ?? "")
    : (createForm.watch("endDate") ?? "");

  const startBounds = planningStartPickerProps();
  const endBounds = planningEndPickerProps({
    startDate: startDateValue,
    mode: "after",
  });

  const setStartDate = useCallback(
    (v: string) => {
      if (isEdit) {
        editForm.setValue("startDate", v, { shouldValidate: true });
        const currentEnd = editForm.getValues("endDate") ?? "";
        const nextEnd = clearEndIfInvalid(v, currentEnd, "after");
        if (nextEnd !== currentEnd)
          editForm.setValue("endDate", nextEnd, { shouldValidate: true });
        return;
      }
      createForm.setValue("startDate", v, { shouldValidate: true });
      const currentEnd = createForm.getValues("endDate") ?? "";
      const nextEnd = clearEndIfInvalid(v, currentEnd, "after");
      if (nextEnd !== currentEnd)
        createForm.setValue("endDate", nextEnd, { shouldValidate: true });
    },
    [isEdit, editForm, createForm],
  );

  const setEndDate = useCallback(
    (v: string) => {
      if (isEdit) editForm.setValue("endDate", v, { shouldValidate: true });
      else createForm.setValue("endDate", v, { shouldValidate: true });
    },
    [isEdit, editForm, createForm],
  );

  const handleLeadChange = useCallback(
    (userId: string | null) => {
      if (isEdit) editForm.setValue("leadId", userId ?? undefined);
      else createForm.setValue("leadId", userId ?? undefined);
    },
    [isEdit, editForm, createForm],
  );

  const handleIconChange = useCallback(
    (icon: string | null) => {
      createForm.setValue("icon", icon ?? undefined, { shouldValidate: true });
    },
    [createForm],
  );

  const handleCreateSubmit = useCallback(
    (data: CreateModuleForm) => {
      const { icon, ...rest } = data;
      createMutation.mutate(
        { ...rest, name: formatModuleName(icon, data.name), projectId },
        {
          onSuccess: () => {
            createForm.reset(FORM_DEFAULTS);
            onOpenChange(false);
            toast.success("Module created");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, createForm, onOpenChange, projectId],
  );

  const handleEditSubmit = useCallback(
    (data: EditModuleForm) => {
      if (!editingModule) return;
      updateMutation.mutate(
        {
          projectId,
          moduleId: editingModule.id,
          version: editingModule.version,
          name: data.name,
          description: data.description,
          status: data.status,
          leadId: data.leadId ?? null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            toast.success("Module updated");
          },
          onError: (err) => {
            if (isWriteConflict(err)) {
              toast.error(
                "Another change was saved first. Reload the page and try again.",
              );
            } else {
              toast.error(getErrorMessage(err));
            }
          },
        },
      );
    },
    [updateMutation, editingModule, projectId, onOpenChange],
  );

  const isPending = isEdit
    ? updateMutation.isPending
    : createMutation.isPending;
  const formId = isEdit ? "module-edit-form" : "module-create-form";

  const footer = (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <LoadingButton
        type="submit"
        form={formId}
        size="sm"
        isPending={isPending}
        loadingText={isEdit ? "Saving…" : "Creating…"}
      >
        {isEdit ? "Save Changes" : "Create Module"}
      </LoadingButton>
    </div>
  );

  const activeLeadId = isEdit
    ? editForm.watch("leadId")
    : createForm.watch("leadId");

  return (
    <FormSheetChrome
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Module" : "Create Module"}
      footer={footer}
    >
      {isEdit ? (
        <form
          id="module-edit-form"
          onSubmit={editForm.handleSubmit(handleEditSubmit)}
          className="space-y-4"
        >
          <ModuleEditFormFields
            form={editForm}
            descValue={descValue}
            startDateValue={startDateValue}
            endDateValue={endDateValue}
            startBounds={startBounds}
            endBounds={endBounds}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            handleLeadChange={handleLeadChange}
            projectId={projectId}
            activeLeadId={activeLeadId}
          />
        </form>
      ) : (
        <form
          id="module-create-form"
          onSubmit={createForm.handleSubmit(handleCreateSubmit)}
          className="space-y-4"
        >
          <ModuleCreateFormFields
            form={createForm}
            descValue={descValue}
            startDateValue={startDateValue}
            endDateValue={endDateValue}
            startBounds={startBounds}
            endBounds={endBounds}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            handleLeadChange={handleLeadChange}
            handleIconChange={handleIconChange}
            projectId={projectId}
            activeLeadId={activeLeadId}
          />
        </form>
      )}
    </FormSheetChrome>
  );
}
