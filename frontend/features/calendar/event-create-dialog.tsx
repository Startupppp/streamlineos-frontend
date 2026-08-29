"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { addHours, differenceInMinutes, endOfDay, format, parseISO, startOfDay } from "date-fns";
import { useIsMobile } from "@/hooks/common/use-mobile";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useCalendarOrgMembers,
  useEventAttendees,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { useCalendarConnections } from "./use-calendar-connections";
import { toast } from "sonner";
import type { TicketSearchResult } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  getDateTimeError,
  isValidUrl,
  needsEndDateField,
  resolveEventDateTimes,
  toDefaultForm,
  toEditForm,
  type FormState,
} from "./event-form-state";
import { EventCreateForm } from "./event-create-form";

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
  const [titleError, setTitleError] = useState("");
  const [linkedTicket, setLinkedTicket] = useState<TicketSearchResult | null>(null);
  const [existingEntityId, setExistingEntityId] = useState<string | null>(null);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const { data: members = [] } = useCalendarOrgMembers();
  const { data: connections = [] } = useCalendarConnections();
  const { data: existingAttendees } = useEventAttendees(
    isEdit && open ? editNumericId : null,
  );

  useEffect(() => {
    if (open) {
      const base = isEdit && event ? toEditForm(event) : toDefaultForm(defaultSlot);
      setForm(isEdit ? base : { ...base, syncConnectionId: "none" });
      setShowEndDate(needsEndDateField(base));
      setDateTimeError("");
      setTitleError("");
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
      if (titleError) setTitleError("");
    },
    [set, titleError],
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

  const handleCategoryChange = useCallback((value: string) => {
    if (value === "general" || value === "meeting" || value === "deadline" || value === "reminder" || value === "leave" || value === "project" || value === "other") {
      set("category", value);
    }
  }, [set]);

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
      setTitleError("Event title is required");
      return;
    }
    if (!/^[a-zA-Z0-9]/.test(trimmedTitle)) {
      setTitleError("Event title must start with a letter or number");
      return;
    }
    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) {
      setTitleError("Event title must contain at least one letter or number");
      return;
    }
    if (trimmedTitle.length < 2) {
      setTitleError("Event title must be at least 2 characters");
      return;
    }
    if (trimmedTitle.length > 100) {
      setTitleError("Event title must be at most 100 characters");
      return;
    }
    if (/\s{2,}/.test(form.title)) {
      setTitleError("Event title cannot have consecutive spaces");
      return;
    }
    setTitleError("");
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
        await updateEvent.mutateAsync({ id: numericId, ...payload });
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
    } catch (error) {
      toast.error(getErrorMessage(error));
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

  return (
    <EventCreateForm
      open={open}
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      isEdit={isEdit}
      form={form}
      titleError={titleError}
      dateTimeError={dateTimeError}
      showEndDate={showEndDate}
      members={members}
      connections={connections}
      linkedTicket={linkedTicket}
      existingEntityId={existingEntityId}
      ticketPickerOpen={ticketPickerOpen}
      isPending={isPending}
      onClose={handleClose}
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
      onSyncConnectionChange={handleSyncConnectionChange}
      onAddConferenceChange={handleAddConferenceChange}
      onShowEndDate={handleShowEndDate}
      onToggleAttendee={toggleAttendee}
      onOpenTicketPicker={handleOpenTicketPicker}
      onTicketSelect={handleTicketSelect}
      onRemoveLinkedTicket={handleRemoveLinkedTicket}
      onTicketPickerChange={setTicketPickerOpen}
      onSave={handleSave}
    />
  );
}
