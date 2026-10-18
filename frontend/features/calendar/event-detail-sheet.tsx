"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { format, addDays } from "date-fns";
import { Tag } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppSheet } from "@/components/shared/app-sheet";
import {
  parseCalendarEventId,
  useCancelOccurrence,
  useCalendarEvent,
  useDeleteCalendarEvent,
  useRsvpCalendarEvent,
  useUpdateCalendarEvent,
  type CalendarListItem,
} from "@/hooks/api/calendar";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatEventDate, formatEventDateRange, formatEventTimeRange } from "@/lib/date-utils";
import { downloadCalendarExport } from "./calendar-export";
import { EventSeriesScopeDialog, type SeriesScope } from "./event-series-scope-dialog";
import { EventDetailActions } from "./event-detail-actions";
import { EventCreateDialog } from "./event-create-dialog";
import {
  EventDetailContent,
  getEventColor,
  RSVP_STATUS_LABELS,
} from "./event-detail-content";
import { CalendarListFallback } from "./calendar-lazy-fallbacks";
import { CalendarSourceActionPanel } from "./calendar-source-action-panel";
import { CalendarNativeScenarioMove } from "./calendar-native-scenario-move";
import type { CalendarScenarioDraftStep } from "./calendar-scenario-draft";
import type { CommitmentReference } from "@/hooks/api/calendar-commitment-schema";

const MeetingWorkspacePanel = dynamic(
  () =>
    import("./meeting-workspace-panel").then((m) => ({
      default: m.MeetingWorkspacePanel,
    })),
  {
    ssr: false,
    loading: () => <CalendarListFallback label="Loading meeting workspace" />,
  },
);

const ProtectedWorkDialog = dynamic(
  () => import("./protected-work-dialog").then((m) => ({ default: m.ProtectedWorkDialog })),
  { ssr: false },
);

const CommitmentRadarSheet = dynamic(
  () => import("./commitment-radar-sheet").then((m) => ({ default: m.CommitmentRadarSheet })),
  { ssr: false },
);

interface EventDetailSheetProps {
  event: CalendarListItem | null;
  onClose: () => void;
  onQueueScenarioStep?: (draft: CalendarScenarioDraftStep) => void;
}

export function EventDetailSheet({ event, onClose, onQueueScenarioStep }: EventDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteRecurringScopeOpen, setDeleteRecurringScopeOpen] = useState(false);
  const [cancelOccurrenceOpen, setCancelOccurrenceOpen] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [meetingWorkspaceOpen, setMeetingWorkspaceOpen] = useState(false);
  const [protectedWorkOpen, setProtectedWorkOpen] = useState(false);
  const [commitmentRadarOpen, setCommitmentRadarOpen] = useState(false);
  const { mutateAsync: deleteEvent, isPending: deleteEventIsPending } =
    useDeleteCalendarEvent();
  const {
    mutateAsync: cancelOccurrence,
    isPending: cancelOccurrenceIsPending,
  } = useCancelOccurrence();
  const { mutateAsync: rsvpMutation, isPending: rsvpMutationIsPending } =
    useRsvpCalendarEvent();
  const { mutateAsync: updateEvent } = useUpdateCalendarEvent();
  const parsedEventId = event ? parseCalendarEventId(event.id) : null;
  const numericEventId = parsedEventId?.eventId ?? null;
  const isCalendarEvent = event?.source === "event";
  const { data: detail, isLoading: detailLoading } = useCalendarEvent(
    isCalendarEvent ? numericEventId : null,
  );
  const canUpdate = isCalendarEvent && (detail ? detail.canManage === true : event?.actions.edit === true);
  const canMutateEvent = canUpdate && event?.category !== "huddle";
  const canExport = useCan("calendar:events:export");
  const commitmentRoot: CommitmentReference | null = detail?.linkedTicket
    ? { source: "build", type: "ticket", recordId: String(detail.linkedTicket.id) }
    : event?.entityType === "deal" && event.entityId && /^\d+$/.test(event.entityId)
      ? { source: "crm", type: "deal", recordId: event.entityId }
      : null;
  const when = !event
    ? ""
    : event.allDay
      ? event.time.kind === "date" && event.time.startDate !== event.time.endDate
        ? formatEventDateRange(event.time.startDate, event.time.endDate, event.timezone)
        : `${formatEventDate(event.start, event.timezone)} · All day`
      : formatEventTimeRange(event.start, event.end, event.timezone);

  const handleUnlink = useCallback(async () => {
    if (numericEventId === null) return;
    try {
      await updateEvent({
        calendarEventId: numericEventId,
        entityType: null,
        entityId: null,
      });
      toast.success("Ticket unlinked");
      setUnlinkConfirmOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [numericEventId, updateEvent]);

  const handleDelete = useCallback(async () => {
    if (!event || numericEventId === null) return;
    try {
      await deleteEvent(numericEventId);
      toast.success("Event deleted");
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [deleteEvent, event, numericEventId, onClose]);

  const handleCancelOccurrence = useCallback(async () => {
    if (!event || numericEventId === null) return;
    try {
      await cancelOccurrence({
        eventId: numericEventId,
        occurrenceStart: parsedEventId?.occurrenceStart ?? event.start,
        expectedVersion: detail?.localVersion,
      });
      toast.success("Occurrence cancelled");
      setCancelOccurrenceOpen(false);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [
    cancelOccurrence,
    detail?.localVersion,
    event,
    numericEventId,
    parsedEventId,
    onClose,
  ]);

  const handleRsvp = useCallback(
    async (status: "accepted" | "declined" | "tentative") => {
      if (!event || numericEventId === null) return;
      try {
        await rsvpMutation({ eventId: numericEventId, status });
        toast.success(`RSVP updated: ${RSVP_STATUS_LABELS[status]}`);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [event, numericEventId, rsvpMutation],
  );

  const handleExportDay = useCallback(async () => {
    if (!event) return;
    try {
      const startDay = new Date(event.start);
      await downloadCalendarExport(
        format(startDay, "yyyy-MM-dd"),
        format(addDays(startDay, 1), "yyyy-MM-dd"),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [event]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const handleRequestDelete = useCallback(() => {
    if (detail?.isRecurring) {
      setDeleteRecurringScopeOpen(true);
    } else {
      setConfirmOpen(true);
    }
  }, [detail?.isRecurring]);
  const handleDeleteScopeConfirm = useCallback(
    async (scope: SeriesScope) => {
      if (!event || numericEventId === null) return;
      setDeleteRecurringScopeOpen(false);
      if (scope === "occurrence") {
        try {
          await cancelOccurrence({
            eventId: numericEventId,
            occurrenceStart: parsedEventId?.occurrenceStart ?? event.start,
            expectedVersion: detail?.localVersion,
          });
          toast.success("Occurrence cancelled");
          onClose();
        } catch (err) {
          toast.error(getErrorMessage(err));
        }
      } else {
        setConfirmOpen(true);
      }
    },
    [event, numericEventId, parsedEventId, detail?.localVersion, cancelOccurrence, onClose],
  );

  const handleRequestCancelOccurrence = useCallback(
    () => setCancelOccurrenceOpen(true),
    [],
  );
  const handleRequestUnlink = useCallback(() => setUnlinkConfirmOpen(true), []);
  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleOpenMeetingWorkspace = useCallback(() => setMeetingWorkspaceOpen(true), []);
  const handleOpenProtectedWork = useCallback(() => setProtectedWorkOpen(true), []);
  const handleOpenCommitmentRadar = useCallback(() => setCommitmentRadarOpen(true), []);

  return (
    <>
      <AppSheet
        open={!!event}
        onOpenChange={handleSheetOpenChange}
        title={event?.title ?? "Event details"}
        description={when}
        className="sm:max-w-xl"
        footer={<EventDetailActions
          showMeeting={isCalendarEvent && event?.category !== "huddle"}
          showHuddle={event?.category === "huddle" && Boolean(event.entityId)}
          huddleHref={event?.entityId ? `/chat?channel=${event.entityId}` : null}
          canExport={canExport}
          canMutate={canMutateEvent}
          mutatePending={isCalendarEvent && !detail}
          showCancelOccurrence={canMutateEvent && detail?.isRecurring === true}
          showProtect={canMutateEvent && !detail?.isRecurring && !event?.allDay}
          showRadar={commitmentRoot !== null}
          onClose={onClose}
          onDelete={handleRequestDelete}
          onCancelOccurrence={handleRequestCancelOccurrence}
          onMeeting={handleOpenMeetingWorkspace}
          onExport={handleExportDay}
          onEdit={handleOpenEdit}
          onProtect={handleOpenProtectedWork}
          onRadar={handleOpenCommitmentRadar}
        />}
      >
          {event ? (
            <div className="mb-4 flex items-center gap-2 border-l-4 pl-3" style={{ borderColor: getEventColor(event) }}>
              <Tag className="size-3.5" style={{ color: getEventColor(event) }} />
              <span className="text-sm capitalize text-muted-foreground">{event.category}</span>
            </div>
          ) : null}
          <EventDetailContent
            event={event}
            numericEventId={numericEventId}
            isCalendarEvent={isCalendarEvent}
            canUpdate={canUpdate}
            deleteEventIsPending={deleteEventIsPending}
            rsvpMutationIsPending={rsvpMutationIsPending}
            detail={detail}
            detailLoading={detailLoading}
            onClose={onClose}
            onRequestUnlink={handleRequestUnlink}
            onRsvp={handleRsvp}
          />
          {event ? <CalendarSourceActionPanel key={`${event.id}:${event.sourceVersion}`} event={event} onQueueScenarioStep={onQueueScenarioStep} /> : null}
          {detail && canMutateEvent && !detail.isRecurring && !detail.allDay && commitmentRoot && onQueueScenarioStep ?
            <CalendarNativeScenarioMove key={`${detail.id}:${detail.localVersion}`} detail={detail} root={commitmentRoot} onQueue={onQueueScenarioStep} /> : null}
      </AppSheet>
      <EventSeriesScopeDialog
        open={deleteRecurringScopeOpen}
        onOpenChange={setDeleteRecurringScopeOpen}
        onConfirm={handleDeleteScopeConfirm}
        isPending={deleteEventIsPending || cancelOccurrenceIsPending}
        title="Delete recurring event"
        description="Which occurrences do you want to delete?"
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Event"
        description="This will permanently delete the event. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={cancelOccurrenceOpen}
        onOpenChange={setCancelOccurrenceOpen}
        title="Cancel this occurrence?"
        description="Only this occurrence will be cancelled. The rest of the series will continue."
        confirmLabel="Cancel occurrence"
        destructive
        isPending={cancelOccurrenceIsPending}
        onConfirm={handleCancelOccurrence}
      />
      <ConfirmDialog
        open={unlinkConfirmOpen}
        onOpenChange={setUnlinkConfirmOpen}
        title="Unlink ticket?"
        description="The ticket will no longer be associated with this event."
        confirmLabel="Unlink"
        onConfirm={handleUnlink}
      />
      <EventCreateDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
        rrule={detail?.rrule}
      />
      <MeetingWorkspaceSheet
        event={event}
        open={meetingWorkspaceOpen}
        onOpenChange={setMeetingWorkspaceOpen}
      />
      {protectedWorkOpen && numericEventId !== null && event ? (
        <ProtectedWorkDialog
          eventId={numericEventId}
          eventStart={new Date(event.start)}
          eventEnd={new Date(event.end)}
          open
          onClose={() => setProtectedWorkOpen(false)}
        />
      ) : null}
      {commitmentRadarOpen && commitmentRoot ? (
        <CommitmentRadarSheet root={commitmentRoot} open onClose={() => setCommitmentRadarOpen(false)} />
      ) : null}
    </>
  );
}

interface MeetingWorkspaceSheetProps {
  event: CalendarListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MeetingWorkspaceSheet({
  event,
  open,
  onOpenChange,
}: MeetingWorkspaceSheetProps) {
  const eventId = event ? parseCalendarEventId(event.id)?.eventId ?? null : null;
  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Meeting workspace"
      description={event?.title || "Meeting"}
      className="z-[110] sm:max-w-2xl"
    >
      {event && eventId ? <MeetingWorkspacePanel eventId={eventId} eventTitle={event.title ?? ""} /> : null}
    </AppSheet>
  );
}
