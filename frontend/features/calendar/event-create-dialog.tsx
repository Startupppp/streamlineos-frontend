"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { format, parseISO, addHours, differenceInMinutes, endOfDay, startOfDay } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useCalendarOrgMembers,
  useEventAttendees,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { useIntegrationConnections } from "@/hooks/api/integrations";
import { toast } from "sonner";
import { EventFormFields } from "./event-form-fields";
import type { TicketSearchResult } from "@/hooks/api/projects";
import { TicketPickerDialog } from "./ticket-picker-dialog";
import { Input } from "@/components/ui/input";
import { Ticket, X, Link as LinkIcon, Video, MapPin } from "lucide-react";

type EventCategory = "general" | "meeting" | "deadline" | "reminder" | "leave" | "project" | "other";

interface FormState {
  title: string;
  description: string;
  location: string;
  meetingUrl: string;
  allDay: boolean;
  color: string;
  category: EventCategory;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attendeeIds: string[];
  locationError: string;
  meetingUrlError: string;
  syncConnectionId: string;
  addConference: boolean;
}

function toDefaultForm(slot?: { start: Date; end: Date } | null): FormState {
  const start = slot?.start ?? new Date();
  const end = slot?.end ?? addHours(start, 1);
  return {
    title: "",
    description: "",
    location: "",
    meetingUrl: "",
    allDay: false,
    color: "blue",
    category: "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    attendeeIds: [],
    locationError: "",
    meetingUrlError: "",
    syncConnectionId: "none",
    addConference: true,
  };
}

function toEditForm(event: CalendarListItem): FormState {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    meetingUrl: event.meetingUrl ?? "",
    allDay: event.allDay ?? false,
    color: event.color ?? "blue",
    category: (event.category as EventCategory) ?? "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    attendeeIds: [],
    locationError: "",
    meetingUrlError: "",
    syncConnectionId: "none",
    addConference: false,
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

function needsEndDateField(
  form: Pick<FormState, "startDate" | "startTime" | "endDate" | "endTime" | "allDay">,
): boolean {
  if (form.startDate !== form.endDate) return true;
  if (form.allDay) return false;
  if (!form.startTime || !form.endTime) return false;
  const start = parseISO(`${form.startDate}T${form.startTime}`);
  const end = parseISO(`${form.endDate}T${form.endTime}`);
  return differenceInMinutes(end, start) !== 60;
}

function resolveEventDateTimes(
  form: FormState,
  showEndDate: boolean,
): { start: Date; end: Date } | null {
  if (!form.startDate) return null;

  const start = form.allDay
    ? startOfDay(parseISO(form.startDate))
    : parseISO(`${form.startDate}T${form.startTime}`);

  if (showEndDate) {
    if (!form.endDate) return null;
    if (!form.allDay && !form.endTime) return null;
    const end = form.allDay
      ? endOfDay(parseISO(form.endDate))
      : parseISO(`${form.endDate}T${form.endTime}`);
    return { start, end };
  }

  const end = form.allDay ? endOfDay(parseISO(form.startDate)) : addHours(start, 1);
  return { start, end };
}

function getDateTimeError(
  form: FormState,
  showEndDate: boolean,
): string {
  if (!showEndDate) return "";
  const resolved = resolveEventDateTimes(form, true);
  if (!resolved) return "";
  if (resolved.end < resolved.start) {
    return "End must be on or after start";
  }
  return "";
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
    isEdit && event ? toEditForm(event) : toDefaultForm(defaultSlot),
  );
  const [showEndDate, setShowEndDate] = useState(() =>
    needsEndDateField(isEdit && event ? toEditForm(event) : toDefaultForm(defaultSlot)),
  );
  const [dateTimeError, setDateTimeError] = useState("");
  const [linkedTicket, setLinkedTicket] = useState<TicketSearchResult | null>(null);
  const [existingEntityId, setExistingEntityId] = useState<string | null>(null);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const { data: members = [] } = useCalendarOrgMembers();
  const { data: connections = [] } = useIntegrationConnections();
  const { data: existingAttendees } = useEventAttendees(
    isEdit && open ? editNumericId : null,
  );

  useEffect(() => {
    if (open) {
      const base = isEdit && event ? toEditForm(event) : toDefaultForm(defaultSlot);
      setForm(isEdit ? base : { ...base, syncConnectionId: "none" });
      setShowEndDate(needsEndDateField(base));
      setDateTimeError("");
      setLinkedTicket(null);
      setExistingEntityId(
        isEdit && event?.entityType === "ticket" && event.entityId
          ? event.entityId
          : null,
      );
    }
  }, [open, defaultSlot, event, isEdit]);

  useEffect(() => {
    if (!open || isEdit) return;
    const primary = connections.find((c) => c.isPrimary && c.status === "active");
    const primaryId = primary ? String(primary.id) : "none";
    setForm((f) => {
      const currentIsValid =
        f.syncConnectionId !== "none" &&
        connections.some((c) => String(c.id) === f.syncConnectionId);
      if (currentIsValid) return f;
      return { ...f, syncConnectionId: primaryId };
    });
  }, [open, isEdit, connections]);

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

  const handleMeetingUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        meetingUrl: value,
        meetingUrlError:
          value.trim() && !isValidUrl(value.trim())
            ? "Enter a valid meeting link (https://…)"
            : "",
      }));
    },
    [],
  );

  const handleAllDayChange = useCallback(
    (v: boolean) => {
      setForm((prev) => {
        const next = { ...prev, allDay: v };
        setDateTimeError(getDateTimeError(next, showEndDate));
        return next;
      });
    },
    [showEndDate],
  );

  const handleStartDateChange = useCallback(
    (v: string) => {
      setForm((prev) => {
        const next = {
          ...prev,
          startDate: v,
          endDate: showEndDate ? prev.endDate : v,
        };
        setDateTimeError(getDateTimeError(next, showEndDate));
        return next;
      });
    },
    [showEndDate],
  );

  const handleStartTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => {
        const next = { ...prev, startTime: e.target.value };
        setDateTimeError(getDateTimeError(next, showEndDate));
        return next;
      });
    },
    [showEndDate],
  );

  const handleEndDateChange = useCallback(
    (v: string) => {
      setForm((prev) => {
        const next = { ...prev, endDate: v };
        setDateTimeError(getDateTimeError(next, showEndDate));
        return next;
      });
    },
    [showEndDate],
  );

  const handleEndTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => {
        const next = { ...prev, endTime: e.target.value };
        setDateTimeError(getDateTimeError(next, showEndDate));
        return next;
      });
    },
    [showEndDate],
  );

  const handleShowEndDate = useCallback(() => {
    setShowEndDate(true);
    setForm((prev) => {
      const start = prev.allDay
        ? startOfDay(parseISO(prev.startDate))
        : parseISO(`${prev.startDate}T${prev.startTime || "09:00"}`);
      const end = prev.allDay ? endOfDay(parseISO(prev.startDate)) : addHours(start, 1);
      const next = {
        ...prev,
        endDate: format(end, "yyyy-MM-dd"),
        endTime: format(end, "HH:mm"),
      };
      setDateTimeError(getDateTimeError(next, true));
      return next;
    });
  }, []);

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

  const handleSyncConnectionChange = useCallback(
    (v: string) => {
      setForm((f) => ({
        ...f,
        syncConnectionId: v,
        addConference: v === "none" ? false : f.addConference,
      }));
    },
    [],
  );

  const handleAddConferenceChange = useCallback(
    (v: boolean) => {
      setForm((f) => ({ ...f, addConference: v }));
    },
    [],
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
    const trimmedMeetingUrl = form.meetingUrl.trim();
    if (trimmedMeetingUrl && !isValidUrl(trimmedMeetingUrl)) {
      toast.error("Meeting link must be a valid URL");
      return;
    }
    if (!form.startDate) {
      toast.error("Start date is required");
      return;
    }
    if (!form.allDay && !form.startTime) {
      toast.error("Start time is required");
      return;
    }
    if (showEndDate && !form.endDate) {
      toast.error("End date is required");
      return;
    }
    if (showEndDate && !form.allDay && !form.endTime) {
      toast.error("End time is required");
      return;
    }

    const resolved = resolveEventDateTimes(form, showEndDate);
    if (!resolved) {
      toast.error("Invalid date or time");
      return;
    }

    const { start: startDate, end: endDate } = resolved;

    if (showEndDate && endDate < startDate) {
      toast.error("End must be on or after start");
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
      meetingUrl: trimmedMeetingUrl || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      allDay: form.allDay,
      color: form.color,
      category: form.category,
      attendeeIds: form.attendeeIds,
      entityType: resolvedEntityId ? "ticket" : undefined,
      entityId: resolvedEntityId,
      syncConnectionId:
        !isEdit && form.syncConnectionId !== "none" ? Number(form.syncConnectionId) : undefined,
      addConference:
        !isEdit && form.syncConnectionId !== "none" ? form.addConference : undefined,
    };

    try {
      if (isEdit && event) {
        const numericId = extractEventNumericId(event.id);
        if (numericId === null) {
          toast.error("Cannot edit this event type");
          return;
        }
        await updateEvent.mutateAsync({
          id: numericId,
          ...payload,
          meetingUrl: trimmedMeetingUrl || null,
        });
        toast.success("Event updated");
      } else {
        const result = await createEvent.mutateAsync(payload);
        if (result.syncError) {
          toast.warning(`Event created, but calendar sync failed: ${result.syncError}`);
        } else if (result.meetingUrl) {
          toast.success("Event created — meeting link added");
        } else {
          toast.success("Event created");
        }
      }
      handleClose();
    } catch {
      toast.error(isEdit ? "Failed to update event" : "Failed to create event");
    }
  }, [form, showEndDate, isEdit, event, createEvent, updateEvent, handleClose, existingEntityId, linkedTicket]);

  const isPending = isEdit ? updateEvent.isPending : createEvent.isPending;
  const isMobile = useIsMobile();

  const handleOpenTicketPicker = useCallback(() => {
    setTicketPickerOpen(true);
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
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        direction={isMobile ? "bottom" : "right"}
      >
        <DrawerContent
          className={cn(
            "flex flex-col gap-0 p-0 pb-0 overflow-hidden shadow-2xl border bg-card",
            isMobile
              ? "w-full max-h-[min(92dvh,48rem)] rounded-t-xl"
              : "h-full w-full md:w-1/2 md:max-w-2xl lg:max-w-3xl",
          )}
        >
          <DrawerHeader className="px-4 py-2.5 border-b flex flex-row items-center justify-between shrink-0 select-none">
            <DrawerTitle className="text-base font-semibold text-foreground">
              {isEdit ? "Edit Event" : "New Event"}
            </DrawerTitle>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
              title="Close"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DrawerHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-2 space-y-2">
              <EventFormFields
                title={form.title}
                description={form.description}
                allDay={form.allDay}
                startDate={form.startDate}
                startTime={form.startTime}
                endDate={form.endDate}
                endTime={form.endTime}
                category={form.category}
                color={form.color}
                connections={connections}
                syncConnectionId={form.syncConnectionId}
                addConference={form.addConference}
                isEdit={isEdit}
                showEndDate={showEndDate}
                dateTimeError={dateTimeError}
                onTitleChange={handleTitleChange}
                onDescriptionChange={handleDescriptionChange}
                onAllDayChange={handleAllDayChange}
                onStartDateChange={handleStartDateChange}
                onStartTimeChange={handleStartTimeChange}
                onEndDateChange={handleEndDateChange}
                onEndTimeChange={handleEndTimeChange}
                onCategoryChange={handleCategoryChange}
                onColorChange={handleColorChange}
                onSyncConnectionChange={handleSyncConnectionChange}
                onAddConferenceChange={handleAddConferenceChange}
                onShowEndDate={handleShowEndDate}
                members={members}
                attendeeIds={form.attendeeIds}
                onToggleAttendee={toggleAttendee}
              />

              {/* Manual meeting link (Google Meet / Teams / Zoom) */}
              <div className="flex items-start gap-2.5">
                <Video className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                <div className="flex-1 space-y-1">
                  <Input
                    type="url"
                    inputMode="url"
                    value={form.meetingUrl}
                    onChange={handleMeetingUrlChange}
                    placeholder="Paste a Google Meet / Teams / Zoom link"
                    aria-invalid={!!form.meetingUrlError}
                    className="h-9 text-sm"
                  />
                  {form.meetingUrlError ? (
                    <p className="text-[11px] text-destructive">
                      {form.meetingUrlError}
                    </p>
                  ) : (
                    !isEdit &&
                    form.syncConnectionId !== "none" &&
                    form.addConference && (
                      <p className="text-[11px] text-muted-foreground">
                        Leave blank to auto-generate a link from the synced
                        account.
                      </p>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                <div className="flex-1 min-w-0 space-y-1">
                  <Input
                    id="ev-location"
                    value={form.location}
                    onChange={handleLocationChange}
                    placeholder="Room or Location"
                    className={cn(
                      "h-9 text-xs flex-1 min-w-0",
                      form.locationError && "border-destructive",
                    )}
                  />
                  {form.locationError && (
                    <p className="text-[10px] text-destructive">{form.locationError}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Linked work item</p>
                  {displayLinkedKey ? (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
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
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg px-3 py-1.5 w-full transition-colors hover:border-violet-400"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Link a ticket…
                    </button>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3 font-normal text-muted-foreground hover:text-foreground"
              onClick={handleClose}
              disabled={isPending}
            >
              Discard
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs px-4 font-medium"
              onClick={handleSave}
              disabled={isPending || !form.title.trim()}
            >
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : "Save"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <TicketPickerDialog
        open={ticketPickerOpen}
        onOpenChange={setTicketPickerOpen}
        onSelect={handleTicketSelect}
      />
    </>
  );
}
