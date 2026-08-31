import { differenceInMinutes } from "date-fns";
import { isValidUrl, resolveEventDateTimes, type FormState } from "./event-form-state";
import { buildRrule } from "./event-recurrence-schema";
import type { TicketSearchResult } from "@/hooks/api/build";
import type { CreateCalendarEventPayload } from "@/hooks/api/calendar";

export function validateEventTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Event title is required";
  if (!/^[a-zA-Z0-9]/.test(trimmed)) return "Event title must start with a letter or number";
  if (!/[a-zA-Z0-9]/.test(trimmed)) return "Event title must contain at least one letter or number";
  if (trimmed.length < 2) return "Event title must be at least 2 characters";
  if (trimmed.length > 100) return "Event title must be at most 100 characters";
  if (/\s{2,}/.test(title)) return "Event title cannot have consecutive spaces";
  return null;
}

export function validateEventDescription(desc: string | undefined): string | null {
  if (!desc) return null;
  if (desc.trim().length < 5) return "Description must be at least 5 characters";
  if (desc.length > 2000) return "Description must be at most 2000 characters";
  return null;
}

export function validateEventLocation(loc: string | undefined): string | null {
  if (!loc) return null;
  const trimmed = loc.trim();
  if (/^https?:\/\//i.test(trimmed) && !isValidUrl(trimmed))
    return "Location contains an invalid URL";
  return null;
}

interface BuildEventPayloadArgs {
  form: FormState;
  showEndDate: boolean;
  linkedTicket: TicketSearchResult | null;
  existingEntityId: string | null;
  isEdit: boolean;
}

/**
 * Either a payload or a reason there is none. `{ payload: {} }` typed as the
 * create shape was a lie on every failure path, and the caller had no way to
 * tell a built payload from an empty one.
 */
export type BuildEventPayloadResult =
  | { payload: CreateCalendarEventPayload; error: null }
  | { payload: null; error: string };

export function buildEventPayload({
  form,
  showEndDate,
  linkedTicket,
  existingEntityId,
  isEdit,
}: BuildEventPayloadArgs): BuildEventPayloadResult {
  if (!form.startDate) return { payload: null, error: "Start date is required" };
  if (!form.allDay && !form.startTime) return { payload: null, error: "Start time is required" };
  if (showEndDate && !form.endDate) return { payload: null, error: "End date is required" };
  if (showEndDate && !form.allDay && !form.endTime)
    return { payload: null, error: "End time is required" };

  const resolved = resolveEventDateTimes(form, showEndDate);
  if (!resolved) return { payload: null, error: "Invalid date or time" };

  const { start: startDate, end: endDate } = resolved;
  if (showEndDate && endDate < startDate)
    return { payload: null, error: "End must be on or after start" };
  if (!form.allDay && differenceInMinutes(endDate, startDate) < 15)
    return { payload: null, error: "Event duration must be at least 15 minutes" };

  const resolvedEntityId = linkedTicket ? String(linkedTicket.id) : (existingEntityId ?? undefined);
  const rrule = buildRrule(form.recurrence) ?? undefined;
  const trimmedTitle = form.title.trim();

  return {
    payload: {
      title: trimmedTitle,
      description: form.description || undefined,
      location: form.location || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      allDay: form.allDay,
      color: form.color,
      category: form.category,
      attendeeIds: form.attendeeIds,
      entityType: resolvedEntityId ? "ticket" : undefined,
      entityId: resolvedEntityId,
      rrule,
      syncConnectionId:
        !isEdit && form.syncConnectionId !== "none" ? Number(form.syncConnectionId) : undefined,
      addConference:
        !isEdit && form.syncConnectionId !== "none" ? form.addConference : undefined,
    },
    error: null,
  };
}
