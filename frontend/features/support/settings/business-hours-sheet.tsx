"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Clock, X, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { TIMEZONES, DAY_ORDER, DAY_LABELS, type BusinessHoursForm } from "./business-hours-form.schema";

interface BusinessHoursSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  form: ReturnType<typeof useForm<BusinessHoursForm>>;
  onSubmit: (data: BusinessHoursForm) => void;
  isPending: boolean;
}

function HolidayChip({ date, form }: { date: string; form: ReturnType<typeof useForm<BusinessHoursForm>> }) {
  const handleRemove = useCallback(() => {
    form.setValue(
      "holidays",
      form.getValues("holidays").filter((d) => d !== date),
      { shouldDirty: true },
    );
  }, [date, form]);

  return (
    <Badge variant="outline" className="text-[10px] h-6 pl-2 pr-1 gap-1 bg-muted">
      {date}
      <button type="button" onClick={handleRemove} aria-label={`Remove ${date}`} className="hover:text-destructive">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export function BusinessHoursSheet({ open, onOpenChange, mode, form, onSubmit, isPending }: BusinessHoursSheetProps) {
  const [holidayInput, setHolidayInput] = useState("");
  const is24x7 = form.watch("is24x7");
  const holidays = form.watch("holidays");

  const handleHolidayInputChange = useCallback((value: string) => setHolidayInput(value), []);

  const handleAddHoliday = useCallback(() => {
    if (!holidayInput) return;
    const current = form.getValues("holidays");
    if (!current.includes(holidayInput)) {
      form.setValue("holidays", [...current, holidayInput].sort(), { shouldDirty: true });
    }
    setHolidayInput("");
  }, [holidayInput, form]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-[560px] overflow-hidden">
        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">
                {mode === "create" ? "Create Business Hours" : "Edit Business Hours"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define a working-hours calendar for SLA tracking
              </p>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="px-6 py-4">
          <Form {...form}>
            <form
              id="business-hours-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Standard Support Hours" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="timezone" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="is24x7" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <FormLabel className="mb-0">Open 24/7</FormLabel>
                      <p className="text-[11px] text-muted-foreground">Skip the weekly schedule below</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isDefault" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <FormLabel className="mb-0">Default Calendar</FormLabel>
                      <p className="text-[11px] text-muted-foreground">Used when a policy has no explicit calendar</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              {!is24x7 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Weekly Schedule</span>
                  </div>
                  <div className="space-y-2">
                    {DAY_ORDER.map((day) => {
                      const enabled = form.watch(`${day}.enabled`);
                      return (
                        <div key={day} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 w-28 shrink-0">
                            <Checkbox
                              id={`day-${day}`}
                              checked={enabled}
                              onCheckedChange={(checked) => form.setValue(`${day}.enabled`, checked === true, { shouldDirty: true })}
                            />
                            <Label htmlFor={`day-${day}`} className="text-xs font-medium cursor-pointer">
                              {DAY_LABELS[day]}
                            </Label>
                          </div>
                          <Input
                            type="time"
                            className="h-8 text-xs"
                            disabled={!enabled}
                            {...form.register(`${day}.start`)}
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input
                            type="time"
                            className="h-8 text-xs"
                            disabled={!enabled}
                            {...form.register(`${day}.end`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>Holidays</span>
                </div>
                <div className="flex items-center gap-2">
                  <DatePicker value={holidayInput ?? ""} onChange={handleHolidayInputChange} placeholder="Pick a date" className="h-8" />
                  <AnimatedIconButton type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleAddHoliday} icon={PlusIcon} />
                </div>
                {holidays.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {holidays.map((date) => (
                      <HolidayChip key={date} date={date} form={form} />
                    ))}
                  </div>
                )}
              </div>
            </form>
          </Form>
        </SheetBody>

        <SheetFooter className="px-6 py-3 border-t shrink-0">
          <Button type="button" variant="outline" className="flex-1 h-9" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" form="business-hours-form" className="flex-1 h-9" disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
