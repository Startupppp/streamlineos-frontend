import { z } from "zod";

export const AVAILABLE_EVENTS = [
  { id: "lead.created", label: "Lead Created" },
  { id: "lead.updated", label: "Lead Updated" },
  { id: "deal.won", label: "Deal Won" },
  { id: "deal.lost", label: "Deal Lost" },
  { id: "ticket.created", label: "Ticket Created" },
  { id: "ticket.updated", label: "Ticket Updated" },
  { id: "comment.created", label: "Comment Added" },
  { id: "leave.approved", label: "Leave Approved" },
  { id: "member.added", label: "Member Added" },
  { id: "member.removed", label: "Member Removed" },
  { id: "member.role_updated", label: "Member Role Changed" },
  { id: "calendar.booking.confirmed", label: "Calendar Booking Confirmed" },
  { id: "calendar.booking.changed", label: "Calendar Booking Changed" },
  { id: "calendar.booking.rescheduled", label: "Calendar Booking Rescheduled" },
  { id: "calendar.booking.cancelled", label: "Calendar Booking Cancelled" },
  { id: "calendar.booking.no_show", label: "Calendar Booking No-show" },
  { id: "calendar.booking.started", label: "Calendar Booking Started" },
  { id: "calendar.booking.ended", label: "Calendar Booking Ended" },
  { id: "calendar.booking.failed", label: "Calendar Booking Failed" },
  { id: "calendar.booking.repaired", label: "Calendar Booking Repaired" },
  { id: "calendar.event.confirmed", label: "Calendar Event Confirmed" },
  { id: "calendar.event.changed", label: "Calendar Event Changed" },
  { id: "calendar.event.rescheduled", label: "Calendar Event Rescheduled" },
  { id: "calendar.event.cancelled", label: "Calendar Event Cancelled" },
  { id: "calendar.event.no_show", label: "Calendar Event No-show" },
  { id: "calendar.event.started", label: "Calendar Event Started" },
  { id: "calendar.event.ended", label: "Calendar Event Ended" },
  { id: "calendar.event.failed", label: "Calendar Event Failed" },
  { id: "calendar.event.repaired", label: "Calendar Event Repaired" },
  { id: "calendar.source.changed", label: "Calendar Source Changed" },
] as const;

export const webhookCreateSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .url("Enter a valid URL")
    .refine(
      (u) => {
        try {
          const parsed = new URL(u);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be an http(s) URL pointing to a public host" },
    ),
  description: z.string().max(500).optional(),
  events: z.array(z.string()),
});

export type WebhookCreateFormValues = z.infer<typeof webhookCreateSchema>;
