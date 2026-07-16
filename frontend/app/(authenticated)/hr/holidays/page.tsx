"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
  isAfter,
  startOfDay,
  getYear,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
} from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarDays,
  Pencil,
  RotateCcw,
  List,
  Calendar,
  Globe,
  Clock,
} from "lucide-react";
import { TrashIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/api-client";
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  type Holiday,
} from "@/hooks/api/hr/holidays";

const holidaySchema = z.object({
  name: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name must be at most 100 characters")
        .refine((v) => /[a-zA-Z]/.test(v), "Name must contain at least one letter")
        .refine((v) => /[a-zA-Z]{3}/.test(v), "Name must contain at least 3 letters")
        .refine((v) => !/\s{2,}/.test(v), "Name cannot have consecutive spaces"),
    ),
  date: z.string().min(1, "Date is required"),
  recurring: z.boolean(),
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "calendar" | "list" | "year" | "upcoming" | "location";

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "list", label: "List", icon: List },
  { value: "year", label: "Year", icon: CalendarDays },
  { value: "upcoming", label: "Upcoming", icon: Clock },
  { value: "location", label: "By Location", icon: Globe },
];

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
          <Button variant="ghost" size="icon" className="w-7" onClick={handleEditClick}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AnimatedIconButton
            icon={TrashIcon}
            variant="ghost"
            size="icon"
            className="w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            iconSize={14}
            onClick={handleDeleteClick}
          />
        </div>
      )}
    </motion.div>
  );
}

function CalendarView({
  holidays,
  viewDate,
  canManage,
  onPrev,
  onNext,
  onEdit,
  onDelete,
  onAdd,
}: {
  holidays: Holiday[];
  viewDate: Date;
  canManage: boolean;
  onPrev: () => void;
  onNext: () => void;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const monthHolidays = useMemo(() => {
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

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <AnimatedIconButton icon={ChevronLeftIcon} variant="ghost" size="icon" iconSize={16} onClick={onPrev} />
          <h2 className="text-lg font-semibold text-foreground">{format(viewDate, "MMMM yyyy")}</h2>
          <AnimatedIconButton icon={ChevronRightIcon} variant="ghost" size="icon" iconSize={16} onClick={onNext} />
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
            const dayHolidays = holidays.filter((h) => isSameDay(parseISO(h.date), day));
            const isHoliday = dayHolidays.length > 0;
            return (
              <div
                key={day.toISOString()}
                className={`relative flex flex-col items-center justify-start rounded-md p-1.5 min-h-[40px] text-sm ${
                  isHoliday ? "bg-primary/5 border border-primary/20" : "hover:bg-muted"
                }`}
                title={isHoliday ? dayHolidays.map((h) => h.name).join(", ") : undefined}
              >
                <span className={`font-medium ${isHoliday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                {isHoliday && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayHolidays.slice(0, 2).map((_, idx) => (
                      <span key={idx} className="w-1.5 h-1.5 rounded-full bg-primary" />
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
            <CalendarDays className="w-8 text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground text-sm">No holidays in {format(viewDate, "MMMM")}</p>
            {canManage && (
              <AnimatedIconButton icon={PlusIcon} variant="ghost" size="sm" className="mt-2" iconSize={14} onClick={onAdd}>
                {" Add one"}
              </AnimatedIconButton>
            )}
          </div>
        ) : (
          monthHolidays.map((h) => (
            <HolidayItem
              key={h.id}
              holiday={h}
              canManage={canManage}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ListView({
  holidays,
  canManage,
  onEdit,
  onDelete,
  onAdd,
  yearFilter,
}: {
  holidays: Holiday[];
  canManage: boolean;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  yearFilter: number | "all";
}) {
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let items = holidays;
    if (yearFilter !== "all") {
      items = items.filter((h) => getYear(parseISO(h.date)) === yearFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((h) => h.name.toLowerCase().includes(q));
    }
    return [...items].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [holidays, yearFilter, search, sortDir]);

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleSortToggle() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <SearchInput
          placeholder="Search holidays..."
          value={search}
          onValueChange={handleSearchChange}
           className="max-w-xs"
         />
        <Button variant="outline" size="sm" className="text-xs" onClick={handleSortToggle}>
          Date {sortDir === "asc" ? "↑" : "↓"}
        </Button>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 rounded-lg border border-border">
          <List className="w-8 text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground text-sm font-medium">
            {search ? "No holidays match your search" : "No holidays for this period"}
          </p>
          {canManage && !search && (
            <AnimatedIconButton icon={PlusIcon} iconSize={16} size="sm" className="mt-3" onClick={onAdd}>
              {" Add Holiday"}
            </AnimatedIconButton>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((h) => (
            <HolidayItem key={h.id} holiday={h} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function YearOverview({
  holidays,
  yearFilter,
}: {
  holidays: Holiday[];
  yearFilter: number | "all";
}) {
  const year = yearFilter === "all" ? getYear(new Date()) : yearFilter;
  const months = eachMonthOfInterval({ start: startOfYear(new Date(year, 0)), end: endOfYear(new Date(year, 0)) });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const monthHolidays = holidays.filter((h) => {
          const d = parseISO(h.date);
          return d >= monthStart && d <= monthEnd;
        });
        return (
          <div key={monthStart.toISOString()} className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {format(monthStart, "MMMM")}
            </p>
            {monthHolidays.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No holidays</p>
            ) : (
              <div className="space-y-1">
                {monthHolidays.map((h) => (
                  <div key={h.id} className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground tabular-nums w-5 shrink-0">
                      {format(parseISO(h.date), "d")}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{h.name}</span>
                    {h.recurring && <RotateCcw className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
            {monthHolidays.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                {monthHolidays.length} holiday{monthHolidays.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UpcomingView({
  holidays,
  canManage,
  onEdit,
  onDelete,
  onAdd,
}: {
  holidays: Holiday[];
  canManage: boolean;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return [...holidays]
      .filter((h) => isAfter(parseISO(h.date), today) || isSameDay(parseISO(h.date), today))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays]);

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 rounded-lg border border-border">
        <Clock className="w-8 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground text-sm font-medium">No upcoming holidays</p>
        {canManage && (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} size="sm" className="mt-3" onClick={onAdd}>
            {" Add Holiday"}
          </AnimatedIconButton>
        )}
      </div>
    );
  }

  const grouped = upcoming.reduce<Record<string, Holiday[]>>((acc, h) => {
    const key = format(parseISO(h.date), "MMMM yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{month}</h3>
          <div className="space-y-2">
            {items.map((h) => (
              <HolidayItem key={h.id} holiday={h} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LocationView() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 rounded-lg border border-border">
      <Globe className="w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm font-medium text-muted-foreground">Location-based holidays not yet configured</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Assign offices or regions to employees in Org settings to group holidays by location.
      </p>
    </div>
  );
}

export default function HolidaysPage() {
  const { data: holidays, isLoading } = useHolidays();
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();
  const canManage = useCan("hr:leaves:manage");

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [viewDate, setViewDate] = useState(new Date());
  const [yearFilter, setYearFilter] = useState<number | "all">(getYear(new Date()));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { recurring: false, name: "", date: "" },
  });

  const allHolidays = holidays ?? [];

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allHolidays.forEach((h) => years.add(getYear(parseISO(h.date))));
    const current = getYear(new Date());
    years.add(current);
    years.add(current + 1);
    return [...years].sort((a, b) => a - b);
  }, [allHolidays]);

  function handlePrevMonth() {
    setViewDate((d) => subMonths(d, 1));
  }
  function handleNextMonth() {
    setViewDate((d) => addMonths(d, 1));
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
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }
  function handleSheetOpenChange(open: boolean) {
    if (!open) {
      setSheetOpen(false);
      setEditingHoliday(null);
    }
  }
  function handleFormSubmit(values: HolidayFormValues) {
    const trimmedName = values.name.trim().toLowerCase();
    if (editingHoliday) {
      updateMutation.mutate(
        { id: editingHoliday.id, ...values },
        {
          onSuccess: () => {
            toast.success("Holiday updated");
            setSheetOpen(false);
            setEditingHoliday(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      const duplicate = allHolidays.find(
        (h) => h.date === values.date && h.name.trim().toLowerCase() === trimmedName,
      );
      if (duplicate) {
        toast.error("A holiday with this name already exists on this date.");
        return;
      }
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success("Holiday added");
          setSheetOpen(false);
          form.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  function handleViewChange(v: string) {
    setViewMode(v as ViewMode);
  }

  function handleYearFilterChange(v: string) {
    setYearFilter(v === "all" ? "all" : Number(v));
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const showYearFilter = viewMode === "list" || viewMode === "year";

  return (
    <PageWrapper
      title="Holiday Calendar"
      subtitle="Manage organization holidays across the year"
      actions={
        <div className="flex gap-2 items-center flex-nowrap">
          {showYearFilter && (
            <Select value={String(yearFilter)} onValueChange={handleYearFilterChange}>
              <SelectTrigger className={cn("w-28", FILTER_SELECT_TRIGGER)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All years</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center border border-border rounded-md overflow-hidden h-8">
            {VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = viewMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  onClick={() => setViewMode(opt.value)}
                  className={`flex items-center gap-1 px-2.5 h-full text-xs font-medium transition-colors border-r last:border-r-0 border-border ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {canManage && (
            <AnimatedIconButton icon={PlusIcon} iconSize={14} onClick={handleCreateClick} size="sm">
              {" Add Holiday"}
            </AnimatedIconButton>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 rounded-lg" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {viewMode === "calendar" && (
              <CalendarView
                holidays={allHolidays}
                viewDate={viewDate}
                canManage={canManage}
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onAdd={handleCreateClick}
              />
            )}
            {viewMode === "list" && (
              <ListView
                holidays={allHolidays}
                canManage={canManage}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onAdd={handleCreateClick}
                yearFilter={yearFilter}
              />
            )}
            {viewMode === "year" && (
              <YearOverview holidays={allHolidays} yearFilter={yearFilter} />
            )}
            {viewMode === "upcoming" && (
              <UpcomingView
                holidays={allHolidays}
                canManage={canManage}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onAdd={handleCreateClick}
              />
            )}
            {viewMode === "location" && <LocationView />}
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
              <SheetBody className="px-6 py-5 space-y-4">
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
    </PageWrapper>
  );
}
