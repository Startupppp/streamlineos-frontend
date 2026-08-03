"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type {
  PmWorkspace,
  CreatePmWorkspaceInput,
  UpdatePmWorkspaceInput,
} from "@/types/projects";

const createSchema = z.object({
  name: z.string().min(1, "Required").max(120),
  slug: z
    .string()
    .min(1, "Required")
    .max(60)
    .regex(/^[a-z][a-z0-9-]*$/, "Lowercase letters, digits or hyphens; must start with a letter"),
});

const editSchema = z.object({
  name: z.string().min(1, "Required").max(120),
  status: z.enum(["active", "archived"]),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const CREATE_DEFAULTS: CreateFormValues = { name: "", slug: "" };
const EDIT_DEFAULTS: EditFormValues = { name: "", status: "active" };

function toEditForm(w: PmWorkspace): EditFormValues {
  return { name: w.name, status: w.status };
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
  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: EDIT_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && defaultValues) {
      editForm.reset(toEditForm(defaultValues));
    } else {
      createForm.reset(CREATE_DEFAULTS);
    }
  }, [open, mode, defaultValues, createForm, editForm]);

  function handleCreateSubmit(v: CreateFormValues) {
    if (!onSubmitCreate) return;
    onSubmitCreate({ name: v.name, slug: v.slug });
  }

  function handleEditSubmit(v: EditFormValues) {
    if (!onSubmitEdit || !defaultValues) return;
    onSubmitEdit({
      pmWorkspaceId: defaultValues.pmWorkspaceId,
      name: v.name,
      status: v.status,
    });
  }

  function handleCancel() {
    onOpenChange(false);
  }

  const formId = mode === "edit" ? "pm-workspace-edit-form" : "pm-workspace-create-form";

  const footer = (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
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
      <FormSheetChrome
        open={open}
        onOpenChange={onOpenChange}
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
    );
  }

  return (
    <FormSheetChrome
      open={open}
      onOpenChange={onOpenChange}
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
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormSheetChrome>
  );
}
