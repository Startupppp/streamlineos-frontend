"use client";

import type { UseFormReturn } from "react-hook-form";
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
import type { PlanningPickerBounds } from "@/lib/date-constraints";
import { CYCLE_DESCRIPTION_MAX, type CycleFormValues } from "./cycle-form-schema";

interface CycleFormFieldsProps {
  form: UseFormReturn<CycleFormValues>;
  isEdit: boolean;
  watchedDescription: string;
  watchedStartDate: string;
  duplicateName: boolean;
  startPickerBounds: PlanningPickerBounds;
  endPickerBounds: PlanningPickerBounds;
  handleStartDateChange: (value: string) => void;
  handleEndDateChange: (value: string) => void;
}

export function CycleFormFields({
  form,
  isEdit,
  watchedDescription,
  watchedStartDate,
  duplicateName,
  startPickerBounds,
  endPickerBounds,
  handleStartDateChange,
  handleEndDateChange,
}: CycleFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Cycle 1, Q3 Planning..."
                {...field}
              />
            </FormControl>
            <FormMessage />
            {!form.formState.errors.name && duplicateName ? (
              <p
                className="text-xs text-status-warning-ink-strong"
                aria-live="polite"
              >
                A cycle with this name already exists in this project.
              </p>
            ) : null}
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Description</FormLabel>
              <span className="text-xs tabular-nums text-muted-foreground">
                {watchedDescription.length}/{CYCLE_DESCRIPTION_MAX}
              </span>
            </div>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Optional description..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {isEdit ? (
        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="What should this cycle achieve?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      <FormField
        control={form.control}
        name="capacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Capacity</FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="Story points this cycle can absorb"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={() => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={watchedStartDate}
                  onChange={handleStartDateChange}
                  placeholder="Start date"
                  fromDate={startPickerBounds.fromDate}
                  fromYear={startPickerBounds.fromYear}
                  toYear={startPickerBounds.toYear}
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
                  onChange={handleEndDateChange}
                  placeholder="End date"
                  fromDate={endPickerBounds.fromDate}
                  fromYear={endPickerBounds.fromYear}
                  toYear={endPickerBounds.toYear}
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
