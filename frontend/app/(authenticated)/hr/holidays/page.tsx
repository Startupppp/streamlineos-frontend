"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Trash2, Pencil, RotateCcw, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  type Holiday,
} from "@/hooks/api/hr/holidays";

const holidaySchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().min(1, "Date is required"),
  recurring: z.boolean(),
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function HolidayItem({
  holiday,
  canManage,
  onEdit,
  onDelete,
}: {
  holiday: Holiday;
  canManage: boolean;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
}) {
  function handleEditClick() {
    onEdit(holiday);
  }
  function handleDeleteClick() {
    onDelete(holiday.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-sm"
    >
      <div className="bg-muted rounded-md px-2.5 py-1.5 text-center min-w-[48px]">
        <p className="text-xs font-medium text-muted-foreground">{format(parseISO(holiday.date), "MMM")}</p>
        <p className="text-lg font-bold text-foreground leading-none">{format(parseISO(holiday.date), "d")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{holiday.name}</p>
        <p className="text-xs text-muted-foreground">{format(parseISO(holiday.date), "EEEE, MMMM d")}</p>
      </div>
      {holiday.recurring && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" /> Recurring
        </Badge>
      )}
      {canManage && (
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function HolidaysPage() {
  const { data: holidays, isLoading } = useHolidays();
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();
  const canManage = useCan("hr:leaves:manage");

  const [viewDate, setViewDate] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [yearView, setYearView] = useState(false);

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { recurring: false, name: "", date: "" },
  });

  const monthHolidays = useMemo(() => {
    if (!holidays) return [];
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return holidays.filter((h) => {
      const d = parseISO(h.date);
      return d >= start && d <= end;
    });
  }, [holidays, viewDate]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return { days: eachDayOfInterval({ start, end }), startPad: getDay(start) };
  }, [viewDate]);

  const holidaysByMonth = useMemo(() => {
    if (!holidays) return {} as Record<string, Holiday[]>;
    return holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
      const month = format(parseISO(h.date), "MMMM yyyy");
      if (!acc[month]) acc[month] = [];
      acc[month].push(h);
      return acc;
    }, {});
  }, [holidays]);

  function handlePrevMonth() {
    setViewDate((d) => subMonths(d, 1));
  }
  function handleNextMonth() {
    setViewDate((d) => addMonths(d, 1));
  }
  function handleToggleView() {
    setYearView((v) => !v);
  }
  function handleCreateClick() {
    setEditingHoliday(null);
    form.reset({ recurring: false, name: "", date: "" });
    setSheetOpen(true);
  }
  function handleEditClick(holiday: Holiday) {
    setEditingHoliday(holiday);
    form.reset({ name: holiday.name, date: holiday.date, recurring: holiday.recurring });
    setSheetOpen(true);
  }
  function handleDeleteClick(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Holiday deleted"),
      onError: () => toast.error("Failed to delete holiday"),
    });
  }
  function handleSheetOpenChange(open: boolean) {
    if (!open) {
      setSheetOpen(false);
      setEditingHoliday(null);
    }
  }
  function handleFormSubmit(values: HolidayFormValues) {
    if (editingHoliday) {
      updateMutation.mutate(
        { id: editingHoliday.id, ...values },
        {
          onSuccess: () => {
            toast.success("Holiday updated");
            setSheetOpen(false);
            setEditingHoliday(null);
          },
          onError: () => toast.error("Failed to update holiday"),
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success("Holiday added");
          setSheetOpen(false);
          form.reset();
        },
        onError: () => toast.error("Failed to add holiday"),
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <PageWrapper
      title="Holiday Calendar"
      subtitle="Manage organization holidays"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleView}>
            {yearView ? (
              <>
                <CalendarDays className="h-4 w-4 mr-2" />
                Month View
              </>
            ) : (
              <>
                <List className="h-4 w-4 mr-2" />
                All Holidays
              </>
            )}
          </Button>
          {canManage && (
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" /> Add Holiday
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 rounded-lg" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      ) : yearView ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="year"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-6"
          >
            {Object.keys(holidaysByMonth).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No holidays added yet</p>
                {canManage && (
                  <Button className="mt-4" onClick={handleCreateClick}>
                    <Plus className="h-4 w-4 mr-2" /> Add Holiday
                  </Button>
                )}
              </div>
            ) : (
              Object.entries(holidaysByMonth).map(([month, items]) => (
                <div key={month}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{month}</h3>
                  <div className="space-y-2">
                    {items.map((h) => (
                      <HolidayItem
                        key={h.id}
                        holiday={h}
                        canManage={canManage}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="month"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="bg-card border border-border rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold text-foreground">{format(viewDate, "MMMM yyyy")}</h2>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
                {Array.from({ length: calendarDays.startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {calendarDays.days.map((day) => {
                  const dayHolidays = holidays?.filter((h) => isSameDay(parseISO(h.date), day)) ?? [];
                  const isHoliday = dayHolidays.length > 0;
                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative flex flex-col items-center justify-start rounded-md p-1.5 min-h-[40px] text-sm ${
                        isHoliday ? "bg-blue-50 border border-blue-200" : "hover:bg-muted"
                      }`}
                    >
                      <span className={`font-medium ${isHoliday ? "text-primary" : "text-foreground"}`}>
                        {format(day, "d")}
                      </span>
                      {isHoliday && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayHolidays.slice(0, 2).map((_, idx) => (
                            <span key={idx} className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {format(viewDate, "MMMM")} Holidays
              </h3>
              {monthHolidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-lg border border-border">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground text-sm">No holidays in {format(viewDate, "MMMM")}</p>
                  {canManage && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={handleCreateClick}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add one
                    </Button>
                  )}
                </div>
              ) : (
                monthHolidays.map((h) => (
                  <HolidayItem
                    key={h.id}
                    holiday={h}
                    canManage={canManage}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>{editingHoliday ? "Edit Holiday" : "Add Holiday"}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holiday Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Independence Day" {...field} />
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
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
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
              </div>
              <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Saving..." : editingHoliday ? "Update Holiday" : "Add Holiday"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
