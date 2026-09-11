"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useUpdatePaymentTerms } from "@/hooks/api/accounting/fin-settings";
import type { PaymentTerm } from "@/types/accounting/fin-settings";

const paymentTermSchema = z.object({
  label: z.string().min(1, "Label is required"),
  days: z.string().min(1, "Days is required"),
  isDefault: z.boolean(),
});
type PaymentTermFormValues = z.infer<typeof paymentTermSchema>;

export function PaymentTermDialog({
  term,
  existingTerms,
  open,
  onOpenChange,
}: {
  term: PaymentTerm | null;
  existingTerms: PaymentTerm[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateTerms = useUpdatePaymentTerms();

  function handleSubmit(values: PaymentTermFormValues) {
    const days = Number(values.days);
    const key = term?.key ?? values.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    let updated: PaymentTerm[];

    if (term) {
      updated = existingTerms.map((t) =>
        t.key === term.key
          ? { key, label: values.label, days, isDefault: values.isDefault }
          : values.isDefault ? { ...t, isDefault: false } : t,
      );
    } else {
      const withoutDefault = values.isDefault
        ? existingTerms.map((t) => ({ ...t, isDefault: false }))
        : existingTerms;
      updated = [...withoutDefault, { key, label: values.label, days, isDefault: values.isDefault }];
    }

    updateTerms.mutate(
      { terms: updated },
      {
        onSuccess: () => { toast.success(term ? "Payment term updated" : "Payment term added"); onOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={term ? "Edit payment term" : "Add payment term"}
      resolver={zodResolver(paymentTermSchema)}
      defaultValues={{
        label: term?.label ?? "",
        days: term ? String(term.days) : "",
        isDefault: term?.isDefault ?? false,
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateTerms.isPending}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Net 30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={0} placeholder="30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="term-isDefault"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel htmlFor="term-isDefault" className="!mt-0">Set as default</FormLabel>
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
