"use client";

import { useState, useCallback } from "react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import { MeetingPrepPanel } from "./meeting-prep-panel";
import { MeetingFollowUpPanel } from "./meeting-follow-up-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  MapPinIcon,
  Trash2Icon,
  DownloadIcon,
  UsersIcon,
  CheckIcon,
  XIcon,
  MicIcon,
} from "@animateicons/react/lucide";
import {
  CalendarIcon,
  Tag,
  Pencil,
  HelpCircle,
  Ticket,
  Video,
} from "lucide-react";
import {
  useDeleteCalendarEvent,
  useRsvpCalendarEvent,
  useEventAttendees,
  useUpdateCalendarEvent,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { downloadCalendarExport } from "./calendar-export";
import { EventCreateDialog } from "./event-create-dialog";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import { TruncatedText } from "@/components/ui/truncated-text";

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#3b82f6",
};

interface EventDetailSheetProps {
  event: CalendarListItem | null;
  onClose: () => void;
}

const RSVP_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  declined: "Declined",
  tentative: "Tentative",
  pending: "Pending",
};

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [aiPrepOpen, setAiPrepOpen] = useState(false);
  const [aiFollowUpOpen, setAiFollowUpOpen] = useState(false);

  const handleOpenAiPrep = useCallback(() => setAiPrepOpen(true), []);
  const handleCloseAiFollowUp = useCallback(() => setAiFollowUpOpen(false), []);
  const handleSwitchToFollowUp = useCallback(() => {
    setAiPrepOpen(false);
    setAiFollowUpOpen(true);
  }, []);
  const { mutateAsync: deleteEvent, isPending: deleteEventIsPending } =
    useDeleteCalendarEvent();
  const { mutateAsync: rsvpMutation, isPending: rsvpMutationIsPending } =
    useRsvpCalendarEvent();
  const { mutateAsync: updateEvent } = useUpdateCalendarEvent();

  const numericEventId = event ? extractEventNumericId(event.id) : null;
  const isCalendarEvent = event?.source === "event";
  const canUpdate = isCalendarEvent;

  const { iconRef: acceptIconRef, hoverHandlers: acceptHoverHandlers } = useAnimatedIcon();
  const { iconRef: declineIconRef, hoverHandlers: declineHoverHandlers } = useAnimatedIcon();
  const { iconRef: unlinkIconRef, hoverHandlers: unlinkHoverHandlers } = useAnimatedIcon();
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

  const { data: attendees = [] } = useEventAttendees(
    isCalendarEvent ? numericEventId : null,
  );

  const handleDelete = useCallback(async () => {
    if (!event || numericEventId === null) return;
    try {
      await deleteEvent(numericEventId);
      toast.success("Event deleted");
      onClose();
    } catch {
      toast.error("Failed to delete event");
    }
  }, [event, numericEventId, deleteEvent, onClose]);

  const handleRsvp = useCallback(
    async (status: "accepted" | "declined" | "tentative") => {
      if (!event || numericEventId === null) return;
      try {
        await rsvpMutation({ eventId: numericEventId, status });
        toast.success(`RSVP updated: ${RSVP_STATUS_LABELS[status]}`);
      } catch {
        toast.error("Failed to update RSVP");
      }
    },
    [event, numericEventId, rsvpMutation],
  );

  const handleExportIcs = useCallback(async () => {
    if (!event) return;
    const from = format(new Date(event.start), "yyyy-MM-dd");
    const to = format(new Date(event.end), "yyyy-MM-dd");
    try {
      await downloadCalendarExport(from, to);
    } catch {
      toast.error("Failed to export event");
    }
  }, [event]);

  const colorHex = event
    ? (EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue)
    : EVENT_COLORS.blue;

  return (
    <>
      <Sheet open={!!event} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: colorHex }}
              />
              <TruncatedText text={event?.title ?? ""} className="min-w-0 flex-1" />
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-3">
              {event && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {event.allDay
                        ? format(new Date(event.start), "PPP")
                        : `${format(new Date(event.start), "PPp")} – ${format(new Date(event.end), "p")}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPinIcon size={14} className="shrink-0 mt-0.5" />
                      {event.location.startsWith("http") ? (
                        <a
                          href={event.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 hover:underline break-all"
                        >
                          {event.location}
                        </a>
                      ) : (
                        <span>{event.location}</span>
                      )}
                    </div>
                  )}
                  {event.meetingUrl && (
                    <div className="flex items-center gap-2">
                      <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <a
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Join meeting
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    <Badge variant="outline" className="text-xs capitalize">
                      {event.category}
                    </Badge>
                  </div>
                  {event.description && (
                    <>
                      <Separator />
                      <p className="text-sm text-foreground">
                        {event.description}
                      </p>
                    </>
                  )}
                  {event.creatorName && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground">
                        Created by {event.creatorName}
                      </p>
                    </>
                  )}

                  {event.entityType === "ticket" && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Ticket className="h-3.5 w-3.5" />
                          Linked ticket
                        </p>
                        {event.linkedTicket ? (
                          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 group">
                            <Link
                              href={`/build/${event.linkedTicket.projectId}?ticket=${event.linkedTicket.id}`}
                              className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                              onClick={onClose}
                            >
                              <Badge
                                variant="outline"
                                className="font-mono text-micro shrink-0 text-muted-foreground border-border"
                              >
                                {event.linkedTicket.key}
                              </Badge>
                              <TruncatedText text={event.linkedTicket.title} className="text-sm flex-1 text-foreground" />
                              <Badge
                                variant="secondary"
                                className="text-micro h-4 px-1.5 shrink-0 capitalize"
                              >
                                {event.linkedTicket.status.toLowerCase().replace(/_/g, " ")}
                              </Badge>
                            </Link>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => setUnlinkConfirmOpen(true)}
                                {...unlinkHoverHandlers}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors duration-150 flex items-center gap-1 shrink-0"
                                aria-label="Unlink ticket"
                              >
                                <XIcon ref={unlinkIconRef} size={12} />
                                Unlink
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2">
                            <span className="text-xs text-muted-foreground flex-1 italic">
                              Ticket unavailable — it may have been deleted.
                            </span>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => setUnlinkConfirmOpen(true)}
                                {...unlinkHoverHandlers}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors duration-150 flex items-center gap-1 shrink-0"
                                aria-label="Unlink ticket"
                              >
                                <XIcon ref={unlinkIconRef} size={12} />
                                Unlink
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {isCalendarEvent && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Your RSVP
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-status-success-ink border-status-success-rule hover:bg-status-success-surface hover:text-status-success-ink"
                            disabled={
                              deleteEventIsPending || rsvpMutationIsPending
                            }
                            onClick={() => handleRsvp("accepted")}
                            aria-label="Accept event"
                            {...acceptHoverHandlers}
                          >
                            <CheckIcon ref={acceptIconRef} size={12} />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-status-warning-ink border-status-warning-rule hover:bg-status-warning-surface hover:text-status-warning-ink"
                            disabled={rsvpMutationIsPending}
                            onClick={() => handleRsvp("tentative")}
                            aria-label="Mark as tentative"
                          >
                            <HelpCircle className="h-3 w-3" />
                            Maybe
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            disabled={rsvpMutationIsPending}
                            onClick={() => handleRsvp("declined")}
                            aria-label="Decline event"
                            {...declineHoverHandlers}
                          >
                            <XIcon ref={declineIconRef} size={12} />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {attendees.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <UsersIcon size={12} />
                          Attendees ({attendees.length})
                        </div>
                        <div className="space-y-1.5">
                          {attendees.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={resolveImageUrl(a.user?.image ?? null)}
                                />
                                <AvatarFallback className="text-micro">
                                  {(a.user?.name ?? a.user?.email ?? "?")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <TruncatedText text={a.user?.name ?? a.user?.email ?? "Unknown"} className="flex-1 text-xs" />
                              <Badge
                                variant="outline"
                                className={`text-micro h-4 px-1.5 capitalize ${
                                  a.status === "accepted"
                                    ? "border-status-success-rule text-status-success-ink"
                                    : a.status === "declined"
                                      ? "border-status-danger-rule text-status-danger-ink"
                                      : a.status === "tentative"
                                        ? "border-status-warning-rule text-status-warning-ink"
                                        : "border-border text-muted-foreground"
                                }`}
                              >
                                {RSVP_STATUS_LABELS[a.status] ?? a.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          {event?.category === "huddle" && event.entityId && (
            <div className="px-5 pt-3 pb-1 shrink-0">
              <Link href={`/chat?channel=${event.entityId}`} onClick={onClose}>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 bg-status-warning-fill hover:bg-status-warning-fill-hover text-white"
                  {...huddleHoverHandlers}
                >
                  <MicIcon ref={huddleIconRef} size={14} />
                  Join Huddle
                </Button>
              </Link>
            </div>
          )}
          <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between gap-2">
            {isCalendarEvent && event?.category !== "huddle" ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
                {...deleteHoverHandlers}
              >
                <Trash2Icon ref={deleteIconRef} size={14} className="mr-1.5" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {isCalendarEvent && event?.category !== "huddle" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAiPrep}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Prep
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportIcs}
                aria-label="Export as .ics"
                {...downloadHoverHandlers}
              >
                <DownloadIcon ref={downloadIconRef} size={14} className="mr-1.5" />
                .ics
              </Button>
              {isCalendarEvent && event?.category !== "huddle" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
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
      />
      <Sheet open={aiPrepOpen} onOpenChange={setAiPrepOpen}>
        <SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-semibold">AI Meeting Prep</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {event && (
              <>
                <MeetingPrepPanel
                  eventId={String(event.id)}
                  eventTitle={event.title ?? ""}
                />
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    onClick={handleSwitchToFollowUp}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Draft Follow-up instead
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={aiFollowUpOpen} onOpenChange={setAiFollowUpOpen}>
        <SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-semibold">AI Follow-up</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {event && (
              <MeetingFollowUpPanel
                eventId={String(event.id)}
                onClose={handleCloseAiFollowUp}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
