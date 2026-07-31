"use client";

import { useFormContext } from "react-hook-form";
import { User } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import type { ProjectGoalFormValues } from "./goal-form-schema";

interface GoalOwnershipFieldsProps {
  isEdit: boolean;
  orgUsers: Array<{ id: string; name?: string | null; email?: string | null }> | undefined;
}

export function GoalOwnershipFields({ isEdit, orgUsers }: GoalOwnershipFieldsProps) {
  const { control, watch, setValue, getValues } = useFormContext<ProjectGoalFormValues>();

  const watchedStartDate = watch("startDate");
  const startBounds = planningStartPickerProps({
    existingValue: isEdit ? watchedStartDate : undefined,
  });
  const dueBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "after",
    existingValue: isEdit ? watch("dueDate") : undefined,
  });

  function handleStartDateChange(value: string) {
    setValue("startDate", value, { shouldValidate: true });
    const currentDue = getValues("dueDate") ?? "";
    const nextDue = clearEndIfInvalid(value, currentDue, "after");
    if (nextDue !== currentDue) {
      setValue("dueDate", nextDue, { shouldValidate: true });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <User className="h-4 w-4" />
        <span>Ownership &amp; Timeline</span>
      </div>
      <FormField
        control={control}
        name="ownerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">Owner</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {orgUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name ?? user.email ?? user.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Start Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={handleStartDateChange}
                  placeholder="Pick a date"
                  className="text-sm"
                  fromDate={startBounds.fromDate}
                  fromYear={startBounds.fromYear}
                  toYear={startBounds.toYear}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Due Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                  className="text-sm"
                  fromDate={dueBounds.fromDate}
                  fromYear={dueBounds.fromYear}
                  toYear={dueBounds.toYear}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
