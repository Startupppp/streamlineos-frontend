"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePaymentRun } from "@/hooks/api/accounting/ap";
import { getErrorMessage } from "@/lib/get-error-message";

const paymentRunFormSchema = z.object({
  name: z.string().min(1, "Required").max(120),
  scheduledDate: z.string().optional(),
  dueBefore: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
});

type PaymentRunFormValues = z.infer<typeof paymentRunFormSchema>;

const DEFAULT_VALUES: PaymentRunFormValues = {
  name: "",
  scheduledDate: "",
  dueBefore: "",
  minAmount: "",
  maxAmount: "",
};

interface PaymentRunFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentRunFormSheet({ open, onOpenChange }: PaymentRunFormSheetProps) {
  const router = useRouter();
  const createMutation = useCreatePaymentRun();

  function handleSubmit(values: PaymentRunFormValues): void {
    createMutation.mutate(
      {
        name: values.name,
        scheduledDate: values.scheduledDate || undefined,
        filters: {
          dueBefore: values.dueBefore || undefined,
          minAmount: values.minAmount ? Number(values.minAmount) : undefined,
          maxAmount: values.maxAmount ? Number(values.maxAmount) : undefined,
        },
      },
      {
        onSuccess: (run) => {
          toast.success(`Payment run "${run.name}" created`);
          onOpenChange(false);
          router.push(`/accounting/payment-runs/${run.id}`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Payment Run"
      description="Select outstanding bills to batch into a payment run."
      resolver={zodResolver(paymentRunFormSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
      submitLabel="Create run"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="run-name" className="text-xs font-medium">
              Name <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="run-name"
              {...form.register("name")}
              placeholder="e.g. July vendor payments"
              className="text-sm"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scheduled-date" className="text-xs font-medium">
              Scheduled date
            </Label>
            <Input
              id="scheduled-date"
              type="date"
              {...form.register("scheduledDate")}
              className="text-sm"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Filters (optional)
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="due-before" className="text-xs font-medium">
                Due before
              </Label>
              <Input
                id="due-before"
                type="date"
                {...form.register("dueBefore")}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="min-amount" className="text-xs font-medium">
                  Min amount
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("minAmount")}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-amount" className="text-xs font-medium">
                  Max amount
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("maxAmount")}
                  placeholder="Any"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </EntityFormSheet>
  );
}
