"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MeetingFormValues } from "./meeting-form-schema";

export function MeetingRecurrenceFields() {
  const { control, watch, setValue } = useFormContext<MeetingFormValues>();
  const recurrenceEnabled = watch("recurrenceEnabled");

  function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("recurrenceEnabled", e.target.checked);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="recurrence-toggle"
          checked={recurrenceEnabled}
          onChange={handleToggle}
          className="rounded border-border"
        />
        <label htmlFor="recurrence-toggle" className="text-sm font-medium cursor-pointer">
          Recurring meeting
        </label>
      </div>

      {recurrenceEnabled && (
        <div className="pl-5 space-y-3">
          <FormField
            control={control}
            name="recurrenceFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Repeat</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="custom">Custom weekday</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="recurrenceEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">End date (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="date" className="text-xs" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
