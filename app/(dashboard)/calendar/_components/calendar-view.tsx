"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  parseISO,
  addHours,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
} from "@/lib/api/hooks/calendar";
import { toast } from "sonner";
import type { View, SlotInfo, CalendarEvent } from "./big-calendar-wrapper";

const BigCalendarWrapper = dynamic(
  () =>
    import("./big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false }
);

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#bd882c",
};

const EVENT_CATEGORIES = [
  "general",
  "meeting",
  "deadline",
  "reminder",
  "leave",
  "project",
  "other",
] as const;

type EventCategory = (typeof EVENT_CATEGORIES)[number];

interface FormData {
  title: string;
  description: string;
  allDay: boolean;
  color: string;
  category: EventCategory;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

function toDefaultForm(slot?: { start: Date; end: Date } | null): FormData {
  const start = slot?.start ?? new Date();
  const end = slot?.end ?? addHours(start, 1);
  return {
    title: "",
    description: "",
    allDay: false,
    color: "blue",
    category: "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
  };
}

const VIEWS: View[] = ["month", "week", "day"];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>(() =>
    toDefaultForm(null)
  );

  const rangeStart = useMemo(
    () => startOfMonth(subMonths(currentDate, 0)),
    [currentDate]
  );
  const rangeEnd = useMemo(
    () => endOfMonth(addMonths(currentDate, 1)),
    [currentDate]
  );

  const { data: events = [] } = useCalendarEvents(rangeStart, rangeEnd);
  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const calEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.startDate),
        end: new Date(e.endDate),
        allDay: e.allDay ?? false,
        resource: {
          color: e.color,
          category: e.category,
          description: e.description,
        },
      })),
    [events]
  );

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const slot = { start: slotInfo.start, end: slotInfo.end };
    setSelectedSlot(slot);
    setFormData(toDefaultForm(slot));
    setIsCreateOpen(true);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setSelectedSlot(null);
    setFormData(toDefaultForm(null));
    setIsCreateOpen(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setIsCreateOpen(false);
    setSelectedSlot(null);
  }, []);

  const handleFieldChange = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleCreate = useCallback(async () => {
    if (!formData.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    let startDate: Date;
    let endDate: Date;

    if (formData.allDay) {
      startDate = parseISO(formData.startDate);
      endDate = parseISO(formData.endDate);
    } else {
      startDate = parseISO(`${formData.startDate}T${formData.startTime}`);
      endDate = parseISO(`${formData.endDate}T${formData.endTime}`);
    }

    if (endDate <= startDate) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: formData.allDay,
        color: formData.color,
        category: formData.category,
      });
      toast.success("Event created");
      handleCloseCreate();
    } catch {
      toast.error("Failed to create event");
    }
  }, [formData, createEvent, handleCloseCreate]);

  const handleDeleteEvent = useCallback(
    async (id: number) => {
      try {
        await deleteEvent.mutateAsync(id);
        toast.success("Event deleted");
      } catch {
        toast.error("Failed to delete event");
      }
    },
    [deleteEvent]
  );

  void handleDeleteEvent;

  const eventPropGetter = useCallback(
    (event: CalendarEvent) => ({
      style: {
        backgroundColor:
          EVENT_COLORS[event.resource?.color ?? "blue"] ?? EVENT_COLORS.blue,
        border: "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "12px",
        padding: "1px 6px",
      },
    }),
    []
  );

  const handlePrev = useCallback(
    () => setCurrentDate((d) => subMonths(d, 1)),
    []
  );
  const handleNext = useCallback(
    () => setCurrentDate((d) => addMonths(d, 1)),
    []
  );
  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[130px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden h-8">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 text-xs capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden bg-card calendar-container">
        {calEvents.length === 0 && view === "month" ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-8 w-8 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No events this month</p>
              <p className="text-xs">Click &quot;Add Event&quot; or select a date on the calendar to get started.</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Event
            </Button>
          </div>
        ) : (
          <BigCalendarWrapper
            events={calEvents}
            date={currentDate}
            view={view}
            onView={setView}
            onNavigate={setCurrentDate}
            onSelectSlot={handleSelectSlot}
            eventPropGetter={eventPropGetter}
          />
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && handleCloseCreate()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              New Calendar Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="event-title" className="text-xs">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="event-title"
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder="Event title"
                className="h-8 text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="event-desc" className="text-xs">
                Description
              </Label>
              <Input
                id="event-desc"
                value={formData.description}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                placeholder="Optional description"
                className="h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="all-day"
                checked={formData.allDay}
                onCheckedChange={(v) => handleFieldChange("allDay", v)}
              />
              <Label htmlFor="all-day" className="text-xs cursor-pointer">
                All day event
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={formData.startDate}
                  onChange={(e) =>
                    handleFieldChange("startDate", e.target.value)
                  }
                />
              </div>
              {!formData.allDay && (
                <div className="space-y-1">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    className="h-8 text-xs"
                    value={formData.startTime}
                    onChange={(e) =>
                      handleFieldChange("startTime", e.target.value)
                    }
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={formData.endDate}
                  onChange={(e) =>
                    handleFieldChange("endDate", e.target.value)
                  }
                />
              </div>
              {!formData.allDay && (
                <div className="space-y-1">
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    className="h-8 text-xs"
                    value={formData.endTime}
                    onChange={(e) =>
                      handleFieldChange("endTime", e.target.value)
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    handleFieldChange("category", v as EventCategory)
                  }
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="capitalize text-xs">{cat}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => handleFieldChange("color", v)}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_COLORS).map(([key, hex]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="capitalize text-xs">{key}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleCloseCreate}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createEvent.isPending || !formData.title.trim()}
            >
              {createEvent.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
