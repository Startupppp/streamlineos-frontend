"use client";

import type { UseFormReturn } from "react-hook-form";
import { Calendar, Target } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";

export type SprintFieldShape = { name: string; startDate: string; endDate: string; goal?: string };

interface SprintFormFieldsProps {
  form: UseFormReturn<SprintFieldShape>;
  goalPlaceholder?: string;
  allowPastStart?: boolean;
}

export function SprintFormFields({
  form,
  goalPlaceholder = "What do you want to achieve in this sprint?",
  allowPastStart = false,
}: SprintFormFieldsProps) {
  const watchedStartDate = form.watch("startDate");
  const startBounds = planningStartPickerProps({
    existingValue: allowPastStart ? watchedStartDate : undefined,
  });
  const endBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "after",
    existingValue: allowPastStart ? form.watch("endDate") : undefined,
  });

  function handleStartDateChange(value: string) {
    form.setValue("startDate", value, { shouldValidate: true });
    const currentEnd = form.getValues("endDate") ?? "";
    const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
    if (nextEnd !== currentEnd) {
      form.setValue("endDate", nextEnd, { shouldValidate: true });
    }
  }

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Sprint name
            </FormLabel>
            <FormControl>
              <Input placeholder="e.g., Sprint 1" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={handleStartDateChange}
                  fromDate={startBounds.fromDate}
                  fromYear={startBounds.fromYear}
                  toYear={startBounds.toYear}
                />
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
              <FormLabel>End date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  fromDate={endBounds.fromDate}
                  fromYear={endBounds.fromYear}
                  toYear={endBounds.toYear}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="goal"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-status-info-ink" />
              Sprint goal (optional)
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={goalPlaceholder}
                className="resize-none"
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
