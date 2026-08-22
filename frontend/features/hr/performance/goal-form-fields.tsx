"use client";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";
import type { UseFormReturn } from "react-hook-form";
import type { GoalFormValues } from "./goal-schema";

interface GoalFormFieldsProps {
  form: UseFormReturn<GoalFormValues>;
  isEdit: boolean;
  watchedUserId: string;
  startBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  endBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  onStartDateChange: (value: string) => void;
}

export function GoalFormFields({
  form,
  isEdit,
  watchedUserId,
  startBounds,
  endBounds,
  onStartDateChange,
}: GoalFormFieldsProps) {
  const handleUserIdChange = (userId: string) =>
    form.setValue("userId", userId, { shouldValidate: true });

  return (
    <>
      {!isEdit && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <EmployeePicker value={watchedUserId} onChange={handleUserIdChange} />
          {form.formState.errors.userId?.message && (
            <p className="text-xs text-destructive">
              {form.formState.errors.userId.message}
            </p>
          )}
        </div>
      )}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Complete Q2 OKRs" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Goal details..." rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="targetValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Target Value</FormLabel>
            <FormControl>
              <Input inputMode="numeric" placeholder="100" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={onStartDateChange}
                  placeholder="Pick a date"
                  className="text-sm"
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
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                  className="text-sm"
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
    </>
  );
}
