"use client";

import { useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateRecurringBill,
  useUpdateRecurringBill,
  type RecurringBillTemplate,
} from "@/hooks/api/accounting/ap";
import { useVendorsOutstanding } from "@/hooks/api/accounting";

const recurringBillFormSchema = z.object({
  name: z.string().min(1, "Required").max(120),
  vendorId: z.string().min(1, "Select a vendor"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  nextRunDate: z.string().optional(),
  isActive: z.boolean(),
  billDate: z.string().min(1, "Required"),
  expenseAccountCode: z.string().min(1, "Required"),
  notes: z.string().optional(),
  lineDescription: z.string().min(1, "Required"),
  lineQuantity: z.string().min(1, "Required"),
  lineRate: z.string().min(1, "Required"),
  lineGstRate: z.string().min(1, "Required"),
});

type RecurringBillFormValues = z.infer<typeof recurringBillFormSchema>;

interface RecurringBillFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: RecurringBillTemplate;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecurringBillFormSheet({
  open,
  onOpenChange,
  template,
}: RecurringBillFormSheetProps) {
  const isEdit = Boolean(template);
  const createMutation = useCreateRecurringBill();
  const updateMutation = useUpdateRecurringBill(template?.id ?? 0);
  const vendorsQuery = useVendorsOutstanding({ pageSize: 200 });
  const vendors = vendorsQuery.data?.items ?? [];

  const firstItem = template?.payload?.items?.[0];

  const defaultValues: RecurringBillFormValues = useMemo(
    () => ({
      name: template?.name ?? "",
      vendorId: template?.vendorId != null ? String(template.vendorId) : "",
      frequency: template?.frequency ?? "MONTHLY",
      nextRunDate: template?.nextRunDate ?? "",
      isActive: template?.isActive ?? true,
      billDate: template?.payload?.billDate ?? todayIso(),
      expenseAccountCode: template?.payload?.expenseAccountCode ?? "5990",
      notes: template?.payload?.notes ?? "",
      lineDescription: firstItem?.description ?? "",
      lineQuantity: firstItem ? String(firstItem.quantity) : "",
      lineRate: firstItem ? String(firstItem.rate) : "",
      lineGstRate: firstItem ? String(firstItem.gstRate) : "",
    }),
    [template, firstItem],
  );

  const handleSubmit = useCallback(
    (values: RecurringBillFormValues): void => {
      const payload = {
        name: values.name,
        vendorId: Number(values.vendorId),
        frequency: values.frequency,
        nextRunDate: values.nextRunDate || undefined,
        isActive: values.isActive,
        payload: {
          vendorId: Number(values.vendorId),
          billDate: values.billDate,
          expenseAccountCode: values.expenseAccountCode,
          notes: values.notes || undefined,
          reverseCharge: false as const,
          discount: 0,
          items: [
            {
              description: values.lineDescription,
              quantity: Number(values.lineQuantity),
              rate: Number(values.lineRate),
              gstRate: Number(values.lineGstRate),
            },
          ],
        },
      };

      if (isEdit) {
        updateMutation.mutate(payload, {
          onSuccess: () => {
            toast.success("Recurring bill updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => {
            toast.success("Recurring bill created");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [isEdit, createMutation, updateMutation, onOpenChange],
  );

  const isPending = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit recurring bill" : "New recurring bill"}
      resolver={zodResolver(recurringBillFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={isEdit ? "Save changes" : "Create"}
      resetOnOpen
    >
      {(form) => {
        function handleFrequencyChange(v: string): void {
          const FREQUENCY_VALUES: ReadonlyArray<string> = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];
          type FrequencyValue = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
          function isFrequency(val: string): val is FrequencyValue {
            return FREQUENCY_VALUES.includes(val);
          }
          if (isFrequency(v)) form.setValue("frequency", v, { shouldValidate: true });
        }

        return (
        <div className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">
              Template name
            </Label>
            <Input
              id="name"
              className="h-8 text-sm"
              placeholder="e.g. Monthly office rent"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendorId" className="text-xs font-medium">
              Vendor
            </Label>
            <Select
              value={form.watch("vendorId")}
              onValueChange={(v) => form.setValue("vendorId", v, { shouldValidate: true })}
            >
              <SelectTrigger id="vendorId" className="h-8 text-sm">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                    {v.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.vendorId && (
              <p className="text-xs text-destructive">{form.formState.errors.vendorId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-xs font-medium">
                Frequency
              </Label>
              <Select
                value={form.watch("frequency")}
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger id="frequency" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextRunDate" className="text-xs font-medium">
                Next run date
              </Label>
              <Input
                id="nextRunDate"
                type="date"
                className="h-8 text-sm"
                {...form.register("nextRunDate")}
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="isActive" className="text-xs font-medium">
                Status
              </Label>
              <Select
                value={form.watch("isActive") ? "true" : "false"}
                onValueChange={(v) =>
                  form.setValue("isActive", v === "true", { shouldValidate: true })
                }
              >
                <SelectTrigger id="isActive" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-t border-border/60 pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Bill template
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="billDate" className="text-xs font-medium">
                  Bill date
                </Label>
                <Input
                  id="billDate"
                  type="date"
                  className="h-8 text-sm"
                  {...form.register("billDate")}
                />
                {form.formState.errors.billDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.billDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expenseAccountCode" className="text-xs font-medium">
                  Expense account
                </Label>
                <Input
                  id="expenseAccountCode"
                  className="h-8 text-sm font-mono"
                  {...form.register("expenseAccountCode")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lineDescription" className="text-xs font-medium">
                Line item description
              </Label>
              <Input
                id="lineDescription"
                className="h-8 text-sm"
                placeholder="e.g. Office rent"
                {...form.register("lineDescription")}
              />
              {form.formState.errors.lineDescription && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.lineDescription.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lineQuantity" className="text-xs font-medium">
                  Qty
                </Label>
                <Input
                  id="lineQuantity"
                  className="h-8 text-sm"
                  placeholder="1"
                  {...form.register("lineQuantity")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lineRate" className="text-xs font-medium">
                  Rate
                </Label>
                <Input
                  id="lineRate"
                  className="h-8 text-sm"
                  placeholder="0.00"
                  {...form.register("lineRate")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lineGstRate" className="text-xs font-medium">
                  GST %
                </Label>
                <Select
                  value={form.watch("lineGstRate")}
                  onValueChange={(v) =>
                    form.setValue("lineGstRate", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="lineGstRate" className="h-8 text-sm">
                    <SelectValue placeholder="0" />
                  </SelectTrigger>
                  <SelectContent>
                    {["0", "5", "12", "18", "28"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                className="text-sm resize-none"
                rows={2}
                placeholder="Optional notes"
                {...form.register("notes")}
              />
            </div>
          </div>
        </div>
        );
      }}
    </EntityFormSheet>
  );
}
