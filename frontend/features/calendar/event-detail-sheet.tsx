"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { format, addDays } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Tag } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
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
import { formatEventDate, formatEventTimeRange } from "@/lib/date-utils";
import { downloadCalendarExport } from "./calendar-export";
import { EventDetailActions } from "./event-detail-actions";
import { EventCreateDialog } from "./event-create-dialog";
import {
  EventDetailContent,
  getEventColor,
  RSVP_STATUS_LABELS,
} from "./event-detail-content";
import { CalendarListFallback } from "./calendar-lazy-fallbacks";
import { CalendarSourceActionPanel } from "./calendar-source-action-panel";
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
  const canUpdate = isCalendarEvent && detail?.canManage === true;
  const canMutateEvent = canUpdate && event?.category !== "huddle";
  const canExport = useCan("calendar:events:export");
  const commitmentRoot: CommitmentReference | null = detail?.linkedTicket
    ? { source: "build", type: "ticket", recordId: String(detail.linkedTicket.id) }
    : event?.entityType === "deal" && event.entityId && /^\d+$/.test(event.entityId)
      ? { source: "crm", type: "deal", recordId: event.entityId }
      : null;
  const reduceMotion = useReducedMotion() === true;

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

  const handleRequestDelete = useCallback(() => setConfirmOpen(true), []);
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
      <Dialog open={!!event} onOpenChange={handleSheetOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <EventDetailHeader event={event} reduceMotion={reduceMotion} />
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
          <EventDetailActions
            showMeeting={isCalendarEvent && event?.category !== "huddle"}
            showHuddle={event?.category === "huddle" && Boolean(event.entityId)}
            huddleHref={event?.entityId ? `/chat?channel=${event.entityId}` : null}
            canExport={canExport}
            canMutate={canMutateEvent}
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
          />
        </DialogContent>
      </Dialog>
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

const HEADER_EASE = [0.22, 1, 0.36, 1] as const;

function EventDetailHeader({
  event,
  reduceMotion,
}: {
  event: CalendarListItem | null;
  reduceMotion: boolean;
}) {
  const color = getEventColor(event);
  const when = !event
    ? ""
    : event.allDay
      ? formatEventDate(event.start, event.timezone)
      : formatEventTimeRange(event.start, event.end, event.timezone);

  return (
    <DialogHeader className="relative shrink-0 overflow-hidden border-b px-5 py-4 text-left">
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left"
        style={{ backgroundColor: color }}
        initial={reduceMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: HEADER_EASE }}
      />
      <DialogTitle className="text-base font-semibold tracking-tight">
        <TruncatedText text={event?.title ?? ""} lines={2} className="min-w-0 text-balance" />
      </DialogTitle>
      {event ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-label text-muted-foreground">{when}</p>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-label font-medium capitalize text-foreground">
            <Tag className="size-3.5" style={{ color }} />
            {event.category}
          </span>
        </div>
      ) : null}
    </DialogHeader>
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent overlayClassName="z-[110]" className="z-[110] flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 gap-1 border-b px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Meeting workspace</p>
          <SheetTitle className="text-base font-semibold tracking-tight">
            <TruncatedText text={event?.title || "Meeting"} lines={2} className="min-w-0 text-balance" />
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-5 py-4">
            {event && eventId ? <MeetingWorkspacePanel eventId={eventId} eventTitle={event.title ?? ""} /> : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
