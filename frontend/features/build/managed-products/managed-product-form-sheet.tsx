"use client";

import { useEffect, useState } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createManagedProductSchema,
  type CreateManagedProductFormValues,
  editManagedProductSchema,
  type EditManagedProductFormValues,
  toCreateManagedProductInput,
} from "@/features/build/managed-products/managed-product-schema";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormSheetChrome } from "@/components/shared";
import type { ManagedProduct, CreateManagedProductInput } from "@/types/projects";
import { useUpdateManagedProduct } from "@/hooks/api/build/managed-products";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
import { TicketConflictDialog } from "@/features/build/ticket-details/ticket-conflict-dialog";
import { ManagedProductCreateFields } from "./managed-product-create-fields";
import { ManagedProductEditFields } from "./managed-product-edit-fields";

const CREATE_DEFAULTS: CreateManagedProductFormValues = {
  name: "",
  key: "",
  description: "",
  ownerId: "",
};

const EDIT_DEFAULTS: EditManagedProductFormValues = {
  name: "",
  description: "",
  ownerId: "",
  status: "active",
};

const MANAGED_PRODUCT_STATUSES = ["active", "archived"] as const;

function toEditForm(p: ManagedProduct): EditManagedProductFormValues {
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
  onSubmitEdit?: never;
  isPending?: never;
}

type Props = CreateProps | EditProps;

export function ManagedProductFormSheet({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmitCreate,
  isPending,
}: Props) {
  const updateProduct = useUpdateManagedProduct();
  const [conflictFields, setConflictFields] = useState<TicketConflictFieldDiff[] | null>(null);
  const submitPending = mode === "edit" ? updateProduct.isPending : (isPending ?? false);

  const createForm = useForm<CreateManagedProductFormValues>({
    resolver: zodResolver(createManagedProductSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  const editForm = useForm<EditManagedProductFormValues>({
    resolver: zodResolver(editManagedProductSchema),
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

  function handleCreateSubmit(v: CreateManagedProductFormValues) {
    if (!onSubmitCreate) return;
    onSubmitCreate(toCreateManagedProductInput(v));
  }

  function handleEditSubmit(v: EditManagedProductFormValues) {
    if (!defaultValues) return;
    const input = {
      managedProductId: defaultValues.id,
      version: defaultValues.version,
      name: v.name,
      description: v.description || null,
      ownerId: v.ownerId || null,
      status: v.status,
    };
    updateProduct.mutate(input, {
      onSuccess: () => {
        toast.success("Managed product updated");
        onOpenChange(false);
      },
      onError: (e) => {
        if (isApiError(e) && e.status === 409) {
          type Comparison = { key: string; label: string; serverValue: string; pendingValue: string };
          const comparisons: Comparison[] = [
            { key: "name", label: "Name", serverValue: defaultValues.name, pendingValue: v.name },
            { key: "status", label: "Status", serverValue: defaultValues.status, pendingValue: v.status },
            {
              key: "description",
              label: "Description",
              serverValue: defaultValues.description ?? "",
              pendingValue: v.description ?? "",
            },
          ];
          const diffs: TicketConflictFieldDiff[] = [];
          for (const { key, label, serverValue, pendingValue } of comparisons) {
            if (serverValue !== pendingValue) {
              diffs.push({ key, label, serverValue: serverValue || "Not set", pendingValue: pendingValue || "Not set" });
            }
          }
          setConflictFields(diffs.length > 0 ? diffs : [{ key: "version", label: "Version", serverValue: "changed on server", pendingValue: "stale" }]);
          return;
        }
        toast.error(getErrorMessage(e));
      },
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
        isPending={submitPending}
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
        <ManagedProductEditFields form={editForm} formId={formId} onSubmit={handleEditSubmit} />
        <TicketConflictDialog
          open={conflictFields !== null}
          fields={conflictFields ?? []}
          onKeepMine={() => setConflictFields(null)}
          onDiscard={() => { setConflictFields(null); onOpenChange(false); }}
        />
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
      <ManagedProductCreateFields form={createForm} formId={formId} onSubmit={handleCreateSubmit} />
    </FormSheetChrome>
  );
}
