"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { useBookingInvitations, useCalendarRoutingAssignment, useManagedCalendarBookings, useMarkBookingInvitationNoShow } from "@/hooks/api/calendar/managed-bookings";
import { useBookingScope } from "@/hooks/api/calendar/booking-rules";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CalendarBookingRule } from "@/hooks/api/calendar/booking-rules-schema";
import type { ManagedBooking } from "@/hooks/api/calendar/managed-bookings-schema";

function BookingInvitations({ booking }: { booking: ManagedBooking }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>([]);
  const [error, setError] = useState<string | null>(null);
  const scope = useBookingScope();
  const invitations = useBookingInvitations(booking.id, cursor);
  const noShow = useMarkBookingInvitationNoShow(booking.id);

  async function markNoShow(invitationId: string) {
    if (!window.confirm("Mark this attendee as a no-show?")) return;
    try {
      await noShow.mutateAsync(invitationId);
      setError(null);
      toast.success("No-show recorded");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <div className="space-y-2"><h5 className="font-medium">Invitations and RSVP</h5>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{invitations.access.denied ? <p className="text-sm text-muted-foreground">Invitations are unavailable to this account.</p> : invitations.access.unavailable || invitations.isError ? <ErrorState title="Invitations unavailable" error={invitations.error} onRetry={() => void invitations.refetch()} /> : invitations.access.pending || invitations.isPending ? <p role="status">Loading invitations…</p> : invitations.data?.items.length ? <div className="space-y-2">{invitations.data.items.map((invitation) => <div key={invitation.id} className="rounded-md border p-2 text-sm"><div className="flex items-center justify-between gap-2"><span>{invitation.guestName || invitation.guestEmail || (invitation.membershipId ? `Member #${invitation.membershipId}` : "Attendee")}</span><span className="capitalize">{invitation.rsvpStatus}</span></div><p className="text-muted-foreground">{invitation.attendeeRole} · {invitation.lifecycleState}{invitation.noShowAt ? " · no-show" : ""}</p>{booking.hostMembershipId === scope.membershipId && invitation.attendeeRole !== "organizer" && invitation.lifecycleState === "current" && !invitation.noShowAt && new Date(invitation.endAt).getTime() <= Date.now() ? <Button size="sm" variant="outline" disabled={noShow.isPending} onClick={() => void markNoShow(invitation.id)}>Mark no-show</Button> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">No invitations are recorded.</p>}<div className="flex gap-2">{previousCursors.length ? <Button variant="outline" onClick={() => { setCursor(previousCursors.at(-1) ?? null); setPreviousCursors(previousCursors.slice(0, -1)); }}>Newer</Button> : null}{invitations.data?.nextCursor ? <Button variant="outline" onClick={() => { setPreviousCursors([...previousCursors, cursor]); setCursor(invitations.data.nextCursor); }}>Older</Button> : null}</div></div>;
}

function BookingDetail({ rule, booking, onBack }: { rule: CalendarBookingRule; booking: ManagedBooking; onBack: () => void }) {
  const assignment = useCalendarRoutingAssignment(rule.id, booking.id);
  return <div className="space-y-3"><Button variant="outline" onClick={onBack}>Back to bookings</Button><div><h4 className="font-medium">{booking.guestName || booking.guestEmail || "Guest booking"}</h4><p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: rule.timeZone }).format(new Date(booking.startAt))}</p></div><div className="rounded-md border p-3 text-sm"><p>Booking: {booking.status} · Lifecycle: {booking.lifecycleState}</p><p>Provider sync: {booking.providerSyncStatus.replaceAll("_", " ")} · Other effects: {booking.externalEffectsStatus.replaceAll("_", " ")}</p>{booking.guestEmail ? <p className="break-all">Guest email: {booking.guestEmail}</p> : null}<p className="break-all text-xs text-muted-foreground">Booking ID: {booking.id}</p></div>
    {assignment.access.denied ? <p className="text-sm text-muted-foreground">Routing details are unavailable to your account.</p> : assignment.access.unavailable || assignment.isError ? <ErrorState title="Routing decision unavailable" error={assignment.error} onRetry={() => void assignment.refetch()} /> : assignment.access.pending || assignment.isPending ? <p role="status">Loading routing decision…</p> : assignment.data ? <div className="space-y-1 rounded-md border p-3 text-sm"><p className="font-medium">Routing decision</p><p>Rule version ID {assignment.data.routingRuleVersionId} · {assignment.data.decisionCode.replaceAll("_", " ")}</p><p>Primary host member #{assignment.data.primaryHostMembershipId}</p><p>Assigned hosts: {assignment.data.hostMembershipIds.map((id) => `#${id}`).join(", ")}</p><p>Fallback: {assignment.data.fallbackApplied ? "Yes" : "No"}</p>{assignment.data.privateReasons.length ? <ul className="list-inside list-disc">{assignment.data.privateReasons.map((reason) => <li key={reason}>{reason.replaceAll("_", " ")}</li>)}</ul> : null}</div> : <p className="text-sm text-muted-foreground">This booking has no team routing assignment.</p>}
    <BookingInvitations booking={booking} />
  </div>;
}

export function CalendarManagedBookingsPanel({ rule, onBack }: { rule: CalendarBookingRule; onBack: () => void }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>([]);
  const [selected, setSelected] = useState<ManagedBooking | null>(null);
  const bookings = useManagedCalendarBookings(rule.id, cursor);
  return <div className="space-y-4"><Button variant="outline" onClick={onBack}>Back to booking pages</Button><div><h3 className="font-medium">Bookings</h3><p className="text-sm text-muted-foreground">{rule.title}</p></div>{selected ? <BookingDetail rule={rule} booking={selected} onBack={() => setSelected(null)} /> : <>
    {bookings.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to these bookings.</p> : bookings.access.unavailable || bookings.isError ? <ErrorState title="Bookings unavailable" error={bookings.error} onRetry={() => void bookings.refetch()} /> : bookings.access.pending || bookings.isPending ? <p role="status">Loading bookings…</p> : bookings.data?.items.length ? <div className="space-y-2">{bookings.data.items.map((booking) => <button key={booking.id} type="button" className="flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted" onClick={() => setSelected(booking)}><span>{booking.guestName || booking.guestEmail || "Guest booking"}<span className="block text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: rule.timeZone }).format(new Date(booking.startAt))}</span></span><span className="capitalize text-muted-foreground">{booking.status}</span></button>)}</div> : <p className="text-sm text-muted-foreground">No bookings for this page yet.</p>}
    <div className="flex gap-2">{previousCursors.length ? <Button variant="outline" onClick={() => { setCursor(previousCursors.at(-1) ?? null); setPreviousCursors(previousCursors.slice(0, -1)); }}>Newer</Button> : null}{bookings.data?.nextCursor ? <Button variant="outline" onClick={() => { setPreviousCursors([...previousCursors, cursor]); setCursor(bookings.data.nextCursor); }}>Older</Button> : null}</div>
  </>}</div>;
}
