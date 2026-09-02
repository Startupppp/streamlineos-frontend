"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getYear, parseISO } from "date-fns";
import { addMonths, subMonths } from "date-fns";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  type Holiday,
} from "@/hooks/api/hr/holidays";
import { VIEW_OPTIONS, type ViewMode, type HolidayFormValues } from "@/features/hr/holidays/lib/holiday-schema";
import { CalendarView } from "@/features/hr/holidays/components/calendar-view";
import { ListView } from "@/features/hr/holidays/components/list-view";
import { YearOverview } from "@/features/hr/holidays/components/year-overview";
import { UpcomingView } from "@/features/hr/holidays/components/upcoming-view";
import { LocationView } from "@/features/hr/holidays/components/location-view";
import { HolidaySheet } from "@/features/hr/holidays/components/holiday-sheet";

export function HolidaysPage() {
  const { data: holidays, isLoading, isError, refetch } = useHolidays();
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();
  const canManage = useCan("hr:leaves:manage");

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [viewDate, setViewDate] = useState(new Date());
  const [yearFilter, setYearFilter] = useState<number | "all">(getYear(new Date()));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const allHolidays = useMemo(() => holidays ?? [], [holidays]);

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
    setSheetOpen(true);
  }
  function handleEditClick(holiday: Holiday) {
    setEditingHoliday(holiday);
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
          <Tabs value={viewMode} onValueChange={handleViewChange}>
            <TabsList>
              {VIEW_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <TabsTrigger
                    key={opt.value}
                    value={opt.value}
                    title={opt.label}
                    className="gap-1.5"
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
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
      ) : isError ? (
        <ErrorState
          title="Couldn't load holidays"
          description="Failed to load the holiday calendar. Please try again."
          onRetry={() => void refetch()}
          className="flex-1"
        />
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

      <HolidaySheet
        open={sheetOpen}
        editingHoliday={editingHoliday}
        isPending={isPending}
        onOpenChange={handleSheetOpenChange}
        onSubmit={handleFormSubmit}
      />
    </PageWrapper>
  );
}
