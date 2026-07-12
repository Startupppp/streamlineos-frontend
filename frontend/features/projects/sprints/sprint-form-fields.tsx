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

export type SprintFieldShape = { name: string; startDate: string; endDate: string; goal?: string };

interface SprintFormFieldsProps {
  form: UseFormReturn<SprintFieldShape>;
  goalPlaceholder?: string;
}

export function SprintFormFields({
  form,
  goalPlaceholder = "What do you want to achieve in this sprint?",
}: SprintFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
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
          name="startDate"
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
          name="endDate"
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
        name="goal"
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
