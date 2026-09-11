# Suppression retirement, a BOLA sweep that finishes, and what mobile INP actually costs

Date: 2026-09-07 · Backend `86fbc322f`, `85f758048` · Frontend `d41d03492`
Stack: co-located `D:\localstack` — PostgreSQL 18.6 `scratch_local` on 127.0.0.1:5432, Redis 6379,
Upstash REST shim 8079. Backend :1500, frontend :1006 started with
`API_INTERNAL_URL=http://127.0.0.1:1500`.

Three findings, in the order they were measured. Every number below came from running the thing,
not from reading it.

---

## 1. `check:test-suppressions` — 76 → 20, and the ratchet went DOWN

**Was:** FAIL, 76 runtime-selected suppressions against a ratchet of 29. The raise had been refused
twice and the gate had been honestly red since the 10-10 release.

**Now:** OK, conditional 20 against a ratchet of **20**.

The gate's own note committed in writing that the next request to move the number should *retire an
existing conditional site* rather than add to the count. That is what was done. 56 `*.db.spec.ts`
files each opened with

```ts
const ENABLED = process.env.X_DB_TESTS === "1";
const describeDb = ENABLED && DB_URL ? describe : describe.skip;
```

That ternary **was** the counted suppression, and it existed only because the default `jest` run
walked those files on machines with no database. They are now selected by SUITE, exactly as
`*.e2e-spec.ts` already was:

| | |
|---|---|
| `jest-db.json` | new; `testRegex: "\\.db\\.spec\\.ts$"` — selects exactly **56** |
| `pnpm test:db-specs` | runs that config |
| default `jest` | now ignores `\.db\.spec\.ts$` — **0** of the 56 remain, 2111 → 2126 files selected |

With the file unreachable from the hermetic run the gate is redundant, so it is gone. Each spec now
**throws**, naming the variable it needs, when its database is absent: a missing prerequisite is a
red suite and can no longer skip.

**The part that could have silently cost coverage.** 19 of the 56 also held a hermetic half that ran
in the default suite. Splitting a file is the standard way to lose coverage by accident, so that
half was moved into a sibling `*.spec.ts` and counted on both sides: **16 files, 71 tests, all
passing with no database**. Three files flagged as needing a split did not need one — their extra
`describe`s are nested inside the gated block, not hermetic siblings — and were left alone.

**Bite-proved, not assumed.** A planted conditional alias takes the count to 21 and the gate exits 1;
removing it returns exit 0. Gate self-test 20/20.

**`db-gates.yml`** loses its 23 `*_DB_TESTS: "1"` variables because nothing reads them now; the
`*_PROBE_DATABASE_URL` values stay, being the real prerequisite. **Its step keeps its `if:` guard**:
that job has no seed step and some suites read seeded rows, so promoting it today would turn CI red
for a missing fixture rather than a defect. That is now a CI-coverage question rather than this
ratchet's, because the class the ratchet priced no longer exists — which also dissolves the recorded
tension with PRD-C018, where every new DB-gated spec used to push this count up.

What remains at 20 is genuinely infrastructure-gated: 9 `*.eval.spec.ts` needing an AI provider key,
6 `src/degradation/**` needing a real S3/Ably/read-replica, and the seeded-E2E and perf specs that
need specific tenant fixtures to mean anything. Also still registered, unchanged: 6 QUARANTINE (all
in `crm-copilot.service.phase2.spec.ts`, CRM, out of scope) and 13 PLACEHOLDER.

---

## 2. The BOLA live sweep now FINISHES, and passes — 4.08 h → 127 s

**Was:** could not complete, so could not pass. 1,937 routes at roughly 7 s each timed out against
the spec's own 4-hour per-test limit. Worse, the nine assertion tests still ran over whatever the
timed-out pass had scored and reported "no disclosures" from a partial sweep.

**Now:** `SWEEP EXIT: 0`, **10/10 tests**, 1,937 routes attempted, **843 scored** against the floor
of 200, probe loop **127 s**.

| Verdict | Count |
|---|---|
| PASS | 825 |
| UNPROBEABLE | 1,094 |
| NO-404 | 16 — all pinned |
| LEAK | 2 — both pinned |
| SERVER-ERROR | **0** |
| Existence oracles | **0** |

**The timeout was not raised.** Three defects, all found by running it:

**(a) Throughput.** For a non-mutating verb the prober request could not start until the control
response had fully arrived, so every attempt paid twice the server's database latency. The read pair
now goes out concurrently. Only the two requests inside one attempt overlap — the route loop stays
sequential, the borrow pool still hands each id out once, outcomes are still recorded in plan order,
and the mutating branch is untouched because DELETE must probe before the control consumes the
object.

**(b) A credential refusal was scored as a disclosure.** A sweep this long mutates the tenants it
probes, so a token minted 40 s ago can describe a membership the server has stopped honouring. That
refusal is a **403, not a 401**, so `sendAs` never re-minted and the stale token kept going out. The
scorer sees only a status, and 403-on-a-real-id beside 404-on-an-absent-id is exactly the shape of an
existence oracle — so `POST /hr/enterprise/ops/emergency/events/:eventId/respond` was reported as
leaking existence, with body `ORG_MEMBERSHIP_INACTIVE`, while re-probed alone it answers **404 and
PASSES**. `sendAs` now re-mints on that refusal too. This suppresses nothing: an object-level 403
carries a different body, and a membership that is really revoked answers 403 again on the fresh
credential and scores exactly as before.

**(c) `POST /leads/:leadId/activities` — a real product defect.** It inserted with a caller-supplied
`leadId` and never checked the lead belonged to the caller's organization, so a cross-tenant id
reached the foreign key and surfaced as **500 where 404 is the contract**. It now loads the lead in
the caller's org first, matching the ownership check its two siblings in the same service already
use. Separately its `date` was `z.string()`, so `new Date(input.date)` raised `RangeError: Invalid
time value` and **any client sending a malformed date got a 500 rather than a 400**; it is now
`z.string().datetime()`, the convention 16 other DTO files already use. Consequence recorded rather
than hidden: the route now scores UNPROBEABLE rather than PASS, because the harness's
contract-derived body no longer satisfies the stricter schema — one route of 1,937.

**The two pinned LEAKs were re-read, not trusted.** Both `billing/marketplace/:appId/install` verbs
return the **prober's own** installation row (`orgId …0002`), so nothing cross-tenant is disclosed
and the pin's stated reason holds.

### Two previously recorded defects do NOT reproduce at this commit

| Recorded | Re-measured 2026-09-07 |
|---|---|
| `GET /build/:projectId/tickets/:ticketId` cross-tenant answers 500, not 404 | **Does not reproduce.** `build-ticket-scope-and-isolation.seeded-e2e-spec.ts` passes **5/5**, including "CROSS-TENANT read … answers 404, not 403 or 200". |
| `POST /crm/consent/contacts/:contactId` cross-tenant **write LEAK** (probe 200) | **Does not reproduce.** Probe answers **404**; scored PASS in the full sweep and in a targeted re-probe. |
| `POST /build/:projectId/epics` cross-tenant SERVER-ERROR (probe 500) | **Does not reproduce.** Probe answers **404**; scored PASS. |

A prior analysis attributed the ticket 500 to migration `0383_rls_org_members_identity_read.sql`
raising 42501 from `organization_members`. **That premise is wrong and should not be carried
forward:** 0383 deliberately uses the NON-raising `_or_null` accessors in its `USING` arm, precisely
because "an RLS USING predicate … evaluated per row … an arm that raises would abort the statement".
Its `WITH CHECK` keeps the raising accessor, so that table raises on write, not on read.

---

## 3. Mobile INP: the breach is `processing`, and it is not `flushSync`

The driver recorded INP as a single number, which is why four candidate fixes were attempted and all
four reverted — nothing in the capture could say which phase they were supposed to move. It now
derives the three phases the spec defines from `PerformanceEventTiming`, plus the element clicked.

**Capture 20**, 11 in-scope routes × 6 repeats, production build, host median busy 26.3%, 132 samples,
**zero refusals**:

| route | INP p75 | input delay | **processing** | presentation |
|---|---|---|---|---|
| /parties | 776 | 95.4 | **572.3** | 133.6 |
| /inbox | 516 | 35.4 | **401.3** | 93.1 |
| /build/inbox | 352 | 37.5 | **237.2** | 95.5 |
| /dashboard | 298 | 40.5 | **160.9** | 72.1 |
| /support/inbox | 232 | 32.6 | **128.6** | 82.8 |
| /build/my-work | 182 | 134.1 | 12.7 | 39.5 |
| /settings | 180 | 130.1 | 15.2 | 39.8 |
| /chat | 128 | 22.5 | 0.7 | 106.4 |
| /notifications | 78 | 10.1 | 11.3 | 62.4 |
| /calendar | 54 | 8.0 | 3.1 | 43.0 |
| /mail | 48 | 9.2 | 10.8 | 35.2 |

**Every breaching route is processing-dominated** — 54% to 74% of the total. Input delay and
presentation are within budget everywhere. The clicked control is the same mobile shell FAB
throughout, and it costs **0.7 ms of processing on `/chat` and 572 ms on `/parties`**, so the handler
is cheap and the re-render it forces is not.

**`flushSync` is not the cause — now measured rather than argued.** Both FAB handlers wrapped the
state toggle in `flushSync`, which forces React to flush all pending work tree-wide inside the event
handler. Removing it (capture 21, same build pipeline, host 27.3%) did **not** reduce processing:

| route | processing WITH flushSync | WITHOUT |
|---|---|---|
| /parties | 572.3 | 576.9 |
| /inbox | 401.3 | 411.6 |
| /build/inbox | 237.2 | **414.3** |
| /support/inbox | 128.6 | 175.6 |
| /dashboard | 160.9 | 142.9 |

Reverted. This confirms with phase-level evidence what was previously only inferred from noisy
aggregates: the cost is the React re-render of the route's own subtree when the FAB's `open` state
changes, not the flush mechanism. **PRD-C149 stays open**, but it is no longer "unattributed": the
next attempt must stop the FAB's open state from re-rendering page content, and it now has a metric
that will show whether it worked.

Run-to-run variance remains large (mobile INP p75 at 6 repeats moved 25–50% between two captures of
the *same* code), so no single capture should be read as a regression or a fix on its own.

---

## Commands

```
# suppressions
pnpm -C backend check:test-suppressions            # OK — conditional 20 (ratchet 20)
node backend/src/scripts/check-test-suppressions.mjs --self-test   # 20 passed

# BOLA, full sweep
BOLA_SOURCE_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 \
BOLA_PROBER_ORG_ID=aaaaaaaa-1111-0000-0000-000000000002 \
BOLA_PROBER_USER_ID=bbbbbbbb-9999-0000-0000-000000000002 \
node --env-file=D:/localstack/backend-local.env -r ts-node/register/transpile-only \
  test/helpers/run-seeded-e2e.ts scratch_local \
  test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts

# Web Vitals
node scripts/measure-web-vitals.mjs --base-url=http://localhost:1006 \
  --routes=/mail,/inbox,/build/inbox,/support/inbox,/dashboard,/calendar,/notifications,/settings,/build/my-work,/parties,/chat \
  --repeat=6 --cookie-file=.capture-cookie-local --out=.vitals-capture-20-phases.json
```

Typechecks clean at these commits: `tsc --noEmit` on `backend/tsconfig.build.json`,
`backend/tsconfig.test.json` and `frontend/tsconfig.json`. **Lint and the full unit suite were NOT
run and are not claimed.**
