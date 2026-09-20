"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { holidaySchema, type HolidayFormValues } from "../lib/holiday-schema";
import type { Holiday } from "@/hooks/api/hr/holidays";

interface HolidaySheetProps {
  open: boolean;
  editingHoliday: Holiday | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HolidayFormValues) => void;
}

function HolidayFormInner({
  editingHoliday,
  isPending,
  onOpenChange,
  onSubmit,
}: Omit<HolidaySheetProps, "open">) {
  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: editingHoliday
      ? { name: editingHoliday.name, date: editingHoliday.date, recurring: editingHoliday.recurring }
      : { recurring: false, name: "", date: "" },
  });

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onOpenChange(false);
  }

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{editingHoliday ? "Edit Holiday" : "Add Holiday"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holiday Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Independence Day" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recurring"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="font-medium cursor-pointer">Recurring</FormLabel>
                      <p className="text-xs text-muted-foreground">Repeat annually on the same date</p>
                    </div>
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving..." className="w-full">
                {editingHoliday ? "Update Holiday" : "Add Holiday"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export function HolidaySheet({ open, editingHoliday, isPending, onOpenChange, onSubmit }: HolidaySheetProps) {
  if (!open) return null;
  return (
    <HolidayFormInner
      key={editingHoliday?.id ?? "new"}
      editingHoliday={editingHoliday}
      isPending={isPending}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}
