"use client";

import { useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormSheetChrome, MemberPicker } from "@/components/shared";
import type {
  ManagedProduct,
  CreateManagedProductInput,
  UpdateManagedProductInput,
} from "@/types/projects";
import { upperCaseFieldChange } from "@/lib/case-field";

const createSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  key: z
    .string()
    .min(1, "Required")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Uppercase letters, digits, hyphens, or underscores only"),
  description: z.string(),
  ownerId: z.string(),
});

const editSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  description: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "archived"]),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const CREATE_DEFAULTS: CreateFormValues = {
  name: "",
  key: "",
  description: "",
  ownerId: "",
};

const EDIT_DEFAULTS: EditFormValues = {
  name: "",
  description: "",
  ownerId: "",
  status: "active",
};

const MANAGED_PRODUCT_STATUSES = ["active", "archived"] as const;

function toEditForm(p: ManagedProduct): EditFormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    ownerId: p.ownerId ?? "",
    status: MANAGED_PRODUCT_STATUSES.find((v) => v === p.status) ?? "active",
  };
}

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create";
  defaultValues?: undefined;
  onSubmitCreate: (input: CreateManagedProductInput) => void;
  onSubmitEdit?: never;
  isPending?: boolean;
}

interface EditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit";
  defaultValues: ManagedProduct;
  onSubmitCreate?: never;
  onSubmitEdit: (input: UpdateManagedProductInput & { managedProductId: number }) => void;
  isPending?: boolean;
}

type Props = CreateProps | EditProps;

export function ManagedProductFormSheet({
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

  const activeFormIsDirty =
    mode === "create" ? createForm.formState.isDirty : editForm.formState.isDirty;

  useRegisterDirtyState(open && activeFormIsDirty);

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
    onSubmitCreate({
      name: v.name,
      key: v.key,
      ...(v.description ? { description: v.description } : {}),
      ...(v.ownerId ? { ownerId: v.ownerId } : {}),
    });
  }

  function handleEditSubmit(v: EditFormValues) {
    if (!onSubmitEdit || !defaultValues) return;
    onSubmitEdit({
      managedProductId: defaultValues.id,
      name: v.name,
      description: v.description || null,
      ownerId: v.ownerId || null,
      status: v.status,
    });
  }

  function handleCancel() {
    onOpenChange(false);
  }

  const formId = mode === "edit" ? "managed-product-edit-form" : "managed-product-create-form";

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
        {mode === "edit" ? "Save Changes" : "Create Product"}
      </LoadingButton>
    </div>
  );

  if (mode === "edit") {
    return (
      <FormSheetChrome
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Managed Product"
        description="Update managed product details."
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
                    <Input {...field} placeholder="Product name" />
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
            <FormField
              control={editForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Describe this product…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner (optional)</FormLabel>
                  <FormControl>
                    <MemberPicker
                      mode="single"
                      value={field.value || undefined}
                      onChange={(id) => field.onChange(id ?? "")}
                      allowUnassigned
                      placeholder="Select owner"
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

  return (
    <FormSheetChrome
      open={open}
      onOpenChange={onOpenChange}
      title="New Managed Product"
      description="Create a product to link projects and track delivery."
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
                  <Input {...field} placeholder="Product name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="PROD"
                    onChange={upperCaseFieldChange(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Describe this product…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner (optional)</FormLabel>
                <FormControl>
                  <MemberPicker
                    mode="single"
                    value={field.value || undefined}
                    onChange={(id) => field.onChange(id ?? "")}
                    allowUnassigned
                    placeholder="Select owner"
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
