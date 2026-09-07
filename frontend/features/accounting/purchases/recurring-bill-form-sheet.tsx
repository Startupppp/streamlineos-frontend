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
type RecurringBillFrequency = RecurringBillFormValues["frequency"];

interface RecurringBillFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: RecurringBillTemplate;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRecurringBillFrequency(value: string): value is RecurringBillFrequency {
  return value === "DAILY" || value === "WEEKLY" || value === "MONTHLY" || value === "QUARTERLY" || value === "YEARLY";
}

function readString(payload: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const value = payload?.[key];
  return typeof value === "string" ? value : fallback;
}

interface FirstBillItem {
  description: string;
  quantity: string;
  rate: string;
  gstRate: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFirstItem(payload: Record<string, unknown> | undefined): FirstBillItem | undefined {
  const items = payload?.["items"];
  if (!Array.isArray(items) || items.length === 0) return undefined;
  const first: unknown = items[0];
  if (!isRecord(first)) return undefined;
  const record = first;
  const description = typeof record.description === "string" ? record.description : "";
  const quantity = record.quantity !== undefined ? String(record.quantity) : "";
  const rate = record.rate !== undefined ? String(record.rate) : "";
  const gstRate = record.gstRate !== undefined ? String(record.gstRate) : "";
  return { description, quantity, rate, gstRate };
}

export function RecurringBillFormSheet({
  open,
  onOpenChange,
  template,
}: RecurringBillFormSheetProps) {
  const isEdit = Boolean(template);
  const createMutation = useCreateRecurringBill();
  const updateMutation = useUpdateRecurringBill(template?.id ?? 0);
  const vendorsQuery = useVendorsOutstanding({ limit: 200 });
  const vendors = vendorsQuery.data?.data ?? [];

  const firstItem = readFirstItem(template?.payload);

  const defaultValues: RecurringBillFormValues = useMemo(
    () => ({
      name: template?.name ?? "",
      vendorId: template?.vendorId != null ? String(template.vendorId) : "",
      frequency: template && isRecurringBillFrequency(template.frequency) ? template.frequency : "MONTHLY",
      nextRunDate: template?.nextRunDate ?? "",
      isActive: template?.isActive ?? true,
      billDate: readString(template?.payload, "billDate", todayIso()),
      expenseAccountCode: readString(template?.payload, "expenseAccountCode", "5990"),
      notes: readString(template?.payload, "notes", ""),
      lineDescription: firstItem?.description ?? "",
      lineQuantity: firstItem?.quantity ?? "",
      lineRate: firstItem?.rate ?? "",
      lineGstRate: firstItem?.gstRate ?? "",
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
              Template name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              className="text-sm"
              placeholder="e.g. Monthly office rent"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendorId" className="text-xs font-medium">
              Vendor <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("vendorId")}
              onValueChange={(v) => form.setValue("vendorId", v, { shouldValidate: true })}
            >
              <SelectTrigger id="vendorId" className="text-sm">
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
            {vendorsQuery.isError && (
              <p className="text-xs text-destructive" role="alert">
                Couldn&apos;t load vendors: {getErrorMessage(vendorsQuery.error)}
              </p>
            )}
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
                <SelectTrigger id="frequency" className="text-sm">
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
                className="text-sm"
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
                <SelectTrigger id="isActive" className="text-sm">
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
                  className="text-sm"
                  {...form.register("billDate")}
                />
                {form.formState.errors.billDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.billDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expenseAccountCode" className="text-xs font-medium">
                  Expense account <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expenseAccountCode"
                  className="text-sm font-mono"
                  {...form.register("expenseAccountCode")}
                />
                {form.formState.errors.expenseAccountCode && (
                  <p className="text-xs text-destructive">{form.formState.errors.expenseAccountCode.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lineDescription" className="text-xs font-medium">
                Line item description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lineDescription"
                className="text-sm"
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
                  Qty <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lineQuantity"
                  className="text-sm"
                  placeholder="1"
                  {...form.register("lineQuantity")}
                />
                {form.formState.errors.lineQuantity && (
                  <p className="text-xs text-destructive">{form.formState.errors.lineQuantity.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lineRate" className="text-xs font-medium">
                  Rate <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lineRate"
                  className="text-sm"
                  placeholder="0.00"
                  {...form.register("lineRate")}
                />
                {form.formState.errors.lineRate && (
                  <p className="text-xs text-destructive">{form.formState.errors.lineRate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lineGstRate" className="text-xs font-medium">
                  GST % <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("lineGstRate")}
                  onValueChange={(v) =>
                    form.setValue("lineGstRate", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="lineGstRate" className="text-sm">
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
                {form.formState.errors.lineGstRate && (
                  <p className="text-xs text-destructive">{form.formState.errors.lineGstRate.message}</p>
                )}
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
