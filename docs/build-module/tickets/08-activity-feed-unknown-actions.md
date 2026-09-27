# 08 — Let the activity feed tolerate an unknown action type

**What to build:** Shipping a new activity action type on the backend does not break the ticket activity tab. Today the consumer's validation is a closed set of fourteen values while the producer emits an open string, so the tighter side of the seam is the client. The first unrecognised action makes the whole page's response fail validation, and the activity tab renders an error state for every ticket that has received one — with no compile-time warning that it was coming.

Parse the action as an open value; keep the closed set only where it drives display, falling back to the raw value when unrecognised.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] An activity entry with an unrecognised action renders instead of failing the page
  — `frontend/hooks/api/build/build-tickets-core-schema.ts` line 288: `action: z.string()` (was `ticketActivityActionContract` — a `z.enum`). Any string now passes Zod validation; `ticketActivityPageContract` no longer throws on unknown action values.
- [x] Known actions still get their specific label and icon
  — `frontend/features/build/tickets/ticket-activity-log.tsx`: `ACTION_ICONS` (line 35) typed as `Record<KnownTicketActivityAction, LucideIcon>` with all 14 known actions mapped. `isKnownAction` type guard (line 52) narrows `entry.action: string` to `KnownTicketActivityAction` inside the ternary so `ACTION_ICONS[entry.action]` is type-safe with no cast. Known actions resolve their specific icon.
- [x] An unrecognised action displays a sensible fallback rather than blank
  — `frontend/features/build/tickets/ticket-activity-log.tsx` line 70: label renders `{entry.label || entry.action}`. When the backend sends a label, it is shown. When the label is empty (defensive), the raw action string is displayed. Icon falls back to `History` via `isKnownAction` guard.
- [x] A test feeds an action type absent from the display set and asserts the feed still renders
  — `frontend/features/build/tickets/ticket-activity-log.test.tsx` (new file, 4 tests):
    - "renders the activity feed when an entry carries an action absent from the display set" — unknown action `"module_linked"` with label; asserts label renders
    - "shows the action string as fallback label when the server sends an empty label for an unknown action" — action `"future_action_v2"` with empty label; asserts action string renders
    - "renders the server label for a known action" — `"created"` action; asserts label renders
    - "does not show an error state when the only entry has an unknown action" — asserts error message absent and item label present
    All 4 pass: `npx jest features/build/tickets/ticket-activity-log.test.tsx` — PASS, 4/4.
