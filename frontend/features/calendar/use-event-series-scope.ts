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
  onClose: () => void;
}

export function useEventSeriesScope({
  event,
  updateEvent,
  upsertOccurrenceException,
  expectedVersion,
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
            // Keyed on the NOMINAL start the id carries, not the moved `start`.
            occurrenceStart: parsed.occurrenceStart ?? event.start,
            modifiedTitle: pendingPayload.title,
            modifiedStart: pendingPayload.startDate,
            modifiedEnd: pendingPayload.endDate,
            expectedVersion,
          });
          toast.success("Occurrence updated");
        } else {
          const { syncConnectionId: _sc, addConference: _ac, ...editPayload } = pendingPayload;
          await updateEvent.mutateAsync({
            calendarEventId: parsed.eventId,
            ...editPayload,
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
    [pendingPayload, event, upsertOccurrenceException, updateEvent, expectedVersion, onClose],
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
