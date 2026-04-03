"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { View, SlotInfo } from "./big-calendar-wrapper";

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
];

interface FormData {
  title: string;
  description: string;
  allDay: boolean;
  color: string;
  category: string;
}

const defaultForm: FormData = {
  title: "",
  description: "",
  allDay: false,
  color: "blue",
  category: "general",
};

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);

  // Fetch events for a wider range to cover week/day views too
  const rangeStart = startOfMonth(subMonths(currentDate, 0));
  const rangeEnd = endOfMonth(addMonths(currentDate, 1));

  const { data: events = [] } = useCalendarEvents(rangeStart, rangeEnd);
  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  // Convert API events to react-big-calendar format
  const calEvents = events.map((e) => ({
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
  }));

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsCreateOpen(true);
  }, []);

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    const start = selectedSlot?.start ?? currentDate;
    const end = selectedSlot?.end ?? currentDate;

    try {
      await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        allDay: formData.allDay,
        color: formData.color,
        category: formData.category,
      });
      toast.success("Event created");
      setIsCreateOpen(false);
      setFormData(defaultForm);
      setSelectedSlot(null);
    } catch {
      toast.error("Failed to create event");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await deleteEvent.mutateAsync(id);
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const eventPropGetter = (event: (typeof calEvents)[number]) => ({
    style: {
      backgroundColor:
        EVENT_COLORS[event.resource?.color ?? "blue"] ?? EVENT_COLORS.blue,
      border: "none",
      borderRadius: "4px",
      color: "#fff",
      fontSize: "12px",
      padding: "1px 4px",
    },
  });

  void handleDeleteEvent; // exposed if needed later

  return (
    <div className="h-full flex flex-col gap-4" style={{ minHeight: "600px" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedSlot(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div
        className="flex-1 min-h-0 bg-card rounded-lg border border-border overflow-hidden"
        style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}
      >
        <BigCalendarWrapper
          events={calEvents}
          date={currentDate}
          view={view}
          onView={setView}
          onNavigate={setCurrentDate}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={eventPropGetter}
        />
      </div>

      {/* Create event dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setFormData(defaultForm);
            setSelectedSlot(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">New Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="event-title" className="text-xs">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="event-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, title: e.target.value }))
                }
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
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Optional"
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, category: v }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
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
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, color: v }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_COLORS).map(([key, hex]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
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

            <div className="flex items-center gap-2">
              <Switch
                id="all-day"
                checked={formData.allDay}
                onCheckedChange={(v) =>
                  setFormData((p) => ({ ...p, allDay: v }))
                }
              />
              <Label htmlFor="all-day" className="text-xs cursor-pointer">
                All day event
              </Label>
            </div>

            {selectedSlot && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                {format(selectedSlot.start, "MMM d, yyyy")}
                {!formData.allDay &&
                  ` · ${format(selectedSlot.start, "h:mm a")} – ${format(selectedSlot.end, "h:mm a")}`}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createEvent.isPending}
            >
              {createEvent.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
