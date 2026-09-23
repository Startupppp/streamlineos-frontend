"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { WizardSectionHeading } from "@/components/wizard-shell";
import { formatCurrencyForBilling } from "@/lib/format-utils";
import {
  GST_RATE_CHOICES,
  type GenerateInvoiceFormValues,
} from "./generate-invoice-schema";

interface InvoiceDetailsFieldsProps {
  form: UseFormReturn<GenerateInvoiceFormValues>;
  entryCount: number;
  totalHours: number;
  subtotal: number;
  currency: string;
  projectName: string;
}

export function InvoiceDetailsFields({
  form,
  entryCount,
  totalHours,
  subtotal,
  currency,
  projectName,
}: InvoiceDetailsFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <WizardSectionHeading>Carried over from the selected time</WizardSectionHeading>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border bg-muted/30 px-3 py-3">
        <dt className="text-xs text-muted-foreground">Project</dt>
        <dd className="truncate text-right text-xs font-medium text-foreground">
          {projectName}
        </dd>
        <dt className="text-xs text-muted-foreground">Entries</dt>
        <dd className="text-right font-mono tabular-nums text-xs font-medium text-foreground">
          {entryCount}
        </dd>
        <dt className="text-xs text-muted-foreground">Hours</dt>
        <dd className="text-right font-mono tabular-nums text-xs font-medium text-foreground">
          {totalHours.toFixed(2)}
        </dd>
        <dt className="text-xs text-muted-foreground">Subtotal</dt>
        <dd className="text-right font-mono tabular-nums text-xs font-semibold text-foreground">
          {formatCurrencyForBilling(subtotal, currency)}
        </dd>
      </dl>

      <WizardSectionHeading>Invoice</WizardSectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="gstRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GST rate</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-label="GST rate">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {GST_RATE_CHOICES.map((rate) => (
                    <SelectItem key={rate} value={rate}>
                      {rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue as</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-label="Invoice status">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ISSUED">Issued</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="font-mono tabular-nums"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due date</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} placeholder="Shown on the invoice" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
