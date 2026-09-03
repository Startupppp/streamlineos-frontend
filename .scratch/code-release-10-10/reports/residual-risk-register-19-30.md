# Residual risk register, part 2 — tickets 19, 22, 23, 26, 28, 29 and 30

**Companion to `reports/residual-risk-register.md`, which covers 08, 11, 15, 20, 21, 33, 35, 36 and 38.**
Same contract, same two dispositions, same reason for existing: ticket 41 box 7 requires that "accepted
lower-severity residual risks carry an owner and a deadline", and until now the eighteen open boxes on
these seven tickets carried neither.

- **ASSIGNABLE** — genuinely closable work with the file, the shape of the change and an owner. Not a risk.
- **ACCEPTED RESIDUAL** — a verified blocker, with a blocker class, a named owner and a date.

**Every blocker below was verified against source, a live gate run or a committed artifact on 2026-09-03.**
Where the ticket's stated blocker turned out to be wrong, the correction is recorded here and in the ticket.
**Nineteen items previously filed as blocked, or buried inside a PARTIAL paragraph, are not blocked at all.**
Section 1 states the four that matter most.

**No source file in either repository was edited by this pass.** Only ticket files under `issues/`, this
report and an appended section of `reports/residual-risk-register.md`.

**Deadlines are proposed**, as in part 1. Owner names are role-based because no roster exists in either
repository; the release owner maps each role to a person.

---

## 1. LOUD — four items that are closable work, not risk

### 1.1 The calendar perf fix is claimed closed in THREE tickets and no committed artifact carries it

This is the single highest-value item in these seven tickets, because it is the only thing standing
between two release gates and green.

Tickets 22, 23 and 29 all record `GET /calendar/events` as fixed: 915.944 → **305.746 ms** p95, 196 → **65**
request statements, 7,063 → **706** buffer blocks. Measured live at head today:

| command | exit | what it says |
|---|---:|---|
| `pnpm check:route-budgets` (backend) | **1** | `GET /calendar/events — measuredBufferBlocks=7072 exceeds maxBufferBlocks=2000` |
| `pnpm check:benchmark-manifest` (backend) | **1** | `GET /calendar/events@reference: request p95 915.944 ms > 800 ms PRD §12.1 ceiling` |

`contracts/route-budgets.json` still carries `measuredLatencyP95Ms: 915.944` and
`measuredBufferBlocks: 7072` for that route. **Both gates are red on numbers the product no longer
produces.** `reports/23b-ci-wiring-and-calendar-recheck.md` §4 is honest about this and names the remedy
exactly: the replacement capture was **stopped at ~81 of 164 slots on a laptop at 5% battery**, and a half
capture must never be merged because the merger clears every route it did not reach. What is needed is one
uninterrupted full 164-slot capture plus `perf:merge-route-budgets --write`, and separately a re-run of the
read-cost writer (`run-read-cost-budgets.mjs` / `measure-route-budgets.mjs`) to clear the 7,072.

It is a **re-run, not an investigation**: no code changes, no decision, no new instrument. It is unowned.
Filed as **A-17**. Until it lands, three ticket boxes (22 box 2, 23 boxes 2 and 6, 29 box 1) are held open
by a stale number, and any reader running the gates concludes the calendar route is still broken.

### 1.2 `pnpm openapi:check` is NOT database-coupled, and the ticket's reason for deferring it is wrong

Ticket 19 box 3 records its remainder as *"Regeneration is a release-time step for the orchestrator… It
boots the app, and boot now runs `PermissionCatalogSyncService.onModuleInit`, which would write grants into
the shared Neon database."*

**That reason does not hold.** Backend CI has run this exact command since it was wired
(`.github/workflows/ci.yml:204-215`) against `DATABASE_URL: postgres://ci:ci@127.0.0.1:5432/ci` — a DSN
pointing at nothing. Reproduced locally today with the same six placeholder variables:

```
NODE_ENV=test DATABASE_URL='postgres://ci:ci@127.0.0.1:5432/ci' … pnpm -s openapi:check   → exit 1
openapi.json is STALE. Run: pnpm openapi:generate
  … 50 differences listed, "and 5 more"  →  55 operations
```

No database was contacted; the app booted and logged `Shutdown drain complete — no requests in flight`.
So the gate is runnable by any agent, today, with no infrastructure and no risk to the shared Neon
instance.

What genuinely remains is **sequencing, not capability**: the 55 differences already span at least six
lanes (nine `/ai/**/stream` routes, `/crm/settings/custom-fields`, `/integrations/git/connections`,
`/ai/usage`, `/payroll/filings/export/jobs/{jobId}`, `/cron/gdpr-export-artifact-retention`,
`/storage/download`, `/storage/image`), which is exactly why it belongs at the release commit rather than
in any single agent's pass. That is a scheduled mechanical task with a named moment — **A-12**, not an
accepted residual.

Two things ride on the same change and would otherwise be missed:

- **`pnpm check:contract-vendor` is ALREADY exit 1 at head**, independently of the regenerate.
  `frontend/contracts/openapi.json` and `streamlineos-backend/openapi.json` agree on all 3,613 operations
  but **one**: `POST /gdpr/rectification/me`, whose request body is a `oneOf` in the backend artifact and a
  flat object in the vendored copy. One `cp`. Nobody has recorded it. (**A-12b**)
- **Ticket 19 box 6's sidebar one-liner** is coupled to the regenerate and the coupling is real:
  `integrations:git:view` appears **0 times in both** artifacts, so flipping
  `sidebar-nav-groups-work-management.ts:215` from `settings:manage` today would fail
  `check:route-access-contract` (measured exit 0 at head, 203 keys, 627 `x-permission` entries). The
  coupling dissolves the moment A-12 lands. (**A-13**)

### 1.3 A live user-visible chat regression, raised by ticket 23 and owned by nobody

Ticket 23's S13 fixed `GET /chat/channels` from 436,371 to 6,876 response bytes by replacing an
unqualified `with: { members }` with a **bounded preview of 8 members** plus the true count. It raised the
frontend consequence as a "FOLLOW-UP RAISED, NOT FIXED" line inside a PARTIAL paragraph, and there it
stayed.

Verified at head, all three halves:

- Backend `src/modules/chat/chat-channel-member-preview.ts:159-163` returns
  `{ ...channel, members, memberCount, membersTruncated }`.
- Frontend `types/chat.ts:103` already declares `memberCount: number`.
- Frontend `features/chat/use-message-panel-data.ts:326` still reads
  `const memberCount = channel?.members?.length ?? 0;`

So every channel header in the product now reports **at most 8 members**; the two seed channels holding 500
each read "8 members". The field it needs is on the wire and in the type. The fix is
`channel?.memberCount ?? channel?.members?.length ?? 0`. **A-22.**

(Recorded beside it, not fixed: that file and five others read `m.user?.id` on list members while the
payload nests it as `m.membership.user` — a pre-existing drift ticket 23 says it neither caused nor fixed.)

### 1.4 Ticket 28 box 6 is routed to a box that is already ticked

Box 6's remainder is explicitly assigned: *"**OWNER: ticket 30 (per-screen states) for (1) and (2); ticket
27 for (3).** Nothing in items (1)-(3) is in the data-layer territory."*

**Ticket 30's corresponding box is box 1 — "Loading, empty, error, offline and permission-denied states are
present on every authenticated surface" — and it is `[x]` CLOSED**, at 22/22 over 556 authenticated route
modules with 0 missing loading states, 0 missing read-error branches and 0 missing permission gates. Ticket
30's two remaining open boxes are keyboard/screen-reader semantics and browser journeys; neither will pick
this up.

So three items of real per-screen work are addressed to a closed box. Nobody is going to do them. The items
themselves are unblocked:

- **(1)** is a design choice plus three files. Verified literally at head: a non-test grep for `fetchStatus`
  across `app features components hooks lib` returns **zero** real occurrences (the only hits are a variable
  named `refetchStatus`). The three shared surfaces read the global `useOnlineStatus()` instead, which
  cannot say *this* read is paused. (**A-25**)
- **(2)** is bigger than the ticket says. Re-counted at head: **237 `useGatedQuery` call sites across 104
  files** under `hooks/**` (the ticket says 180/83), every one carrying an `access` gate on its result. A
  non-test grep for `access.denied` finds **8 reading surfaces and every one of them is CRM** — so the
  number of *in-scope* screens that consume the gate they were given is **zero**. (**A-26**)
- **(3)** filter-empty vs data-empty, per page. (**A-27**)

The register's ask is that the release owner re-routes these to a ticket whose box is still open, or
re-opens ticket 30 box 1 for the per-screen half.

### 1.5 Ticket 30 box 1 is ticked partly on a sentence that is false at head

**This landed while this pass was running**, which is why it is here rather than in §3.11. Ticket 30's box 1
was rewritten today to close the offline clause with:

> **Offline is closed on both halves.** `components/shared/loading-state.tsx` and `components/ui/data-table.tsx`
> — … — both read `fetchStatus === "paused"` …

Measured at head, twice, minutes apart: a non-test grep for `fetchStatus` across
`app features components hooks lib` returns **zero** occurrences — the only hits are a variable named
`refetchStatus` — and both named files read the **global browser signal** instead.
`components/shared/loading-state.tsx:6,121,131` and `components/ui/data-table.tsx:19,74,269` import and call
`useOnlineStatus()` (`navigator.onLine` plus the window online/offline events) and set `aria-busy={isOnline}`.
**Neither reads `fetchStatus === "paused"`.**

The *substance* may still hold — `useOnlineStatus()` does render an offline state and `PAUSED_LABEL` is real —
so this is recorded as a correction and **the box was not unticked**; that is the owner's call. What is not
arguable is that **ticket 28 box 6 and ticket 30 box 1 now assert opposite things in writing about the same two
files**, and ticket 28 already corrected this exact claim once. It is the second instance in this release of
the failure part 1 recorded at its §4.2: two agents reading two files reach opposite conclusions. **A-25 owns
the resolution** — decide which signal is canonical — and until it is decided, ticket 30 box 1's offline
evidence should not be cited.

---

## 2. The register

Blocker classes: **SCOPE** (CRM/inventory excluded) · **DECISION** (owner's to make) · **INFRA**
(credentials or infrastructure this effort does not hold) · **TOOL** (no instrument exists) ·
**SCALE** (bounded work too large for one release) · **ASSIGNABLE** (not a risk — closable work).

| id | ticket · box | disposition | blocker | owner | deadline |
|---|---|---|---|---|---|
| **A-12** | 19 · box 3 — `openapi:check`, 55 stale operations | **ASSIGNABLE** | — (sequencing only) | release orchestrator, at the release commit | **2026-09-08** |
| **A-12b** | 19 · box 3 — vendored contract, 1 operation adrift | **ASSIGNABLE** | — | same change as A-12 | 2026-09-08 |
| **A-13** | 19 · box 6 — sidebar nav key one-liner | **ASSIGNABLE** | — (rides on A-12) | same change as A-12 | 2026-09-08 |
| **A-14** | 22 · box 1 — 56 `maxDbCalls` defaults | **ASSIGNABLE** | — | per-module owners (4 KB routes unowned inside t29) | 2026-09-17 |
| **A-15** | 22 · box 2 — `measuredDbCalls` 2/82 | **ASSIGNABLE** | — | per-module owners, one `countDbCalls` each | 2026-09-17 |
| **A-16** | 22 · box 2 — `measuredBatchSize`/`measuredDurationMs` 0/12 | **ASSIGNABLE** | — (the number is already on the wire) | cron/worker owner + perf-harness owner | 2026-09-17 |
| **A-17** | 22 · box 2 · 23 · boxes 2, 6 · 29 · box 1 — **the stale calendar capture** | **ASSIGNABLE** | — | **perf-harness owner — highest value item here** | **2026-09-08** |
| **A-18** | 23 · box 2 — 3 routes answering HTTP 500 | **ASSIGNABLE** (triage) | — | build / chat / notifications owners | 2026-09-10 |
| **A-19** | 23 · box 2 — 4 routes answering HTTP 402 (seed plan limit) | **ASSIGNABLE** | — | seeding owner (2 of 4 are CRM, stay excluded) | 2026-09-17 |
| **A-20** | 23 · box 3 — 120 unreachable benchmark slots | **ASSIGNABLE** | — | seeding owner (`seed-perf-scratch.mjs`) | 2026-09-17 |
| **A-21** | 23 · box 4 — in-process-only single flight | **ASSIGNABLE** | — | cache owner | 2026-09-17 |
| **A-22** | 23 · box 6 — **chat member count shows 8** | **ASSIGNABLE** | — | frontend chat owner | **2026-09-08** |
| **A-23** | 23 · box 7 — per-org downstream measurement half | **ASSIGNABLE** | — | perf-harness owner | 2026-09-17 |
| **A-24** | 26 · box 6 — no ratchet on `measuredScriptBytes` | **ASSIGNABLE** | — | frontend perf owner | 2026-09-17 |
| **A-25** | 28 · box 6 — which offline signal is canonical | **ASSIGNABLE** | — | frontend shared-components owner | 2026-09-17 |
| **A-26** | 28 · box 6 — 237 gated reads, 0 in-scope readers | **ASSIGNABLE** | — | per-screen owners; **needs re-routing, see §1.4** | 2026-09-17 |
| **A-27** | 28 · box 6 — filter-empty vs data-empty | **ASSIGNABLE** | — | ticket 27 owner | 2026-09-17 |
| **A-28** | 29 · box 1 — **second calendar surface still renders** | **ASSIGNABLE** | — | HR / ticket 25 owner | **2026-09-10** |
| **A-29** | 30 · box 2 — no corpus-wide ARIA/live-region gate | **ASSIGNABLE** (unwritten gate) | — | frontend a11y owner | 2026-09-17 |
| **A-30** | 30 · box 5 — journeys assert no write | **ASSIGNABLE** | — | ticket 30 owner (own territory) | 2026-09-17 |
| **R-12** | 19 · box 6 — automations rung | ACCEPTED RESIDUAL | DECISION | release owner (product) | 2026-09-10 |
| **R-13** | 22 · box 1 — critical set asserted, not derived | ACCEPTED RESIDUAL | **TOOL** — no request-volume telemetry exists | release owner | 2027-03-03 review |
| **R-14** | 23 · box 2 — 6 provider-backed mail routes | ACCEPTED RESIDUAL | INFRA (a connected mail account) | infrastructure operator | 2026-09-30 |
| **R-15** | 23 · box 4 — cache-hit p95 unmeasured | ACCEPTED RESIDUAL | INFRA (see §3.4 — **not** "a local Redis") | infrastructure operator | 2026-09-30 |
| **R-16** | 23 · box 5 — Home waits for the slowest arm | ACCEPTED RESIDUAL | DECISION (changes the Home contract) | release owner (product) | 2026-09-10 |
| **R-17** | 23 · box 6 — realtime-token read, not measured | ACCEPTED RESIDUAL | TOOL (0 statements by construction) | perf-harness owner | 2026-09-17 |
| **R-18** | 23 · box 7 — pool/queue exhaustion behaviour | ACCEPTED RESIDUAL | **TOOL** — harness is serial by construction | perf-harness owner | 2026-09-30 |
| **R-19** | 26 · box 6 — 17 route JS budget breaches | ACCEPTED RESIDUAL | DECISION (cross-lane, two levers, priced) | frontend platform owner + dependency decision | 2026-09-17 |
| **R-20** | 28 · box 7 — 55 of 2,502 seam calls parse at runtime | ACCEPTED RESIDUAL | **SCALE**; box wording unachievable, see §3.8 | per-module FE owners; release owner sets a quota | quota 2026-09-17 · review 2027-03-03 |
| **R-21** | 29 · box 1 — "this and following" series split | ACCEPTED RESIDUAL | DECISION (Q1 + Q2 of `29b`) | release owner (product) | 2026-09-10 |
| **R-22** | 29 · box 2 — NEW REQUIREMENT (A) unread + delta sync | ACCEPTED RESIDUAL | SCOPE (decision taken and recorded) | mail/integrations product owner | target by 2026-09-17 · review 2026-12-01 |
| **R-23** | 29 · box 2 — NEW REQUIREMENT (B) inbound mail, bounce/DLQ | ACCEPTED RESIDUAL | SCOPE (no inbound path exists at all) | mail/integrations product owner | target by 2026-09-17 · review 2026-12-01 |
| **R-24** | 30 · box 2 — 9 unreachable click targets | ACCEPTED RESIDUAL | SCOPE (7 CRM, 2 inventory, named) | CRM/inventory release owner | 2026-12-01 review |
| **R-25** | 30 · box 5 — journeys cannot be a CI gate | ACCEPTED RESIDUAL | INFRA/CI (no FE job boots the app) | CI owner | 2026-09-17 |
| **R-26** | 30 · box 5 — `/crm/leads` reaches an error boundary | ACCEPTED RESIDUAL | SCOPE | CRM/inventory release owner | 2026-12-01 review |

**Twenty ASSIGNABLE items, fifteen accepted residuals**, across eighteen open boxes on seven tickets.
No item is left without a disposition, an owner and a date.

**Two boxes cannot be met as worded and should be amended rather than left to fail** — the same shape as
R-8 in part 1: **28 box 7** ("client types mirror the backend schema exactly" at 2.2% coverage) and **29
box 2** (it asks for two features the release has decided not to build). Amending a box is the release
owner's call, which is why both carry the release owner beside the module owner.

---

## 3. Per-ticket verification — what was checked, and how

### 3.1 Ticket 19 box 3 — ⚠️ **TICKET BLOCKER WAS WRONG**

Run, not read: `pnpm -s openapi:check` under the six CI placeholder variables → **exit 1**, `openapi.json
is STALE`, 50 differences printed plus "and 5 more" = **55 operations**. No database was reachable at the
DSN supplied and the run completed. The recorded reason (a Neon write at boot) is therefore not what
defers this. See §1.2. The document's staleness is independently visible in the artifact: it still carries
`/settings/integrations/git`, `/settings/ai-usage` and `/settings/custom-fields`, and carries none of
`/integrations/git/connections`, `/ai/usage` or `/crm/settings/custom-fields` — exactly the five paths the
ticket says moved.

Everything else in this box is closed and was spot-checked rather than re-derived: the six gates that read
the committed document are named in the ticket and `check:route-access-contract` was re-run here (exit 0).

### 3.2 Ticket 19 box 6 — ✅ **VERIFIED, and it has a mechanical half the box does not advertise**

- The automations rung is a genuine product decision. `reports/19b-automations-rung-decision.md` exists and
  states four options; 48 triggers across HR 27 / CRM 8 / Support 7 / Accounting 6 means no single module
  rung fits. **R-12.** (The 48-trigger count was taken from the ticket, not recounted.)
- The sidebar half was verified both ways it can be: `sidebar-nav-groups-work-management.ts:215` still
  reads `requiredPermission: "settings:manage"`, and `integrations:git:view` occurs **0 times** in
  `streamlineos-backend/openapi.json` and **0 times** in `frontend/contracts/openapi.json`. So the flip
  really would fail `check:route-access-contract`, and really does dissolve when A-12 lands. **A-13.**
  I did not perform the flip — editing source is outside this pass.

### 3.3 Ticket 22 boxes 1 and 2 — ✅ **VERIFIED against the live gate, not the ticket**

`pnpm check:route-budgets` → **exit 1**, and its own summary lines:

```
82 declared budgets (70 routes + 12 worker batches) · Route surface 82/3613 (2.3%)
Measurement: 386/570 declared ceilings measured (67.7%) — 2 fully, 67 partly, 13 not at all
By field: DbCalls 2/82 · LatencyP95Ms 69/82 · DownstreamCalls 69/82 · ResponseBytes 69/82 ·
          MemoryMb 69/82 · BufferBlocks 54/54 · ReadPathP95Ms 54/82 · BatchSize 0/12 · DurationMs 0/12
maxDbCalls basis: 12 counted from the call path · 14 declared estimate · 56 default ceiling · 0 undeclared
```

Independently re-derived from `contracts/route-budgets.json`: 82 entries,
`{declared-estimate: 14, counted-call-path: 12, default-ceiling: 56}`, `measuredDbCalls` populated on 2,
`measuredBatchSize` and `measuredDurationMs` on 0 of 12 worker batches. Every number the ticket claims is
reproduced.

- **A-14 / A-15.** `countDbCalls` exists at `src/scripts/route-budget-db-calls.ts:76`, is general, has its
  own spec (`src/scripts/__tests__/route-budget-db-calls.spec.ts`) and is already applied to 2 routes in
  `test/perf/route-db-call-budget.e2e-spec.ts`. The mechanism is complete; the coverage is unowned.
- **A-16 — the ticket's "NOT reachable from any HTTP instrument" is too strong.** For the storage sweep the
  batch size is already on the wire: `CronStorageSweepService` declares `organizations: number`
  (`cron-storage-sweep.service.ts:43`, assigned at `:83`) and `cron-storage.controller.ts:44` returns
  `{ success: true, ...outcome.result }`. The harness times the endpoint, so `durationMs` is a figure it
  already holds. This is an **unwritten instrument**, not an unreachable measurement.
  *Caveat: only the storage sweep was checked. The other eleven worker batches were not opened one by one,
  so "the number is already on the wire" is proved for one of twelve, not for all.*
- **R-13.** The critical-set clause is a genuine tool absence — nothing in either repository records request
  volume, so there is no way to rank 3,613 operations by traffic. Accepted, permanently, unless traffic
  telemetry is built.

### 3.4 Ticket 23 boxes 2–7 — ⚠️ **one blocker corrected, four items freed, two confirmed**

`pnpm check:benchmark-manifest` → **exit 1**. Live refusal tally, by route×tenant slot:

```
12  provider-backed: no connected mail account in the seed
 7  route answered HTTP 500
 7  route answered HTTP 402
 1  no client in this tenant to bill
 1  no payroll run in this tenant
136 of 164 request-level slots measured (82.9%) · 154/280 (55.0%) of statement ceilings
```

At contract level, 13 of 82 budgets are unmeasured. **Ticket correction: the ticket's box 2 says "4 routes
answer HTTP 500"; it is 3** — `POST /build/{projectId}/tickets`, `POST /chat/channels/{channelId}/messages`
and `GET /cron/notifications-retention-sweep`. `GET /clients` now answers 200 and is measured. Report 23b
§6 already records that recovery; the box above it does not. (**A-18**)

The four 402s — `POST /leads`, `POST /deals`, `POST /invoices`, `POST /support` — are refused because the
**majority tenant's plan limit is already reached in the seed**. That is a seed condition, not a route
defect, and it is fixable in `src/scripts/seed-perf-scratch.mjs` (which exists, 51,709 B). Two of the four
are CRM and stay excluded. (**A-19**)

**Box 3.** 120 unreachable benchmark slots are seed rows for modules the perf seed does not populate. Same
file, same owner, unowned. (**A-20**)

**Box 4 — the blocker is real but the ticket names the wrong missing thing.** Verified:
`package.json:360` carries `@upstash/redis` and there is no `ioredis`, no `redis` and no docker-compose in
the backend repo; `cache.module.ts:25-38` builds `new Redis({ url: UPSTASH_REDIS_REST_URL, token:
UPSTASH_REDIS_REST_TOKEN, … })` and returns **null** when either is absent; both variable names are present
in the repo `.env`, i.e. a **shared remote** instance. So the harness's assertion that `REDIS` is `null` is
what keeps every recorded number honestly a cache-MISS, and measuring a hit against the configured client
would both pollute other sessions' cache and time a WAN round trip.

The precise missing thing is **a locally hosted endpoint speaking the Upstash REST protocol** — after which
the change is *env-only*, two variables, zero code. **A plain local `redis-server` will not do**, because
`@upstash/redis` is a REST client and does not speak the Redis wire protocol. The ticket's "a local Redis
(or an in-process cache provider the seeded harness can bind)" would send someone to install the wrong
thing; the in-process alternative is also not free, because `CacheService` injects the concrete
`Redis | null` class rather than an interface, so binding a double means widening the provider type.
**R-15.**

Raised inside that box and never routed: **single-flight is in-process only**, so N instances produce up to
N fills of one hot key while `cache-multi-instance.spec.ts` claims "runs the fetcher exactly once". That is
a misleading test name over real multi-instance behaviour and it is unowned. **A-21.** *Taken on trust from
the ticket — I did not read that spec or run it.*

**Box 5 — confirmed, and it is false on both sides.** `dashboard-personal.service.ts:80` is
`await Promise.all([...])` with `settle()` on the arms (`:82, :89, :109, :115, :169`), so the response
waits for the slowest arm by construction; and the frontend fetches it as a **single** query
(`hooks/api/dashboard.ts:379` → `/dashboard/personal`), so there is nothing to render section by section
either. Three clauses of four hold. Streaming needs per-section endpoints or a streamed response, which
changes the Home contract for an aggregate presently costing 20.04 ms p95. Genuine product decision.
**R-16.**

**Box 6.** Held open by A-17 (the stale artifact), by R-14 (provider-backed inbox), by R-17
(realtime-token, `randomUUID()` + a `Map.set`, zero statements by construction, so there is nothing an
instrument would add) — and by **A-22**, the chat member-count regression in §1.3.

**Box 7 — one half is free, one half is a genuine tool absence.**
The per-org downstream unit is *implemented*: `effectiveDownstreamCeiling` in `check-route-budgets.mjs`
(commit `55ca701e`), six self-test cases, and correctly still red because no contract entry declares
`maxDownstreamCallsPerOrg` and the allowance refuses to apply without a measured org count. The remaining
half is reading a number that is already in the response body (§3.3) and writing two contract fields.
**A-23.**
The exhaustion half is confirmed blocked: `src/db/query-telemetry.ts:181` is
`export const queryTelemetry = new QueryTelemetryTracker()` — a **module-level singleton** — and the heap
baseline is process-wide, so two concurrent in-process requests cannot be attributed separately and the
harness cannot drive the pool past its ceiling without measuring a different process than it reports on.
Closing it needs a new concurrent driver, not a re-run. **R-18.**

### 3.5 Ticket 26 box 6 — ✅ **VERIFIED; the decision holds, and the numbers have moved**

Re-run at head: `node scripts/check-route-bundle-budget.mjs` → **exit 1, 13 routes, 13 measured, 0
pending, 17 breaches, every one JavaScript.** Overages span **26,993 → 325,756 B**. Everything that is not
JavaScript is met (CSS 58,244/65,536 · fonts 55,206/131,072 · images 2,907–14,480/524,288 · third-party
**0 B** · server payload 19,466–25,682/40,960).

The ticket's narrative section is one capture behind S9's `--write`, so three of its figures are stale:
`/chat` first-load is **+109,462** (ticket: +101,313), `/chat`'s page chunk **+26,993** (ticket: +20,085),
`/crm/leads` first-load **+63,798** (ticket: +59,598). **"The smallest open breach is 59,598 B" is
therefore wrong twice** — the smallest breach is `/chat`'s page chunk at +26,993, and the smallest
first-load breach is +63,798.

**The conclusion survives, and I checked the arithmetic rather than transcribing it.** The comparison is
apples to apples: `measuredFirstLoadJsBytes` is gzip(9) over the route's client-reference manifest
(`measure-route-bundles.mjs:80-122`) and `measuredScriptBytes` is over-the-wire transfer, which is
compressed. Subtracting the full ~75 kB gzip that both levers together would buy from every route's first
load closes **at most 2 of the 17** breaches (`/crm/leads` +63,798 and `/build/my-work` +73,324); it does
not touch `/chat`'s page chunk, because framer-motion and `@animateicons` sit in shared first-load chunks,
not in a route's own page chunk. Twelve of the seventeen have an overage larger than 100 kB. So *"neither
closes 17 breaches alone"* is correct and, if anything, understated. **R-19.**

One thing the box does not record and should: **the breach is growing while the release runs** — `/chat`
first load moved +8 kB in a day — and `check-route-bundle-budget.mjs` compares against a fixed ceiling that
14 routes already breach, so growth is invisible until someone re-measures. A ratchet on the last measured
value would make growth fail even while the absolute ceiling is unreachable. **A-24** (design only; not
implemented here).

### 3.6 Ticket 28 box 6 — ⚠️ **the routing is broken, and item (2) is bigger than recorded**

See §1.4. The ticket's own correction of its predecessor ("the 'this note is stale' note was itself wrong")
is upheld: a non-test grep for `fetchStatus` across `app features components hooks lib` returns **zero**
real occurrences at head, so the literal claim stands, while the substantive claim — that offline copy does
render on three shared surfaces via `useOnlineStatus()` — also stands. Both are true; they are different
statements about different signals, which is exactly what the box needs someone to decide between.

Item (2) re-counted at head with a coarser grep than the ticket's: **237 `useGatedQuery` call sites across
104 files** under `hooks/**` (ticket: 180/83), and `access.denied` is read on **8 surfaces, all eight under
`crm/`**. The ticket says "exactly one, and that file is CRM"; the honest number is eight, and the
conclusion is stronger than the ticket drew it — **zero in-scope screens consume the gate**, out of 237
gated reads. *My grep is coarser than the ticket's scanner and may over-count; the direction is not in
doubt.*

### 3.7 Ticket 28 box 2 — noted, not adopted

**Superseded during this pass: box 2 was CLOSED by another lane while this file was being written.** At the
time of the final read it is `- [x] Queries are gated by effective access and required identifiers`, with the
former `[~]` retained below it as `- [~] (superseded)`. Ticket 28 is therefore **6 of 8 closed**, and its two
open boxes are 6 and 7, exactly as this register treats them. The paragraph below is the state at the start of
the pass and is kept for the record.

Box 2 is still `[~]` and is outside the seven boxes this pass was asked for, so it is recorded here without
a disposition: 105 of 133 ungated reads converted, 16 further `BASE`-const reads resolved and gated, 11
deliberately held back and 12 CRM/inventory deliberately not converted. It is not left without an owner —
it is simply not this register's.

### 3.8 Ticket 28 box 7 — ✅ **VERIFIED as recorded; the box's wording is the problem**

The honest fraction is the ticket's own: **55 of 2,502** seam call sites under `hooks/` carry a runtime
contract (**52 of 1,012** GETs) across **49 distinct routes** — **2.2%**. Each conversion needs the backend
response shape verified first, because a contract written from the frontend's own type would encode the
drift instead of catching it. That makes it per-route work, not a codemod, and it is not finishable in this
release.

What *is* in place is a risk-weighted ratchet: `lib/api-contract-coverage.test.ts` parses all seam calls
with the TS compiler API and fails if any money / permissions / tenancy / PII route loses its contract or
gains a second un-validated call site, and it is bite-proved on `/billing/entitlements` and
`POST /organization/switch`. That is the defensible position, and it is not what the box asks for.

**R-20**, and a recommendation: amend the box to "every money/permissions/tenancy/PII route parses at
runtime, enforced by a ratchet; the remainder is scheduled" — otherwise the box fails for a reason nobody
disagrees with. *Not independently recounted: the 55/2,502 and 52/1,012 figures are the ticket's.*

### 3.9 Ticket 29 box 1 — ⚠️ **the box's last clause is FALSE at head, and that alone keeps it open**

The box ends "**No module-specific calendar page exists.**" It does. Verified at head:
`frontend/features/hr/recruitment/interviews-page.tsx:30-36` dynamically imports
`@/features/calendar/big-calendar-wrapper` and renders `<BigCalendarWrapper …>` at line **249**, at
`/hr/recruitment/interviews`. `BigCalendarWrapper` is referenced by exactly three files — its own
definition, `features/calendar/calendar-view.tsx`, and this one.

This violates root `CLAUDE.md` §8 ("Never module-specific calendar pages") and is a feature→feature import
under §9. `hr-interviews` is already a registered aggregate source, so `/calendar` already shows these
events and the remedy is a list plus a link. It has been reported in three consecutive passes (S8, S10,
S11) and routed to HR / ticket 25 each time, and it is still there. **A-28.** *The box cannot tick while
that file renders a calendar, whatever happens to the other two remainders.*

The other two: **A-17** (p95 not re-measured — the ticket says so itself: "somebody must re-run the
harness before the route is called closed") and **R-21**, the "this and following" series split. R-21 is a
real product decision and is well posed: `reports/29b-open-decisions.md` §1 states five questions and names
Q1 (a second `calendar_events` row with `UNTIL` and a `series_parent_id`, versus an override table) and Q2
(do post-split exceptions and cancellations re-parent — Q2 is recorded as having a *wrong* answer, not a
trade-off) as the two that block building. The frontend vocabulary is `"occurrence" | "series"` and the
backend has only `upsertOccurrenceException` / `cancelOccurrence` plus whole-series update, so a series
split exists nowhere in either repo. *Taken from the ticket: the five questions and the two service method
names were not re-read at source.*

### 3.10 Ticket 29 box 2 — ✅ **VERIFIED as a taken decision; needs an owner and a date, not a debate**

Both remainders are NEW REQUIREMENTs, already scoped out of this release with the reasoning written down in
`reports/29b-open-decisions.md` §2, and each is one requirement rather than several:

- **(A) unread + incremental sync.** A count is withheld deliberately because it would be *wrong*: the
  mirror holds only what has been listed, so a fresh account would report "3 unread" for a 400-message
  mailbox and present it as authoritative. Needs delta-token semantics on `mail_sync_checkpoints`, a
  `listChanges` on both provider wrappers (Gmail `historyId`, Outlook `deltaLink` — neither wrapper asks
  for one) and a background sync worker that does not exist. **R-22.**
- **(B) idempotent receive + bounce/retry/DLQ.** There is **no inbound mail path at all**; a bounce arrives
  as an inbound DSN, so bounce handling cannot precede receiving. **R-23.**

Both are provider-integration designs with a worker and a schema change apiece, not defects in shipped
behaviour. The two real defects in this box — ordering (a hard dead end: `nextCursor: null` unconditionally
on the cached path) and database search — were fixed and measured in S10, and idempotent send turned out to
be already done. *Taken on trust: the "zero webhook/inbound/bounce/DLQ references under
`src/modules/mail/`" scan was not re-run.*

### 3.11 Ticket 30 box 2 — ⚠️ **the scope exclusion is sound; the second clause has no instrument**

Half one is a clean exclusion: 9 of 633 click targets unreachable (624/633, 98.6%), ratchet pinned at 9,
all nine named file-and-line — 7 under `features/crm/**`, 2 in
`app/(authenticated)/inventory/purchase-orders/page.tsx`. **R-24.** *Not re-run: I did not execute
`keyboard-reachability.contract`; the counts are the ticket's.*

Half two is the item worth routing. The box also asks for screen-reader semantics, and the ticket says so
plainly: *"beyond reachability, ARIA relationships and live-region correctness across 556 pages are still
established only by rendered suites, not by any corpus-wide measurement."* **That is an unwritten gate, not
a blocker** — and the template sits in the same directory: `keyboard-reachability.contract.test.ts` already
walks 3,647 `.tsx` files and ratchets its finding. A sibling contract over `aria-labelledby` /
`aria-describedby` targets, `aria-live` on status regions and control/label association is bounded, static
and unowned. **A-29.**

### 3.12 Ticket 30 box 5 — ⚠️ **three remainders presented as one; only the CI half is blocked**

Verified from the harness's own header (`frontend/scripts/browser-journeys.mjs:1-60`):

- **The steps are routes plus an optional inert interaction** — "none of these writes, so a failing run
  never…". Adding a write-and-assert journey is work inside this ticket's own file and its own territory.
  Not blocked, not owned. **A-30.**
- **The CI half is genuinely infrastructure.** It needs `--base-url` (a running app) and `--cookie-file`
  (a minted `authjs.session-token`). The browser is *not* the obstacle — the candidate list already
  includes `/usr/bin/google-chrome` and `/usr/bin/chromium`. The obstacle is that **no frontend CI job
  boots the app**: `.github/workflows/frontend.yml` has five jobs (`frontend`, `type-check`, `build`,
  `tests`, `gates`) and none starts a server or a database. Backend CI already runs a seeded job
  (`tenant-isolation`), so the pattern exists for one repo; a cross-repo job with a minted session does
  not. **R-25.**
- `/crm/leads` is the one route of 21 still reaching an error boundary. **R-26**, folded into the CRM
  exclusion.

The harness's two honesty refusals were confirmed present in its own documentation and are the reason the
S14 run could report `63 of 63 planned steps` without shrinking a denominator. Neither was relaxed.

---

## 4. Cross-territory findings — not mine to fix

1. **`frontend/contracts/openapi.json` is stale against the backend artifact at head** and nobody has
   recorded it. `pnpm check:contract-vendor` → **exit 1**. The two documents agree on all 3,613 operations
   except `POST /gdpr/rectification/me` (`oneOf` request body in the backend, flat object in the vendored
   copy). The step is `continue-on-error` in `frontend.yml`, so CI will never surface it. (**A-12b**)
2. **A live chat regression is shipping**: channel headers report at most 8 members
   (`features/chat/use-message-panel-data.ts:326`). Introduced by a backend perf fix in another repo,
   raised in a report, owned by nobody. (**A-22**, §1.3)
3. **Two release gates are red on numbers the product no longer produces.** `check:route-budgets` and
   `check:benchmark-manifest` both fail on `GET /calendar/events` at figures three tickets say were fixed.
   Anyone running the gates today concludes the calendar route is broken. (**A-17**, §1.1)
4. **A second calendar surface has survived three reporting passes.**
   `features/hr/recruitment/interviews-page.tsx:249`, a root-constitution §8 violation, reported at S8, S10
   and S11 and routed to HR / ticket 25 each time. (**A-28**)
5. **Ticket 28 box 6 is addressed to ticket 30 box 1, which is closed.** Three items of per-screen work
   have no live box to land in. (§1.4)
6. **The frontend JS budget is growing during the release** and no instrument would catch it: the gate
7. **Ticket 30 box 1 is ticked over evidence that names the wrong mechanism** (§1.5), and it contradicts ticket
   28 box 6 in writing. The box was not unticked here; the owner should either correct the sentence or reopen
   the clause.
   compares against a fixed ceiling 14 routes already breach, with no ratchet on the last measurement.
   (**A-24**)

---

## 5. Honest gaps — what this pass did NOT verify

- **Ran, and read the output of:** `pnpm -s openapi:check` (backend, exit 1), `pnpm -s check:route-budgets`
  (backend, exit 1), `pnpm -s check:benchmark-manifest` (backend, exit 1), `pnpm -s check:contract-vendor`
  (frontend, exit 1), `pnpm -s check:route-access-contract` (frontend, exit 0),
  `node scripts/check-route-bundle-budget.mjs` (frontend, exit 1).
- **Not run, either repo:** `lint`, `test`, `test:e2e`, seeded e2e, `next build`, backend `typecheck`,
  frontend `type-check`, `check:spec-typecheck`, `keyboard-reachability.contract`,
  `authenticated-surface-states.contract`, `browser-journeys.mjs`, and the perf HTTP capture itself. This
  pass edited no source, so none was required, and none is claimed as passing.
- **No database was connected to.** No `psql`, no `scratch_*` database created, read or dropped. The
  `openapi:check` run used a placeholder DSN pointing at nothing, exactly as backend CI does;
  `DATABASE_URL` from `.env` was never read or used, and the only thing read from `.env` was the *names* of
  two variables (to establish that the Upstash client is configured).
- **Taken on trust, not independently re-derived:** ticket 19's 48-automation-trigger count across four
  modules; ticket 23's `cache-multi-instance.spec.ts` claim (A-21) and its realtime-token reading;
  ticket 28's 55/2,502 and 52/1,012 contract-coverage fractions; ticket 29's five series-split questions
  and the "zero inbound-mail references" scan; ticket 30's 633/9 keyboard-reachability counts and its 556
  authenticated route modules.
- **Verified for one of twelve:** A-16's claim that a worker batch's size is already on the wire is proved
  for `GET /cron/storage-sweep` only. The other eleven batch entries were not opened.
- **My `useGatedQuery` and `access.denied` counts are coarse greps**, not the ticket's scanner. 237/104 and
  8-all-CRM should be re-derived by whoever picks up A-26; the direction (zero in-scope readers) is not in
  doubt.
- **The bundle figures are from the committed manifest**, which S9 wrote from build
  `pRoNmQpD1X5_6lTUEhSv9`. I re-ran the *check*, not the *measurement*; no browser pass and no production
  build was performed here.
- **Deadlines are proposed, not agreed**, and **owner names are role-based**, following part 1's convention.
  The release owner maps each role to a person and confirms or moves each date at sign-off.

---

## 6. What this changes for ticket 41

Together with part 1, every open box on tickets 08, 11, 15, 19, 20, 21, 22, 23, 26, 28, 29, 30, 33, 35, 36
and 38 now carries a disposition, an owner and a date.

- Part 1: 6 assignable · 22 accepted residuals.
- Part 2: **20 assignable · 15 accepted residuals**, over eighteen open boxes.

**Four of part 2's items should be looked at by the release owner directly rather than accepted as
lower-severity:**

- **A-17** — two release gates are red on stale numbers. It is a re-run, and until it happens the release
  cannot honestly report its own perf posture.
- **A-22** — a user-visible regression is shipping in chat.
- **A-28** — the calendar box's own last clause is false at head, and the file has survived three passes.
- **§1.5** — ticket 30 box 1 is ticked over evidence naming a mechanism that is not in the code, and it
  contradicts ticket 28 box 6 in writing. A false tick is the one outcome this release exists to prevent.

And **two boxes should be amended rather than left to fail**: 28 box 7 and 29 box 2 ask for things this
release has decided, correctly, not to do.
