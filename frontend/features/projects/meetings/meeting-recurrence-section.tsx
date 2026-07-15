"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function MeetingRecurrenceSection() {
  const form = useFormContext();
  const recurrenceEnabled = form.watch("recurrenceEnabled") as boolean;

  function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    form.setValue("recurrenceEnabled", e.target.checked);
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
        <label htmlFor="recurrence-toggle" className="cursor-pointer text-sm font-medium">
          Recurring meeting
        </label>
      </div>

      {recurrenceEnabled ? (
        <div className="space-y-3 pl-5">
          <FormField
            control={form.control}
            name="recurrenceFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Repeat</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
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
            control={form.control}
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
      ) : null}
    </div>
  );
}
