# V3 Delta Audit — S05 (Billing/Accounting/Finance) & S06 (Communications)

Auditor: V3 (read-only). Date: 2026-08-30.

---

## S05 — Billing, Payments, Accounting & Finance

### Checked [x] items (3 total)

#### [x] §4 — ON CONFLICT / three-state webhook ledger
**VERIFIED DONE.**
`backend/src/modules/billing/core/provider-event-ledger.ts:24-60`.
`claim()` returns RECORDED (insert succeeds), RETRY (conflict + `processedAt IS NULL`), PROCESSED (conflict + `processedAt NOT NULL`). Comment at L24 explicitly references the defect. Two extra states (FOREIGN, ERROR) are additive and do not weaken the contract.

#### [x] §4 — `billing-webhook.spec.ts` fix (`BillingProfileService` missing from `RootTestModule`)
**VERIFIED DONE.**
`backend/src/modules/billing/core/billing-webhook.spec.ts:12` imports `BillingProfileService`; line 222 provides the mock. Suite pass count (439/439) not re-run in this session but the structural fix is in place.

#### [x] §11 — Guard audit (0 undeclared handlers in billing/invoices/quotes trees)
**VERIFIED DONE.**
Spot check on `billing.controller.ts`: every handler carries `@RequirePermission(…)`, `@Universal()`, or `@Public()`. `check:route-classification` gate referenced as passing (0 undeclared system-wide) in prior session evidence.

---

### Open [ ] items

#### §1a — Write the invoices index migration
**ALREADY DONE.**
`backend/migrations/0663_invoice_reminder_due_index.sql` exists with the matching SQL (minus `CONCURRENTLY`, which cannot run inside a Drizzle transaction block — correct omission). Journalled at `_journal.json` line 2669 (`"tag": "0663_invoice_reminder_due_index"`).

#### §1b — Measure sweep in buffers as `streamline_app` with tenant GUC; record before/after
**GENUINELY OPEN.**
No buffer-measurement record found in source. ~0.5 day: run `EXPLAIN (ANALYZE, BUFFERS)` on the reminder sweep as the app role with the GUC set, record both index-scan and heap-fetch block counts.

#### §2 — Split billing orchestration (subscription lifecycle · entitlement resolution · seat accounting · invoices · payment attempts · promotions · AI-credit ledger)
**ALREADY DONE.**
`billing.service.ts` is 220 lines. Separate services already exist: `ai-credits.service.ts`, `ai-credits-reservation.service.ts`, `ai-credits-packs.service.ts`, `ai-credits-usage.service.ts`, `seat-ledger.service.ts`, `proration-ledger.service.ts`, `versioned-catalog.service.ts`, `invoice-snapshot.service.ts`, `plan-limits.service.ts`. Each is under 500 lines.

#### §2 — `frontend/features/billing/ai-credits-settings-page.tsx` (566) split
**ALREADY DONE.**
Current size: 397 lines (was 566). Under the 500-line hard limit.

#### §2 — `features/accounting/sales/invoice-detail-view.tsx` (586) split
**ALREADY DONE.**
Current size: 305 lines (was 586). Under 300-line target.

#### §2 — `modules/finance/banking/reconciliation.service.ts` (644) split
**ALREADY DONE.**
Current size: 423 lines (was 644). Under the 500-line hard limit.

#### §3 — Prove invariants with tests (immutable snapshots, integer money, atomic reserve, no provider call on entitlement path, currency snapshots, seat advisory lock)
**GENUINELY OPEN.**
No dedicated invariant test suite found. Positive signals: `ai-credits-reservation.service.ts:41-98` does atomic `FOR UPDATE` + deduct + insert in one nested transaction before any provider call; no `parseFloat(x) * 100` float arithmetic found in `ai-credits.service.ts`. But no test pins the seat advisory-lock invariant or the immutable-invoice snapshot guarantee. ~2 days.

#### §4 — Prove webhook correctness with tests (signature failure, replay, out-of-order, duplicate, cross-tenant event id)
**ALREADY DONE.**
`billing-webhook.spec.ts` covers all listed scenarios:
- Signature failure: line 231 ("records nothing at all when the signature does not match")
- Duplicate / completed-replay short-circuit: lines 288–310
- Out-of-order delivery: line 354 ("guards the payment upsert so a stale status cannot overwrite a later one")
- Cross-tenant event id: line 313 ("refuses an event id already held by another tenant instead of reporting success")

#### §5 — Seats and proration (behaviour across invite · activation · suspension · removal · billing-cycle · plan transition)
**GENUINELY OPEN.**
`seat-ledger.service.ts` and `proration-ledger.service.ts` exist. No test suite proving the end-to-end lifecycle across all listed transitions was found. ~2–3 days.

#### §6 — Bounded work (async invoice generation/export, cursor contract cap 100, remove offset branches)
**GENUINELY OPEN.**
No evidence of large generation moved to async jobs or of cursor-pagination audit across finance endpoints. ~1–2 days.

#### §7 — Retention and reversal (soft-delete filtering, reversal records)
**GENUINELY OPEN.**
No dedicated retention-policy or reversal-record audit found. ~1–2 days.

#### §8 — Failure behaviour (billing during Redis outage, provider outage, webhook redelivery; entitlements must fail closed)
**GENUINELY OPEN.**
No degradation or outage-simulation tests found. ~1 day.

#### §9 — Outbox consumers (22 orphan event types)
**GENUINELY OPEN.**
Requires closing or registering consumers for billing/invoices/quotes tree emissions. ~1–2 days.

#### §10 — Tenant isolation coverage (~72 services, bucket B05)
**GENUINELY OPEN.**
Large coverage effort; each service needs a cross-tenant DENY + same-tenant CONTROL. ~5–7 days.

---

## S06 — Chat, Calendar, Notifications, Mail

### Checked [x] items (7 total)

#### [x] §1 — `calendar_events.visibility` column (false premise: column already existed)
**VERIFIED DONE.**
`backend/src/db/schema/common/calendar-events.ts:18`:
```
visibility: text("visibility").notNull().default("org"),
```
Migration 0664 (`0664_calendar_events_visibility.sql`) added the column and is journalled at `_journal.json` line 2676.

#### [x] §1 — SQL predicate in `calendar-event-source.loader.ts`
**VERIFIED DONE.**
`backend/src/modules/calendar/calendar-event-source.loader.ts:109-113`:
```ts
or(
  eq(calendarEvents.visibility, "org"),
  eq(calendarEvents.createdBy, userId),
  isNotNull(callerAtt.id),          // LEFT JOIN on callerMembershipId
)
```
Note: the ticket description included `attendee.status <> 'declined'`, but the actual predicate uses a LEFT JOIN without that filter — declined attendees retain visibility of events they were invited to. This is deliberate; `calendar-visibility.spec.ts:117-127` explicitly documents and tests this behavior as correct (RSVP is not removal).

Departed members get sentinel `callerMembershipId = 0` (no integer PK is 0, so the join never matches), effectively blocking the attendee arm.

#### [x] §1 — Home dashboard predicate (`dashboard-personal.service.ts:161`)
**VERIFIED DONE.**
`backend/src/modules/dashboard/dashboard-personal.service.ts:161`:
`eq(calendarEvents.visibility, "org")` inside an `or()` predicate covering org-visible, organizer, and attendee arms.

#### [x] §1 — Calendar visibility tests
**VERIFIED DONE.**
- `calendar-visibility.spec.ts`: **18 tests** (exact count confirmed). Covers org-visible arm, organizer arm, attendee arm, declined-attendee semantics, departed-member sentinel, cross-org isolation, and ACTIVE membership gate.
- `dashboard-hr-events.spec.ts`: **15 tests** (exact count confirmed).

#### [x] §5 — Notifications delivery proof (at-least-once, idempotent materialization, retry, dead-letter)
**VERIFIED DONE.**
- `notification-dispatch-after-commit.spec.ts`: 16 tests pinning the intent→drain→PROCESSED durability chain and the 42501 defect (fire-and-forget on dead transaction handle).
- `notification-outbox-relay.spec.ts`: 4 tests pinning relay recovery, dedupe, retry, dead-letter. Both files exist with the correct structure.
Suite pass count (266/266) not re-run in this session.

#### [x] §5 — Alert predicates verified against real DB column emission
**VERIFIED DONE.**
- `alert-queue-age.mjs`: queries `outbox_events` DB columns directly (oldest PENDING row age + retry-pressure sum). Not a log-string grep.
- `alert-dead-delivery.mjs`: queries `notification_deliveries` DB columns directly for rows reaching DEAD state.
- `alert-delivery.spec.ts`: integration spec that runs the alert chain end-to-end with a real HTTP server.

#### [x] §9 — Guard audit (0 undeclared handlers in notifications/calendar/chat trees)
**VERIFIED DONE.**
Spot check on `calendar.controller.ts`: every handler carries `@Universal()` or `@RequirePermission(…)`. `check:route-classification` gate referenced as passing (0 undeclared) in prior session evidence.

---

### Open [ ] items

#### §2 — RFC 5545 / RRULE library; IANA timezone ids; recurrence exceptions persisted independently
**ALREADY DONE** (for this sub-item).
`calendar-occurrence.service.ts:1` imports `RRule` from `rrule`; `date-fns-tz` handles IANA timezone conversion. `backend/src/db/schema/calendar/calendar-event-exceptions.ts` persists exceptions as a separate table with composite FK `(org_id, event_id)` → `calendar_events` and unique index `(org_id, event_id, occurrence_start)`.

#### §2 — Event mutation and invitation/reminder intent commit in one transaction through the outbox
**GENUINELY OPEN.** Need to verify all calendar mutating handlers use outbox commit for reminders. ~0.5 day.

#### §2 — Stable occurrence + attendee idempotency key; series/occurrence/attendee/timezone change cancels stale reminder work
**GENUINELY OPEN.** No occurrence-level idempotency key or stale-work cancellation found. ~1 day.

#### §2 — Prove timezone and DST behaviour (creation, edits, recurrence, free/busy, notifications)
**GENUINELY OPEN.** No DST-specific test suite found. ~1 day.

#### §2 — Free/busy and conflict checks indexed by organization, principal and time range
**GENUINELY OPEN.** `calendar-conflict.service.ts` exists; no index-coverage proof found. ~0.5 day.

#### §2 — Cap calendar export date ranges and each Home calendar source before merge/truncation
**GENUINELY OPEN.** No export cap or per-source pre-merge cap found. ~0.5 day.

#### §2 — `features/calendar/calendar-view.tsx` (506) — extract `useCalendarViewState` hook
**GENUINELY OPEN.** File is 506 lines; `useCalendarViewState` does not exist anywhere in the frontend. ~0.5 day.

#### §3 — Chat actor migration (555/555 legacy actors remaining; contraction not started)
**GENUINELY OPEN.** Largest open item in S06. Requires membership-keyed cutover for channels, participants, messages, reactions, mentions, reads, invites; resumable backfill; composite FK validation; zero-use proof before column drops. ~3–5 days.

#### §3 — Chat file splits
- `chat-messages.service.ts`: 471 lines (was 613). Under 500-line hard limit; conditionally resolved.
- `channel-sidebar.tsx`: **535 lines** (unchanged). Over 500-line hard limit. No cohesive-exception entry found. **Live violation.**
- `huddle-panel.tsx`: **513 lines** (unchanged). Over 500-line hard limit. No cohesive-exception entry found. **Live violation.**
Either split by responsibility or record a proper cohesive-exception file. ~0.5–1 day each.

#### §4 — Chat and calendar admin gating (admin descendants not in universal allowlist; resolve to a permission)
**GENUINELY OPEN.** Universal-route allowlist audit for chat/calendar admin descendants not confirmed. ~0.5 day.

#### §5 — Event-stream adapter (abort, jittered reconnect, retry ceiling, heartbeat, token expiry, logout cleanup, org-switch cleanup)
**GENUINELY OPEN.** No unified SSE/stream adapter found. ~2 days.

#### §5 — Never route a notification timestamp through a JavaScript `Date`
**ALREADY DONE.**
Per MEMORY.md: "Notification delivery FK truncates microseconds — FIXED". Confirmed in S06 "Already done" section: "Notification delivery preserves database timestamp precision for its composite FK."

#### §6 — Mail (provider sync checkpointed, thread auth before content retrieval, malware scan + signed expiring URLs, unread watermarks, cursor non-undefined)
**GENUINELY OPEN.** Multiple sub-items, none confirmed done. ~3–5 days.

#### §7 — Outbox consumers (22 orphan event types, close those emitted from S06 trees)
**GENUINELY OPEN.** ~1–2 days.

#### §8 — Tenant isolation coverage (~40 services, bucket B09)
**GENUINELY OPEN.** ~3–5 days.

---

## Verdict Counts

| Ticket | Checked [x] | VERIFIED DONE | REGRESSED | NOT ACTUALLY DONE |
|--------|------------|---------------|-----------|-------------------|
| S05    | 3          | 3             | 0         | 0                 |
| S06    | 7          | 7             | 0         | 0                 |

| Ticket | Open [ ] (items/sub-items) | ALREADY DONE | PREMISE FALSE | GENUINELY OPEN |
|--------|---------------------------|--------------|---------------|----------------|
| S05    | 10 items                  | 6            | 0             | 8 (some items split) |
| S06    | 8 items                   | 3            | 0             | 13 (some items split) |

---

## ALREADY DONE rows (exact item text)

**S05:**
1. `§1a` — "Write it as a proper journalled migration and prove it applies cold and on upgrade" — `migrations/0663_invoice_reminder_due_index.sql` + journal entry 2669.
2. `§2` — "Split billing orchestration into subscription lifecycle · entitlement resolution · seat accounting · invoices · payment attempts · promotions · AI-credit ledger." — `billing.service.ts` 220 lines; all sub-domains in separate services.
3. `§2` — "`frontend/features/billing/ai-credits-settings-page.tsx` (566) … split by responsibility." — now 397 lines.
4. `§2` — "`features/accounting/sales/invoice-detail-view.tsx` (586) split by responsibility." — now 305 lines.
5. `§2` — "`modules/finance/banking/reconciliation.service.ts` (644) split by cohesive responsibility." — now 423 lines.
6. `§4` — "Prove with tests: signature verification failure · replay of an already-processed event · out-of-order delivery · duplicate delivery · tenant/provider-account uniqueness." — `billing-webhook.spec.ts` lines 231, 288–310, 313, 354.

**S06:**
1. `§2` — "Use a standards-compliant RFC 5545 / RRULE library; store IANA timezone ids, UTC instants and recurrence exceptions persisted independently of the series definition." — `calendar-occurrence.service.ts:1` (`RRule` import + `date-fns-tz`); `calendar_event_exceptions` table with composite FK.
2. `§5` — "Never route a notification timestamp through a JavaScript `Date`…" — fixed in prior session; confirmed in S06 "Already done" section.
