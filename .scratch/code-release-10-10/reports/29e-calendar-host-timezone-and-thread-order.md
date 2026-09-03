# 29e — Calendar host-timezone expansion, the C10 fence hole, and mail thread ordering

**Session:** S15 · **Ticket:** 29, boxes "Calendar" (line 14) and "Inbox/mail" (line 123)
**Verdict:** neither box closed. Two real defects fixed and bite-proved, one pre-existing spec
fragility fixed, one regression fence repaired. Everything left open is named below with an owner.

---

## 1. Recurrence expansion tracked the HOST's timezone, not the event's

**The defect.** `expandRecurring` (`src/modules/calendar/calendar-occurrence.service.ts`) converted
`dtstart`, both window bounds and `UNTIL` with `date-fns-tz`'s `toZonedTime`, then handed the result
to `rrule`. Those two libraries disagree about what a `Date` means:

- `rrule` reads a `dtstart`'s **UTC** getters as the wall clock.
- `toZonedTime` returns the Date whose **system-local** getters read as the wall clock.

They coincide only when `process.env.TZ === "UTC"`. Off UTC, every occurrence was rotated by the
host's own offset *before* `BYDAY`/`BYMONTHDAY` were applied, so it landed on the wrong **day**.

**Measured**, on this machine (`TZ=Asia/Calcutta`, +05:30), zone `America/New_York`:

| Series | Correct | Produced |
|---|---|---|
| all-day weekly `BYDAY=MO`, stored `2024-03-04T05:00Z` | `2024-03-04` (Mon) | `2024-03-05` (**Tue**) |
| `FREQ=MONTHLY;BYMONTHDAY=1`, stored `2024-04-01T04:00Z` | 1st of month | **2nd** of month |
| weekly 09:00 (the shape the existing spec pins) | `2024-03-04T14:00Z` | `2024-03-04T14:00Z` ✅ |

The rotation is `−hostOffset`, so the affected set is **every event whose local time is within the
host's offset of midnight**: all-day recurring events on a positive-offset host, late-evening ones on
a negative-offset host. Holidays, leave and interview series are exactly that shape, and the same
`expandToOccurrences` also feeds conflict detection, ICS export and the reminder sweep.

**Why it was invisible.** Nothing pins TZ for the test run — not `src/test/jest-setup.ts`, not the
jest block in `package.json` — so the suite inherits the host zone. The baseline was **43 suites /
406 tests, exit 0**. `calendar-dst-edge.spec.ts` is a genuinely good spec (explicit 2024 transition
dates, UTC-instant assertions, BITE cases, no `today` anchoring) and it still could not see this:
**every case it pins is at 09:00 local**, far enough from midnight that the rotation preserves the
weekday. That is the entire reason C6 read as closed for three passes.

**`getTimezoneOffset` is not the fix.** Measured: `date-fns-tz`'s `getTimezoneOffset` resolves an
offset per calendar **day**, answering `−04:00` for every instant of 2024-03-10 including those
before the 07:00Z transition. An attempt built on it was red on the transition-day cases. The
conversion is now built on `Intl.DateTimeFormat.formatToParts`, which is accurate to the instant, and
consults the host zone nowhere.

**Proof.** New `calendar-host-timezone-independence.spec.ts`, **17 tests**, exit 0 under `TZ=UTC`,
`Asia/Calcutta`, `America/New_York`, `Pacific/Auckland`, `Europe/Berlin` and `Australia/Adelaide`
(half-hour offset, and two of those hosts observe DST themselves).

Its BITE cases make the host offset an **explicit parameter** rather than ambient. That matters: a
first attempt guarded on "is the host UTC" and passed *vacuously* under `TZ=America/New_York`, because
the old mechanism is also correct whenever the host runs at the event's own zone. Parameterised, the
cases reproduce the defect under every host zone, and they show that at offset 0 the old mechanism
**agrees** with the fix — which is precisely why a UTC CI runner would have hidden this forever.

Whole module: **44 suites / 423 tests, exit 0** (was 43 / 406). `tsc --noEmit` exit 0.
Backend commit **`d01b3c41`**.

### 1b. A pre-existing host-TZ fragility in the same module

`dto/calendar-span.spec.ts` asserted a flat `widest <= 92` days. `clientWindow` builds **host-local**
Dates, exactly as the browser does, so a three-month window straddling a fall-back really is 92d 1h
(measured: 92.0417 under Europe/Berlin). The spec failed under every DST-observing host and passed
only at UTC. Reproduced at **HEAD, unmodified**, in a `git archive HEAD` tree before any change of
mine — this is not my regression. Now models the DST slack explicitly.
Backend commit **`68171169`**.

With both, the whole calendar module is host-timezone independent: **44 / 423, exit 0 under all six
zones**.

---

## 2. C10 — the fence added by `fa05e4ad9` does not detect what remains

The interviews fix is **real and verified**: `features/hr/recruitment/interviews-page.tsx` no longer
references `BigCalendarWrapper` and links to `/calendar?source=hr-interviews`, which is a registered
source. That part of the brief held up.

But `unified-calendar-surface-boundary.test.ts` bans *importing* `features/calendar/**` or
`react-big-calendar`. A module that hand-rolls a month grid out of `date-fns` and `grid-cols-7`
imports nothing from `features/calendar` and passes cleanly — and that is the shape of **every
surface still outstanding**. The fence was green while three module-specific calendars existed.

Swept `features/`, `components/` and `app/` for `grid-cols-7` paired with a calendar-day signal.
Registered sources at head: `build`, `hr`, `hr-leaves`, `hr-interviews`, `hr-attendance`,
`hr-holidays`, `tasks`.

| Surface | What it is | Duplicates | Verdict |
|---|---|---|---|
| `features/build/views/calendar-view.tsx` | month grid of tickets by `dueDate`; prev/next/today, month+year selects | `build` source | **§8 violation**, but scoped **per project**, which `/calendar` cannot express today |
| `features/hr/holidays/components/calendar-view.tsx` | month grid of holidays, prev/next; the holidays page's **default** view | `hr-holidays` source | **§8 violation** |
| `features/hr/leaves/components/leave-calendar-widget.tsx` | "Who's Out This Week" avatar strip; read-only, no navigation, no view switch | `hr-leaves` source | reads as a dashboard widget — judgement recorded, not assumed |

Checked and cleared: `features/timesheets/team/team-view.tsx` (week summary table),
`features/timesheets/billing/billing-view.tsx` (date-range filter), `features/hr/work-logs` (grouped
list). The accounting `grid-cols-7` hits are aging buckets; the dashboard ones are layout grids.

The scan now detects the hand-rolled shape and asserts the outstanding set with `toEqual`, so it
bites **in both directions** — a fourth surface fails, and a fixed one fails until its entry is
deleted. `jest features/calendar` → **19 suites / 154 tests, exit 0** (was 19 / 151); frontend
`tsc --noEmit` exit 0. Frontend commit **`c0f5c0560`**.

**Not fixed, deliberately.** Deleting the Build grid removes per-project due-date scoping that
`/calendar` has no way to express; deleting the holidays grid removes that page's default view and is
HR / ticket 25 territory. Both would be removing shipped functionality on my own judgement.
**Owners: Build owner; HR / ticket 25 owner.**

---

## 3. Mail — M2 conversation ordering fixed

**Corrections to S14's file paths** (substance survives both): `unified-inbox.service.ts` is in
`src/modules/notifications/`, not `src/modules/mail/`; `skipCache = Boolean(query)` is
`mail.service.ts:90` in the **backend**, not `mail-shell.tsx:90` in the frontend. Everything else
S14 asserts checked out at head.

**The defect.** `getThread` (`mail.service.ts:318-333`) returned the provider's own order untouched.
Gmail's `GMAIL_FETCH_MESSAGE_BY_THREAD_ID` path (`providers/gmail-mail.provider.ts:92-113`) maps and
filters and **never sorts**; Outlook (`:210-238`) pushes `receivedDateTime asc` to Graph. One
conversation, two orders, depending on the account.

Ordering now happens once in the service, covering every caller — the controller and **both AI
paths** (`mail-ai.service.ts:90` thread summarisation, `:130` reply drafting), which were reading an
unordered transcript and treating its last element as the newest message. A Gmail reply draft could
answer the wrong turn.

The comparator parses instants rather than comparing raw strings the way `mergeMessagesByDate` does.
Gmail normalises through `toISOString()`, but Outlook passes Graph's `receivedDateTime` through
untouched, and for the same second `...30Z` vs `...30.5000000Z` sort **backwards** as text — measured,
`localeCompare` returns `1` for the pair whose true order is the reverse, because `.` is below `Z`.
An unparseable date sorts last rather than returning `NaN`, which would leave the comparator, and
therefore the whole order, undefined. Oldest-first, matching Outlook's existing contract, so Outlook
is unchanged and Gmail is brought into line.

**Proof.** New `mail-thread-ordering.spec.ts` — **10 tests** driving the real `MailService` with
provider doubles answering in the providers' own shapes (brief rule 11: a typecheck cannot see an
ordering contract). Reverting the fix in a throwaway `git archive` tree turns exactly **3 red** —
cross-provider agreement, the Gmail unordered case, newest-is-last — while the pure-helper tests and
the BITE control stay green. Module: **13 suites / 108 tests, exit 0** (was 12 / 98).
`tsc --noEmit` exit 0; `check:spec-typecheck` exit 0. Backend commit **`30fee448`**.

`idx_mail_metadata_thread` still has **no reader**: the fix orders the provider's answer rather than
reading the mirror, because the mirror holds only what has been listed and a thread is routinely not
fully in it. Making that index live is the same delta-sync prerequisite as R-22, not a separate item.

---

## 4. What I did not close, and why

| Item | Status | Reason | Owner |
|---|---|---|---|
| Calendar **C10** | ❌ | Three hand-rolled surfaces remain; removing two loses shipped functionality (per-project scoping; a page's default view) | Build owner · HR / ticket 25 |
| Calendar **C4, C5, C7** | PARTIAL | S14's verdicts stand; I did not re-open them | release owner (product) |
| Calendar **p95 over HTTP** | not run | `test/perf/route-budget-http.seeded-e2e-spec.ts` **NOT RUN BY ME**. Unchanged from S13/S14 | perf-harness owner |
| Mail **M1/M3** widening | PARTIAL | `listCached` already takes `accountId: number \| null` and already skips the predicate when null, so the data layer supports it and only `mail.service.ts:69/75` refuses — **smaller than S14 implied**. Left undone anyway: needs cross-account freshness semantics, an equivalence run, and a **measured** read cost. Hottest mail read path; already caused one p95 regression this release; no benchmark is trustworthy with other agents live | mail owner + perf-harness owner |
| Mail **M4/M5/M7/M8** | ❌ | The two NEW REQUIREMENTs (R-22, R-23). `src/modules/ingress/**` is CRM territory, excluded | mail/integrations owner |
| Mail **M6** | PARTIAL | `common/idempotency/**` framework territory; FAILED-state semantics affect every `@Idempotent` command | idempotency-framework owner |
| Mail **M10** | ❌ (inert) | `queryKeys.inbox.count()` has zero consumers; `/me/inbox/unified/count` (`src/me/inbox.controller.ts:41-45`) has no client hook. Nothing to invalidate | M4's consumer |

**Cross-territory finding.** Nothing pins `TZ` for the backend test run. Three other modules use the
`toZonedTime`/`fromZonedTime` pair — `workflows/engine/cron-next.ts`,
`support/core/support-business-hours.util.ts`, `hr/time/attendance-summary.service.ts`. Those feed
the results to **date-fns** functions, which read local components, so the pair is used as intended
and I found no defect there. The calendar case was specifically about handing that representation to
**`rrule`**, which reads UTC components. I did not audit those three in depth — flagging the pattern,
not asserting a bug. Pinning a non-UTC `TZ` for the whole suite would make this class bite in CI, but
that is a repo-wide change under other agents and I did not make it unilaterally.

---

## Commands run

| Command | Exit | Result |
|---|---|---|
| `jest --testPathPattern="src/modules/calendar"` (baseline, pre-change) | 0 | 43 suites / 406 tests |
| `jest --testPathPattern="src/modules/calendar"` × `TZ`∈{UTC, Asia/Calcutta, America/New_York, Pacific/Auckland, Europe/Berlin, Australia/Adelaide} | 0 (all six) | 44 suites / 423 tests |
| `jest --testPathPattern="calendar-host-timezone-independence"` × same six | 0 (all six) | 17 tests |
| `jest --testPathPattern="src/modules/mail"` | 0 | 13 suites / 108 tests (was 12 / 98) |
| `jest --testPathPattern="mail-thread-ordering"` with the fix reverted in a `git archive` tree | 1 | **3 failed / 10** |
| backend `tsc --noEmit -p tsconfig.json` (8 GB heap) | 0 | 0 errors |
| backend `pnpm check:spec-typecheck` | 0 | passed |
| frontend `jest --testPathPattern="features/calendar"` | 0 | 19 suites / 154 tests (was 19 / 151) |
| frontend `tsc --noEmit` (8 GB heap) | 0 | 0 errors |

Not run: `pnpm check:route-budgets`, `pnpm check:benchmark-manifest`, the HTTP p95 harness, lint,
e2e, and any database benchmark. No database was touched this session.

## Commits

| SHA | Repo | Files |
|---|---|---|
| `d01b3c41` | backend | `calendar-occurrence.service.ts`, `calendar-host-timezone-independence.spec.ts` (new), `calendar-item-timezone.spec.ts` |
| `68171169` | backend | `dto/calendar-span.spec.ts` |
| `30fee448` | backend | `mail.service.ts`, `providers/mail-normalizers.ts`, `mail-thread-ordering.spec.ts` (new) |
| `c0f5c0560` | frontend | `features/calendar/unified-calendar-surface-boundary.test.ts` |
