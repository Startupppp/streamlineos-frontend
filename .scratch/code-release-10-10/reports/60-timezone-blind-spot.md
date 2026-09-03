# 60 — The timezone blind spot: what a non-UTC test run found

**Status:** five product-code defects found and fixed; CI can now catch the class in both repos.
**Date:** 2026-09-03
**Repos:** `streamlineos-backend`, `streamlineos-frontend`

---

## 1. The finding, restated after verifying it

Backend `d01b3c41` fixed calendar recurrence expansion tracking the *host machine's*
timezone instead of the event's. I verified the commit and its reasoning: `rrule` reads a
`dtstart`'s **UTC** getters as the wall clock, while `date-fns-tz`'s `toZonedTime` builds
the representation whose **system-local** getters read as the wall clock. The two agree
only at `TZ=UTC`.

The larger claim in the ticket was the important one, and it is correct:

> Nothing pins `TZ` for the test run, and CI runs at UTC, so this class of bug can never
> fail CI.

Confirmed by inspection:

| | pins `TZ`? |
|---|---|
| `streamlineos-backend` `package.json` `jest` block | no |
| `streamlineos-backend/src/test/jest-setup.ts` | no (sets 5 unrelated env vars) |
| `streamlineos-frontend/frontend/jest.config.cjs` | no |
| `streamlineos-frontend/frontend/jest.setup.js` | no |
| `.github/workflows/ci.yml` `tests` job (before this work) | no — inherits the runner's UTC |
| `.github/workflows/frontend.yml` `tests` job (before this work) | no — same |

**Correction to one part of the framing.** The class is not only *host*-timezone coupling.
Two of the five defects found are the same root cause pointing the other way: a value with
no instant (a `YYYY-MM-DD` calendar date) parsed as an instant and then re-projected into
*some* zone — the host's on the server, the reader's in the browser. Same defect, same
remedy, and the non-UTC run finds both.

---

## 2. Blast radius, measured before any fix

Full unfiltered suites, `--maxWorkers=2`, `--ci`. Six other agents were committing to the
same working tree throughout, so the pre-existing failure baseline drifts between runs;
every conclusion below is drawn from a **same-tree A/B**, never from comparing two runs
taken minutes apart.

### Backend — `node ./node_modules/jest/bin/jest.js --maxWorkers=2 --ci`

| TZ | exit | suites | tests |
|---|---|---|---|
| `Asia/Calcutta` | 1 | 10 failed / 1923 passed / 1941 total | 41 failed / 16734 passed / 16866 total |
| `America/New_York` | 1 | 9 failed / 1925 passed / 1942 total | 34 failed / 16749 passed / 16874 total |
| `Pacific/Auckland` | 1 | 8 failed / 1927 passed / 1943 total | 33 failed / 16764 passed / 16888 total |
| `Australia/Adelaide` | 1 | 9 failed / 1927 passed / 1944 total | 34 failed / 16768 passed / 16893 total |
| `UTC` | 1 | 11 failed / 1925 passed / 1944 total | 36 failed / 16766 passed / 16893 total |

Note the total suite count rising 1941 → 1944 across the sequence: that is other agents
adding spec files mid-run, and it is why the raw failure counts are not comparable.

**Timezone-attributable failures: exactly one, and only at `America/New_York`.**
`src/modules/hr/time/leaves-write-probation.spec.ts`. Re-running the ten
`Asia/Calcutta` failures back-to-back at `UTC` and `Asia/Calcutta` (56 suites / 507 tests,
seconds apart) produced the same set at both zones — so those ten are the shared-tree
churn baseline, not timezone. The `UTC` run's extra suites
(`hrms-critical-audit-invariants`, `hr-workflows-tenant-isolation`,
`module-registry-fields`, `slo-catalogue`, `gated-keys-are-catalogued`,
`bola-body-id-binding`) are all source-text ratchets over files another agent was editing.

The clean A/B is in §4.1: a hermetic `git archive` tree at one commit, one file reverted,
UTC vs `America/New_York` — 11 vs 12 failed suites, and the difference is exactly
`leaves-write-probation`.

### Frontend — `node ./node_modules/jest/bin/jest.js --maxWorkers=2 --ci`

| TZ | exit | suites | tests |
|---|---|---|---|
| `UTC` | 0 | 345 passed / 345 | 3410 passed / 3410 |
| `Asia/Calcutta` | 0 | 345 passed / 345 | 3410 passed / 3410 |
| `Australia/Adelaide` | 0 | 347 passed / 347 | 3423 passed / 3423 |
| `America/Sao_Paulo` | 0 | 347 passed / 347 | 3423 passed / 3423 |
| `Pacific/Auckland` | **1** | 1 failed / 344 passed | **1 failed** / 3409 passed |
| `America/New_York` | 1 | 1 failed / 345 passed / 346 | 0 failed (suite failed to load) |

- `Pacific/Auckland`: `lib/date-utils.relative.test.ts` — real, spec-only. §3.2.
- `America/New_York`: `features/__tests__/virtual-row-listitem.contract.test.ts` failed to
  load — `Cannot find module '../../test-utils/source-corpus'`. **Not timezone**: another
  agent had the spec on disk and its helper not yet written. Not my territory; it resolved
  itself later in the session.

### Why `Asia/Calcutta` alone would have been a false clearance

`Asia/Calcutta` is +05:30 with **no DST**. It finds the whole "west/east of UTC" family
and none of the transition-day family. Three of the five defects below are only visible on
a host that *has* a DST transition. The half-hour offset also matters independently: it is
the case `d01b3c41`'s own proof called out.

---

## 3. The five defects

Each is classified as the task asked. "Product code" and "spec only" were kept strictly
apart, and each spec-only verdict was reached only after driving the product code.

### 3.1 PRODUCT — backend: a `YYYY-MM-DD` from the wire parsed as a UTC instant

`fix(hr,build)` — `501ffb3d`

`formatDateOnly` (`src/common/date/date.utils.ts`) already returns a calendar-date string
unchanged. **Sixteen call sites wrapped their argument in `new Date(...)` first**, which
defeats that short-circuit: the string parses to midnight UTC and `getFullYear` /
`getMonth` / `getDate` then read that instant in the **host's** zone.

Measured at `TZ=America/New_York`: a leave requested for `2026-03-01` was **persisted** as
`2026-02-28` (`leaves-write.service.ts:214` inserts `startStr`), judged against probation
on the wrong day, matched against the wrong conflict window, and announced by email as the
wrong day. Same shape on joining dates, dates of birth, asset assign/return/purchase dates,
salary-structure effective dates, recruitment application deadlines, performance-goal
windows and timesheet entry dates.

The existing `leaves-write-probation.spec.ts` **already asserted the right answer** and had
been green throughout — the second time in this release a good spec hid a real bug for want
of a zone.

Dropping the wrapper is byte-identical on the ISO-datetime path (`formatDateOnly` does its
own `new Date(value)` there), so the only behaviour that changes is the wrong one.

New spec: `src/common/date/calendar-date-host-independence.spec.ts` — models the host
offset as an explicit parameter, so its BITE cases reproduce under every host zone.

### 3.2 PRODUCT + SPEC — frontend: a `YYYY-MM-DD` rendered in the reader's zone

`fix(frontend)` — `45fa592be`

`formatShortDate` parsed every input with `new Date()`, so a `date` column from the API —
order date, expiry, expected delivery, received date, sales-order date — became midnight
UTC and was then projected into the **reader's** zone. An expiry of `2026-07-12` read as
**"11 Jul 2026"** for every reader west of UTC.

The backend genuinely sends a calendar date: `expiryDate` is `date("expiry_date")` in
Drizzle and its DTO validates `/^\d{4}-\d{2}-\d{2}$/`. So this is product code, not a spec.
Fixed by rendering a calendar date in UTC — where the invented instant and the intended day
agree — while a real timestamp still renders in the reader's own zone. That second half is
asserted, so a later "just force UTC everywhere" cannot quietly break it.

**The spec-only half, and why it is not a cover story.** `lib/date-utils.relative.test.ts`
anchored `NOW` at midday **UTC** and asserted the UTC reading of a fallback that
deliberately renders in the reader's zone — so it failed at `Pacific/Auckland`. Before
calling the spec wrong I checked every consumer of `formatRelativeTime` / `formatShortDate`:
all are `"use client"` pages, so the reader's zone *is* the right zone for an instant. The
anchor is now midday **local**, which is host-independent for every real zone; the product
code on that path is unchanged. The genuinely wrong product code in the same file
(`formatShortDate`) is fixed above — the two were found together and kept apart
deliberately.

### 3.3 PRODUCT — backend: the cron walk ran on the host's clock

`fix(workflows)` — `src/modules/workflows/engine/cron-next.ts`

`computeNextCronDate` converted with `toZonedTime` — a Date whose **system-local** fields
read as the tenant's wall clock — then walked the candidate with `setHours` / `setDate` /
`setMinutes`, which write the **host's** clock. On the host's own spring-forward day the
local hour 02 does not exist, JavaScript normalises `setHours(2, 0, 0, 0)` to 03:00, and the
walk skips hour 2 entirely.

Measured, host at `America/New_York`, tenant in `Asia/Kolkata` (a zone with **no DST at
all**):

```
computeNextCronDate("30 2 * * *", "Asia/Kolkata", 2024-03-10 01:00 IST)
  host UTC / Asia/Calcutta / Pacific/Auckland  -> 2024-03-10 02:30 IST   correct
  host America/New_York                        -> 2024-03-11 02:30 IST   a whole day late
```

The run is not moved by an hour, it is **dropped for a day**. Every workflow schedule in the
02:00–02:59 band of every tenant, once a year, driven entirely by the host's transition.
Same at `Pacific/Auckland` on 2024-09-29 and `Australia/Adelaide` on 2024-10-06.

`toWallClockUtc` / `fromWallClockUtc` — the Intl conversion `d01b3c41` built — moved to
`src/common/date/zoned-wall-clock.ts` rather than being copied;
`calendar-occurrence.service.ts` imports and re-exports them, so its call sites and its
spec's import path are unchanged (`calendar-item-timezone.spec.ts` asserts that source text
verbatim). The walk now uses `getUTC*` / `setUTC*`, which have no transitions.

### 3.4 PRODUCT — backend: SLA business hours ran on the host's clock

`fix(support)` — `src/modules/support/core/support-business-hours.util.ts`

Same shape: `toZonedTime` then `setHours` / `setDate` for the day roll and the window
boundaries. On the host's spring-forward day a boundary inside the missing hour is
normalised forward and every due date computed from it moves by an hour.

Measured over **960 (schedule × policy-zone × instant × minutes) cases per host**,
disagreements with the UTC answer:

| host | before | after |
|---|---|---|
| `Australia/Adelaide` | 32 | 0 |
| `America/Havana` | 29 | 0 |
| `America/New_York` | 24 | 0 |
| `Pacific/Auckland` | 24 | 0 |
| `Asia/Beirut` | 13 | 0 |
| `UTC`, `Asia/Calcutta`, `America/Santiago`, `America/Sao_Paulo` | 0 | 0 |

**This is the one where the prior audit was wrong, and where my own first probe was wrong
too.** The lead I was handed said three modules use `toZonedTime`/`fromZonedTime` and none
had a bug, "because they feed date-fns, which uses local getters, so the pair is used as
intended". The premise is true and is exactly the problem: the intended use puts every field
operation on the host's clock. My first probe of this same function also came back clean
(0/768) because it used a Mon–Fri 09:00–17:00 policy — a window that never sits in a host's
missing hour. It took widening the probe to all seven days and an overnight window to make
it bite. A clean probe is evidence about the probe.

Tenant-facing effect: a first-response or resolution deadline an hour off, once or twice a
year per host transition, for any policy whose window boundary lands in the gap hour —
overnight and 24×7-shaped policies most of all.

### 3.5 PRODUCT — backend: `date-fns-tz` is host-dependent at the primitive

`fix(hr)` — `attendance-summary.service.ts`, `hr-calendar-source.ts`

The root cause under 3.3 and 3.4 is not the call sites. **`toZonedTime` itself — and
therefore `formatInTimeZone`, which takes an explicit zone — is host-dependent.**

```
toZonedTime(2024-03-09T20:40:00Z, "Asia/Kolkata").getHours()
  every host except America/New_York -> 2      (the true Kolkata reading is 02:10)
  host America/New_York              -> 3

formatInTimeZone(2024-03-09T20:40:00Z, "Asia/Kolkata", "yyyy-MM-dd HH:mm")
  -> "2024-03-10 03:10" at America/New_York, "2024-03-10 02:10" everywhere else
```

Measured over **90,000 (instant × zone) samples per host**, wrong readings: 10 at
`America/Havana`, 10 at `Asia/Beirut`, 9 at `America/New_York`, 9 at `Europe/Berlin`, 8 at
`Pacific/Auckland`, 8 at `Australia/Adelaide`, **0** at `UTC` and `Asia/Calcutta`.

Seven backend call sites use these. Two act on the **hour** and are fixed:

- `attendance-summary.service.ts` derives minute-of-day from `getHours()`/`getMinutes()` to
  decide **LATE** and **EARLY-EXIT**. An hour of check-ins on the host's transition day was
  judged against the wrong minute — an employee's attendance verdict flipped by the server's
  own clock.
- `hr-calendar-source.ts` renders check-in / check-out on the calendar day cell with
  `formatInTimeZone(..., "p")`, an hour later than the clock-in actually was.

`formatZoneClockTime` in `common/date/zoned-wall-clock.ts` replaces the second and
reproduces date-fns's `p` for en-US byte-for-byte (asserted at the 12/AM/PM boundaries).

**Measured and deliberately left alone.** The other six `formatInTimeZone` call sites —
`dashboard-stats`, `dashboard-availability`, `hr-calendar-sub-sources`,
`hr-calendar-source` (its three `today`/`activatedAt`/`joinedAt` calls),
`attendance-email-report`, `attendance-clock` — all format `"yyyy-MM-dd"`. Across the same
90,000 samples on all eight hosts, **including the midnight-transition zones
`America/Havana` and `Asia/Beirut`, the date part never disagreed once**. The
normalisation only ever moves forward within a day, so a date-only format is safe. Named
here rather than churned, so the next reader does not have to re-derive it.

---

## 4. Proving the CI leg actually bites

Every proof below runs the CI leg's **own command** in a hermetic tree built with
`git archive <sha> | tar -x`, never by planting a defect in the shared working tree.

### 4.1 Backend, whole suite, one file reverted

Tree: `git archive 501ffb3d`, `src/modules/hr/time/leaves-write.service.ts` reverted to
`501ffb3d~1`, `node_modules` symlinked.

| TZ | exit | suites failed | tests failed |
|---|---|---|---|
| `UTC` | 1 | 11 | 35 |
| `America/New_York` | 1 | **12** | **36** |

Identical baseline; the one extra suite is exactly
`src/modules/hr/time/leaves-write-probation.spec.ts`. **The non-UTC leg catches the
reverted fix and the UTC leg does not.**

### 4.2 Frontend, whole suite, one file reverted

Tree: `git archive HEAD frontend`, `lib/date-utils.ts` reverted to before the fix, the new
spec kept.

| TZ | exit | tests failed |
|---|---|---|
| `UTC` | 1 | **0** |
| `Pacific/Auckland` | 1 | **0** |
| `Australia/Adelaide` | 1 | **0** |
| `America/New_York` | 1 | **2** |

(The non-zero exits are 4 suite-level failures present identically at every zone, from
other agents' in-flight files at that HEAD.) The asymmetry *is* the finding: a UTC-only
runner, and even two eastern non-UTC runners, cannot see a west-of-UTC defect.

### 4.3 Cron — bites on all three non-UTC legs

Tree: `git archive HEAD` with the pre-fix `cron-next.ts`, new spec copied in.

| TZ | tests failed | which |
|---|---|---|
| `UTC` | 1 | structural BITE only |
| `America/New_York` | 3 | structural + both behavioural |
| `Pacific/Auckland` | 2 | structural + spring-forward day |
| `Australia/Adelaide` | 2 | structural + spring-forward day |

The three behavioural cases are deliberately the spring-forward days of the three matrix
zones (`2024-03-10`, `2024-09-29`, `2024-10-06`), verified against each host's actual gap
with `new Date(y, m, d, 2, 30)`.

### 4.4 Business hours — same shape

`UTC` 1 failed (structural only) · `America/New_York` 3 · `Pacific/Auckland` 2 ·
`Australia/Adelaide` 2.

### 4.5 Attendance clock — same shape

`UTC` 1 failed (structural only) · 2 at each of the three non-UTC matrix zones.

---

## 5. The CI change

A new `tests-non-utc` job in each repo, alongside the existing `tests` job.

```yaml
tests-non-utc:
  strategy:
    fail-fast: false
    matrix:
      tz: [America/New_York, Pacific/Auckland, Australia/Adelaide]
  # ... same steps, same unfiltered command, with TZ: ${{ matrix.tz }}
```

**Not `TZ: UTC` everywhere.** Pinning UTC would have cemented the blind spot while looking
like a fix. `TZ: UTC` *is* now stated on the existing `tests` step — as the other half of a
deliberate pair, so the runner's zone is not left to chance, and so the pairing is legible.

**Unfiltered, not scoped to "date-sensitive" suites.** Both repos' `tests` jobs already
carry a comment explaining why they are unfiltered — `--testPathPattern` reports green while
every suite outside the filter is red. A scoped non-UTC leg would reintroduce exactly that
shape, *and* would need a maintained list of date-sensitive suites, which is wrong the
moment someone adds a `new Date()` to a suite nobody classified. That is how this class
hides in the first place. The frontend suite is 25s and the backend ~5 min at
`--maxWorkers=2` on a contended laptop, so scoping buys little.

**Why these three zones, and nothing redundant.**

| zone | offset | DST | axis it is the only cover for |
|---|---|---|---|
| `America/New_York` | −05:00 / −04:00 | northern | negative offset — the only one that sees §3.1 and §3.2 |
| `Pacific/Auckland` | +12:00 / +13:00 | southern | large positive offset, southern transition dates |
| `Australia/Adelaide` | +09:30 / +10:30 | southern | **half-hour** offset — integer-hour arithmetic |

`fail-fast: false` so one red zone still reports the other two; a matrix that stops at the
first failure reports on a prefix, which is the job-level masking defect ticket 35 fixed one
level up.

`check:gate-wiring` passes in both repos after the change (backend: 98 gates, 15 jobs, 7
workflow files; frontend: 34 gates, 6 jobs), and both files parse as YAML with the matrix
and step env wired as intended.

---

## 6. After

Full unfiltered suites at head, after all five fixes.

### Frontend

| TZ | exit | suites | tests |
|---|---|---|---|
| `UTC` | 0 | 349 passed / 349 | 3436 passed / 3436 |
| `America/New_York` | 0 | 349 / 349 | 3436 / 3436 |
| `Pacific/Auckland` | 0 | 349 / 349 | 3436 / 3436 |
| `Australia/Adelaide` | 0 | 349 / 349 | 3436 / 3436 |
| `Asia/Calcutta` | 0 | 349 / 349 | 3436 / 3436 |

### Backend

See §8 — the final four-zone run is recorded there with its exact numbers.

Focused verification, all green at `UTC`, `America/New_York`, `America/Sao_Paulo`,
`Asia/Calcutta`, `Australia/Adelaide` and `Pacific/Auckland`:

| pattern | suites / tests |
|---|---|
| `(calendar-date-host-independence\|leaves-write-probation)` | 11 tests |
| `(cron-next-host-timezone\|workflow-schedule-tick\|calendar)` | 53 / 492 |
| `(support-business-hours\|support-sla)` | 28 tests |
| `(zoned-wall-clock\|calendar\|attendance\|hr-calendar)` | 63 / 539 |
| frontend `lib/date-utils\.` | 18 tests |

`pnpm typecheck` exit 0 / 0 errors (backend, after each change) ·
`pnpm check:spec-typecheck` exit 0 · `pnpm check:cycles` exit 0 (no circular dependency) ·
`eslint` exit 0 on every touched file · frontend `check:formatters`,
`check:test-typecheck`, `check:gate-wiring` all exit 0.

---

## 7. A trap worth recording

**`process.env.TZ` cannot be changed inside a jest worker.** Jest replaces `process.env`
with a copy, so Node never receives the reassignment hook that resets its cached zone.
Measured under **both** the `jsdom` and the `node` test environments: the zone does not
move, and a spec written as a `for (const zone of ZONES)` loop silently asserts the same
ambient zone N times and passes. In bare `node` the same code works, which makes it worse.

Consequence: a spec cannot vary the ambient zone itself. The two things it *can* do, and
both are used above:

1. Model the other side's offset as an **explicit parameter** — the trick `d01b3c41`'s own
   spec uses. Those cases bite in every host zone, including UTC.
2. Pin the correct literal answer and let the **CI matrix** supply the ambient zone. Those
   cases bite only on the matching leg, which is why §4 proves each one against a reverted
   fix at each zone rather than asserting it.

Every spec added here carries at least one of kind 1, so `TZ=UTC` alone still fails on a
regression of the structure even when it cannot fail on the behaviour.

---

## 8. Open, and honest

- **Nothing was quarantined, skipped or weakened.** Ticket 35 forbids it and a quarantined
  suite in this report would refute the report.
- **The shared-tree churn baseline is not mine and is not fixed.** Between 8 and 11 backend
  suites were red at every zone throughout, from other agents' in-flight edits to files
  those suites ratchet over (`keyset`, `list-query.schema`, `env-coverage`,
  `razorpay-service-import-boundary`, `legacy-reader-ratchet`, `injection-surfaces`,
  `secrets-cookies-and-keys`, `upload-controls`, plus transient
  `hrms-critical-audit-invariants`, `hr-workflows-tenant-isolation`,
  `module-registry-fields`, `slo-catalogue`, `gated-keys-are-catalogued`,
  `bola-body-id-binding`, `session-revocation-enforced`). Verified non-timezone by running
  them at `UTC` and `Asia/Calcutta` seconds apart and getting the same set. Not my
  territory.
- **`features/__tests__/virtual-row-listitem.contract.test.ts`** could not load at one point
  (`Cannot find module '../../test-utils/source-corpus'`). Another agent's half-landed
  change; it resolved during the session and is green at head.
- **The six date-only `formatInTimeZone` call sites are measured safe, not proven safe.**
  90,000 samples × 8 hosts is a strong sample, not a proof. If `date-fns-tz` is ever
  removed, they should move to `zoned-wall-clock` with the rest.
- **`formatDateOnly(new Date())` — no argument — is a different question and was not
  touched.** Nine call sites ask "what is today?" and answer in the **host's** zone rather
  than the organisation's (`timesheets/core/timer.service.ts`,
  `exceptions-detector.service.ts`, `entries.service.ts`, `assets.service.ts`,
  `employee-onboarding.service.ts` ×2, `celebrations.service.ts`,
  `projects-reports.service.ts`, and `date.utils.ts`'s own `getTodayString`). That is
  a real org-vs-host question with a product decision inside it — which zone should decide a
  timesheet's "today" — and it is not a mechanical fix. **Left open and named**; it is
  invisible to the TZ matrix because no spec pins it.
- **`toLocaleDateString` / `toLocaleTimeString` with no `timeZone` appears at 33 backend
  call sites, plus 15 date-shaped `toLocaleString` calls** (`crm-brief`, `crm-copilot`, `meetings-prep-prompt`, `hr-template-render`,
  `experience-letter`, `task-notifications`, `clients-email`, and others). Every one renders
  in the host's zone. Most are prose inside AI prompts or emails where an hour is
  immaterial, but `experience-letter.service.ts:193` and `hr-template-render.service.ts:50`
  stamp a **date onto a generated document**. Not audited case by case here. **Left open
  and named.**
- **`test:e2e` and `test:e2e:seeded` were not run at a non-UTC zone.** They need a database
  and were out of budget for this pass; the new CI job covers the unit suites only. If the
  seeded suite is ever added to the matrix, expect the calendar and attendance paths to be
  where it bites first.
