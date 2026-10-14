import { z } from "zod";

export const managedBookingsContract = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    ruleId: z.number().int().positive(),
    hostMembershipId: z.number().int().positive(),
    startAt: z.string(),
    endAt: z.string(),
    status: z.enum(["pending", "confirmed", "cancelled", "rescheduled", "declined"]),
    lifecycleState: z.enum(["pending", "confirmed", "changed", "rescheduled", "cancelled", "no_show", "started", "ended", "failed", "repaired"]),
    lifecycleVersion: z.number().int().positive(),
    guestName: z.string().nullable(),
    guestEmail: z.string().nullable(),
    providerSyncStatus: z.enum(["not_requested", "pending", "synced", "failed", "uncertain"]),
    externalEffectsStatus: z.enum(["not_requested", "pending", "succeeded", "failed", "uncertain"]),
    createdAt: z.string(),
  })),
  nextCursor: z.string().nullable(),
});

export const routingAssignmentContract = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  routingRuleId: z.number().int().positive(),
  routingRuleVersionId: z.number().int().positive(),
  primaryHostMembershipId: z.number().int().positive(),
  hostMembershipIds: z.array(z.number().int().positive()).min(1),
  decisionCode: z.string(),
  fallbackApplied: z.boolean(),
  privateReasons: z.array(z.string()),
  status: z.enum(["committed", "cancelled", "failed"]),
  createdAt: z.string(),
});

export const bookingInvitationsContract = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    membershipId: z.number().int().positive().nullable(),
    guestEmail: z.string().nullable(),
    guestName: z.string().nullable(),
    attendeeRole: z.enum(["organizer", "required", "optional"]),
    rsvpStatus: z.enum(["pending", "accepted", "tentative", "declined"]),
    lifecycleState: z.enum(["current", "removed", "cancelled"]),
    noShowAt: z.string().nullable(),
    endAt: z.string(),
  })),
  nextCursor: z.string().uuid().nullable(),
});

export const invitationActionContract = z.object({
  id: z.string().uuid(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  role: z.enum(["organizer", "required", "optional"]),
  rsvpStatus: z.enum(["pending", "accepted", "tentative", "declined"]),
  meetingUrl: z.string().nullable(),
});

export type ManagedBooking = z.infer<typeof managedBookingsContract>["items"][number];
export type ManagedBookingPage = z.infer<typeof managedBookingsContract>;
export type RoutingAssignment = z.infer<typeof routingAssignmentContract>;
export type BookingInvitationPage = z.infer<typeof bookingInvitationsContract>;
export type BookingInvitation = BookingInvitationPage["items"][number];
export type InvitationAction = z.infer<typeof invitationActionContract>;
