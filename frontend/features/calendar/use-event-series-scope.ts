import type { CreateCalendarEventPayload } from "@/hooks/api/calendar";
import { useState, useCallback } from "react";
import {
  extractEventNumericId,
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
  onClose: () => void;
}

export function useEventSeriesScope({
  event,
  updateEvent,
  upsertOccurrenceException,
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
      const numericId = extractEventNumericId(event.id);
      if (numericId === null) {
        toast.error("Cannot edit this event type");
        setSeriesScopeOpen(false);
        return;
      }
      try {
        if (scope === "occurrence") {
          await upsertOccurrenceException.mutateAsync({
            eventId: numericId,
            occurrenceStart: event.start,
            modifiedTitle: pendingPayload.title,
            modifiedStart: pendingPayload.startDate,
            modifiedEnd: pendingPayload.endDate,
          });
          toast.success("Occurrence updated");
        } else {
          const { syncConnectionId: _sc, addConference: _ac, ...editPayload } = pendingPayload;
          await updateEvent.mutateAsync({ id: numericId, ...editPayload });
          toast.success("Event updated");
        }
        setSeriesScopeOpen(false);
        setPendingPayload(null);
        onClose();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [pendingPayload, event, upsertOccurrenceException, updateEvent, onClose],
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
