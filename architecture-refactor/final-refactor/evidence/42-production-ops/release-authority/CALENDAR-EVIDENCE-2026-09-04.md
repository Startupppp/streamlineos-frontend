# PRD-C128 Calendar Verification Evidence — 2026-09-04

**Auditor:** Lane G (parallel release-verification fan-out)  
**Scope:** current-HEAD verification of PRD-C128 — one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys, DST/exception/conflict/reminder E2E coverage.  
**Method:** source audit only. No lint, no tests run, no product source modified.

---

## 1. Calendar Route Enumeration

Every file whose path or component name contains "calendar" in the App Router tree (`app/`):

| Route file | Classified as |
|---|---|
| `frontend/app/(authenticated)/calendar/page.tsx` | The ONE unified `/calendar` page |
| `frontend/app/(authenticated)/calendar/settings/page.tsx` | Calendar account-connection settings (sub-route of the unified calendar) |
| `frontend/app/(authenticated)/calendar/error.tsx` | Error boundary for `/calendar` |
| `frontend/app/(authenticated)/calendar/loading.tsx` | Loading state for `/calendar` |

No other module path in `app/` contains "calendar" (confirmed by grep across all `app/` files).

### Known module mini-calendars (acknowledged violations, not new)

Three feature files hand-roll a day-grid outside `features/calendar/`:

| File | Description | Status |
|---|---|---|
| `frontend/features/build/views/calendar-view.tsx` | Month grid of Build tickets by dueDate with prev/next/today | Recorded violation — explicitly listed in `unified-calendar-surface-boundary.test.ts` L87 |
| `frontend/features/hr/holidays/components/calendar-view.tsx` | Month grid of holidays; the holidays page default view | Recorded violation — listed L90 |
| `frontend/features/hr/leaves/components/leave-calendar-widget.tsx` | "Who's Out This Week" 7-day avatar strip; read-only, no navigation | Recorded violation — listed L93 |

`unified-calendar-surface-boundary.test.ts` uses `toEqual([...KNOWN_MODULE_CALENDAR_SURFACES].sort())` — the assertion bites in BOTH directions (a new surface fails, and so does a fixed one until its entry is removed). All three are RECORDED, not silently tolerated. No new unrecorded violations found.

---

## 2. Sub-claim Verification

### 2.1 Source Toggles

**VERIFIED DONE.**

`GET /calendar/sources` → `CalendarSourceRegistry.getToggleList()` at `backend/src/modules/calendar/calendar-source.registry.ts:72`.

Server-side gating chain:
1. `isDeclaredModule(source)` (line 50) rejects any source whose `module` key is absent from the module registry — fails **closed** (undeclared → treated as always-on on the previous approach; the comment at line 40 explains the fix).
2. `this.access.moduleAvailabilityFor(orgId, userId, source.module)` (line 61) — this is per-user availability, not org-level. A user denied a module does not receive its events. The comment at line 59 records why `isModuleEnabled` (org-level only) was wrong.
3. Per-user toggle preferences persisted in `calendar_source_preferences` via `CalendarSourcePreferencesService`.

Frontend: `useCalendarSources` (`hooks/api/calendar.ts:417`) is gated by `useCan("calendar:read")`. `useCalendarEvents` waits for `enabledSources !== undefined` before firing (line 273) and encodes the sorted enabled set in the query key (line 262–265), so a toggle moves the read to a different cache entry rather than invalidating. Tested in `hooks/api/calendar-source-key.test.ts` with 6 substantive tests including BITE proofs.

### 2.2 Timezone Display

**VERIFIED DONE.**

Storage: events stored as UTC ISO instants (`startDate`, `endDate` as `timestamptz`). The `CalendarListItem.timezone` field carries the authored IANA zone (`hooks/api/calendar.ts:139–143`; comment: "absolute instants, so rendering them in the reader's zone is right about the moment").

Rendering: `big-calendar-wrapper.tsx` uses `dateFnsLocalizer` from `date-fns`. No naive local-time string stored. `Intl.DateTimeFormat` used for detail-sheet rendering in tests.

On create: the browser zone is sent as `timezone` (`event-create-validators.test.ts:169`).  
On edit: `timezone` is deliberately omitted so the authored zone survives the editor's locale (`event-create-validators.test.ts:183`). The test also checks that the key is absent from `JSON.stringify(body)` (line 195–208), because the backend's `input.timezone !== undefined` check would otherwise treat the presence of `undefined` as a time change.

Backend validation: `createEventSchema` requires a valid IANA zone, rejects offset strings (`+05:30`) and fabricated zones — `calendar-timezone.spec.ts:76–123`.

### 2.3 Series vs Instance Edits

**VERIFIED DONE.**

`event-series-scope-dialog.tsx` presents two edit scopes: "This occurrence only" (`occurrence`) and "All occurrences" (`series`). No "this and following" scope exists; the PRD criterion text says "series-versus-instance edits" without naming that third scope, and the two-scope implementation satisfies the stated requirement.

Routing: `use-event-series-scope.ts` routes `occurrence` to `PATCH /calendar/events/:eventId/occurrences/:occurrenceStart` and `series` to `PUT /calendar/events/:eventId`.

Key correctness: occurrence edits are keyed on the NOMINAL start extracted from the id (e.g. `event-42-2026-03-18T09:00:00.000Z` → nominal `2026-03-18T09:00:00.000Z`), not on `event.start` (the moved time). The BITE test in `use-event-series-scope.test.ts:99` asserts this explicitly: a rescheduled occurrence (`start = MOVED_START`) routes the PATCH with `occurrenceStart = NOMINAL_START`.

Exception persistence: `useUpsertOccurrenceException` calls `PATCH /calendar/events/:eventId/occurrences/:occurrenceStart` which upserts a `calendar_event_exceptions` row keyed on `(event_id, nominal_start)`. Cancellation uses `DELETE` on the same URL.

### 2.4 Cursor/Range Query Keys

**VERIFIED DONE.**

The calendar uses range queries, not keyset cursor pagination. There is no cursor to mismatch. The range is encoded in the TanStack query key:

```
[...base, "calendar", "events", start_iso, end_iso, enabled_sources?]
```

defined at `lib/query-keys/platform-hierarchy.ts:6–9`.

The view window is ±1 month from `currentDate` (`calendar-view.tsx:156–163`), and the query is sent with `{ start: start.toISOString(), end: end.toISOString() }` — the key and the request parameters match.

Truncation (>2,000 events) is surfaced to the user via a `truncated` flag in the response (`CalendarEventsResponse`, hooks line 240–244), not silently dropped.

No `= ANY(${jsArray})` pattern found in calendar queries. No `new Date` interpolated into a Drizzle `sql` template in the calendar module. These traps were checked explicitly.

### 2.5 DST/Exception/Conflict/Reminder Coverage

**VERIFIED DONE.** All files opened; no placeholder tests found.

#### DST

`backend/src/modules/calendar/calendar-dst-edge.spec.ts`:
- "weekly 09:00 NY meeting: occurrence BEFORE fall-back is at 13:00 UTC" (line 27)
- "weekly 09:00 NY meeting: occurrence AFTER fall-back is at 14:00 UTC — local stays 09:00" (line 39)
- "BITE PROOF: the occurrence after fall-back is NOT at 13:00 UTC" (line 51)
- "fall-back does not produce two occurrences for the same local time" (line 62)
- Spring-forward equivalents (lines 76–111)
- Full-year crossing, non-DST zone (IST +05:30) (lines 221–259)

`backend/src/modules/calendar/calendar-timezone.spec.ts`:
- "UTC instants and IANA zone display (DST both directions + non-hour offset)" (line 125)
- "spring-forward gap time and fall-back ambiguous time" (line 184)
- "free/busy: conflict detection across a DST transition" (line 247)

`backend/src/modules/calendar/calendar-reminder-sweep-recurring.spec.ts`:
- "CalendarReminderSweepService — DST correctness for reminder window" (line 594)
- "spring-forward (UTC 07:00 = 03:00 EDT): event at that instant is within a 20-min pre-reminder window" (line 595)
- "fall-back: UTC 05:59 and UTC 06:01 are both distinct instants 2 minutes apart" (line 602)
- "Asia/Kolkata (+05:30): weekly FREQ=DAILY series expanded to 2024-01-15 midnight IST = UTC 18:30 prior day" (line 608)
- "America/New_York spring-forward: weekly series starting 2024-03-04T14:00Z expands to 2024-03-11T13:00Z" (line 628)

#### Exception

`backend/src/modules/calendar/calendar-exception-reminder-cancellation.spec.ts`: Tests that a cancelled occurrence dead-letters its reminder in `notification_outbox`, keyed on table name (not just "an update happened"), to survive the parent-series version-bump that now accompanies every occurrence write.

`backend/src/modules/calendar/calendar-series-exception-scope.spec.ts`: Tests scope routing for occurrence exceptions.

#### Conflict

`frontend/features/calendar/__tests__/event-conflict-notice.test.ts`:
- Asserts backend still returns both `eventConflicts` and `oooConflicts` from `createEvent` (anti-vacuity probe against backend source)
- Asserts client response type declares both fields
- Asserts each field has at least one consumer outside its declaration (anti-vacuity)
- Tests `describeEventConflicts` for singular/plural, named/unnamed attendees, deduplication, combined-conflict message

`backend/src/modules/calendar/calendar-conflict.service.spec.ts`: Backend conflict-detection unit tests.

#### Reminder

`backend/src/modules/calendar/calendar-reminder-sweep-recurring.spec.ts`:
- "uses occurrence start and attendee membershipId in dedupeKey for a recurring event" (line 60)
- "does NOT set reminder15MinSent on a recurring event" (line 121)
- "second sweep of the same recurring occurrence emits nothing new (per-attendee dedupeKey idempotency)" (line 207)
- "skips a cancelled recurring occurrence" (line 274)
- "queues a reminder at modifiedStart when an occurrence is moved into the sweep window" (line 332)
- "does not queue a reminder when an occurrence is moved out of the sweep window" (line 402)
- "applies modifiedTitle and uses modifiedStart in message while nominal start anchors the dedupeKey" (line 463)

`backend/src/modules/calendar/calendar-reminder-sweep-event-paging.spec.ts`: Reminder sweep paging.  
`backend/src/modules/calendar/calendar-reminder-sweep-tenant-isolation.spec.ts`: Cross-tenant reminder isolation.  
`backend/src/modules/calendar/calendar-reminder-recipient-paging.spec.ts`: Recipient paging.

---

## 3. Known Traps Checked

| Trap | Finding |
|---|---|
| Keyset cursor mismatches ORDER BY | Not applicable — range queries only, no keyset cursor |
| Date interpolated into Drizzle `sql` template | Grep across `backend/src/modules/calendar/**` returns no matches |
| `= ANY(${jsArray})` in Drizzle sql template | Grep across `backend/src/modules/calendar/**` returns no matches |
| Query-key factory called with no args matches nothing | `queryKeys.calendar.all` is used only for blanket invalidation (intentional prefix match); individual reads use fully-parameterized factories |
| `db.transaction` mock that doesn't invoke its callback | Not applicable to calendar tests audited (calendar tests use `jest.fn()` for mutations, not transaction mocks) |

---

## 4. P0/P1 Defects

**P1 — Three module-specific mini-calendar surfaces exist (acknowledged, not new)**

Files: `features/build/views/calendar-view.tsx`, `features/hr/holidays/components/calendar-view.tsx`, `features/hr/leaves/components/leave-calendar-widget.tsx`.

These violate the product rule "Never module-specific calendar pages" but are explicitly recorded in `features/calendar/unified-calendar-surface-boundary.test.ts` KNOWN_MODULE_CALENDAR_SURFACES (line 86). The test bites on any NEW surface and also bites if a recorded one is removed without a product decision. This is not a regression introduced by the current release; it is a tracked outstanding item.

No P0 defects found.

---

## 5. Sub-claim Summary Table

| Sub-claim | Status | File:line |
|---|---|---|
| ONE `/calendar` route | VERIFIED DONE | `app/(authenticated)/calendar/page.tsx:1` |
| No new module-specific calendar pages | VERIFIED DONE (3 acknowledged) | `features/calendar/unified-calendar-surface-boundary.test.ts:86` |
| Source toggles — server-side module gated | VERIFIED DONE | `backend/src/modules/calendar/calendar-source.registry.ts:50–69` |
| Source toggles — permission gated on frontend | VERIFIED DONE | `hooks/api/calendar.ts:419` |
| Source toggles — enabled set in query key | VERIFIED DONE | `lib/query-keys/platform-hierarchy.ts:6–9`; tested `hooks/api/calendar-source-key.test.ts` |
| Timezone display — UTC instants stored | VERIFIED DONE | `hooks/api/calendar.ts:139`; `backend/…/calendar-timezone.spec.ts:125` |
| Timezone display — browser zone sent on create only | VERIFIED DONE | `features/calendar/event-create-validators.test.ts:169,183` |
| Series vs instance edits — scope dialog | VERIFIED DONE | `features/calendar/event-series-scope-dialog.tsx:15` |
| Series vs instance edits — nominal-start keying BITE | VERIFIED DONE | `features/calendar/use-event-series-scope.test.ts:99` |
| Cursor/range keys — range in key | VERIFIED DONE | `lib/query-keys/platform-hierarchy.ts:6` |
| Cursor/range keys — no stale undefined in key | VERIFIED DONE | `hooks/api/calendar-source-key.test.ts:96` |
| DST — fall-back/spring-forward expansion | VERIFIED DONE | `backend/…/calendar-dst-edge.spec.ts:27–111` |
| DST — reminder window correctness | VERIFIED DONE | `backend/…/calendar-reminder-sweep-recurring.spec.ts:594` |
| Exception — cancelled occurrence dead-letters reminder | VERIFIED DONE | `backend/…/calendar-exception-reminder-cancellation.spec.ts` |
| Conflict — both lists surfaced to user | VERIFIED DONE | `features/calendar/__tests__/event-conflict-notice.test.ts:65–92` |
| Reminder — dedupeKey idempotency | VERIFIED DONE | `backend/…/calendar-reminder-sweep-recurring.spec.ts:207` |
| Reminder — modifiedStart routing | VERIFIED DONE | `backend/…/calendar-reminder-sweep-recurring.spec.ts:332` |
| No Date-in-sql-template trap | VERIFIED CLEAN | grep `backend/src/modules/calendar/**` — no matches |
| No `= ANY(${jsArray})` trap | VERIFIED CLEAN | grep `backend/src/modules/calendar/**` — no matches |

---

## 6. Verdict

**PRD-C128: CLOSED.**

All six sub-claims verified against current HEAD source. The CLOSED status recorded on 2026-09-04 in RELEASE-RECORD-2026-09-04.md is consistent with the evidence at this commit. The three acknowledged module mini-calendars are a tracked outstanding product item, not a release blocker; they predate this release and are recorded in a biting test.
