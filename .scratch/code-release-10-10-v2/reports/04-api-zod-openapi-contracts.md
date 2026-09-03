# 04 — API, Zod and OpenAPI contracts

**Status:** partial. 3 of 13 criteria closed with proof; 10 partial or open with measured residuals.
**Repos:** backend `streamlineos-backend`, frontend `streamlineos-frontend/frontend`. Nothing committed
by me — the orchestrator commits.

---

## The headline number

**Response-contract coverage, measured on `openapi.json` (a 2xx response with a `content` schema):**

| | operations | with a 2xx content schema | % |
|---|---|---|---|
| **Before** | 3,642 | **1** | 0.027 % |
| **After** | 3,642 | **24** | 0.659 % |
| **Residual** | | **3,618 uncontracted** | 99.34 % |

Measured with the script below against the regenerated document, before and after
(`pnpm openapi:generate`, exit 0, "3642 operations" both times):

```
python3 -c "import json; d=json.load(open('openapi.json')); ..."
before: operations 3642 / 2xx content schema 1   (GET /calendar/admin/settings)
after : operations 3642 / 2xx content schema 24
```

The 24 are every operation in `calendar`, `storage` and `cron/storage-sweep` whose return shape I
could derive from the service projection. They are listed in full at the end of §C049.

### The gate that hid this

`pnpm check:openapi-coverage` prints, and has always printed:

```
response-schemas: 3642/3642 ops have a declared response body (100%)
```

That line is **vacuous**. `findMissingResponseSchemas`
(`src/scripts/check-openapi-coverage.mjs:174-200`) counts an operation as covered if its
`responses` object has any key in the 2xx range — and `SwaggerModule.createDocument` auto-generates
`"200": { description: "OK" }` with no `content` for every handler. So the gate reports 100 %
coverage of a property that 0.03 % of the surface actually had. **This one line is why nobody has
noticed the missing response half.**

**Fix (routed, not applied — `src/scripts/**` is ticket 30's):** in
`findMissingResponseSchemas`, replace the `has2xx` disjunct with a check that the 2xx response
carries `content[*].schema`, and ratchet the resulting number rather than requiring 100 %. The
`hasResponseWithContent` helper on line 187 already computes almost exactly the right predicate; it
is `has2xx ||` on line 194 that neutralises it.

---

## C047 — strict TypeScript, no new `any`/suppressions/double casts

- `$HEAVY 2 -- pnpm -C .../streamlineos-backend typecheck` → **exit 0** (run three times across the
  change set: after the interceptor, after the storage rollout, after the compression config).
- `pnpm check:type-assertions` → **exit 1**, and **none of the three offenders is mine**:
  - `src/scripts/check-referential-action-drift.ts` — one `as unknown as`, a new untracked file from
    the ticket-30 agent.
  - `src/common/cache/cache-fill.ts` — 2 plain assertions; `src/common/cache/**` is explicitly
    excluded from my territory.
  - `src/common/cache/cache.service.ts` — a stale ledger entry.
  The gate first flagged **my** `response-contract.interceptor.ts` for 2 plain assertions
  (`value as Record<string, unknown>` and `(value as {pipe?: unknown}).pipe`). Both were removed by
  narrowing through an `isPlainRecord` type guard rather than ledgering them; re-run confirms my
  files contribute **0** assertions, 0 double casts, 0 suppressions.
- New code adds no `any`, no `@ts-ignore`, no `as unknown as`, and no parallel hand-written type: the
  response schemas are the single source and `z.infer` is used where a type is needed.

**Closed.**

## C048 — Zod at every untrusted boundary

Audited in my territory (`src/common/**` less cache, `calendar`, `cron`, `storage`, `contracts`).

- **Bodies / params / queries** — `@Validate({ body, query, params })` +
  `ZodValidationInterceptor` (global `APP_INTERCEPTOR`). Every param schema in
  `calendar.controller.ts` (`eventIdParams`, `eventIdoccurrenceStartParams`, `sourceKeyParams`) and
  `storage-kb.controller.ts` (`slugParams`) is `.strict()`. Verified, no gaps found in my modules.
- **Environment** — `src/config/env.validation.ts` validates every declared variable and fails fast;
  `resolveAdmissionConfig` (`src/common/admission/admission.config.ts:46-53`) parses its own six
  variables through Zod and throws with the issue list. Neither is `.strict()`, and that is
  **correct, not a gap**: `process.env` carries hundreds of unrelated variables and a strict schema
  would reject every boot. Recorded here so a later reader does not "fix" it.
- **Upload manifests** — `MultipartAction` + `initiateMultipartSchema`/`completeMultipartSchema`;
  `check:multipart-contracts` exit 0, `check:bounded-contracts` exit 0 (`parts` is bounded).
- **External provider responses** — all four in my territory parse: `turnstile.service.ts:61`
  (`safeParse`), `virustotal-av-scanner.ts:91` (`safeParse`),
  `external-calendar-sync.service.ts:71,101` (`parse`), `external-event-normalizers.ts:86-90`
  (`googleListSchema.parse` + per-item `safeParse`, skipping unparseable items).
- **NEW: responses.** This criterion says "every untrusted … external response". A response the
  frontend receives is an untrusted input to the frontend, and it was validated nowhere. See C049.

**Partial** — closed for my modules; the repo-wide residual is C049's 3,618.

## C049 — reconcile backend Zod/OpenAPI with frontend types, hooks, forms, error states

This is the load-bearing criterion and the one the brief is right about: **a typecheck can never
satisfy it.** Three things were done.

### 1. `@ResponseSchema` was documentation. It is now an assertion.

`@ResponseSchema(schema)` existed, reached `build-openapi-document`, and **was compared against
nothing**. A schema could be wrong the day it was written and no test, gate or typecheck would say
so — coverage that reads as coverage and proves nothing.

**New:** `src/common/openapi/response-contract.interceptor.ts`, registered last in
`src/app.module.ts` (so it is innermost on the response path). It `safeParse`s the value the handler
returned against the declared schema and:

- under `NODE_ENV=test` — **throws** `ResponseContractViolation`, so every spec, e2e and seeded run
  that touches a contracted route fails loudly on drift. That is where both shipped defects would
  have been caught.
- in development and production — logs at error and passes the payload through unchanged. A contract
  bug is a bug in the *contract* as often as in the service, and 500-ing a live user over a schema
  typo trades a wrong field for a dead screen. The frontend's own `parseApiResponse`
  (`frontend/lib/api-envelope.ts:153`) already fails closed at the point of consumption, so the
  strict half lives where the reader is.
- skips `StreamableFile` / `Readable` / `Buffer` / anything with `.pipe` / `undefined` — draining a
  stream to inspect it would defeat C090.
- reports **paths and Zod issue codes only, never the value** — a response body is exactly where a
  token lives (`check:log-secrets` exit 0).
- tolerates the `{ success, data }` envelope in either direction, so the check does not depend on
  global interceptor ordering.

Proof: `src/common/openapi/__tests__/response-contract.spec.ts` — **24 tests, exit 0**. The drift
cases are the two that actually shipped, transposed onto a contract: a field the service MOVED
(`membership.user` vs `user`) and a field it STOPPED SENDING. An ADDED field passes, matching the
frontend's stated policy.

### 2. The published document was wrong about the body it described

`ResponseTransformInterceptor` (`src/main.ts:121`) wraps every handler return without a `success`
key as `{ success: true, data }`. `applyResponseSchema` published the **un-enveloped** shape — so
the single response contract this API published, `GET /calendar/admin/settings`, documented
`{ sources }` while the wire carried `{ success: true, data: { sources } }`. A consumer generating a
client from it would read `sources` off the envelope and find `undefined`.

`envelopeResponseSchema` (`src/common/openapi/build-openapi-document.ts`) now wraps, unless the
schema itself declares `success` (the cron controllers return their own envelope and the transform
passes those through). This matters because **102 operations are classified `published` with real
external consumers** in `contracts/api-contract-registry.json`.

`wireDate()` (`src/common/openapi/wire-types.ts`) resolves the two-readers problem: the interceptor
sees a `Date` (pre-`JSON.stringify`), the document must publish `string/date-time`. `z.date()` alone
emits `{}` under `z.toJSONSchema` — a property with no declared type, which satisfies every consumer
vacuously. `.meta()` answers both, and the spec pins both halves against zod 4.4.3 so an upgrade
that regressed either fails rather than silently emitting `{}` again.

### 3. Two live frontend defects found by doing the reconciliation

Both are the exact defect class the brief names — hand-written client type, optional field, both
repos typecheck clean, feature silently unreachable.

**(a) The "Cancel occurrence" button and the series-scope prompt never render. FIXED (backend).**

`hooks/api/calendar.ts:201` reads `/calendar/events` through
`apiClient.get<CalendarEventsResponse>(...)`, a cast. `CalendarListItem`
(`hooks/api/calendar.ts:105-121`) declares `rrule?: string | null` and
`isRecurring?: boolean | null`, and two features read them:

- `features/calendar/event-detail-sheet.tsx:147` — `{event?.isRecurring ? <Cancel occurrence> : null}`
- `features/calendar/use-event-create-dialog.ts:225` — `if (isEdit && event?.rrule) seriesScope.open…`

The backend emitted **neither**. `CalendarNativeEventSource.load` computes
`const isRecurring = event.rrule !== null` one line above the projection and discarded it, and
`projectionToItem` (`calendar-events-aggregate.service.ts`) had no case for `rrule`. Both fields were
permanently `undefined`; both features were permanently unreachable.

Fixed additively (no field removed, so a backward-compatible deploy):
`src/modules/calendar/calendar-native-event-source.ts` now puts `rrule` and `isRecurring` in the
projection meta, `calendar-events-aggregate.service.ts` reads them out, and
`src/modules/calendar/calendar.types.ts` declares them.

Proof — `src/modules/calendar/calendar-events-wire-shape.spec.ts`, modelled on
`chat-huddle-wire-shape.spec.ts`: it drives the real `CalendarNativeEventSource` and the real
`CalendarEventsAggregateService` over a loader double answering in the row shape
`queryVisibleEvents` actually produces, and checks the result against the same schema the controller
declares. **Anti-vacuity verified**: with the two projection lines removed the suite goes
**exit 1, 3 failed / 3 passed**; restored, **exit 0, 6 passed**. Both runs recorded.

**(b) `POST /calendar/events` — the sync-failure warning can never fire. NOT FIXED (frontend territory).**

`features/calendar/use-event-create-dialog.ts:239`:
```ts
if (res.syncError) toast.warning(`Event created, but calendar sync failed: ${res.syncError}`);
```
`CalendarService.createEvent` (`src/modules/calendar/calendar.service.ts:209`) returns
`{ event, oooConflicts, eventConflicts, meetingUrl: null, syncQueued }` — there is no `syncError`,
and there cannot be: the provider sync is *queued* inside the same transaction, so at response time
nothing has failed yet. `MutateCalendarEventResponse` (`hooks/api/calendar.ts:74-80`) declares
`syncError?: string | null` and omits `syncQueued` and `eventConflicts` entirely.
**A calendar sync failure is invisible to the user.** The fix is the frontend's: read `syncQueued`
and surface failure from `GET /calendar/events/{eventId}/sync-status`, which now has a contract.

### The 24 contracted operations

```
GET    /calendar/admin/settings                (pre-existing)
GET    /calendar/events
GET    /calendar/external-events
GET    /calendar/sources
PUT    /calendar/sources/{sourceKey}
GET    /calendar/events/{eventId}/rsvp
POST   /calendar/events/{eventId}/rsvp
GET    /calendar/events/{eventId}/sync-status
POST   /calendar/events/{eventId}/sync-retry
DELETE /calendar/events/{eventId}
GET    /cron/storage-sweep                     POST /cron/storage-sweep
POST   /storage/upload
POST   /storage/multipart/initiate | complete | abort
GET    /storage/quarantine                     GET /storage/quarantine/{quarantineId}
POST   /storage/quarantine/{quarantineId}/release | reject
DELETE /storage/quarantine/{quarantineId}
POST   /onboarding/documents
POST   /hr/recruitment/candidates/{candidateId}/vault/{documentId}/url
GET    /public/kb/{slug}/attachments
```

New schema files: `src/modules/calendar/dto/calendar-response.schemas.ts`,
`src/modules/storage/dto/storage-response.schemas.ts`. Every one names the projection or Drizzle
column list it was derived from. **None was written from a frontend type** — a contract copied from
the consumer encodes the drift instead of catching it.

`syncStatusResponseSchema` and `syncRetryResponseSchema` already existed in
`src/modules/calendar/dto/sync-status.schemas.ts`, already `z.infer`-linked to the service's return
type, and were attached to **no handler**. Free.

### Why not the other 3,618

`cron` is 130 of my 156 operations and I deliberately did **not** blanket-contract it. Its responses
are heterogeneous — `{success,message}`, `{success,skipped,message}`, `{success:false}`,
`{ok:true}`, `{outcomes:[…]}` — so the only schema that would cover all 130 is
`z.object({success: z.boolean()})`, which proves nothing and would move the coverage number from 24
to 154 without adding one real assertion. That is exactly the coverage theatre this release is
fighting. `/cron/storage-sweep` is contracted properly instead, with every counter declared as an
integer, because the failure it guards (a sweep that stops assigning `result.organizations` and
still answers 200) is real and I understand that route.

**Partial.** Residual: **3,618 operations (99.34 %) still publish no response schema**, and the
frontend seam is **84 / 2,665 call sites parsed (3.2 %)** — 71 when I started, 13 added concurrently
by other agents, none by me (`hooks/api/**` is not my territory).

## C085 — route budgets, and the two red gates

### `GET /calendar/events` — measuredBufferBlocks 7072 > 2000 → **STALE MEASUREMENT, not a regression**

The recorded 7,063/7,072 was produced by the **single-statement** candidate page that no longer
exists: both range branches under one `OR`, three left joins, an 18-column projection and no lower
bound on `start_date` for the recurring arm. `CalendarEventSourceLoader` was subsequently split into
four statements per page and `read-cost-budgets.mjs` was rewritten to measure the dominant one — but
the number in `contracts/route-budgets.json` was never re-taken, so the gate was failing on SQL that
no longer runs. `check:benchmark-manifest` says so itself: *"the measured SQL catalog(s) … changed
on disk since capture"*.

Re-measured by me, `run-read-cost-budgets.mjs`, **200 samples**, on `scratch_perf_seed` (at head) as
**`streamline_app`** (`rolbypassrls=f`) with `app.organization_id` set, on all three seeded tenants:

| tenant | share | rows in table | warm blocks | first-read blocks | result rows | scanned | ceiling |
|---|---|---|---|---|---|---|---|
| `…0001` | 89.93 % | 60,025 | **697** | 706 | 500 | 517 | 2,000 |
| `…0003` | 9.00 % | 6,025 | **700** | 709 | 500 | 549 | 2,000 |
| `…0002` | 0.90 % | 625 | **46** | 55 | 84 | 85 | 2,000 |

All three PASS. **No ceiling was raised.** `contracts/route-budgets.json` now records 709 (the worst
first read, from the 9.00 % tenant — recorded because it is worse than the reference), with the
superseded figures, the command, the database, the role and the reason preserved in a `supersedes`
block. `--samples=25` and `--samples=200` agreed to the block.

### `GET /cron/storage-sweep` — measuredDownstreamCalls 8 > 0 → **WRONG DECLARATION (wrong unit), not a regression**

Traced end to end: `CronStorageSweepService.sweep` runs `forEachOrg`
(`src/common/tenant/for-each-org.ts:149`), which enumerates every organisation with
`deleted_at IS NULL AND status = 'ACTIVE'` (lines 157-161) and calls
`StorageMultipartService.sweepAbandonedUploads` once per organisation, which issues exactly one
`ListMultipartUploadsCommand` per organisation with a bucket
(`src/modules/storage/storage-multipart.service.ts:148-166`).

Measured on the capture database:
```
psql -d scratch_t23_http -tAc "select count(*) from organizations
                               where deleted_at is null and status='ACTIVE';"  →  8
```
**8 outbound calls = 8 organisations = exactly 1 per organisation.** `0` was never the wrong
magnitude; it is the wrong **unit**. `check-route-budgets.mjs:192` already implements the per-organisation
composition (`maxDownstreamCalls + maxDownstreamCallsPerOrg × measuredOrgsSwept`) and it **fails
closed** — the allowance applies only when a positive integer `measuredOrgsSwept` is recorded. The
contract now declares `maxDownstreamCallsPerOrg: 1` and `measuredOrgsSwept: 8`; the fixed component
stays **0**, so the invariant it encodes for the other eleven worker batches ("a worker batch does not
leave the process") is untouched, and the measurement sits **at** the boundary — a second outbound
call per organisation still fails.

### Results

| gate | before | after |
|---|---|---|
| `pnpm check:route-budgets` | **exit 1** — 2 measured values above ceiling | **exit 0** |
| `pnpm check:route-budgets-http` | **exit 1** | **exit 0** |
| `pnpm check:route-budgets:self-test` | exit 0 | exit 0 |
| `pnpm check:route-budgets-http:self-test` | exit 0 | exit 0 |
| `pnpm check:benchmark-manifest` | exit 1 | **exit 1 (unchanged)** |

`check:route-budgets-http`'s exit 1 was **not** the storage-sweep breach (that line is printed but
does not affect its exit code). It was `changed === true`: ten cron retention-sweep budgets had been
added to `contracts/route-budgets.json` after the capture and carried `httpMeasurement: null` where
the merge writes `{status:"unmeasured", reason:"the capture holds no slot for this route"}`. Fixed by
running the sanctioned tool, `node test/perf/merge-http-route-budgets.mjs --write` — diffed before
and after: **only those ten `httpMeasurement` blocks plus `budgetsDeclared` 82→92 and the ceiling
digest changed. No measured number was invented.**

`check:benchmark-manifest` remains red for three reasons, none of which I can close from my
territory: (i) `requestLevel.breaches` is a **frozen capture artifact** written at capture time
against the then-declared ceiling of 0 — it will clear on the next capture, and hand-editing a
capture record would be falsifying evidence; (ii) statement-ceiling coverage is 154/280 (55.0 %)
against its threshold; (iii) the calendar p95 below.

### Still open: `GET /calendar/events@reference` p95 915.944 ms > 800 ms (PRD §12.1)

**Real, and not cleared by the buffer re-measurement** — a different instrument. The read path is
now cheap (697 blocks); the cost is elsewhere. The capture records **`requestDbCalls` 196 on the
reference tenant vs 40 on the minority one**, and the mechanism is visible in the source:

`CalendarEventSourceLoader.queryVisibleEvents` drains up to `CALENDAR_EVENTS_CAP = 2000` **events**
in pages of 500, at **four statements per page**. `CalendarNativeEventSource.load` then expands them
and stops at 2,000 **projections** — and `CalendarSourceRegistry.loadAll` then keeps
`CALENDAR_PER_SOURCE_CAP = 400` of them (`calendar-source.registry.ts:19,101-105`). So the loader
pays ~16-20 statements to produce 2,000 items of which **400 survive**.

Proposed fix, **not applied**: bound the drain at the per-source cap the registry actually keeps
(401, so the registry still sees the `> 400` overflow that sets `truncated`). It is behaviour-preserving
in the ordered prefix — the registry slices the same order the source produces — with the one caveat
the loader's own docblock already records for its current bound (events whose every occurrence is
cancelled or outside the window). I did not land it because I cannot re-measure p95 without running
the seeded HTTP harness (`test/perf/route-budget-http.seeded-e2e-spec.ts`, other territory,
`scratch_t23_http`), and a perf change I cannot measure is a change that can land inert.
**Severity: medium — one route, 916 ms vs an 800 ms ceiling, reference tenant only (minority p95 is
59 ms).**

## C086 / C087 — one intent per route; Home bounded and parallel

Not my modules, verified read-only and reported here because the criteria are on my ticket.

- **C087 is satisfied and proven behaviourally.** `settleSection`
  (`src/modules/dashboard/dashboard-section-settle.ts:37-71`) races each section against
  `HOME_SECTION_DEADLINE_MS = 2500` and always resolves — a rejection or a deadline degrades that
  section to a fallback and records it. `dashboard-home-fanout.spec.ts` proves concurrency with a
  start-barrier that deadlocks a sequential implementation, proves boundedness by counting started
  sections as module count varies, and proves independence by hanging one source forever and
  requiring an answer. Row volume capped by `dashboard-read-limits.ts`.
- **C086** — `check:bounded-contracts` exit 0 (10 CRM/inventory violations declared out of scope);
  `check:route-duplicates` exit 0. The calendar aggregate is the correct shape for this criterion:
  five parallel sources, `Promise.allSettled`, per-source cap, failures reported by key rather than
  failing the read.

**Partial** — C087 closed on evidence, C086 not independently proven across 3,642 operations.

## C088 — explicit DTO projections

Two real over-projections found in my territory. Both are named, one is contracted as-is rather
than silently narrowed:

1. **`POST /calendar/events` and `PUT /calendar/events/{eventId}` return the whole row.**
   `calendar.service.ts:148` uses a bare `.returning()`, so the response carries every column of
   `calendar_events` — including `visibility`, `agenda`, `postMeetingNotes`, `linkedDealId`,
   `linkedLeadId`, `recurrenceEnd`, `reminder15MinSent`, `integrationConnectionId`,
   `externalEventId`, `localVersion`. Ten internal columns to the browser on every create and
   update. The client's `CalendarEvent` (`hooks/api/calendar.ts:44-66`) declares **none** of them and
   instead declares four fields that do not exist (`createdBy`, `attendeeIds`, `isRecurring`,
   `recurringRule`) and one relation that is never selected (`creator`).
   **Not fixed**: narrowing it is a wire change on a route the client reads, and the client's type is
   wrong in the other direction too — it needs the frontend and backend changed together.
   **Severity: medium (over-exposure of internal columns, no secret).**
2. **`POST /calendar/events/{eventId}/rsvp`** returns the whole `event_attendees` row.
   `calendarRsvpResponseSchema` records it **as it is**, with a comment saying so, rather than
   documenting the narrow shape it ought to have — a contract that describes an intention is a
   contract that fails on the first real response.

`check:query-projections` exit 0, `check:relation-hydration` exit 0, `check:relation-keys` exit 0
(111 relation keys, all known to the frontend or triaged).

**Partial.**

## C089 — Brotli/gzip with minimum-size and already-compressed exclusions

**Before:** `src/main.ts:97` was `app.use(compression())` — **zero options**. Every property this
criterion names was an undeclared default of `compression@1.8.1`: the 1 KB threshold at `index.js:73`,
the exclusions from the `compressible` npm database, Brotli preference from
`PREFERRED_ENCODING = ['br','gzip']`, quality 4 at `index.js:64-68`. `pnpm check:compression`
(exit 0, before and after) asserts only that the literal string `compression()` appears in `main.ts`
— it inspects no threshold, no filter and no exclusion, so all four could vanish in a minor upgrade
with the gate green.

**After:** `src/common/http/compression.config.ts` declares them, and `main.ts:100` is
`app.use(compression(httpCompressionOptions()))`. Two things that were **not** in force are now:

1. **`application/pdf` is in the `compressible` database, so every PDF this API returns was being
   gzipped** — payslips (`payslip-download.service.ts:200`), offer letters, Form 16, quote documents.
   A PDF's object streams are already Flate-compressed. Now excluded explicitly, along with
   `image/*`, `video/*`, `audio/*`, archives and web fonts — with `image/svg+xml` deliberately kept
   compressible.
2. **BREACH.** Compression + a secret in the body + attacker-influenced text + a cross-origin size
   oracle. This deployment has three of the four: `app.enableCors({ credentials: true })`
   (`main.ts:108-115`) and three routes returning a token in a compressible JSON body —
   `POST /notifications/events/token` (`notifications.controller.ts:70-79`),
   `auth.controller.ts:340-341`, `api-tokens.service.ts:126` (plaintext API key).
   `NO_COMPRESSION_HEADER` (`x-no-compression`) is the opt-out, checked **first** so a handler can
   never be overruled by a content type; `Cache-Control: no-transform` also works. **This supplies
   the mechanism, not the adoption** — the three routes above are in `notifications`, `auth` and
   `api-tokens`, none of which is my territory. **Routed to their owners. Severity: medium.**

A landmine avoided and pinned: `zlib.constants.BROTLI_PARAM_QUALITY` is **1**, not 11. 11 is the
maximum quality *value* and reads like the parameter id; using it as the key sets `BROTLI_PARAM_MODE`
and leaves quality at the default with no error. The constant is imported, and the spec asserts
`zlibConstants.BROTLI_PARAM_QUALITY === 1`.

Proof: `src/common/http/__tests__/compression.config.spec.ts` — **25 tests, exit 0**, driving the
filter with header pairs.

**Partial** — mechanism landed and tested; three secret-returning routes have not adopted the opt-out.

## C090 — stream or return a durable job; never buffer a growing payload

Audited, not changed (almost all of it is other territories). Measured:

- **Streaming, correctly**: contacts CSV (`contacts.controller.ts:98-110`, `res.write` + drain
  backpressure + `res.destroyed` check, keyset-paged, unbounded rows but never buffered),
  audit-log CSV (capped 10,000), CRM export, object/file download (`storage.controller.ts:435`),
  GDPR export, HR employee export (spills to `tmpdir()` then `createReadStream` — the best pattern
  here), notifications SSE.
- **Durable async job**: five job tables. **Three of the five workers still buffer the whole file**
  before upload — `expense-export-worker.service.ts:38` (`lines.join("\n")`, cap 50,000),
  `payroll-export-worker.service.ts:56,74,84`, `finance-report-export-worker.service.ts:80-82`.
- **Unbounded buffering — the two worst, no `LIMIT` at all**:
  `src/modules/clients/clients.service.ts:265-300` (`exportCsv`, full `SELECT` with no `.limit()`,
  whole CSV into one string, served at `clients.controller.ts:96-103`) and
  `src/modules/quotes/quotes-lifecycle.service.ts:238-275`. **Severity: high — an OOM on a large
  tenant.** Neither is my territory.
- **AI**: streams on exactly two controllers (`kb-rag`, `chat-assistant`) plus the two KB routes;
  every other AI controller returns a buffered JSON `invoke`.
- **In my territory**: `calendar-export.service.ts` buffers but is capped at
  `EXPORT_ROW_CAP = 500` — acceptable; `storage.controller.ts:435` pipes. No change needed.

**Partial** — reported, not closed. Two high-severity unbounded buffers routed.

## C091 — propagate cancellation and deadlines

**Fixed one real gap.** `TenantContextInterceptor` — the interceptor that arms the abort signal for
every tenant-scoped request — called `createStreamAbortSignal(req, res, null)`. So of the two arms
that can abort a request, only `client_disconnected` was reachable outside `src/modules/ai`:
`deadline_exceeded` existed in the type, in the timer branch and in the reason union, and **nothing
could produce it**. A request hung on a slow upstream ran until something else gave up.

It now passes `admission.maxExecutionMs` — the number the admission scheduler already uses as the
per-request execution ceiling and already divides by for queue weighting
(`admission.service.ts:80`), so the deadline the scheduler assumes and the deadline the request
enforces are the same number instead of one assumption and one absence. Default 30,000 ms
(`statementTimeoutMs`), overridable with `ADMISSION_MAX_EXECUTION_MS`.

Proof: `src/common/tenant/__tests__/tenant-context.deadline.spec.ts` (new) + the existing
`tenant-context.abort.spec.ts`, `stream-abort.spec.ts` and the admission suite —
**218 tests, exit 0**.

**What this deliberately does not do**, and why, recorded in the code: aborting the signal does not
itself cancel a running query or an in-flight provider call. Making `callProvider`
(`src/common/outbound/call-provider.ts`) read the ambient signal is the obvious next step and is
**wrong as a default** — that helper carries side-effecting calls including a payment capture, and
abandoning one mid-flight on a client disconnect turns a completed external effect into an
unrecorded one. It needs a per-descriptor `cancelOnDisconnect` opt-in for read-only calls.

Residual, measured:
- The request signal reaches the **DB** layer nowhere — `with-tenant.ts` takes no signal. Cancellation
  of a running query is entirely `statement_timeout` (30 s / 60 s idle / 5 s lock,
  `pool.config.ts:121-123`, refused as `0` in production).
- `src/common/http/outbound-request.ts:42-44` composes a caller signal correctly and has **2 call
  sites, neither of which passes one**. `call-provider.ts` has no `signal` parameter at all.
- **Backpressure is solid**: admission (200/400/50 per org), DB pool lane admission with queue shed,
  AI per-org cap of 20. No generic fanout limiter exists (`p-limit` et al. are not dependencies).

**Partial.**

## C092 — idempotency and optimistic concurrency, stable 409/412

Measured from `openapi.json` and the source:

| | count | % of mutating |
|---|---|---|
| Mutating operations (POST/PUT/PATCH/DELETE) | 2,134 | 100 % |
| `@Idempotent` (`x-idempotent: true`) | **245** | **11.5 %** |
| Bespoke inline `Idempotency-Key` header | 29 | 1.4 % |
| **Any replay protection** | **263** | **12.3 %** |

**~1,871 of 2,134 mutating operations (87.7 %) carry no replay protection of any kind.**
`pnpm check:idempotent-commands` exits 0 — but its "in scope" set is a keyword regex
(`check-idempotent-commands.mjs:21,24`) and **all 11 in-scope handlers are on the exclusion
allowlist**, so it passed with zero handlers actually enforced. It is a regression tripwire on a
keyword list, not coverage.

The fence itself is good: `command_fences` with a unique `(org, audience, key)` claim,
`onConflictDoNothing`, 60 s lease, 24 h TTL; 400 on a missing key, **422** on a hash mismatch,
**409** on an in-flight duplicate, replay of the stored status and body, fail-closed on store error.

**Optimistic concurrency: it does not exist.** Searched `src/**`:
- `If-Match` / `ifMatch` — **zero hits**.
- `ETag` — one hit, an S3 CORS `ExposeHeaders` list. No HTTP ETag is ever emitted or read.
- `412` / `PreconditionFailedException` — **zero real hits**. Nest's exception is never imported.

**Nothing in this API returns 412.** There is a version mechanism, but it is body-carried and covers
**3 of 2,134 mutating operations (0.14 %)** with a client-supplied `expectedVersion` (two directory
engagement routes and `POST /workflows/{id}/publish`, where it is *optional* and silently skipped
when omitted), plus ~6 services doing server-derived CAS. `row_version` columns exist on ~15 tables
and only ~6 services read them.

**Cross-territory defect, high severity: 14 dead conflict handlers.** Drizzle wraps driver errors, so
`err.code === "23505"` is `undefined` — SQLSTATE lives on `.cause`, which
`src/common/db/postgres-error.ts:49-112` walks correctly and 192 call sites use correctly. These 14
do not, and **return 500 on a real unique violation instead of 409**:
`crm/pricebooks/crm-pricebooks.service.ts:64,96,165,325,355`;
`crm/automation-studio/crm-sequences.service.ts:38,62`; and three **local `isUniqueViolation`
helpers that shadow the correct import name** so the call sites read as compliant —
`inventory/products/inv-product-catalog.service.ts:28-34` (used :65,:148,:175),
`inventory/products/inv-product-crud.service.ts:35-41` (used :266,:267),
`inventory/channels/channels.service.ts:21-27` (used :77,:111).
Worst: `inv-product-crud.service.ts:266` is the SKU auto-allocation retry loop —
`if (!providedSku && isUniqueViolation(err)) continue;` is always false, so a genuine SKU race never
retries, the `ConflictException` at :267 is never reached and the fallback at :273 is unreachable.
**No gate exists for this pattern.** Not my territory; routed.

**Open.**

## C093 — no serial downstream calls when independent; cap fanout; batch adapters

- **No general-purpose concurrency limiter exists in the repo.** No `p-limit`, `p-map`, `p-queue`,
  `bottleneck`, `semaphore` dependency. The only limiter is `AiConcurrencyLimiter`, which is an
  admission gate (rejects at 20 in-flight per org, fails open) and cannot bound a `map`.
- **41 serial `for … await <network call>` loops.** Worst:
  `inventory/webhooks/webhook-emitter.service.ts:36` — per-subscription `fetch` with a 10 s abort
  timeout, over a subscriptions query at :17-33 with **no `.limit()`**. N subscribers ⇒ up to
  N × 10 s serial in the emit path. **Severity: high**, not my territory.
- **`storage-multipart.service.ts:168` is mine**: serial `AbortMultipartUploadCommand` inside the
  pagination loop, uncapped in `list.Uploads` × pages. It is a background sweep, so serial is
  defensible as backpressure, and it is now bounded by a declared budget
  (`maxDownstreamCallsPerOrg: 1` fails as soon as it makes a second call per organisation on the
  seed). Left as is, named here.
- **Batch adapters: none used.** `email.provider.ts:135` uses `resend.emails.send` (one message per
  call) exclusively; Resend's `emails.batch.send` (100/call) is referenced nowhere, while
  `email.service.ts:152` loops one HTTP send per recipient over an uncapped `recipientEmails[]`
  re-attaching the same XLSX each time. Clearest "the provider has a batch adapter and we don't use
  it" gap in the repo.

**Open** — audited, one item in my territory judged acceptable and now budget-bounded.

## C094 — frontend loaders and TanStack consumers reuse/prefetch the canonical request

Audited read-only (`app/**`, `features/**`, `hooks/**` are not my territory).

**Six hydrated routes, and all six query keys MATCH** — no dead-weight prefetch:
`/me/access` (root authenticated layout), `/settings/roles`, `/directory/workers`, `/hr/documents`,
`/hr/assets`, `/payroll/runs`. Verified through `scopedQueryKeyHashFn`
(`lib/query-scope.ts:38`, `JSON.stringify([scope, key])` — property order matters and both sides
build the object in the same order), and the scope strings agree because
`createServerQueryClient` and `createAppQueryClient` both import from the neutral
`lib/query-scope.ts`. `check:query-scope` exit 0 (5,353 files), `check:query-signal` exit 0
(1,056 `queryFn` blocks).

**Two genuine duplicate fetches — the finding:**
`app/(authenticated)/build/[projectId]/layout.tsx:36` and
`app/(authenticated)/build/workspaces/[pmWorkspaceId]/[projectId]/layout.tsx:24` each
`await serverGet<ProjectWithDetails>(\`/build/${id}\`)` with **no contract, no `prefetchQuery`, no
`dehydrate`, no `HydrationBoundary`** — the payload is used for redirect/404/403 branching and then
thrown away. **27 files** then call `useProject(id)` (`hooks/api/build/projects.ts:188-190`), which
re-fetches the identical route on mount. Every build detail navigation pays `GET /build/:id` twice.
It is invisible to every gate: `check-query-scope.mjs` only polices `lib/prefetch/`, so a `serverGet`
in a layout that never dehydrates is unguarded. **Severity: medium.** Not my territory.

**Secondary:** `lib/prefetch/hr.ts:32,42` ship **uncontracted** SSR halves against hand-written local
interfaces. Their client halves are also uncontracted, so they are symmetric today — but hydrated
SSR data renders before the client `queryFn` ever runs, so contracting either HR hook later would
silently bypass the contract on first paint. That is the exact hazard
`lib/prefetch/prefetch-contract.test.ts` was written to catch for payroll; payroll, roles and
workers got it right, HR did not.

**Open** — audited and located, not fixed (frontend territory).

---

## Gate ledger

| gate | repo | exit | note |
|---|---|---|---|
| `typecheck` | backend | **0**, then **2** | Exit 0 three times across my change set. A final run at 16:55 exits 2 on **one** error — `src/db/schema/inventory/warehouses.ts(5,20): TS2724 '"../common/organization"' has no exported member named 'organizationMembers'` — from another agent's uncommitted edit to that file (mtime 16:52, +6/−1, `src/db/schema/**` is not my territory). `tsc --noEmit` reports every error, and that is the **only** one, so every file I changed typechecks clean. |
| `check:spec-typecheck` | backend | 2 | same single root cause as above |
| `check:route-budgets` | backend | **0** | was 1 |
| `check:route-budgets-http` | backend | **0** | was 1 |
| `check:route-budgets:self-test` | backend | 0 | |
| `check:route-budgets-http:self-test` | backend | 0 | |
| `check:openapi-coverage` | backend | 0 | its response-schema line is vacuous — see §headline |
| `check:contract-registry` | backend | 0 | |
| `check:contract-breaking-change` | backend | 0 | |
| `check:bounded-contracts` | backend | 0 | |
| `check:operation-ids` / `openapi-path-params` / `route-duplicates` / `multipart-contracts` | backend | 0 | |
| `check:relation-keys` | backend | 0 | 111 keys |
| `check:compression` + self-test | backend | 0 | presence-only; the real assertions are the new spec |
| `check:query-projections` / `relation-hydration` / `n1-growing-loops` / `unbounded-reads` | backend | 0 | |
| `check:import-direction` / `module-di` / `over-300` / `log-secrets` / `fire-and-forget` / `vacuous-assertions` / `kebab-case` / `module-registration` / `bare-throw` / `gate-wiring` | backend | 0 | |
| **`check:envelope-consistency`** | backend | **1** | **turned red by me — see below** |
| `check:benchmark-manifest` | backend | 1 | unchanged; blockers outside my reach |
| `check:type-assertions` | backend | 1 | 3 offenders, **none mine** (cache ×2 + a ticket-30 script) |
| `check:file-sizes` | backend | 1 | 2 offenders, **neither mine** (an organization service line count, a ticket-30 script at 596 lines) |
| jest `src/common/openapi` + calendar + storage + cron | backend | **0** | 105 suites, **1,002 tests** |
| jest `tenant-context\|stream-abort\|admission` | backend | **0** | **218 tests** |
| jest `compression.config` | backend | **0** | **25 tests** |
| jest (final re-run of all four new suites) | backend | **0** | **61 tests**, 4 suites |
| jest `src/common/**` | backend | 1 | 4 suites / 23 tests failing, **none in a file I touched** — `pagination/list-query.schema` + `pagination/keyset` (a `.strict()` change in `modules/build` schemas), `audit/hrms-critical-audit-invariants` (asserts on `modules/hr/time/work-logs.service.ts`), `observability/trace-boundary-coverage`. `git status` shows 57 files uncommitted across ~14 agents. |
| `check:contract-vendor` | frontend | **0** | re-vendored `contracts/openapi.json`; sha256 `9cba20e2ca1d90f5…` |
| `check:contract-drift` | frontend | 0 | 0 baselined drifts |
| `check:response-contracts` | frontend | 0 | 84/2,665 parsed (was 71; the 13 are other agents') |
| `check:permission-catalog` | frontend | 0 | |
| `check:query-scope` / `check:query-signal` | frontend | 0 | |

### The gate I turned red, honestly

`check:envelope-consistency` went **exit 0 → exit 1** with 2 violations, and I am not hiding it:

```
GET /public/kb/{slug}/attachments — paginated endpoint 200 schema has no recognizable pagination signal
GET /storage/quarantine          — paginated endpoint 200 schema has no recognizable pagination signal
```

It was green because it had **nothing to read**. `findUnpaginatedCollections`
(`check-envelope-consistency.mjs:105-130`) skips any operation whose 2xx response has no `content`.
Measured: **336 paginated GET operations exist; before my change 0 of them carried a 2xx content
schema, so the check had zero subjects across the whole document.** It fired the moment two of them
got one.

- **`GET /storage/quarantine` is a gate blind spot, not a defect.** It returns a proper
  `CursorPage` (`{data, pagination:{limit,nextCursor,hasMore}}`). The gate reads only the
  **top-level** properties of the 200 schema, and the published body is now the real wire —
  `{success, data:{…}}` — so the signal sits one level down.
  **One-line fix, routed to ticket 30:** in `schemaHasPaginationSignal`
  (`check-envelope-consistency.mjs:75-84`), unwrap `properties.data` when `properties.success` is
  present before looking for the signal. Worth doing properly: it currently blinds the check for all
  336 paginated routes as they get contracted.
- **`GET /public/kb/{slug}/attachments` is a REAL defect.** It accepts `page` and `limit` and returns
  a **bare array** with no `total` and no `hasMore` — a caller cannot page it correctly. It is
  classified **`published`** in `contracts/api-contract-registry.json` with declared external
  consumers ("unauthenticated external users via share links, embedded widgets and emailed forms"),
  so fixing it is a **breaking change** that needs a version and a deprecation window, not a silent
  edit. It has **no frontend consumer** (grep of `hooks/ features/ app/ lib/`).
  **Product decision required. Severity: medium.**

I could have made both disappear by deleting the two `@ResponseSchema` decorators. Raising a ceiling
to turn a gate green is a defect; so is removing the contract that made a defect visible.

---

## Files changed

**Backend**
```
src/common/openapi/response-contract.interceptor.ts          (new)
src/common/openapi/wire-types.ts                             (new)
src/common/openapi/__tests__/response-contract.spec.ts       (new, 24 tests)
src/common/openapi/build-openapi-document.ts                 (envelopeResponseSchema)
src/common/http/compression.config.ts                        (new)
src/common/http/__tests__/compression.config.spec.ts         (new, 25 tests)
src/common/tenant/tenant-context.interceptor.ts              (request deadline)
src/common/tenant/__tests__/tenant-context.deadline.spec.ts  (new)
src/app.module.ts                                            (+2 lines: register the interceptor)
src/main.ts                                                  (+2 lines: compression options)
src/modules/calendar/dto/calendar-response.schemas.ts         (new)
src/modules/calendar/calendar.controller.ts                   (9 × @ResponseSchema)
src/modules/calendar/calendar.types.ts                        (rrule, isRecurring)
src/modules/calendar/calendar-events-aggregate.service.ts     (project them)
src/modules/calendar/calendar-native-event-source.ts          (emit them)
src/modules/calendar/calendar-events-wire-shape.spec.ts       (new)
src/modules/storage/dto/storage-response.schemas.ts           (new)
src/modules/storage/storage.controller.ts                     (1 × @ResponseSchema)
src/modules/storage/storage-multipart.controller.ts           (3 ×)
src/modules/storage/storage-quarantine.controller.ts          (5 ×)
src/modules/storage/storage-vault.controller.ts               (1 ×)
src/modules/storage/storage-onboarding.controller.ts          (1 ×)
src/modules/storage/storage-kb.controller.ts                  (1 ×)
src/modules/cron/cron-storage.controller.ts                   (2 ×)
contracts/route-budgets.json                                  (re-measurement + per-org unit + merge)
openapi.json                                                  (regenerated)
```
`src/app.module.ts` and `src/main.ts` are two-line additive wirings each, outside my named
territory but in nobody else's; flagged here for the sweep.

**Frontend**
```
contracts/openapi.json    (re-vendored from the backend; check:contract-vendor exit 0)
```

## Routed to the orchestrator

1. **`check:openapi-coverage` reports 100 % response-schema coverage of a property 0.66 % of the
   surface has.** One-disjunct fix at `src/scripts/check-openapi-coverage.mjs:194`. **Ticket 30.**
   This is the single highest-leverage change on this ticket and I could not make it.
2. **`check:envelope-consistency` needs to unwrap `{success,data}`** before looking for a pagination
   signal (`check-envelope-consistency.mjs:75-84`). 336 paginated routes depend on it. **Ticket 30.**
3. **`GET /public/kb/{slug}/attachments`** — published, externally consumed, paginated, returns a
   bare array. **Product decision** (version + deprecation window).
4. **14 dead `err.code === "23505"` conflict handlers** returning 500 instead of 409, three of them
   behind local helpers that shadow the correct import name. CRM + inventory territories.
   **High severity, no gate exists.**
5. **Three secret-returning routes must set `x-no-compression`**:
   `notifications.controller.ts:70-79`, `auth.controller.ts:340-341`, `api-tokens.service.ts:126`.
6. **`features/calendar/use-event-create-dialog.ts:239`** reads `res.syncError`, which the backend
   never sends — calendar sync failures are invisible. Frontend territory.
7. **Two duplicate `GET /build/:id` fetches** at `app/(authenticated)/build/[projectId]/layout.tsx:36`
   and the workspaces twin; 27 `useProject` consumers refetch on mount.
8. **Two unbounded export buffers** with no `LIMIT`: `clients.service.ts:265-300`,
   `quotes-lifecycle.service.ts:238-275`. **High severity (OOM).**
9. **`GET /calendar/events` p95 916 ms vs an 800 ms PRD ceiling** — cause identified (the loader
   drains 2,000 events to feed a 400-item cap), fix proposed, **not landed** because re-measuring
   needs the seeded HTTP harness in another territory.
