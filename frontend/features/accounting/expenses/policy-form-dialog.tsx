"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { FinExpensePolicy } from "@/types/accounting/expenses";

const policySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  maxAmount: z.string().optional(),
  requiresReceiptAbove: z.string().optional(),
  requiresApprovalAbove: z.string().optional(),
  isActive: z.boolean(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: FinExpensePolicy | null;
  onSubmit: (values: PolicyFormValues, policyId: number | null) => void;
  isSubmitting: boolean;
}

function defaultValues(policy: FinExpensePolicy | null): PolicyFormValues {
  return {
    name: policy?.name ?? "",
    maxAmount: policy?.maxAmount ?? "",
    requiresReceiptAbove: policy?.requiresReceiptAbove ?? "",
    requiresApprovalAbove: policy?.requiresApprovalAbove ?? "",
    isActive: policy?.isActive ?? true,
  };
}

export function PolicyFormDialog({
  open,
  onOpenChange,
  policy,
  onSubmit,
  isSubmitting,
}: PolicyFormDialogProps) {
  const handleSubmit = (values: PolicyFormValues) => {
    onSubmit(values, policy?.id ?? null);
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={policy ? "Edit Policy" : "New Expense Policy"}
      description="Define rules for expense submissions."
      resolver={zodResolver(policySchema)}
      defaultValues={defaultValues(policy)}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={policy ? "Save changes" : "Create policy"}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Policy name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} className="text-sm" placeholder="Travel expenses" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="maxAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max amount</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" className="text-sm" placeholder="5000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiresReceiptAbove"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Require receipt above</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" className="text-sm" placeholder="500" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiresApprovalAbove"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Require approval above</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" className="text-sm" placeholder="2000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm !mt-0">Active</FormLabel>
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
