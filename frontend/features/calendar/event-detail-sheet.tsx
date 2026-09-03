"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import Link from "next/link";
import { Pencil, Sparkles } from "lucide-react";
import { DownloadIcon, MicIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  extractEventNumericId,
  useCancelOccurrence,
  useDeleteCalendarEvent,
  useRsvpCalendarEvent,
  useUpdateCalendarEvent,
  type CalendarListItem,
} from "@/hooks/api/calendar";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { downloadCalendarExport } from "./calendar-export";
import { EventCreateDialog } from "./event-create-dialog";
import {
  EventDetailContent,
  getEventColor,
  RSVP_STATUS_LABELS,
} from "./event-detail-content";
import { CalendarListFallback } from "./calendar-lazy-fallbacks";

const MeetingFollowUpPanel = dynamic(
  () =>
    import("./meeting-follow-up-panel").then((m) => ({
      default: m.MeetingFollowUpPanel,
    })),
  { ssr: false, loading: () => <CalendarListFallback label="Loading AI follow-up" /> },
);

const MeetingPrepPanel = dynamic(
  () =>
    import("./meeting-prep-panel").then((m) => ({
      default: m.MeetingPrepPanel,
    })),
  { ssr: false, loading: () => <CalendarListFallback label="Loading AI meeting prep" /> },
);

interface EventDetailSheetProps {
  event: CalendarListItem | null;
  onClose: () => void;
}

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOccurrenceOpen, setCancelOccurrenceOpen] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [aiPrepOpen, setAiPrepOpen] = useState(false);
  const [aiFollowUpOpen, setAiFollowUpOpen] = useState(false);
  const { mutateAsync: deleteEvent, isPending: deleteEventIsPending } = useDeleteCalendarEvent();
  const { mutateAsync: cancelOccurrence, isPending: cancelOccurrenceIsPending } = useCancelOccurrence();
  const { mutateAsync: rsvpMutation, isPending: rsvpMutationIsPending } = useRsvpCalendarEvent();
  const { mutateAsync: updateEvent } = useUpdateCalendarEvent();
  const numericEventId = event ? extractEventNumericId(event.id) : null;
  const isCalendarEvent = event?.source === "event";
  const canUpdate = isCalendarEvent;
  const { iconRef: huddleIconRef, hoverHandlers: huddleHoverHandlers } = useAnimatedIcon();
  const { iconRef: deleteIconRef, hoverHandlers: deleteHoverHandlers } = useAnimatedIcon();
  const { iconRef: downloadIconRef, hoverHandlers: downloadHoverHandlers } = useAnimatedIcon();

  const handleUnlink = useCallback(async () => {
    if (numericEventId === null) return;
    try {
      await updateEvent({ id: numericEventId, entityType: null, entityId: null });
      toast.success("Ticket unlinked");
      setUnlinkConfirmOpen(false);
    } catch {
      toast.error("Failed to unlink ticket");
    }
  }, [numericEventId, updateEvent]);

  const handleDelete = useCallback(async () => {
    if (!event || numericEventId === null) return;
    try {
      await deleteEvent(numericEventId);
      toast.success("Event deleted");
      onClose();
    } catch {
      toast.error("Failed to delete event");
    }
  }, [deleteEvent, event, numericEventId, onClose]);

  const handleCancelOccurrence = useCallback(async () => {
    if (!event || numericEventId === null) return;
    try {
      await cancelOccurrence({ eventId: numericEventId, occurrenceStart: event.start });
      toast.success("Occurrence cancelled");
      setCancelOccurrenceOpen(false);
      onClose();
    } catch {
      toast.error("Failed to cancel occurrence");
    }
  }, [cancelOccurrence, event, numericEventId, onClose]);

  const handleRsvp = useCallback(async (status: "accepted" | "declined" | "tentative") => {
    if (!event || numericEventId === null) return;
    try {
      await rsvpMutation({ eventId: numericEventId, status });
      toast.success(`RSVP updated: ${RSVP_STATUS_LABELS[status]}`);
    } catch {
      toast.error("Failed to update RSVP");
    }
  }, [event, numericEventId, rsvpMutation]);

  const handleExportIcs = useCallback(async () => {
    if (!event) return;
    try {
      await downloadCalendarExport(
        format(new Date(event.start), "yyyy-MM-dd"),
        format(new Date(event.end), "yyyy-MM-dd"),
      );
    } catch {
      toast.error("Failed to export event");
    }
  }, [event]);

  const handleSwitchToFollowUp = useCallback(() => {
    setAiPrepOpen(false);
    setAiFollowUpOpen(true);
  }, []);

  return <>
    <Sheet open={!!event} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: getEventColor(event) }} />
            <TruncatedText text={event?.title ?? ""} className="min-w-0 flex-1" />
          </SheetTitle>
        </SheetHeader>
        <EventDetailContent event={event} numericEventId={numericEventId} isCalendarEvent={isCalendarEvent} canUpdate={canUpdate} deleteEventIsPending={deleteEventIsPending} rsvpMutationIsPending={rsvpMutationIsPending} onClose={onClose} onRequestUnlink={() => setUnlinkConfirmOpen(true)} onRsvp={handleRsvp} />
        {event?.category === "huddle" && event.entityId ? <div className="px-5 pt-3 pb-1 shrink-0"><Link href={`/chat?channel=${event.entityId}`} onClick={onClose}><Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-status-warning-fill hover:bg-status-warning-fill-hover text-white" {...huddleHoverHandlers}><MicIcon ref={huddleIconRef} size={14} />Join Huddle</Button></Link></div> : null}
        <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between gap-2">
          {isCalendarEvent && event?.category !== "huddle" ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmOpen(true)} {...deleteHoverHandlers}><Trash2Icon ref={deleteIconRef} size={14} className="mr-1.5" />Delete</Button>
              {event?.isRecurring ? (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setCancelOccurrenceOpen(true)}>Cancel occurrence</Button>
              ) : null}
            </div>
          ) : <div />}
          <div className="flex items-center gap-2">
            {isCalendarEvent && event?.category !== "huddle" ? <Button variant="outline" size="sm" onClick={() => setAiPrepOpen(true)} className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Prep</Button> : null}
            <Button variant="outline" size="sm" onClick={handleExportIcs} aria-label="Export as .ics" {...downloadHoverHandlers}><DownloadIcon ref={downloadIconRef} size={14} className="mr-1.5" />.ics</Button>
            {isCalendarEvent && event?.category !== "huddle" ? <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button> : null}
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Event" description="This will permanently delete the event. This action cannot be undone." confirmLabel="Delete" destructive onConfirm={handleDelete} />
    <ConfirmDialog open={cancelOccurrenceOpen} onOpenChange={setCancelOccurrenceOpen} title="Cancel this occurrence?" description="Only this occurrence will be cancelled. The rest of the series will continue." confirmLabel="Cancel occurrence" destructive isPending={cancelOccurrenceIsPending} onConfirm={handleCancelOccurrence} />
    <ConfirmDialog open={unlinkConfirmOpen} onOpenChange={setUnlinkConfirmOpen} title="Unlink ticket?" description="The ticket will no longer be associated with this event." confirmLabel="Unlink" onConfirm={handleUnlink} />
    <EventCreateDialog open={editOpen} onOpenChange={setEditOpen} event={event} />
    <AiMeetingSheets event={event} aiPrepOpen={aiPrepOpen} aiFollowUpOpen={aiFollowUpOpen} onAiPrepOpenChange={setAiPrepOpen} onAiFollowUpOpenChange={setAiFollowUpOpen} onSwitchToFollowUp={handleSwitchToFollowUp} />
  </>;
}

interface AiMeetingSheetsProps {
  event: CalendarListItem | null;
  aiPrepOpen: boolean;
  aiFollowUpOpen: boolean;
  onAiPrepOpenChange: (open: boolean) => void;
  onAiFollowUpOpenChange: (open: boolean) => void;
  onSwitchToFollowUp: () => void;
}

function AiMeetingSheets({ event, aiPrepOpen, aiFollowUpOpen, onAiPrepOpenChange, onAiFollowUpOpenChange, onSwitchToFollowUp }: AiMeetingSheetsProps) {
  return <>
    <Sheet open={aiPrepOpen} onOpenChange={onAiPrepOpenChange}><SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]"><SheetHeader className="px-5 py-4 border-b shrink-0"><SheetTitle className="text-sm font-semibold">AI Meeting Prep</SheetTitle></SheetHeader><div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{event ? <><MeetingPrepPanel eventId={String(event.id)} eventTitle={event.title ?? ""} /><div className="pt-2 border-t"><Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5" onClick={onSwitchToFollowUp}><Sparkles className="h-3.5 w-3.5" />Draft Follow-up instead</Button></div></> : null}</div></SheetContent></Sheet>
    <Sheet open={aiFollowUpOpen} onOpenChange={onAiFollowUpOpenChange}><SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]"><SheetHeader className="px-5 py-4 border-b shrink-0"><SheetTitle className="text-sm font-semibold">AI Follow-up</SheetTitle></SheetHeader><div className="flex-1 overflow-y-auto px-5 py-4">{event ? <MeetingFollowUpPanel eventId={String(event.id)} onClose={() => onAiFollowUpOpenChange(false)} /> : null}</div></SheetContent></Sheet>
  </>;
}
