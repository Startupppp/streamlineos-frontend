import { useState, useCallback } from "react";
import {
  parseCalendarEventId,
  useUpdateCalendarEvent,
  useUpsertOccurrenceException,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SeriesScope } from "./event-series-scope-dialog";
import type { CalendarEventPayload } from "./event-create-validators";

interface UseEventSeriesScopeProps {
  event?: CalendarListItem | null;
  updateEvent: ReturnType<typeof useUpdateCalendarEvent>;
  upsertOccurrenceException: ReturnType<typeof useUpsertOccurrenceException>;
  expectedVersion?: number;
  series?: { startDate: string; endDate: string } | null;
  onClose: () => void;
}

function seriesTiming(
  payload: CalendarEventPayload,
  occurrence: CalendarListItem,
  series: { startDate: string; endDate: string } | null | undefined,
): { startDate?: string; endDate?: string } | null {
  const shift = Date.parse(payload.startDate) - Date.parse(occurrence.start);
  const duration = Date.parse(payload.endDate) - Date.parse(payload.startDate);
  if (shift === 0 && duration === Date.parse(occurrence.end) - Date.parse(occurrence.start)) return {};
  if (!series) return null;
  const start = Date.parse(series.startDate) + shift;
  return { startDate: new Date(start).toISOString(), endDate: new Date(start + duration).toISOString() };
}

export function useEventSeriesScope({
  event,
  updateEvent,
  upsertOccurrenceException,
  expectedVersion,
  series,
  onClose,
}: UseEventSeriesScopeProps) {
  const [seriesScopeOpen, setSeriesScopeOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<CalendarEventPayload | null>(null);

  const openWithPayload = useCallback((payload: CalendarEventPayload) => {
    setPendingPayload(payload);
    setSeriesScopeOpen(true);
  }, []);

  const handleSeriesScopeConfirm = useCallback(
    async (scope: SeriesScope) => {
      if (!pendingPayload || !event) return;
      const parsed = parseCalendarEventId(event.id);
      if (parsed === null) {
        toast.error("Cannot edit this event type");
        setSeriesScopeOpen(false);
        return;
      }
      try {
        if (scope === "occurrence") {
          await upsertOccurrenceException.mutateAsync({
            eventId: parsed.eventId,
            occurrenceStart: parsed.occurrenceStart ?? event.start,
            modifiedTitle: pendingPayload.title,
            ...(pendingPayload.description !== undefined
              ? { modifiedDescription: pendingPayload.description }
              : {}),
            modifiedStart: pendingPayload.startDate,
            modifiedEnd: pendingPayload.endDate,
            expectedVersion,
          });
          toast.success("Occurrence updated");
        } else {
          const { syncConnectionId: _sc, addConference: _ac, startDate: _s, endDate: _e, ...editPayload } = pendingPayload;
          const timing = parsed.occurrenceStart
            ? seriesTiming(pendingPayload, event, series)
            : { startDate: pendingPayload.startDate, endDate: pendingPayload.endDate };
          if (timing === null) {
            toast.error("The series is still loading. Try again in a moment.");
            return;
          }
          await updateEvent.mutateAsync({
            calendarEventId: parsed.eventId,
            ...editPayload,
            ...timing,
            expectedVersion,
          });
          toast.success("Event updated");
        }
        setSeriesScopeOpen(false);
        setPendingPayload(null);
        onClose();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [pendingPayload, event, upsertOccurrenceException, updateEvent, expectedVersion, series, onClose],
  );

  const handleSeriesScopeOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) setPendingPayload(null);
    setSeriesScopeOpen(isOpen);
  }, []);

  return {
    seriesScopeOpen,
    openWithPayload,
    seriesPending: upsertOccurrenceException.isPending || updateEvent.isPending,
    handleSeriesScopeConfirm,
    handleSeriesScopeOpenChange,
  };
}
