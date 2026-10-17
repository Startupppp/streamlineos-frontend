"use client";

import { type UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { LeaveFormValues } from "./leave-request-schema";

const FIELD_LABEL_CLASS =
  "text-xs font-semibold text-foreground/80 uppercase tracking-wider";

export function LeaveHalfDayFields({
  form,
}: {
  form: UseFormReturn<LeaveFormValues>;
}) {
  const halfDay = form.watch("halfDay");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <FormField
        control={form.control}
        name="halfDay"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2.5">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0 cursor-pointer text-xs font-medium text-foreground">
              Half Day Request
            </FormLabel>
          </FormItem>
        )}
      />

      {halfDay ? (
        <FormField
          control={form.control}
          name="halfDayPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Period
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="AM">AM (Morning — first half)</SelectItem>
                  <SelectItem value="PM">PM (Afternoon — second half)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}

export function LeavePriorityField({
  form,
}: {
  form: UseFormReturn<LeaveFormValues>;
}) {
  return (
    <FormField
      control={form.control}
      name="priority"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={FIELD_LABEL_CLASS}>Priority</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="LOW">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-success-fill" />
                  Low
                </span>
              </SelectItem>
              <SelectItem value="MEDIUM">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-warning-fill" />
                  Medium
                </span>
              </SelectItem>
              <SelectItem value="HIGH">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-danger-fill" />
                  High
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
