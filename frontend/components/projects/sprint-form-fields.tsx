"use client";

import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
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

/**
 * Shared name + start/end date + goal fields used by both
 * create-sprint-dialog and edit-sprint-dialog. The `goal` placeholder
 * differs slightly between the two contexts.
 */
interface SprintFormFieldsProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  goalPlaceholder?: string;
}

export function SprintFormFields<T extends FieldValues>({
  form,
  goalPlaceholder = "What do you want to achieve in this sprint?",
}: SprintFormFieldsProps<T>) {
  return (
    <>
      <FormField
        control={form.control}
        name={"name" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
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
          name={"startDate" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start date</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"endDate" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>End date</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name={"goal" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-cyan-500" />
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
