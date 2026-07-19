"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EntityFormDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateDimensionValue,
  useUpdateDimensionValue,
  type AccountingDimensionValue,
} from "@/hooks/api/accounting/core";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(50),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensionId: number;
  value?: AccountingDimensionValue;
}

export function DimensionValueFormDialog({ open, onOpenChange, dimensionId, value }: Props) {
  const isEdit = !!value;
  const create = useCreateDimensionValue(dimensionId);
  const update = useUpdateDimensionValue(dimensionId, value?.id ?? 0);
  const mutation = isEdit ? update : create;

  function handleSubmit(values: FormValues) {
    if (isEdit) {
      update.mutate(
        { name: values.name },
        {
          onSuccess: () => {
            toast.success("Value updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => {
          toast.success("Value added");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  return (
    <EntityFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Value" : "Add Value"}
      resolver={zodResolver(schema)}
      defaultValues={{
        name: value?.name ?? "",
        code: value?.code ?? "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      submitLabel={isEdit ? "Save" : "Add"}
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    id="val-code"
                    placeholder="e.g. CC-001"
                    readOnly={isEdit}
                    className={`font-mono text-sm${isEdit ? " bg-muted" : ""}`}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input id="val-name" placeholder="e.g. Engineering" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
