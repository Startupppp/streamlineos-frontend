import { z } from "zod";

/**
 * Only events a backend service actually dispatches through
 * `WebhooksDispatchService`. Derived by diffing this list against every
 * `dispatch(orgId, "<event>")` call site — the previous catalog offered 17
 * events that no dispatcher ever emitted (all HR, inventory and invoicing
 * entries, plus `deal.created`, `deal.stage_changed`, `lead.assigned`,
 * `lead.converted`, `lead.status_changed`), so subscribing to them was a silent
 * no-op, while 8 events that DO fire could not be selected at all.
 *
 * Adding an entry here without a dispatcher recreates that bug. If you add a
 * `dispatch()` call, add it here in the same change.
 */
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
