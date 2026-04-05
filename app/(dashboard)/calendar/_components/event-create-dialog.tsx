"use client";

import { useState, useCallback, useEffect } from "react";
import { format, parseISO, addHours } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateCalendarEvent } from "@/lib/api/hooks/calendar";
import { toast } from "sonner";

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

interface FormState {
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  color: string;
  category: EventCategory;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

function toDefaultForm(slot?: { start: Date; end: Date } | null): FormState {
  const start = slot?.start ?? new Date();
  const end = slot?.end ?? addHours(start, 1);
  return {
    title: "",
    description: "",
    location: "",
    allDay: false,
    color: "blue",
    category: "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
  };
}

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSlot?: { start: Date; end: Date } | null;
}

export function EventCreateDialog({ open, onOpenChange, defaultSlot }: EventCreateDialogProps) {
  const [form, setForm] = useState<FormState>(() => toDefaultForm(defaultSlot));
  const createEvent = useCreateCalendarEvent();

  useEffect(() => {
    if (open) {
      setForm(toDefaultForm(defaultSlot));
    }
  }, [open, defaultSlot]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    const startDate = form.allDay
      ? parseISO(form.startDate)
      : parseISO(`${form.startDate}T${form.startTime}`);
    const endDate = form.allDay
      ? parseISO(form.endDate)
      : parseISO(`${form.endDate}T${form.endTime}`);
    if (endDate <= startDate) {
      toast.error("End time must be after start time");
      return;
    }
    try {
      await createEvent.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: form.allDay,
        color: form.color,
        category: form.category,
      });
      toast.success("Event created");
      handleClose();
    } catch {
      toast.error("Failed to create event");
    }
  }, [form, createEvent, handleClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">New Calendar Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="ev-title" className="text-xs">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ev-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Event title"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-desc" className="text-xs">Description</Label>
            <Input
              id="ev-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional description"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-location" className="text-xs">Location / Meet Link</Label>
            <Input
              id="ev-location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Conference Room A or https://meet.google.com/..."
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ev-allday" checked={form.allDay} onCheckedChange={(v) => set("allDay", v)} />
            <Label htmlFor="ev-allday" className="text-xs cursor-pointer">All day event</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <DatePicker value={form.startDate} onChange={(v) => set("startDate", v)} placeholder="Start date" />
            </div>
            {!form.allDay && (
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  className="h-8 text-xs"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <DatePicker
                value={form.endDate}
                onChange={(v) => set("endDate", v)}
                fromDate={form.startDate ? new Date(form.startDate) : undefined}
                placeholder="End date"
              />
            </div>
            {!form.allDay && (
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  className="h-8 text-xs"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v as EventCategory)}>
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
              <Select value={form.color} onValueChange={(v) => set("color", v)}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_COLORS).map(([key, hex]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
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
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={createEvent.isPending || !form.title.trim()}
          >
            {createEvent.isPending ? "Creating..." : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
