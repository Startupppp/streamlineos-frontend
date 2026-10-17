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
import { BuildDateTimeField } from "@/features/build/shared/build-datetime-field";
import type { MeetingFormValues } from "./meeting-form-schema";

export function MeetingSchedulingFields() {
  const { control, watch } = useFormContext<MeetingFormValues>();
  const tz = watch("timezone");

  return (
    <>
      <div className="grid gap-4">
        <FormField
          control={control}
          name="scheduledAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start <span className="text-destructive">*</span></FormLabel>
              <BuildDateTimeField
                value={field.value}
                onChange={field.onChange}
                dateLabel="Start date"
                timeLabel="Start time"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="endAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End</FormLabel>
              <BuildDateTimeField
                value={field.value}
                onChange={field.onChange}
                dateLabel="End date"
                timeLabel="End time"
                clearable
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (min)</FormLabel>
              <FormControl>
                <Input {...field} type="number" min="1" placeholder="30" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="UTC" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {tz ? (
        <p className="text-sm text-muted-foreground">
          Times use {tz}.
        </p>
      ) : null}
    </>
  );
}
