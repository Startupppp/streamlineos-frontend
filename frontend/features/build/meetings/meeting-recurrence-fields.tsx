"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
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

  function handleRecurrenceChecked(checked: boolean | "indeterminate") {
    setValue("recurrenceEnabled", checked === true, { shouldDirty: true });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="recurrence-toggle"
          checked={recurrenceEnabled}
          onCheckedChange={handleRecurrenceChecked}
        />
        <label htmlFor="recurrence-toggle" className="cursor-pointer text-sm font-medium">
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
                <FormLabel>Repeat</FormLabel>
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
                <FormLabel>End date (optional)</FormLabel>
                <FormControl>
                  <DatePicker
                    ariaLabel="Recurrence end date"
                    clearable
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Pick an end date"
                  />
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
