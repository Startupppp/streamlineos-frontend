"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  HelpCircle,
  MapPin,
  Ticket,
  UserRound,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { parseCalendarEventId, useEventAttendees, type CalendarEventDetail, type CalendarListItem } from "@/hooks/api/calendar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { EVENT_COLORS } from "./calendar-event-constants";
import { EventSyncStatus } from "./event-sync-status";

export const RSVP_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  declined: "Declined",
  tentative: "Tentative",
  pending: "Pending",
};

type RsvpChoice = "accepted" | "declined" | "tentative";

const RSVP_OPTIONS: Array<{
  id: RsvpChoice;
  label: string;
  ariaLabel: string;
  icon: LucideIcon;
  ink: string;
  pill: string;
}> = [
  {
    id: "accepted",
    label: "Accept",
    ariaLabel: "Accept event",
    icon: Check,
    ink: "text-status-success-ink",
    pill: "bg-status-success-surface",
  },
  {
    id: "tentative",
    label: "Maybe",
    ariaLabel: "Mark as tentative",
    icon: HelpCircle,
    ink: "text-status-warning-ink",
    pill: "bg-status-warning-surface",
  },
  {
    id: "declined",
    label: "Decline",
    ariaLabel: "Decline event",
    icon: X,
    ink: "text-destructive",
    pill: "bg-destructive/10",
  },
];

const RSVP_COPY: Record<RsvpChoice, string> = {
  accepted: "You're going",
  tentative: "You might go",
  declined: "You're not going",
};

const FACT_EASE = [0.22, 1, 0.36, 1] as const;

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
  onRsvp: (status: RsvpChoice) => void;
}

export function getEventColor(event: CalendarListItem | null) {
  return event ? (EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue) : EVENT_COLORS.blue;
}

function isRsvpChoice(value: string | null | undefined): value is RsvpChoice {
  return value === "accepted" || value === "declined" || value === "tentative";
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
  const [pendingRsvp, setPendingRsvp] = useState<{
    eventId: number;
    status: RsvpChoice;
  } | null>(null);
  const serverRsvp = isRsvpChoice(detail?.myRsvpStatus) ? detail.myRsvpStatus : null;
  const activeRsvp =
    pendingRsvp && pendingRsvp.eventId === numericEventId
      ? pendingRsvp.status
      : serverRsvp;
  const isOccurrence = !!parseCalendarEventId(event?.id ?? "")?.occurrenceStart;
  const description = (isOccurrence ? event?.description : isCalendarEvent && !detailLoading ? detail?.description : event?.description) ?? null;
  const creatorName = (isCalendarEvent && !detailLoading ? detail?.creatorName : event?.creatorName) ?? null;
  const rsvpBusy = deleteEventIsPending || rsvpMutationIsPending;

  const chooseRsvp = useCallback(
    (status: RsvpChoice) => {
      if (numericEventId === null) return;
      setPendingRsvp({ eventId: numericEventId, status });
      onRsvp(status);
    },
    [numericEventId, onRsvp],
  );

  return (
    <div className="space-y-5">
        {event ? (
          <>
            {event.location ? (
              <DetailFact index={0} icon={MapPin} well="bg-status-warning-surface text-status-warning-ink">
                {event.location.startsWith("http") ? (
                  <a
                    href={event.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {event.location}
                  </a>
                ) : (
                  <span>{event.location}</span>
                )}
              </DetailFact>
            ) : null}
            {detail?.meetingUrl ? (
              <JoinMeetingLink href={detail.meetingUrl} />
            ) : null}
            {description ? (
              <p className="text-sm leading-relaxed text-foreground">{description}</p>
            ) : null}
            {creatorName ? (
              <DetailFact index={1} icon={UserRound} well="bg-muted text-foreground">
                <span>
                  Created by <span className="font-medium">{creatorName}</span>
                </span>
              </DetailFact>
            ) : null}
            {(detail?.entityType ?? event.entityType) === "ticket" ? (
              <div className="space-y-2">
                <DetailFact index={2} icon={Ticket} well="bg-status-info-surface text-status-info-ink">
                  <span className="font-medium">Linked ticket</span>
                </DetailFact>
                {!detailLoading || !isCalendarEvent ? (
                  <LinkedTicketRow
                    linkedTicket={detail?.linkedTicket ?? null}
                    canUpdate={canUpdate}
                    onClose={onClose}
                    onRequestUnlink={onRequestUnlink}
                  />
                ) : null}
              </div>
            ) : null}
            {isCalendarEvent ? (
              <RsvpPicker
                active={activeRsvp}
                busy={rsvpBusy}
                tentativeBusy={rsvpMutationIsPending}
                onChoose={chooseRsvp}
              />
            ) : null}
            <EventSyncStatus eventId={isCalendarEvent ? numericEventId : null} />
            {attendees.length > 0 ? (
              <div className="space-y-2">
                <DetailFact index={3} icon={Users} well="bg-status-info-surface text-status-info-ink">
                  <span className="font-medium">Attendees ({attendees.length})</span>
                </DetailFact>
                <div className="space-y-1.5 pl-11">
                  {attendees.map((attendee) => (
                    <AttendeeRow key={attendee.id} attendee={attendee} />
                  ))}
                </div>
              </div>
            ) : null}
            {detail && detail.guestEmails.length > 0 ? (
              <div className="space-y-2">
                <DetailFact index={4} icon={Users} well="bg-status-info-surface text-status-info-ink">
                  <span className="font-medium">Guests ({detail.guestEmails.length})</span>
                </DetailFact>
                <ul aria-label="External guests" className="space-y-1 pl-11 text-sm">
                  {detail.guestEmails.map((email) => (
                    <li key={email} className="truncate">{email}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
    </div>
  );
}

function DetailFact({
  icon: Icon,
  well,
  index,
  children,
}: {
  icon: LucideIcon;
  well: string;
  index: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={reduceMotion ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.28, delay: index * 0.04, ease: FACT_EASE }
      }
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", well)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 text-sm text-foreground">{children}</div>
    </motion.div>
  );
}

function JoinMeetingLink({ href }: { href: string }) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl bg-primary px-3 py-2 text-primary-foreground transition-transform duration-200 active:scale-[0.98] motion-reduce:transition-none"
      initial={reduceMotion ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: FACT_EASE }}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
        <Video className="size-4" />
      </span>
      <span className="text-sm font-medium">Join meeting</span>
    </motion.a>
  );
}

function RsvpPicker({
  active,
  busy,
  tentativeBusy,
  onChoose,
}: {
  active: RsvpChoice | null;
  busy: boolean;
  tentativeBusy: boolean;
  onChoose: (status: RsvpChoice) => void;
}) {
  const reduceMotion = useReducedMotion() === true;
  const activeOption = RSVP_OPTIONS.find((option) => option.id === active) ?? null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Your RSVP</p>
      <div
        role="group"
        aria-label="Your RSVP"
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
      >
        {RSVP_OPTIONS.map((option) => {
          const selected = active === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              aria-label={option.ariaLabel}
              disabled={option.id === "accepted" ? busy : tentativeBusy}
              onClick={() => onChoose(option.id)}
              className={cn(
                "relative flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                option.ink,
              )}
            >
              {selected ? (
                <motion.span
                  layoutId="event-rsvp-selection"
                  aria-hidden
                  className={cn("absolute inset-0 rounded-lg shadow-xs", option.pill)}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 34 }
                  }
                />
              ) : null}
              <Icon className={cn("relative z-10 size-4", selected && "scale-110")} />
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
      <p
        className={cn(
          "text-label transition-colors duration-200",
          activeOption ? activeOption.ink : "text-muted-foreground",
        )}
      >
        {activeOption ? RSVP_COPY[activeOption.id] : "No response yet"}
      </p>
    </div>
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
      <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2 dark:border-background">
        <Link
          href={`/build/${linkedTicket.projectId}/issues?ticket=${linkedTicket.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80"
          onClick={onClose}
        >
          <Badge variant="outline" className="shrink-0 border-border font-mono text-micro text-muted-foreground">
            {linkedTicket.key}
          </Badge>
          <TruncatedText text={linkedTicket.title} className="flex-1 text-sm text-foreground" />
          <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-micro capitalize">
            {linkedTicket.status.toLowerCase().replace(/_/g, " ")}
          </Badge>
        </Link>
        {canUpdate ? <UnlinkButton onClick={onRequestUnlink} /> : null}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted px-3 py-2 dark:border-background">
      <span className="flex-1 text-label text-muted-foreground">
        Ticket unavailable. It may have been deleted.
      </span>
      {canUpdate ? <UnlinkButton onClick={onRequestUnlink} /> : null}
    </div>
  );
}

function UnlinkButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1 text-label text-destructive transition-colors duration-150 hover:text-destructive"
      aria-label="Unlink ticket"
    >
      <X className="size-3.5" />
      Unlink
    </button>
  );
}

function AttendeeRow({ attendee }: { attendee: NonNullable<ReturnType<typeof useEventAttendees>["data"]>[number] }) {
  const displayName = attendee.user?.name ?? attendee.user?.email ?? "Unknown";
  const statusClass =
    attendee.status === "accepted"
      ? "border-status-success-rule text-status-success-ink"
      : attendee.status === "declined"
        ? "border-status-danger-rule text-status-danger-ink"
        : attendee.status === "tentative"
          ? "border-status-warning-rule text-status-warning-ink"
          : "border-border text-muted-foreground";
  return (
    <div className="flex items-center gap-2 text-sm">
      <Avatar className="size-6">
        <AvatarImage src={resolveImageUrl(attendee.user?.image ?? null)} />
        <AvatarFallback className="text-micro">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <TruncatedText text={displayName} className="flex-1 text-sm" />
      <Badge variant="outline" className={cn("h-4 px-1.5 text-micro capitalize", statusClass)}>
        {RSVP_STATUS_LABELS[attendee.status] ?? attendee.status}
      </Badge>
    </div>
  );
}
