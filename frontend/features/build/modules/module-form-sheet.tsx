"use client";

import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateModule } from "@/hooks/api/build/advanced";
import { useUpdateModule } from "@/hooks/api/build/modules";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { FormSheetChrome } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { EmojiIconPicker } from "@/components/ui/emoji-icon-picker";
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
  MODULE_STATUSES,
  DESC_MAX,
} from "./create-module-schema";
import {
  editModuleSchema,
  type EditModuleForm,
  EDIT_FORM_DEFAULTS,
} from "./update-module-schema";

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
  const activeStatus = isEdit
    ? editForm.watch("status")
    : createForm.watch("status");

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
          <div className="space-y-1.5">
            <Label htmlFor="mod-edit-name">Name</Label>
            <Input id="mod-edit-name" {...editForm.register("name")} />
            {editForm.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">
                {editForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="mod-edit-desc">Description</Label>
              <span
                className={`text-xs ${descValue.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}
              >
                {descValue.length}/{DESC_MAX}
              </span>
            </div>
            <Textarea
              id="mod-edit-desc"
              rows={3}
              {...editForm.register("description")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              control={editForm.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s
                          .replace(/-/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mod-edit-start">Start Date</Label>
              <DatePicker
                id="mod-edit-start"
                value={startDateValue}
                onChange={setStartDate}
                placeholder="Start date"
                fromDate={startBounds.fromDate}
                fromYear={startBounds.fromYear}
                toYear={startBounds.toYear}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-edit-end">End Date</Label>
              <DatePicker
                id="mod-edit-end"
                value={endDateValue}
                onChange={setEndDate}
                placeholder="End date"
                fromDate={endBounds.fromDate}
                fromYear={endBounds.fromYear}
                toYear={endBounds.toYear}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Lead</Label>
            <Controller
              control={editForm.control}
              name="leadId"
              render={() => (
                <ProjectMemberSelect
                  projectId={projectId}
                  mode="single"
                  value={activeLeadId}
                  onChange={handleLeadChange}
                  allowUnassigned
                  placeholder="No lead"
                  className="h-9 text-sm"
                />
              )}
            />
          </div>
        </form>
      ) : (
        <form
          id="module-create-form"
          onSubmit={createForm.handleSubmit(handleCreateSubmit)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="mod-create-name">Name</Label>
            <div className="flex gap-2">
              <Controller
                control={createForm.control}
                name="icon"
                render={({ field }) => (
                  <EmojiIconPicker
                    id="mod-icon"
                    icon={field.value}
                    onIconChange={handleIconChange}
                  />
                )}
              />
              <Input
                id="mod-create-name"
                className="flex-1"
                {...createForm.register("name")}
              />
            </div>
            {createForm.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">
                {createForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="mod-create-desc">Description</Label>
              <span
                className={`text-xs ${descValue.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}
              >
                {descValue.length}/{DESC_MAX}
              </span>
            </div>
            <Textarea
              id="mod-create-desc"
              rows={3}
              {...createForm.register("description")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              control={createForm.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s
                          .replace(/-/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mod-create-start">Start Date</Label>
              <DatePicker
                id="mod-create-start"
                value={startDateValue}
                onChange={setStartDate}
                placeholder="Start date"
                fromDate={startBounds.fromDate}
                fromYear={startBounds.fromYear}
                toYear={startBounds.toYear}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-create-end">End Date</Label>
              <DatePicker
                id="mod-create-end"
                value={endDateValue}
                onChange={setEndDate}
                placeholder="End date"
                fromDate={endBounds.fromDate}
                fromYear={endBounds.fromYear}
                toYear={endBounds.toYear}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Lead</Label>
            <Controller
              control={createForm.control}
              name="leadId"
              render={() => (
                <ProjectMemberSelect
                  projectId={projectId}
                  mode="single"
                  value={activeLeadId}
                  onChange={handleLeadChange}
                  allowUnassigned
                  placeholder="No lead"
                  className="h-9 text-sm"
                />
              )}
            />
          </div>
        </form>
      )}
    </FormSheetChrome>
  );
}
