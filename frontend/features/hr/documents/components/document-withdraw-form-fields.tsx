"use client";

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { UseFormReturn } from "react-hook-form";
import { WITHDRAW_REASON_MAX_LENGTH, type DocumentWithdrawValues } from "./document-withdraw-schema";

interface DocumentWithdrawFormFieldsProps {
  form: UseFormReturn<DocumentWithdrawValues>;
}

/** The one thing asked when a document is taken out of the Knowledge Base: why. It goes to the audit log. */
export function DocumentWithdrawFormFields({ form }: DocumentWithdrawFormFieldsProps) {
  return (
    <FormField
      control={form.control}
      name="reason"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Reason</FormLabel>
          <FormControl>
            <Textarea {...field} rows={3} maxLength={WITHDRAW_REASON_MAX_LENGTH} placeholder="For example: replaced by the 2026 handbook" />
          </FormControl>
          <FormDescription>Publishers can read this on the entry, and it is recorded with your name and the time.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
