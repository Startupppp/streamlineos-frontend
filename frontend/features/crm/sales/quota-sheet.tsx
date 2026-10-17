"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_CONTROL_CLASS, FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCreateSalesQuota } from "@/hooks/api/crm/sales";
import { getErrorMessage } from "@/lib/get-error-message";
import { QUOTA_DEFAULTS, QUOTA_PERIOD_LABELS, quotaFormSchema, type QuotaFormValues } from "./quota-form-schema";

interface QuotaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERIODS = Object.entries(QUOTA_PERIOD_LABELS);

export function QuotaSheet({ open, onOpenChange }: QuotaSheetProps) {
  const create = useCreateSalesQuota();

  function handleSubmit(values: QuotaFormValues) {
    create.mutate(
      { ...values, notes: values.notes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Quota set");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormSheet<QuotaFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Set a quota"
      description="A revenue target for one rep over a period. Attainment is tracked against won deals."
      resolver={zodResolver(quotaFormSchema)}
      defaultValues={QUOTA_DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={create.isPending}
      submitLabel="Set quota"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rep</FormLabel>
                <FormControl>
                  <UserCombobox value={field.value} onChange={field.onChange} placeholder="Choose a rep…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={FIELD_CONTROL_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {PERIODS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starts</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ends</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="targetRevenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target revenue</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormSheet>
  );
}
