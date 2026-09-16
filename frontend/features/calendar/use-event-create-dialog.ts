"use client";

import { useState, useCallback, useEffect, useMemo, type ChangeEvent } from "react";
import { addHours, endOfDay, format, parseISO, startOfDay } from "date-fns";
import { useIsMobile } from "@/hooks/common/use-mobile";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useUpsertOccurrenceException,
  useCalendarMemberLookup,
  useCalendarEvent,
  useEventAttendees,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { useCalendarConnections } from "./use-calendar-connections";
import { toast } from "sonner";
import type { TicketSearchResult } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { describeEventConflicts } from "./event-conflict-notice";
import {
  getDateTimeError,
  isValidUrl,
  needsEndDateField,
  toDefaultForm,
  toEditForm,
  type FormState,
} from "./event-form-state";
import { useEventSeriesScope } from "./use-event-series-scope";
import {
  validateEventTitle,
  validateEventDescription,
  validateEventLocation,
  buildEventPayload,
} from "./event-create-validators";

interface UseEventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSlot?: { start: Date; end: Date } | null;
  event?: CalendarListItem | null;
  rrule?: string | null;
}

export function useEventCreateDialog({
  open,
  onOpenChange,
  defaultSlot,
  event,
  rrule,
}: UseEventCreateDialogProps) {
  const isEdit = !!event;
  const editNumericId = useMemo(
    () => (isEdit && event ? extractEventNumericId(event.id) : null),
    [isEdit, event],
  );
  const [form, setForm] = useState<FormState>(() =>
    isEdit && event ? toEditForm(event, rrule) : toDefaultForm(defaultSlot),
  );
  const [showEndDate, setShowEndDate] = useState(() =>
    needsEndDateField(isEdit && event ? toEditForm(event, rrule) : toDefaultForm(defaultSlot)),
  );
  const [dateTimeError, setDateTimeError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [linkedTicket, setLinkedTicket] = useState<TicketSearchResult | null>(null);
  const [existingEntityId, setExistingEntityId] = useState<string | null>(null);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const upsertOccurrenceException = useUpsertOccurrenceException();
  const { data: members = [] } = useCalendarMemberLookup();
  const { data: connections = [] } = useCalendarConnections();
  const { data: existingAttendees } = useEventAttendees(isEdit && open ? editNumericId : null);
  const { data: editingDetail } = useCalendarEvent(isEdit && open ? editNumericId : null);

  useEffect(() => {
    if (!open) return;
    const base = isEdit && event ? toEditForm(event, rrule) : toDefaultForm(defaultSlot);
    setForm(isEdit ? base : { ...base, syncConnectionId: "none" });
    setShowEndDate(needsEndDateField(base));
    setDateTimeError("");
    setTitleError("");
    setLinkedTicket(null);
    setExistingEntityId(
      isEdit && event?.entityType === "ticket" && event.entityId ? event.entityId : null,
    );
  }, [open, defaultSlot, event, isEdit]);

  useEffect(() => {
    if (!open || isEdit) return;
    const primary = connections.find((c) => c.isPrimary && c.status === "active");
    const primaryId = primary ? String(primary.id) : "none";
    setForm((f) => {
      const currentIsValid =
        f.syncConnectionId !== "none" && connections.some((c) => String(c.id) === f.syncConnectionId);
      if (currentIsValid) return f;
      return { ...f, syncConnectionId: primaryId };
    });
  }, [open, isEdit, connections]);

  useEffect(() => {
    if (!open || !isEdit || !existingAttendees || existingAttendees.length === 0) return;
    const ids = existingAttendees.map((a) => a.user?.id).filter((id): id is string => !!id);
    setForm((prev) => ({ ...prev, attendeeIds: ids }));
  }, [open, isEdit, existingAttendees]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

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

  const seriesScope = useEventSeriesScope({ event, updateEvent, upsertOccurrenceException, onClose: handleClose });

  const handleTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      set("title", e.target.value);
      if (titleError) setTitleError("");
    },
    [set, titleError],
  );

  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => set("description", e.target.value),
    [set],
  );

  const handleLocationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      set("location", value);
      const locationError =
        value && /^https?:\/\//i.test(value) && !isValidUrl(value) ? "Invalid URL format" : "";
      setForm((prev) => ({ ...prev, locationError }));
    },
    [set],
  );

  const handleAllDayChange = useCallback((v: boolean) => {
    setForm((prev) => {
      const next = { ...prev, allDay: v };
      setDateTimeError(getDateTimeError(next, showEndDate));
      return next;
    });
  }, [showEndDate]);

  const handleStartDateChange = useCallback((v: string) => {
    setForm((prev) => {
      const next = { ...prev, startDate: v, endDate: showEndDate ? prev.endDate : v };
      setDateTimeError(getDateTimeError(next, showEndDate));
      return next;
    });
  }, [showEndDate]);

  const handleStartTimeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => {
      const next = { ...prev, startTime: e.target.value };
      setDateTimeError(getDateTimeError(next, showEndDate));
      return next;
    });
  }, [showEndDate]);

  const handleEndDateChange = useCallback((v: string) => {
    setForm((prev) => {
      const next = { ...prev, endDate: v };
      setDateTimeError(getDateTimeError(next, showEndDate));
      return next;
    });
  }, [showEndDate]);

  const handleEndTimeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => {
      const next = { ...prev, endTime: e.target.value };
      setDateTimeError(getDateTimeError(next, showEndDate));
      return next;
    });
  }, [showEndDate]);

  const handleShowEndDate = useCallback(() => {
    setShowEndDate(true);
    setForm((prev) => {
      const start = prev.allDay
        ? startOfDay(parseISO(prev.startDate))
        : parseISO(`${prev.startDate}T${prev.startTime || "09:00"}`);
      const end = prev.allDay ? endOfDay(parseISO(prev.startDate)) : addHours(start, 1);
      const next = { ...prev, endDate: format(end, "yyyy-MM-dd"), endTime: format(end, "HH:mm") };
      setDateTimeError(getDateTimeError(next, true));
      return next;
    });
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    if (value === "general" || value === "meeting" || value === "deadline" ||
        value === "reminder" || value === "leave" || value === "project" || value === "other")
      set("category", value);
  }, [set]);

  const handleColorChange = useCallback((v: string) => set("color", v), [set]);

  const handleSyncConnectionChange = useCallback((v: string) => {
    setForm((f) => ({ ...f, syncConnectionId: v, addConference: v === "none" ? false : f.addConference }));
  }, []);

  const handleAddConferenceChange = useCallback(
    (v: boolean) => setForm((f) => ({ ...f, addConference: v })),
    [],
  );

  const handleSave = useCallback(async () => {
    const titleErr = validateEventTitle(form.title);
    if (titleErr) { setTitleError(titleErr); return; }
    setTitleError("");
    const descErr = validateEventDescription(form.description);
    if (descErr) { toast.error(descErr); return; }
    const locErr = validateEventLocation(form.location);
    if (locErr) { toast.error(locErr); return; }

    const result = buildEventPayload({ form, showEndDate, linkedTicket, existingEntityId, isEdit });
    if (result.error !== null) { toast.error(result.error); return; }

    if (isEdit && rrule) {
      seriesScope.openWithPayload(result.payload);
      return;
    }

    try {
      if (isEdit && event) {
        const numericId = extractEventNumericId(event.id);
        if (numericId === null) { toast.error("Cannot edit this event type"); return; }
        const { syncConnectionId: _sc, addConference: _ac, ...editPayload } = result.payload;
        await updateEvent.mutateAsync({
          calendarEventId: numericId,
          ...editPayload,
          ...(editingDetail ? { expectedVersion: editingDetail.localVersion } : {}),
        });
        toast.success("Event updated");
      } else {
        const res = await createEvent.mutateAsync(result.payload);
        if (res.syncQueued) toast.success("Event created — syncing to your calendar");
        else toast.success("Event created");
        // The server scans for overlapping occurrences and approved leave on every
        // create; before this the result was discarded and a double-booking read
        // as plain success. A second toast so a sync failure is not displaced.
        const conflictNotice = describeEventConflicts(res);
        if (conflictNotice) toast.warning(`Event created, but ${conflictNotice}.`);
      }
      handleClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [form, showEndDate, isEdit, event, rrule, createEvent, updateEvent, handleClose, existingEntityId, linkedTicket, seriesScope, editingDetail]);

  const handleOpenTicketPicker = useCallback(() => setTicketPickerOpen(true), []);

  const handleTicketSelect = useCallback((ticket: TicketSearchResult) => {
    setLinkedTicket(ticket);
    setExistingEntityId(null);
    setTicketPickerOpen(false);
  }, []);

  const handleRemoveLinkedTicket = useCallback(() => {
    setLinkedTicket(null);
    setExistingEntityId(null);
  }, []);

  const handleRecurrenceChange = useCallback(
    (next: FormState["recurrence"]) => set("recurrence", next),
    [set],
  );

  const isPending = isEdit ? updateEvent.isPending : createEvent.isPending;
  const isMobile = useIsMobile();

  return {
    form, titleError, dateTimeError, showEndDate, members, connections,
    linkedTicket, existingEntityId, ticketPickerOpen, setTicketPickerOpen,
    isPending, isMobile, isEdit,
    handleClose, handleTitleChange, handleDescriptionChange, handleLocationChange,
    handleAllDayChange, handleStartDateChange, handleStartTimeChange,
    handleEndDateChange, handleEndTimeChange, handleShowEndDate,
    handleCategoryChange, handleColorChange, handleSyncConnectionChange,
    handleAddConferenceChange, toggleAttendee, handleOpenTicketPicker,
    handleTicketSelect, handleRemoveLinkedTicket, handleSave, handleRecurrenceChange,
    ...seriesScope,
  };
}
