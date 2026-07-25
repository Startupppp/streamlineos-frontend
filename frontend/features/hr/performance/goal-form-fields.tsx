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
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { GoalFormValues } from "./goal-schema";

type Employee = { id: string; name?: string | null; email: string };

interface GoalFormFieldsProps {
  form: UseFormReturn<GoalFormValues>;
  isEdit: boolean;
  employees: Employee[];
  watchedUserId: string;
  userPickerOpen: boolean;
  onUserPickerOpenChange: (open: boolean) => void;
  startBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  endBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  onStartDateChange: (value: string) => void;
}

export function GoalFormFields({
  form,
  isEdit,
  employees,
  watchedUserId,
  userPickerOpen,
  onUserPickerOpenChange,
  startBounds,
  endBounds,
  onStartDateChange,
}: GoalFormFieldsProps) {
  return (
    <>
      {!isEdit && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Popover open={userPickerOpen} onOpenChange={onUserPickerOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={userPickerOpen}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">
                  {employees.find((e) => e.id === watchedUserId)?.name ??
                    employees.find((e) => e.id === watchedUserId)?.email ??
                    "Select employee"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup>
                    {employees.map((e) => (
                      <CommandItem
                        key={e.id}
                        value={`${e.name ?? ""} ${e.email}`}
                        onSelect={() => {
                          form.setValue("userId", e.id, {
                            shouldValidate: true,
                          });
                          onUserPickerOpenChange(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            watchedUserId === e.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {e.name ?? e.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
