"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function MeetingScheduleFields() {
  const form = useFormContext();
  const tz = form.watch("timezone") as string;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="scheduledAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} type="datetime-local" className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End</FormLabel>
              <FormControl>
                <Input {...field} type="datetime-local" className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (min)</FormLabel>
              <FormControl>
                <Input {...field} type="number" min="1" placeholder="30" className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="UTC" className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {tz ? (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Timezone: <span className="font-medium">{tz}</span>
        </p>
      ) : null}
    </>
  );
}
