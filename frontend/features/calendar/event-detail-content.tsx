"use client";

import { useCallback } from "react";
import Link from "next/link";
import { CalendarIcon, HelpCircle, Tag, Ticket, Video } from "lucide-react";
import { CheckIcon, MapPinIcon, UsersIcon, XIcon } from "@animateicons/react/lucide";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useEventAttendees, type CalendarEventDetail, type CalendarListItem } from "@/hooks/api/calendar";
import { resolveImageUrl } from "@/lib/utils";
import { formatEventDate, formatEventTimeRange } from "@/lib/date-utils";
import { EVENT_COLORS } from "./calendar-event-constants";
import { EventSyncStatus } from "./event-sync-status";

export const RSVP_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  declined: "Declined",
  tentative: "Tentative",
  pending: "Pending",
};

interface EventDetailContentProps {
  event: CalendarListItem | null;
  numericEventId: number | null;
  isCalendarEvent: boolean;
  canUpdate: boolean;
  deleteEventIsPending: boolean;
  rsvpMutationIsPending: boolean;
  detail?: CalendarEventDetail | null;
  detailLoading?: boolean;
  onClose: () => void;
  onRequestUnlink: () => void;
  onRsvp: (status: "accepted" | "declined" | "tentative") => void;
}

export function getEventColor(event: CalendarListItem | null) {
  return event ? (EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue) : EVENT_COLORS.blue;
}

export function EventDetailContent({
  event,
  numericEventId,
  isCalendarEvent,
  canUpdate,
  deleteEventIsPending,
  rsvpMutationIsPending,
  detail,
  detailLoading,
  onClose,
  onRequestUnlink,
  onRsvp,
}: EventDetailContentProps) {
  const { data: attendees = [] } = useEventAttendees(
    isCalendarEvent ? numericEventId : null,
  );
  const { iconRef: acceptIconRef, hoverHandlers: acceptHoverHandlers } = useAnimatedIcon();
  const { iconRef: declineIconRef, hoverHandlers: declineHoverHandlers } = useAnimatedIcon();

  const handleAccept = useCallback(() => onRsvp("accepted"), [onRsvp]);
  const handleTentative = useCallback(() => onRsvp("tentative"), [onRsvp]);
  const handleDecline = useCallback(() => onRsvp("declined"), [onRsvp]);

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-5 py-4 space-y-3">
        {event ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                {event.allDay
                  ? formatEventDate(event.start, event.timezone)
                  : formatEventTimeRange(event.start, event.end, event.timezone)}
              </span>
            </div>
            {event.location ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPinIcon size={14} className="shrink-0 mt-0.5" />
                {event.location.startsWith("http") ? (
                  <a href={event.location} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 hover:underline break-all">
                    {event.location}
                  </a>
                ) : <span>{event.location}</span>}
              </div>
            ) : null}
            {detailLoading && isCalendarEvent ? (
              <Skeleton className="h-8 w-full rounded-md" />
            ) : detail?.meetingUrl ? (
              <div className="flex items-center gap-2">
                <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <a href={detail.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  Join meeting
                </a>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <Badge variant="outline" className="text-xs capitalize">{event.category}</Badge>
            </div>
            {detailLoading && isCalendarEvent ? (
              <><Separator /><Skeleton className="h-12 w-full rounded-md" /></>
            ) : ((isCalendarEvent ? detail?.description : event.description) ?? null) ? (
              <><Separator /><p className="text-sm text-foreground">{isCalendarEvent ? detail?.description : event.description}</p></>
            ) : null}
            {detailLoading && isCalendarEvent ? null : ((isCalendarEvent ? detail?.creatorName : event.creatorName) ?? null) ? (
              <><Separator /><p className="text-xs text-muted-foreground">Created by {isCalendarEvent ? detail?.creatorName : event.creatorName}</p></>
            ) : null}
            {(detail?.entityType ?? event.entityType) === "ticket" ? (
              <><Separator /><div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5" />Linked ticket</p>
                {detailLoading && isCalendarEvent ? (
                  <Skeleton className="h-10 w-full rounded-lg" />
                ) : <LinkedTicketRow linkedTicket={detail?.linkedTicket ?? null} canUpdate={canUpdate} onClose={onClose} onRequestUnlink={onRequestUnlink} />}
              </div></>
            ) : null}
            {isCalendarEvent ? (
              <><Separator /><div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your RSVP</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 text-status-success-ink border-status-success-rule hover:bg-status-success-surface hover:text-status-success-ink" disabled={deleteEventIsPending || rsvpMutationIsPending} onClick={handleAccept} aria-label="Accept event" {...acceptHoverHandlers}><CheckIcon ref={acceptIconRef} size={12} />Accept</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 text-status-warning-ink border-status-warning-rule hover:bg-status-warning-surface hover:text-status-warning-ink" disabled={rsvpMutationIsPending} onClick={handleTentative} aria-label="Mark as tentative"><HelpCircle className="h-3 w-3" />Maybe</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" disabled={rsvpMutationIsPending} onClick={handleDecline} aria-label="Decline event" {...declineHoverHandlers}><XIcon ref={declineIconRef} size={12} />Decline</Button>
                </div>
              </div></>
            ) : null}
            <EventSyncStatus eventId={isCalendarEvent ? numericEventId : null} />
            {attendees.length > 0 ? <><Separator /><div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"><UsersIcon size={12} />Attendees ({attendees.length})</div>
              <div className="space-y-1.5">{attendees.map((attendee) => <AttendeeRow key={attendee.id} attendee={attendee} />)}</div>
            </div></> : null}
          </>
        ) : null}
      </div>
    </ScrollArea>
  );
}

interface LinkedTicketRowProps {
  linkedTicket: CalendarEventDetail["linkedTicket"];
  canUpdate: boolean;
  onClose: () => void;
  onRequestUnlink: () => void;
}

function LinkedTicketRow({ linkedTicket, canUpdate, onClose, onRequestUnlink }: LinkedTicketRowProps) {
  if (linkedTicket) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 group">
        <Link href={`/build/${linkedTicket.projectId}/issues?ticket=${linkedTicket.id}`} className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity" onClick={onClose}>
          <Badge variant="outline" className="font-mono text-micro shrink-0 text-muted-foreground border-border">{linkedTicket.key}</Badge>
          <TruncatedText text={linkedTicket.title} className="text-sm flex-1 text-foreground" />
          <Badge variant="secondary" className="text-micro h-4 px-1.5 shrink-0 capitalize">{linkedTicket.status.toLowerCase().replace(/_/g, " ")}</Badge>
        </Link>
        {canUpdate ? <UnlinkButton onClick={onRequestUnlink} /> : null}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2">
      <span className="text-xs text-muted-foreground flex-1 italic">Ticket unavailable — it may have been deleted.</span>
      {canUpdate ? <UnlinkButton onClick={onRequestUnlink} /> : null}
    </div>
  );
}

function UnlinkButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return <button type="button" onClick={onClick} {...hoverHandlers} className="text-xs text-muted-foreground hover:text-destructive transition-colors duration-150 flex items-center gap-1 shrink-0" aria-label="Unlink ticket"><XIcon ref={iconRef} size={12} />Unlink</button>;
}

function AttendeeRow({ attendee }: { attendee: NonNullable<ReturnType<typeof useEventAttendees>["data"]>[number] }) {
  const displayName = attendee.user?.name ?? attendee.user?.email ?? "Unknown";
  const statusClass = attendee.status === "accepted" ? "border-status-success-rule text-status-success-ink" : attendee.status === "declined" ? "border-status-danger-rule text-status-danger-ink" : attendee.status === "tentative" ? "border-status-warning-rule text-status-warning-ink" : "border-border text-muted-foreground";
  return <div className="flex items-center gap-2 text-sm"><Avatar className="h-6 w-6"><AvatarImage src={resolveImageUrl(attendee.user?.image ?? null)} /><AvatarFallback className="text-micro">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><TruncatedText text={displayName} className="flex-1 text-xs" /><Badge variant="outline" className={`text-micro h-4 px-1.5 capitalize ${statusClass}`}>{RSVP_STATUS_LABELS[attendee.status] ?? attendee.status}</Badge></div>;
}
