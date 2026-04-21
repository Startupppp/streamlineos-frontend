"use client";

import { useState, useCallback, useEffect } from "react";
import { format, parseISO, addHours } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Check, Video, Loader2 } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useCalendarOrgMembers,
  useGoogleMeetStatus,
  useCreateMeetLink,
  extractEventNumericId,
} from "@/lib/api/hooks/calendar";
import type { CalendarListItem } from "@/lib/api/hooks/calendar";
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
  attendeeIds: string[];
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
    attendeeIds: [],
  };
}

function toEditForm(event: CalendarListItem): FormState {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    allDay: event.allDay ?? false,
    color: event.color ?? "blue",
    category: (event.category as EventCategory) ?? "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    attendeeIds: [],
  };
}

function getMemberName(member: { firstName: string | null; lastName: string | null; name: string | null }) {
  if (member.firstName) return `${member.firstName} ${member.lastName ?? ""}`.trim();
  return member.name ?? "Unknown";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSlot?: { start: Date; end: Date } | null;
  event?: CalendarListItem | null;
}

export function EventCreateDialog({ open, onOpenChange, defaultSlot, event }: EventCreateDialogProps) {
  const isEdit = !!event;
  const [form, setForm] = useState<FormState>(() =>
    isEdit ? toEditForm(event!) : toDefaultForm(defaultSlot)
  );
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const { data: members = [] } = useCalendarOrgMembers();
  const { data: meetStatus } = useGoogleMeetStatus();
  const createMeet = useCreateMeetLink();

  useEffect(() => {
    if (open) {
      setForm(isEdit ? toEditForm(event!) : toDefaultForm(defaultSlot));
    }
  }, [open, defaultSlot, event, isEdit]);

  const handleSheetOpenChange = useCallback(
    (v: boolean) => {
      if (!v) onOpenChange(false);
    },
    [onOpenChange],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAttendee = useCallback((memberId: string) => {
    setForm((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(memberId)
        ? prev.attendeeIds.filter((id) => id !== memberId)
        : [...prev.attendeeIds, memberId],
    }));
  }, []);

  const handleGenerateMeet = useCallback(async () => {
    try {
      const res = await createMeet.mutateAsync();
      set("location", res.meetLink);
    } catch {
      toast.error("Failed to generate Meet link");
    }
  }, [createMeet, set]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("title", e.target.value);
  }, [set]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("description", e.target.value);
  }, [set]);

  const handleLocationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("location", e.target.value);
  }, [set]);

  const handleAllDayChange = useCallback((v: boolean) => {
    set("allDay", v);
  }, [set]);

  const handleStartDateChange = useCallback((v: string) => {
    set("startDate", v);
  }, [set]);

  const handleStartTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("startTime", e.target.value);
  }, [set]);

  const handleEndDateChange = useCallback((v: string) => {
    set("endDate", v);
  }, [set]);

  const handleEndTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("endTime", e.target.value);
  }, [set]);

  const handleCategoryChange = useCallback((v: string) => {
    set("category", v as EventCategory);
  }, [set]);

  const handleColorChange = useCallback((v: string) => {
    set("color", v);
  }, [set]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    const startDate = form.allDay
      ? parseISO(`${form.startDate}T12:00:00`)
      : parseISO(`${form.startDate}T${form.startTime}`);
    const endDate = form.allDay
      ? parseISO(`${form.endDate}T12:00:00`)
      : parseISO(`${form.endDate}T${form.endTime}`);
    if (endDate <= startDate) {
      toast.error("End time must be after start time");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description || undefined,
      location: form.location || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      allDay: form.allDay,
      color: form.color,
      category: form.category,
      attendeeIds: form.attendeeIds,
    };
    try {
      if (isEdit && event) {
        const numericId = extractEventNumericId(event.id);
        if (numericId === null) {
          toast.error("Cannot edit this event type");
          return;
        }
        await updateEvent.mutateAsync({ id: numericId, ...payload });
        toast.success("Event updated");
      } else {
        await createEvent.mutateAsync(payload);
        toast.success("Event created");
      }
      handleClose();
    } catch {
      toast.error(isEdit ? "Failed to update event" : "Failed to create event");
    }
  }, [form, isEdit, event, createEvent, updateEvent, handleClose]);

  const isPending = isEdit ? updateEvent.isPending : createEvent.isPending;

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 w-full sm:max-w-[480px]">
        <SheetHeader className="px-6 border-b shrink-0">
          <SheetTitle className="text-base font-semibold">
            {isEdit ? "Edit Event" : "New Calendar Event"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title" className="text-xs font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={handleTitleChange}
                placeholder="Event title"
                className="h-9"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-desc" className="text-xs font-medium">Description</Label>
              <Input
                id="ev-desc"
                value={form.description}
                onChange={handleDescriptionChange}
                placeholder="Optional description"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-location" className="text-xs font-medium">Location / Meet Link</Label>
              <div className="flex gap-2">
                <Input
                  id="ev-location"
                  value={form.location}
                  onChange={handleLocationChange}
                  placeholder="Room A, Zoom link, https://meet.google.com/..."
                  className="h-9 flex-1"
                />
                {meetStatus && (
                  meetStatus.connected ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 gap-1.5"
                      disabled={createMeet.isPending}
                      onClick={handleGenerateMeet}
                    >
                      {createMeet.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Video className="h-3.5 w-3.5" />}
                      Meet
                    </Button>
                  ) : (
                    <a href={meetStatus.authUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                        <Video className="h-3.5 w-3.5" />
                        Connect
                      </Button>
                    </a>
                  )
                )}
              </div>
              {meetStatus?.connected && meetStatus.googleEmail && (
                <p className="text-[11px] text-muted-foreground">Google: {meetStatus.googleEmail}</p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Switch id="ev-allday" checked={form.allDay} onCheckedChange={handleAllDayChange} />
              <Label htmlFor="ev-allday" className="text-sm cursor-pointer">All day event</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Date</Label>
                <DatePicker
                  value={form.startDate}
                  onChange={handleStartDateChange}
                  placeholder="Start date"
                />
              </div>
              {!form.allDay && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input
                    type="time"
                    className="h-9"
                    value={form.startTime}
                    onChange={handleStartTimeChange}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date</Label>
                <DatePicker
                  value={form.endDate}
                  onChange={handleEndDateChange}
                  fromDate={form.startDate ? new Date(form.startDate) : undefined}
                  placeholder="End date"
                />
              </div>
              {!form.allDay && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">End Time</Label>
                  <Input
                    type="time"
                    className="h-9"
                    value={form.endTime}
                    onChange={handleEndTimeChange}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={form.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="capitalize">{cat}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Color</Label>
                <Select value={form.color} onValueChange={handleColorChange}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_COLORS).map(([key, hex]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                          <span className="capitalize">{key}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {members.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Attendees</Label>
                  {form.attendeeIds.length > 0 && (
                    <Badge variant="secondary" className="text-[11px]">
                      {form.attendeeIds.length} selected
                    </Badge>
                  )}
                </div>
                <div className="rounded-lg border bg-muted/30 p-1 space-y-0.5 max-h-48 overflow-y-auto">
                  {members.map((member) => {
                    const name = getMemberName(member);
                    const selected = form.attendeeIds.includes(member.id);
                    return (
                      <AttendeeRow
                        key={member.id}
                        memberId={member.id}
                        name={name}
                        image={member.image}
                        selected={selected}
                        onToggle={toggleAttendee}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 border-t shrink-0 flex-row gap-2 justify-end">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending || !form.title.trim()}>
            {isPending
              ? (isEdit ? "Saving..." : "Creating...")
              : (isEdit ? "Save Changes" : "Create Event")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface AttendeeRowProps {
  memberId: string;
  name: string;
  image: string | null | undefined;
  selected: boolean;
  onToggle: (id: string) => void;
}

function AttendeeRow({ memberId, name, image, selected, onToggle }: AttendeeRowProps) {
  const handleClick = useCallback(() => {
    onToggle(memberId);
  }, [memberId, onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-left",
        selected ? "bg-gold/10 ring-1 ring-gold/30" : "hover:bg-muted"
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={resolveImageUrl(image)} />
        <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className={cn("flex-1 truncate text-sm", selected && "font-medium")}>{name}</span>
      <div className={cn(
        "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
        selected ? "border-gold bg-gold" : "border-muted-foreground/30"
      )}>
        {selected && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
    </button>
  );
}
