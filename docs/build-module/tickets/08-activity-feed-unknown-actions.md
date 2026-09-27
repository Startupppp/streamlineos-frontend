# 08 — Let the activity feed tolerate an unknown action type

**What to build:** Shipping a new activity action type on the backend does not break the ticket activity tab. Today the consumer's validation is a closed set of fourteen values while the producer emits an open string, so the tighter side of the seam is the client. The first unrecognised action makes the whole page's response fail validation, and the activity tab renders an error state for every ticket that has received one — with no compile-time warning that it was coming.

Parse the action as an open value; keep the closed set only where it drives display, falling back to the raw value when unrecognised.

**Blocked by:** None — can start immediately.

**Status:** partial — ordinary unknown-action case passes; inherited-property action names still crash

**Verified 2026-09-27:** Current source retains an open action-string contract and display
fallback. `features/build/tickets/ticket-activity-log.test.tsx` passed all four component tests
using `node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath` from frontend.
This is limited evidence for the covered cases, not completion or a production-browser claim.

**Three-pass recheck:** `ticket-activity-log.tsx:53` uses `action in ACTION_ICONS`, which accepts
inherited properties. Rendering the current component in memory succeeds for `future_action_v2`
but throws for `__proto__` and `constructor`. The four existing tests pass without covering those
inputs, parsing the real response contract or asserting each known icon mapping.

- [ ] Use an own-property lookup for the display map and add inherited-name regression cases, including __proto__, constructor and toString; assert fallback rendering without a thrown error
- [ ] Exercise parsing plus rendering together and assert a known action retains its intended icon/label; retain the ordinary unknown-action regression

- [ ] An activity entry with an unrecognised action renders instead of failing the page
  — `frontend/hooks/api/build/build-tickets-core-schema.ts` line 288: `action: z.string()` (was `ticketActivityActionContract` — a `z.enum`). Any string now passes Zod validation; `ticketActivityPageContract` no longer throws on unknown action values.
- [ ] Known actions still get their specific label and icon
  — `frontend/features/build/tickets/ticket-activity-log.tsx`: `ACTION_ICONS` (line 35) typed as `Record<KnownTicketActivityAction, LucideIcon>` with all 14 known actions mapped. `isKnownAction` type guard (line 52) narrows `entry.action: string` to `KnownTicketActivityAction` inside the ternary so `ACTION_ICONS[entry.action]` is type-safe with no cast. Known actions resolve their specific icon.
- [ ] An unrecognised action displays a sensible fallback rather than blank
  — `frontend/features/build/tickets/ticket-activity-log.tsx` line 70: label renders `{entry.label || entry.action}`. When the backend sends a label, it is shown. When the label is empty (defensive), the raw action string is displayed. Icon falls back to `History` via `isKnownAction` guard.
- [x] A test feeds an action type absent from the display set and asserts the feed still renders
  — `frontend/features/build/tickets/ticket-activity-log.test.tsx` (new file, 4 tests):
    - "renders the activity feed when an entry carries an action absent from the display set" — unknown action `"module_linked"` with label; asserts label renders
    - "shows the action string as fallback label when the server sends an empty label for an unknown action" — action `"future_action_v2"` with empty label; asserts action string renders
    - "renders the server label for a known action" — `"created"` action; asserts label renders
    - "does not show an error state when the only entry has an unknown action" — asserts error message absent and item label present
    All 4 pass: `npx jest features/build/tickets/ticket-activity-log.test.tsx` — PASS, 4/4.
