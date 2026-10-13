"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { useCreateProductUpdate } from "@/hooks/api/build/managed-product-updates";
import { getErrorMessage } from "@/lib/get-error-message";

const schema = z.object({ body: z.string().min(1, "Body is required") });
type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = { body: "" };

interface Props {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BodyField = ControllerRenderProps<FormValues, "body">;

function renderBody({ field }: { field: BodyField }) {
  return (
    <FormItem>
      <FormLabel>Update</FormLabel>
      <FormControl>
        <Textarea
          {...field}
          placeholder="What should the team know about this product?"
          className={FIELD_CONTROL_CLASS}
          rows={5}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

function renderFields(_form: UseFormReturn<FormValues>) {
  return (
    <FormField control={_form.control} name="body" render={renderBody} />
  );
}

export function ManagedProductUpdateDialog({ managedProductId, open, onOpenChange }: Props) {
  const mutation = useCreateProductUpdate(managedProductId);

  const handleSubmit = useCallback(
    (values: FormValues) => {
      mutation.mutate(
        { body: values.body.trim() },
        {
          onSuccess: () => {
            toast.success("Product update posted.");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [mutation, onOpenChange],
  );

  return (
    <EntityFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Post product update"
      description="Share a status update with the team. It will appear on this product's overview."
      resolver={zodResolver(schema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      submitLabel="Post update"
      resetOnOpen
    >
      {renderFields}
    </EntityFormDialog>
  );
}
