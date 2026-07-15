"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
          <div className="space-y-1.5">
            <Label className="text-xs">Policy name *</Label>
            <Input
              {...form.register("name")}
              className="text-sm"
              placeholder="Travel expenses"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Max amount</Label>
              <Input
                {...form.register("maxAmount")}
                type="number"
                step="0.01"
                min="0"
                className="text-sm"
                placeholder="5000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Require receipt above</Label>
              <Input
                {...form.register("requiresReceiptAbove")}
                type="number"
                step="0.01"
                min="0"
                className="text-sm"
                placeholder="500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Require approval above</Label>
              <Input
                {...form.register("requiresApprovalAbove")}
                type="number"
                step="0.01"
                min="0"
                className="text-sm"
                placeholder="2000"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
            <Label className="text-sm">Active</Label>
          </div>
        </>
      )}
    </EntityFormDialog>
  );
}
