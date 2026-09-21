"use client";

import { useEffect } from "react";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormSheetChrome } from "@/components/shared";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import type {
  PmWorkspace,
  CreatePmWorkspaceInput,
  UpdatePmWorkspaceInput,
} from "@/types/projects";
import { lowerCaseFieldChange } from "@/lib/case-field";
import {
  createPmWorkspaceFormSchema,
  editPmWorkspaceFormSchema,
  type CreatePmWorkspaceFormInput,
  type EditPmWorkspaceFormInput,
} from "./pm-workspace-form-schema";

const CREATE_DEFAULTS: CreatePmWorkspaceFormInput = { name: "", slug: "" };
const EDIT_DEFAULTS: EditPmWorkspaceFormInput = { name: "", status: "active" };

const PM_WORKSPACE_STATUSES = ["active", "archived"] as const;

function toEditForm(w: PmWorkspace): EditPmWorkspaceFormInput {
  return {
    name: w.name,
    status: PM_WORKSPACE_STATUSES.find((v) => v === w.status) ?? "active",
  };
}

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create";
  defaultValues?: undefined;
  onSubmitCreate: (input: CreatePmWorkspaceInput) => void;
  onSubmitEdit?: never;
  isPending?: boolean;
}

interface EditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit";
  defaultValues: PmWorkspace;
  onSubmitCreate?: never;
  onSubmitEdit: (input: UpdatePmWorkspaceInput & { pmWorkspaceId: string }) => void;
  isPending?: boolean;
}

type Props = CreateProps | EditProps;

export function PmWorkspaceFormSheet({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmitCreate,
  onSubmitEdit,
  isPending,
}: Props) {
  const createForm = useForm<CreatePmWorkspaceFormInput>({
    resolver: zodResolver(createPmWorkspaceFormSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  const editForm = useForm<EditPmWorkspaceFormInput>({
    resolver: zodResolver(editPmWorkspaceFormSchema),
    defaultValues: EDIT_DEFAULTS,
  });

  const isDirty = open && (createForm.formState.isDirty || editForm.formState.isDirty);
  useRegisterBuildDirtyState(isDirty);
  const { requestLeave, dialogProps } = useUnsavedChangesGuard({ isDirty });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && defaultValues) {
      editForm.reset(toEditForm(defaultValues));
    } else {
      createForm.reset(CREATE_DEFAULTS);
    }
  }, [open, mode, defaultValues, createForm, editForm]);

  function handleCreateSubmit(v: CreatePmWorkspaceFormInput) {
    if (!onSubmitCreate) return;
    onSubmitCreate({ name: v.name, slug: v.slug });
  }

  function handleEditSubmit(v: EditPmWorkspaceFormInput) {
    if (!onSubmitEdit || !defaultValues) return;
    onSubmitEdit({
      pmWorkspaceId: defaultValues.pmWorkspaceId,
      name: v.name,
      status: v.status,
    });
  }

  function handleClose() {
    requestLeave(() => onOpenChange(false));
  }

  function handleSheetOpenChange(nextOpen: boolean) {
    if (!nextOpen) handleClose();
    else onOpenChange(true);
  }

  const formId = mode === "edit" ? "pm-workspace-edit-form" : "pm-workspace-create-form";

  const footer = (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClose}>
        Cancel
      </Button>
      <LoadingButton
        type="submit"
        form={formId}
        size="sm"
        isPending={isPending}
        loadingText="Saving…"
      >
        {mode === "edit" ? "Save Changes" : "Create Workspace"}
      </LoadingButton>
    </div>
  );

  if (mode === "edit") {
    return (
      <>
        <FormSheetChrome
          open={open}
          onOpenChange={handleSheetOpenChange}
          title="Edit PM Workspace"
          description="Update workspace details."
          footer={footer}
        >
          <Form {...editForm}>
            <form
              id={formId}
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Workspace name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </FormSheetChrome>
        <UnsavedChangesDialog {...dialogProps} />
      </>
    );
  }

  return (
    <>
      <FormSheetChrome
        open={open}
        onOpenChange={handleSheetOpenChange}
        title="New PM Workspace"
        description="Create a workspace to group products, teams and projects."
        footer={footer}
      >
        <Form {...createForm}>
          <form
            id={formId}
            onSubmit={createForm.handleSubmit(handleCreateSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={createForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Workspace name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={createForm.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="my-workspace"
                      onChange={lowerCaseFieldChange(field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </FormSheetChrome>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  );
}
