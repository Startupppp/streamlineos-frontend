"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { format, parseISO, addHours, differenceInMinutes } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useCalendarOrgMembers,
  useGoogleMeetStatus,
  useCreateMeetLink,
  useEventAttendees,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { toast } from "sonner";
import { EventFormFields } from "./event-form-fields";
import { EventAttendeesPicker } from "./event-attendees-picker";
import { useTicketSearch } from "@/hooks/api/projects";
import type { TicketSearchResult } from "@/hooks/api/projects";
import { Ticket, X, Search, Loader2, Maximize2, Users, Link as LinkIcon } from "lucide-react";

type EventCategory = "general" | "meeting" | "deadline" | "reminder" | "leave" | "project" | "other";

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
  locationError: string;
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
    locationError: "",
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
    locationError: "",
  };
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSlot?: { start: Date; end: Date } | null;
  event?: CalendarListItem | null;
}

export function EventCreateDialog({
  open,
  onOpenChange,
  defaultSlot,
  event,
}: EventCreateDialogProps) {
  const isEdit = !!event;
  const editNumericId = useMemo(
    () => (isEdit && event ? extractEventNumericId(event.id) : null),
    [isEdit, event],
  );
  const [form, setForm] = useState<FormState>(() =>
    isEdit ? toEditForm(event!) : toDefaultForm(defaultSlot),
  );
  const [linkedTicket, setLinkedTicket] = useState<TicketSearchResult | null>(null);
  const [existingEntityId, setExistingEntityId] = useState<string | null>(null);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const [ticketSearchQ, setTicketSearchQ] = useState("");
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const { data: members = [] } = useCalendarOrgMembers();
  const { data: meetStatus } = useGoogleMeetStatus();
  const createMeet = useCreateMeetLink();
  const { data: existingAttendees } = useEventAttendees(
    isEdit && open ? editNumericId : null,
  );

  useEffect(() => {
    if (open) {
      setForm(isEdit ? toEditForm(event!) : toDefaultForm(defaultSlot));
      setLinkedTicket(null);
      setExistingEntityId(
        isEdit && event?.entityType === "ticket" && event.entityId
          ? event.entityId
          : null,
      );
    }
  }, [open, defaultSlot, event, isEdit]);

  useEffect(() => {
    if (open && isEdit && existingAttendees && existingAttendees.length > 0) {
      const ids = existingAttendees
        .map((a) => a.user?.id)
        .filter((id): id is string => !!id);
      setForm((prev) => ({ ...prev, attendeeIds: ids }));
    }
  }, [open, isEdit, existingAttendees]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set("title", e.target.value);
    },
    [set],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set("description", e.target.value);
    },
    [set],
  );

  const handleLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      set("location", value);
      if (value && /^https?:\/\//i.test(value) && !isValidUrl(value)) {
        setForm((prev) => ({ ...prev, locationError: "Invalid URL format" }));
      } else {
        setForm((prev) => ({ ...prev, locationError: "" }));
      }
    },
    [set],
  );

  const handleAllDayChange = useCallback(
    (v: boolean) => {
      set("allDay", v);
    },
    [set],
  );

  const handleStartDateChange = useCallback(
    (v: string) => {
      set("startDate", v);
    },
    [set],
  );

  const handleStartTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set("startTime", e.target.value);
    },
    [set],
  );

  const handleEndDateChange = useCallback(
    (v: string) => {
      set("endDate", v);
    },
    [set],
  );

  const handleEndTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      set("endTime", e.target.value);
    },
    [set],
  );

  const handleCategoryChange = useCallback(
    (v: string) => {
      set("category", v as EventCategory);
    },
    [set],
  );

  const handleColorChange = useCallback(
    (v: string) => {
      set("color", v);
    },
    [set],
  );

  const handleSave = useCallback(async () => {
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      toast.error("Event title is required");
      return;
    }
    if (!/^[a-zA-Z0-9]/.test(trimmedTitle)) {
      toast.error("Event title must start with a letter or number");
      return;
    }
    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) {
      toast.error("Event title must contain at least one letter or number");
      return;
    }
    if (trimmedTitle.length < 2) {
      toast.error("Event title must be at least 2 characters");
      return;
    }
    if (trimmedTitle.length > 100) {
      toast.error("Event title must be at most 100 characters");
      return;
    }
    if (/\s{2,}/.test(form.title)) {
      toast.error("Event title cannot have consecutive spaces");
      return;
    }
    if (form.description) {
      if (form.description.trim().length < 5) {
        toast.error("Description must be at least 5 characters");
        return;
      }
      if (form.description.length > 2000) {
        toast.error("Description must be at most 2000 characters");
        return;
      }
    }
    if (form.location) {
      const loc = form.location.trim();
      if (/^https?:\/\//i.test(loc) && !isValidUrl(loc)) {
        toast.error("Location contains an invalid URL");
        return;
      }
    }
    if (!form.startDate) {
      toast.error("Start date is required");
      return;
    }
    if (!form.allDay && !form.startTime) {
      toast.error("Start time is required");
      return;
    }
    if (!form.endDate) {
      toast.error("End date is required");
      return;
    }
    if (!form.allDay && !form.endTime) {
      toast.error("End time is required");
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
    if (!form.allDay && differenceInMinutes(endDate, startDate) < 15) {
      toast.error("Event duration must be at least 15 minutes");
      return;
    }

    const resolvedEntityId = linkedTicket ? String(linkedTicket.id) : (existingEntityId ?? undefined);
    const payload = {
      title: trimmedTitle,
      description: form.description || undefined,
      location: form.location || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      allDay: form.allDay,
      color: form.color,
      category: form.category,
      attendeeIds: form.attendeeIds,
      entityType: resolvedEntityId ? "ticket" : undefined,
      entityId: resolvedEntityId,
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

  const handleOpenTicketPicker = useCallback(() => {
    setTicketPickerOpen(true);
    setTicketSearchQ("");
  }, []);

  const handleTicketSelect = useCallback((ticket: TicketSearchResult) => {
    setLinkedTicket(ticket);
    setExistingEntityId(null);
    setTicketPickerOpen(false);
  }, []);

  const handleRemoveLinkedTicket = useCallback(() => {
    setLinkedTicket(null);
    setExistingEntityId(null);
  }, []);

  const displayLinkedKey = linkedTicket
    ? `${linkedTicket.projectKey}-${linkedTicket.ticketNumber}`
    : existingEntityId
      ? `#${existingEntityId}`
      : null;

  const displayLinkedTitle = linkedTicket?.title ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex flex-col p-0 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border bg-card"
        >
          {/* Header controls (New Event, Sizing controls, Close controls) */}
          <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0 select-none">
            <DialogTitle className="text-base font-semibold text-foreground">
              {isEdit ? "Edit Event" : "New Event"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                title="Expand"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4 space-y-4">
              <EventFormFields
                title={form.title}
                description={form.description}
                location={form.location}
                locationError={form.locationError}
                allDay={form.allDay}
                startDate={form.startDate}
                startTime={form.startTime}
                endDate={form.endDate}
                endTime={form.endTime}
                category={form.category}
                color={form.color}
                meetStatus={meetStatus}
                isMeetPending={createMeet.isPending}
                onTitleChange={handleTitleChange}
                onDescriptionChange={handleDescriptionChange}
                onLocationChange={handleLocationChange}
                onAllDayChange={handleAllDayChange}
                onStartDateChange={handleStartDateChange}
                onStartTimeChange={handleStartTimeChange}
                onEndDateChange={handleEndDateChange}
                onEndTimeChange={handleEndTimeChange}
                onCategoryChange={handleCategoryChange}
                onColorChange={handleColorChange}
                onGenerateMeet={handleGenerateMeet}
              />

              {/* Attendees Picker with icon on left */}
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                <div className="flex-1">
                  <EventAttendeesPicker
                    members={members}
                    selectedIds={form.attendeeIds}
                    onToggle={toggleAttendee}
                  />
                </div>
              </div>

              {/* Linked Work item with icon on left */}
              <div className="flex items-start gap-3 pb-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                <div className="flex-1 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Linked work item</p>
                  {displayLinkedKey ? (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <Ticket className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                      <span className="font-mono text-[11px] text-violet-600 shrink-0">
                        {displayLinkedKey}
                      </span>
                      {displayLinkedTitle && (
                        <span className="text-xs truncate flex-1">{displayLinkedTitle}</span>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveLinkedTicket}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0"
                        aria-label="Remove linked ticket"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenTicketPicker}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg px-3 py-2 w-full transition-colors hover:border-violet-400"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Link a ticket…
                    </button>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Action Footer matches Google Calendar style */}
          <div className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                className="h-8 text-xs px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium"
                onClick={handleSave}
                disabled={isPending || !form.title.trim()}
              >
                {isPending
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : "Save"}
              </Button>
              <Button
                variant="outline"
                className="h-8 text-xs px-3 font-normal"
                disabled={isPending}
              >
                More Options
              </Button>
            </div>
            <Button
              variant="outline"
              className="h-8 text-xs px-3 font-normal text-muted-foreground hover:text-foreground"
              onClick={handleClose}
              disabled={isPending}
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketPickerOpen} onOpenChange={setTicketPickerOpen}>
        <DialogContent className="max-w-md p-0 flex flex-col h-[50vh] overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Link a ticket</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 py-4 flex flex-col">
            <TicketPickerContent
              q={ticketSearchQ}
              onQChange={setTicketSearchQ}
              onSelect={handleTicketSelect}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TicketPickerContent({
  q,
  onQChange,
  onSelect,
}: {
  q: string;
  onQChange: (v: string) => void;
  onSelect: (t: TicketSearchResult) => void;
}) {
  const { data: tickets = [], isLoading } = useTicketSearch(q);
  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search by ticket key or title…"
          className="w-full pl-8 pr-3 py-2 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
      </div>
      <div className="overflow-y-auto space-y-1 flex-1">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : tickets.length === 0 && q ? (
          <div className="py-4 text-xs text-muted-foreground">No tickets found</div>
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onSelect(ticket)}
              className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-muted/40 transition-colors"
            >
              <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">
                {ticket.projectKey}-{ticket.ticketNumber}
              </span>
              <span className="text-xs flex-1 min-w-0 truncate">{ticket.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
