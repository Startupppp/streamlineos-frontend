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
  useCreateRecurringTemplate,
  useUpdateRecurringTemplate,
} from "@/hooks/api/accounting/ar";
import type { RecurringInvoiceTemplate } from "@/types/accounting/ar";

const recurringTemplateSchema = z.object({
  name: z.string().min(1, "Required").max(120),
  clientId: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  nextRunDate: z.string().optional(),
  endDate: z.string().optional(),
  currency: z.string().min(1),
  notes: z.string().optional(),
  isActive: z.boolean(),
});

type TemplateFormValues = z.infer<typeof recurringTemplateSchema>;

interface RecurringTemplateFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: RecurringInvoiceTemplate;
}

export function RecurringTemplateFormSheet({
  open,
  onOpenChange,
  template,
}: RecurringTemplateFormSheetProps) {
  const isEdit = Boolean(template);
  const createMutation = useCreateRecurringTemplate();
  const updateMutation = useUpdateRecurringTemplate();

  const defaultValues: TemplateFormValues = useMemo(
    () => {
      const payload = template?.payload ?? {};
      const payloadCurrency = typeof payload["currency"] === "string" ? payload["currency"] : "INR";
      const payloadNotes = typeof payload["notes"] === "string" ? payload["notes"] : "";
      return {
        name: template?.name ?? "",
        clientId: template?.clientId != null ? String(template.clientId) : "",
        frequency: template?.frequency ?? "MONTHLY",
        nextRunDate: template?.nextRunDate ?? "",
        endDate: template?.endDate ?? "",
        currency: payloadCurrency,
        notes: payloadNotes,
        isActive: template?.isActive ?? true,
      };
    },
    [template],
  );

  const handleSubmit = useCallback(
    (values: TemplateFormValues): void => {
      const payload: Record<string, unknown> = {
        currency: values.currency,
        notes: values.notes ?? undefined,
        status: "ISSUED",
      };

      if (isEdit && template) {
        updateMutation.mutate(
          {
            templateId: template.id,
            name: values.name,
            clientId: values.clientId ? Number(values.clientId) : undefined,
            frequency: values.frequency,
            nextRunDate: values.nextRunDate || undefined,
            endDate: values.endDate || undefined,
            payload,
            isActive: values.isActive,
          },
          {
            onSuccess: () => {
              toast.success("Recurring invoice template updated");
              onOpenChange(false);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        createMutation.mutate(
          {
            name: values.name,
            clientId: values.clientId ? Number(values.clientId) : undefined,
            frequency: values.frequency,
            nextRunDate: values.nextRunDate || undefined,
            endDate: values.endDate || undefined,
            payload,
          },
          {
            onSuccess: () => {
              toast.success("Recurring invoice template created");
              onOpenChange(false);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      }
    },
    [isEdit, template, createMutation, updateMutation, onOpenChange],
  );

  const isPending = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit recurring template" : "New recurring template"}
      resolver={zodResolver(recurringTemplateSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={isEdit ? "Save changes" : "Create"}
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">
              Template name
            </Label>
            <Input
              id="name"
              className="h-8 text-sm"
              placeholder="e.g. Monthly retainer"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientId" className="text-xs font-medium">
              Customer ID <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="clientId"
              type="number"
              className="h-8 text-sm"
              placeholder="Client ID"
              {...form.register("clientId")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-xs font-medium">
                Frequency
              </Label>
              <Select
                value={form.watch("frequency")}
                onValueChange={(v) =>
                  form.setValue("frequency", v as TemplateFormValues["frequency"], {
                    shouldValidate: true,
                  })
                }
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
              <Label htmlFor="currency" className="text-xs font-medium">
                Currency
              </Label>
              <Select
                value={form.watch("currency")}
                onValueChange={(v) => form.setValue("currency", v, { shouldValidate: true })}
              >
                <SelectTrigger id="currency" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-xs font-medium">
                End date <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                className="h-8 text-sm"
                {...form.register("endDate")}
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

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              className="text-sm resize-none"
              rows={2}
              placeholder="Optional notes for generated invoices"
              {...form.register("notes")}
            />
          </div>
        </div>
      )}
    </EntityFormSheet>
  );
}
