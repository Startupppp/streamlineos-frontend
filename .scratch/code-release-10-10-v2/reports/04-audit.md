# 04 — API, Zod and OpenAPI contracts — AUDIT at current head

**Audit date:** 2026-09-03 (second pass, over the prior report `04-api-zod-openapi-contracts.md`)
**Backend head:** `2f37e1bb0` on `release/code-10-10-v2`
**Frontend head:** `7469d2789` on `release/code-10-10-v2`
**Nothing was edited.** This file is the only write. All numbers below were taken by me at head.

---

## 0. Relationship to the prior report

The prior report closed C047 and (partly) C087 and left ten criteria partial or open. I
**re-verified its claims at head** and then pushed past it. Summary of that verification:

| prior claim | at head |
|---|---|
| `ResponseContractInterceptor` registered as the innermost `APP_INTERCEPTOR` | **HOLDS** — `src/app.module.ts:105,221` |
| `openapi.json` response coverage 24/3,642 | **HOLDS** — I re-measured: 24 with a 2xx `content` schema; the gate prints 25 because `GET /platform/visit` has no 2xx key at all and is covered by the 405 carve-out |
| calendar `rrule` / `isRecurring` emitted | **HOLDS** — `calendar-events-aggregate.service.ts:57`, `dto/calendar-response.schemas.ts:56`; spec green |
| compression options declared | **HOLDS** — `src/main.ts:100`, `src/common/http/compression.config.ts:92-94` |
| request deadline armed | **HOLDS** — `tenant-context.interceptor.ts:72,122` |
| `check:openapi-coverage` was vacuous, routed to ticket 30 | **CLOSED by `248c29c0d`** — now counts a resolvable `content` schema, ratchet 3617, prints "NOT A PASS FOR THIS RULE" |
| `check:envelope-consistency` blind to `{success,data}`, routed to ticket 30 | **CLOSED by `248c29c0d`** — 2 violations → 1 |
| storage-sweep budget re-expressed as `maxDownstreamCallsPerOrg: 1` + `measuredOrgsSwept: 8` | **DID NOT LAND** — `contracts/route-budgets.json` at head still carries `maxDownstreamCalls: 0` / `measuredDownstreamCalls: 8` with no per-org keys, and `check:benchmark-manifest` is red on it (2 breaches). See F-11. |
| `GET /public/kb/{slug}/attachments` bare array | **STILL OPEN** — `check:envelope-consistency` exit 1 |
| `res.syncError` unreachable | **STILL OPEN** |
| two duplicate `GET /build/:id` fetches | **STILL OPEN**, and the consumer count is 28 files, not 27 |
| two unbounded CSV export buffers | **STILL OPEN**, and I found *why no gate sees them* — see F-9 |
| 14 dead `err.code === "23505"` handlers | **STILL OPEN**, all 14 are in CRM/Inventory (out of release scope). The 5 in-scope SQLSTATE sites (`hr-people.service.ts:172`, `recruitment-handoff.service.ts:141,164,179`, `hr-import-commit.service.ts:142`) all use `getPostgresErrorDetails` correctly. |

**The prior report's single largest claim — "the committed contract describes the code" — is false
at head.** See F-1, which no gate run in the prior report could have caught because the freshness
gate is named `openapi:check`, not `check:openapi-*`, and was not in its ledger.

---

## 1. Corpus read — with numbers

### Backend (`streamlineos-backend`)
| dimension | measured |
|---|---|
| TypeScript files under `src/` | **5,717** (3,648 counted as "application files" by `check:type-assertions`) |
| controller files | **550** |
| route decorators (`@Get/@Post/@Put/@Patch/@Delete/@Head/@Options`) | **3,644** |
| operations in `openapi.json` | **3,642** (2 live routes are missing — F-10) |
| service files | **1,078** (`check:n1-growing-loops` parses 2,161 "service files" by its own glob) |
| DTO/schema files | **376** |
| mutating operations (POST/PUT/PATCH/DELETE) | **2,134** |
| tables in the live catalog (`scratch_head_1010`) | **944** |
| `check:*` gate scripts in `package.json` | **189** |

### Frontend (`streamlineos-frontend/frontend`)
| dimension | measured |
|---|---|
| `.ts`/`.tsx` files | **5,387** (5,010 counted by `check:type-assertions`) |
| files under `hooks/api/**` | **556** (487 non-test) |
| hand-written response/request types in `hooks/api/**` | **1,361 types / 7,953 fields** |
| typed `apiClient.<verb><T>(…)` call sites | **2,465** |
| fetch-seam call sites counted by `check:response-contracts` | **2,665**, of which **84 (3.2 %)** carry a runtime contract |
| distinct routes at the seam | **1,964**, of which **72** are parsed somewhere |
| resolvable *literal* API paths I could statically match against `openapi.json` | **2,477** |
| `useQuery(` call sites | **366**; `queryKey:` declarations **3,199** |
| `serverGet` call sites | **41** |

### Gates I ran at head (exit codes are mine, taken today)

| gate | exit | note |
|---|---|---|
| `openapi:check` (freshness) | **1 → later 0** | **exit 1 at the committed HEAD** (13 changed ops). A concurrent agent regenerated the working-tree copy at 21:27 while I was auditing; `git show HEAD:openapi.json` still differs. See F-1. |
| `check:openapi-coverage` | 0 | prints `25/3642 (0.69 %)` and **"NOT A PASS FOR THIS RULE"** |
| `check:envelope-consistency` | **1** | 1 violation, `GET /public/kb/{slug}/attachments` |
| `check:type-assertions` (backend) | **1** | 3 offenders, none in ticket-04 files |
| `check:benchmark-manifest` | **1** | 2 breaches on `/cron/storage-sweep`; capture 358 commits behind head |
| `check:contract-registry` / `contract-breaking-change` / `bounded-contracts` / `operation-ids` / `openapi-path-params` / `route-duplicates` / `multipart-contracts` | 0 | all read the **stale** document |
| `check:body-binding` / `bodyless-conflicts` / `idempotent-commands` / `conflict-targets` | 0 | |
| `check:query-projections` / `relation-hydration` / `n1-growing-loops` / `unbounded-reads` / `db-call-count` | 0 | all ratcheted, none clean |
| `check:route-budgets` / `route-budgets-http` | 0 | both print PARTIAL/BREACH lines that do not affect the exit code |
| `check:compression` | 0 | presence-only |
| `check:response-contracts` / `contract-drift` / `contract-vendor` / `type-assertions` (frontend) | 0 | |
| jest `response-contract|calendar-events-wire-shape|compression.config` | **0** | 3 suites, **55 tests** |

I did **not** run `typecheck`, `next build` or a full `jest` — forbidden by the laptop budget.

---

## 2. Per-criterion assessment

### PRD-C047 — strict TypeScript, no new `any`, suppressions, double casts, non-null abuse, **or parallel hand-written types that drift from schemas**

**Partially met.** The first four clauses are measured and good; the fifth is unmeasured by any gate
and is where every finding in §3 lives.

- Backend `check:type-assertions`, **3,648 application files scanned**: `as any` / `@ts-ignore` /
  `@ts-expect-error` / `@ts-nocheck` = **0**. `as unknown as` = **31 sites in 18 files** (22 ledgered
  at a proven external seam, 8 owed a Zod parse). Plain assertions under a zero-growth ceiling =
  **1,189** (866 `as X` + 323 `!`) in **465 files**. 28 `db.execute<T>` raw-row generics, 25
  cross-checked against their SQL, all supported.
- Backend gate is **exit 1** on three items, none of them ticket-04 files:
  `src/scripts/check-referential-action-drift.ts` (1 unledgered double cast),
  `src/common/cache/cache-fill.ts` (2 unledgered plain assertions),
  `src/common/cache/cache.service.ts` (a stale ledger entry that must be deleted).
- Frontend `check:type-assertions`, **5,010 files**: **PASS**. 7 `as unknown as` in 6 files, 13 raw
  `fetch` JSON casts in 8 files, 999 plain assertions in 510 files, 0 suppressions, 0
  `.json() as Promise<T>`.
- **The fifth clause is not met.** `hooks/api/**` holds **1,361 hand-written types with 7,953
  fields**. I cross-referenced every field name against the set of 58,320 identifiers appearing
  anywhere in 3,654 backend source files: **64 fields name something the backend never mentions**.
  Discounting frontend-only shapes (mutation contexts, stream callbacks) and CRM/Inventory, **eight
  are in-scope declared response fields**, and **four have live consumers that render them**:
  `FeedbackResult.completedRequests` / `.totalRequests` (F-4), `AdminBlogCategory.postCount` (F-2),
  `CalendarEvent.recurringRule`, `MutateCalendarEventResponse.syncError`. A typecheck cannot see any
  of them because both sides typecheck against themselves.
- **NOT MEASURED:** `pnpm typecheck` in either repo (8–12 GB, forbidden here). The orchestrator's
  central run is the authority.

### PRD-C048 — validate every untrusted body, parameter, query, environment value, upload manifest and external response through Zod

**Partially met — and the body half is genuinely excellent.** I wrote a handler-level scanner over
all 550 controller files / 3,644 handlers:

| slot | handlers that bind it | with **no** Zod schema | coverage |
|---|---|---|---|
| `@Body()` | **1,392** | **0** | **100 %** |
| `@Param()` | **1,938** | **38** | 98.0 % |
| `@Query()` | **598** | **48** | 92.0 % |

`check:body-binding` independently confirms the other direction: 1,941 validated slots, **UNBOUND 0**.
Env is validated by `src/config/env.validation.ts` + `resolveAdmissionConfig`. Upload manifests go
through `MultipartAction` (`check:multipart-contracts` exit 0).

Triaging the 86 gaps by hand: most are benign — `@Param(x, ParseIntPipe)` (a pipe *is* validation),
or a handler that takes `@Query() q: unknown` and `safeParse`s it explicitly
(`kb-ask.controller.ts:120`). **18 are not benign**: a raw `@Query("x")` string coerced numerically
with no schema. Of those, **five reach `LIMIT`/`OFFSET` or a date cast unguarded** and are findings
F-6, F-7 and F-8. I proved the SQL-level consequence against the local catalog:

```
PREPARE p1(bigint) AS select 1 limit $1; EXECUTE p1('NaN');
  ERROR:  invalid input syntax for type bigint: "NaN"
PREPARE p2(bigint) AS select 1 limit $1; EXECUTE p2(-5);
  ERROR:  LIMIT must not be negative
```

**Responses remain unvalidated at the frontend seam**: 84 of 2,665 (3.2 %), and
`check:response-contracts` says so itself — *"97.8 % of the seam is still an unchecked cast. This
gate freezes that debt; it does not retire it."*

### PRD-C049 — reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states

**Not met.** This is the criterion the ticket exists for and it is where I spent most of the audit.
Three independent reconciliations, each with numbers:

**(a) Document vs code.** `git show HEAD:openapi.json` vs a fresh generation from the same commit:
**13 operations differ** (F-1). The frontend's vendored `contracts/openapi.json` is byte-identical
to the stale backend artifact (sha256 `9cba20e2ca1d90f5…` on both), so the drift is shipped to the
consumer side too. Two further live operations (`/v2/users`, `/v2/users/{userId}`) are in the code
and in no document at all (F-10).

**(b) Route existence.** I matched all **2,477** statically resolvable literal frontend API paths
against `openapi.json` path templates and methods. **18 call sites had no matching operation.** After
discarding 13 that were my regex mis-parsing a template literal (`${qs`, computed segments) or
`/v2/*` (F-10), **three are real**: `GET /blog/admin/categories` (F-2),
`GET /finance/bank-accounts/{id}` (F-3), `GET /hr/departments/legacy` (F-12, dead hook).

**(c) Field-level shape.** The 64-field drift set from C047, narrowed to consumers that render.
`GET /hr/feedback/results/{subjectId}` is the worst: the backend returns
`{subjectId, requests, responses}` and the panel reads `totalRequests`, `completedRequests`,
`avgRating` — **all four stat cards on the 360° feedback screen are wrong** (F-4).

**Response coverage at head:** 24 of 3,642 operations (0.659 %) publish a 2xx `content` schema;
3,618 do not. The gate now reports this honestly (0.69 % including the 405 carve-out) and refuses to
call it a pass.

### PRD-C085 — route budgets for db calls, downstream calls, latency, response bytes, memory; record p50/p95/p99 at the release commit

**Partially met, and the second clause is definitively not met.**

`contracts/route-budgets.json` holds **92 budget entries** — **2.53 % of 3,642 operations**. Of the
92, **all 92** declare all five dimensions (`maxDbCalls`, `maxDownstreamCalls`, `maxLatencyP95Ms`,
`maxResponseBytes`, `maxMemoryMb`). Measurement is much thinner:

| dimension | measured / 92 |
|---|---|
| `measuredDownstreamCalls` | 69 |
| `measuredLatencyP95Ms` | 69 |
| `measuredResponseBytes` | 69 |
| `measuredMemoryMb` | 69 |
| **`measuredDbCalls`** | **3** |

p50 / p95 / p99 are present on **69 of 92** `httpMeasurement` blocks. `check:route-budgets` prints
its own verdict: *"PARTIAL — 387 of 640 declared ceilings are measured and within budget; 253 are
unmeasured and therefore unenforced. This is not a pass over the route surface: 92/3642 operations
carry a budget at all."*

**"at the release commit" fails outright.** `check:benchmark-manifest` reports the capture is
`ef3c1960`, **358 commits behind head**, taken *"on a DIRTY working tree at 295e55cb"*, with
*"2 measured SQL catalog(s) changed on disk since capture"* (one of them `contracts/route-budgets.json`
itself). Statement-ceiling coverage is **154/280 (55.0 %)** with 6 vacuous and 120 unmeasured, and
the database-statement ratchet covers **2/70 (2.9 %)** of linked read paths.

One PRD ceiling breach survives: `GET /calendar/events@reference` **p95 915.944 ms > 800 ms**. The
prior report's diagnosis (the loader drains 2,000 events to feed a 400-item registry cap) is
unchanged in the source at head. **NOT MEASURED by me** — re-measuring needs
`test/perf/route-budget-http.seeded-e2e-spec.ts` against `scratch_t23_http`, which the laptop budget
excludes.

### PRD-C086 — one user intent per route; no avoidable waterfalls; no mega-responses

**Partially met, not independently proven.** `check:route-duplicates` exit 0 (0 operationId
duplicates, 0 ambiguous param-vs-param routes, 0 version inconsistencies). `check:bounded-contracts`
exit 0 with 10 CRM/Inventory violations declared out of scope and **0 in-scope**. The calendar
aggregate is the right shape (five parallel sources, `Promise.allSettled`, per-source cap).

Counter-evidence I found: `POST /calendar/events` and `PUT /calendar/events/{eventId}` return **all
29 columns** of `calendar_events` (F-13) — a mega-response on the smallest possible intent. And the
build detail route is an avoidable waterfall in the other direction (F-14).

### PRD-C087 — Home aggregation bounded and parallel, independent section results

**Met.** Verified at head. `HOME_SECTION_DEADLINE_MS = 2_500`
(`src/modules/dashboard/dashboard-section-settle.ts:16`); `settleSection` races each section and
always resolves, degrading only the failing section. `dashboard-home-fanout.spec.ts` proves
concurrency with a start barrier, boundedness by counting started sections, and independence by
hanging one source forever (`:252-291`) and asserting elapsed time stays inside
`HOME_SECTION_DEADLINE_MS ± tolerance` (`:338-339`). Row volume is capped by `dashboard-read-limits.ts`.
This is the one criterion on the ticket with a behavioural proof rather than a static one.

### PRD-C088 — explicit DTO projections; omit nested relations, internal columns, secrets, repeated payloads

**Not met — frozen at a large number, with one concrete over-exposure confirmed.**

`check:query-projections` (3,650 files): **1,378 unprojected reads** (findMany 287 · findFirst 488 ·
bare `.select()` 603) against a ceiling of 1,383 — **0.4 % headroom**, i.e. the criterion is
suspended, not satisfied. `check:relation-hydration`: **186 unprojected relation hydrations**
(ratchet 186), **72 base-table credential candidates reported but not enforced**. In `src/modules`
alone: **1,026 bare `.returning()`** vs 402 projected, and **601 bare `.select()`**.

I specifically hunted the P0 shape — a secret column reaching the wire. I enumerated the live catalog
for credential-like columns (**42 tables**) and traced the reads on the plaintext-bearing ones:

- `webhook_endpoints.secret` — **correct**: list and get strip it, `create`/`rotateSecret` are
  deliberate reveal-once (`webhooks.service.ts:51-104`).
- `hr_webhook_subscriptions.secret` — **correct**: `columns: { secret: false }` on both reads.
- `support_channels.inbound_secret` — **correct**: `columns: { inboundSecret: false }`; create is a
  documented reveal-once.
- `sign_org_settings.webhook_secret` — **over-exposed** (F-15): `getOrCreate` returns the whole row
  and `GET /sign/admin/settings` returns it verbatim.

Money is clean: only **2** `real`/`double precision` columns in the whole 944-table catalog match a
money-ish name, and both are `cell_capacity_measurements` telemetry, not tenant money. **No
floating-point money defect exists.**

### PRD-C089 — Brotli/gzip with minimum-size and already-compressed exclusions; never compress secrets cross-origin

**Partially met — mechanism landed, adoption is zero.** `src/main.ts:100` passes
`httpCompressionOptions()`; `compression.config.ts` declares the 1,024-byte threshold, an explicit
already-compressed exclusion list, and Brotli quality keyed on `zlibConstants.BROTLI_PARAM_QUALITY`.
25 tests green.

The BREACH half is **not** in force. `NO_COMPRESSION_HEADER` (`x-no-compression`) is declared at
`compression.config.ts:46` and read at `:116`, and **no handler anywhere in `src/` sets it** —
grep returns only the config file itself. `app.enableCors({ credentials: true })` is live at
`src/main.ts:108-115`, and three routes still return a token in a compressible JSON body (F-16).
`check:compression` is exit 0 and asserts only that the literal string `compression` appears in
`main.ts` — it inspects no threshold, no filter, no exclusion, and no opt-out adoption.

### PRD-C090 — stream, or return a durable async job; never buffer a growing payload

**Not met.** Confirmed at head, and I found the reason no gate sees the two worst cases (F-9):
`src/scripts/baselines/unbounded-reads-classification.json` classifies both files
`FALSE-POSITIVE` with justifications that are factually false for the export path. The
classification is **per file**, so one wrong justification suppresses every read in the file.
`check:unbounded-reads` therefore exits 0 with "unbounded reads: 3 ACTIONABLE" over 310 files marked
false-positive.

Correct streaming does exist and is good: contacts CSV with `res.write` + drain backpressure,
audit-log CSV capped at 10,000, object download piping, GDPR export, HR employee export spilling to
`tmpdir()` then `createReadStream`, notifications SSE.

### PRD-C091 — propagate cancellation and deadlines; enforce upstream timeouts, concurrency limits, backpressure

**Partially met.** The one real gap the prior report fixed is at head:
`tenant-context.interceptor.ts:72` computes `REQUEST_DEADLINE_MS = resolveAdmissionConfig().maxExecutionMs`
and `:122` passes it to `createStreamAbortSignal`, so `deadline_exceeded` is now reachable outside
`src/modules/ai`.

Residual, unchanged and re-verified: the request signal reaches the **DB layer nowhere**
(`with-tenant.ts` takes no signal; cancellation of a running query is entirely `statement_timeout`);
`call-provider.ts` has **no `signal` parameter at all**; `outbound-request.ts` composes a caller
signal correctly and has 2 call sites, neither of which passes one. Backpressure is solid (admission
200/400/50 per org, DB pool lane admission with queue shed, AI per-org cap 20).

### PRD-C092 — idempotency and optimistic concurrency for replayable/conflict-prone mutations; stable 409/412

**Not met.** Re-measured at head from both the committed and the freshly generated document
(identical result):

| | count | % of 2,134 mutating |
|---|---|---|
| `@Idempotent` (`x-idempotent: true`) | **245** | **11.5 %** |
| **Any replay protection** | ~263 | ~12.3 % |
| `PreconditionFailedException` in `src/` | **0** | 0 % |
| `If-Match` / `ifMatch` in `src/` | **0** | 0 % |
| HTTP `412` emitted anywhere | **0** | 0 % — all six `412` hits in `src/` are prose about a count of findings |
| operations with a client-supplied version check | **3** | **0.14 %** |
| `row_version`/`version`/`lock_version` columns in the live catalog | **31** | — |

**Nothing in this API returns 412.** Of the 3 version-checked operations, two (directory engagements)
are correct — required `expectedVersion`, CAS in the `WHERE`, `ConflictException` on zero rows
(`worker-engagements.service.ts:383,471`), with `rowVersion` round-tripped because `listEngagements`
uses a bare `.select()`. The third, `POST /workflows/{id}/publish`, **is inert** (F-5).

`check:idempotent-commands` is exit 0 over an empty enforced set: **546 controllers scanned, 11
handlers in scope, and all 11 are on the exclusion allowlist.** It is a regression tripwire on a
keyword list, not coverage.

### PRD-C093 — no serial downstream calls when independent; cap fanout; use batch adapters

**Not met.** Re-verified at head:

- **No general-purpose concurrency limiter is a dependency** — `p-limit`, `p-map`, `p-queue`,
  `bottleneck`, `semaphore`, `async-sema`: none present. The only limiter is `AiConcurrencyLimiter`,
  an admission gate that cannot bound a `map`.
- `check:n1-growing-loops` over 2,161 service files / 5,103 loop nodes: **97 GROWING sites in 73
  files** (ratchet 102), 76 PAGING, 16 literal-bounded. `check:db-call-count`: 150 files with
  loop-internal DB calls, **32 ACTIONABLE (51 sites)**, plus 3 "INVISIBLE" N+1s the patterns cannot
  match because the per-row work is a service call.
- **Batch adapters: still none.** `src/modules/email/email.provider.ts:135` uses
  `resend.emails.send` (one message per call) exclusively; Resend's `emails.batch.send` (100/call)
  appears nowhere. `email.service.ts:152-165` loops one HTTP send per recipient over an uncapped
  `recipientEmails[]`, re-attaching the same XLSX buffer each time (F-17).
- `inventory/webhooks/webhook-emitter.service.ts:17-36` still has no `.limit()` on the subscriptions
  query and still fans out serially with a 10 s abort per subscriber. **Inventory — out of release
  scope**, noted only.

### PRD-C094 — frontend loaders and TanStack consumers reuse/prefetch the canonical request

**Partially met.** The six hydrated routes still agree — `check:query-scope` and `check:query-signal`
both exit 0 in the frontend, and `lib/prefetch/` holds a `prefetch-contract.test.ts` and a
`hydration-contract.test.ts` that pin the key shape.

The two genuine duplicate fetches are unchanged at head (F-14), and the count of consumers that
refetch on mount is now **28 files** calling `useProject(`.

---

## 3. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| F-1 | **P1** | `openapi.json` (HEAD `a40144862`) + `frontend/contracts/openapi.json` | The published contract is stale by 13 operations; the vendored frontend copy is byte-identical |
| F-2 | **P1** | `frontend/hooks/api/blog-admin.ts:136` | `GET /blog/admin/categories` does not exist — the blog category admin tab is permanently broken |
| F-3 | **P1** | `frontend/hooks/api/accounting/banking.ts:157` | `GET /finance/bank-accounts/{id}` does not exist — the bank-account detail screen never renders |
| F-4 | **P1** | `frontend/features/hr/feedback/results-tab.tsx:25,74-77` | Every stat on the 360° feedback panel reads a field the API does not send |
| F-5 | **P1** | `frontend/features/workflows/builder/workflow-builder-canvas.tsx:52` | The workflow publish optimistic lock is inert; concurrent publishes lose an update silently |
| F-6 | **P1** | `src/me/me.controller.ts:64-71` | `GET /me/login-history` 500s on a malformed `page`/`limit`, and its OFFSET is unbounded |
| F-7 | **P1** | `src/modules/chat/chat-saved.controller.ts:32` | `GET /chat/saved?limit=abc` produces `LIMIT NaN` → 500 |
| F-8 | **P1** | `src/modules/support/core/support-sla.controller.ts:148`, `src/modules/organization/setup/org.controller.ts:34` | A negative `limit` reaches `LIMIT` → `LIMIT must not be negative` → 500 |
| F-9 | **P1** | `src/scripts/baselines/unbounded-reads-classification.json` | Two unbounded CSV exports are suppressed by a per-file FALSE-POSITIVE justification that is factually wrong |
| F-10 | **P1** | `src/modules/users/users.controller.ts:68,259` | `/v2/users` and `/v2/users/{userId}` are live and in no document; the registry and breaking-change gates cannot see them |
| F-11 | **P2** | `contracts/route-budgets.json` (`GET /cron/storage-sweep`) | The per-org unit fix did not land; `check:benchmark-manifest` is red on a wrong-unit budget |
| F-12 | **P2** | `frontend/hooks/api/hr/employees.ts:52` | `useLegacyDepartments` calls a nonexistent route; no consumer, so it is dead weight rather than a broken screen |
| F-13 | **P2** | `src/modules/calendar/calendar.service.ts:149` | `POST/PUT /calendar/events` return all 29 columns; the client type names 5 fields the route never sends |
| F-14 | **P2** | `frontend/app/(authenticated)/build/[projectId]/layout.tsx:36` (+ workspaces twin `:24`) | `GET /build/:id` fetched twice per navigation; 28 files refetch on mount |
| F-15 | **P2** | `src/modules/e-sign/sign-settings.service.ts:40-54` | `GET /sign/admin/settings` returns `webhook_secret` (plaintext `text` column) in the whole row |
| F-16 | **P2** | `src/modules/notifications/notifications.controller.ts:76`, `src/modules/auth/auth.controller.ts:341`, `src/modules/api-tokens/core/api-tokens.service.ts:126` | `x-no-compression` has **zero adoption**; three token-returning routes stay compressible under credentialed CORS |
| F-17 | **P2** | `src/modules/email/email.service.ts:152-165` | Serial one-send-per-recipient over an uncapped list, same XLSX re-attached; `emails.batch.send` unused |
| F-18 | **P2** | `src/scripts/check-idempotent-commands.mjs` | The gate enforces zero handlers: 11 in scope, all 11 excluded |
| F-19 | **P2** | `src/modules/kb/help-centre/…` → `GET /public/kb/{slug}/attachments` | Published, externally consumed, takes `page`/`limit`, returns a bare array (`check:envelope-consistency` exit 1) |
| F-20 | **P2** | `src/scripts/check-referential-action-drift.ts`, `src/common/cache/cache-fill.ts`, `src/common/cache/cache.service.ts` | Three unledgered/stale assertion entries keep `check:type-assertions` red |

### F-1 — `openapi.json` at HEAD does not describe the code (P1)

**Evidence.** `pnpm openapi:check` (wired into `.github/workflows/ci.yml:338`) at the committed HEAD:

```
openapi.json is STALE. Run: pnpm openapi:generate
  13 changed operations, 0 added, 0 removed
```

I proved it independently by generating a fresh document to the scratchpad and diffing it against
`git show HEAD:openapi.json`: **13 changed, 0 added, 0 removed.** Every difference is the same shape —
the document **omits a bound the code enforces**:

```
PATCH /users/{userId}                    + "additionalProperties": false
PATCH /access/org-modules/{moduleKey}    + "additionalProperties": false
PATCH /organization/settings             + "additionalProperties": false
POST  /org/announcements                 + "additionalProperties": false
POST  /support/routing-rules             + "maxItems": 50
PATCH /support/routing-rules/{ruleId}    + "maxItems": 50
POST  /support/sla-policies              + "maxItems": 5
PATCH /support/sla-policies/{slaPolicyId}+ "maxItems": 5
POST  /tasks/sequences                   + "maxItems": 100
PATCH /timesheets/settings               + "maxItems": 50, "minLength": 1, "maxLength": 100
PATCH /sign/admin/settings               + "maxItems": 20, "maxItems": 50, "minLength": 1, "maxLength": 50
POST  /sign/admin/watermark-policies     + "maxItems": 20, "maxItems": 500, "minLength": 1, "maxLength": 50
PATCH /sign/admin/watermark-policies/{policyId}  (same)
```

**How it got there.** `git log -S` shows the bound
`conditions: z.array(routingConditionSchema).min(1, …).max(50)` was introduced *in* `a40144862` —
the ticket-04 commit that also regenerated `openapi.json`. That commit's file list includes
`support-tickets.schemas.ts`, `support-sla.schemas.ts`, `task.schemas.ts`, `settings.schemas.ts`,
`users.schemas.ts`, `organization.schemas.ts`, `announcements.schemas.ts` and `e-sign.schemas.ts` —
none of which appear in that report's own "Files changed" list. This is the documented
shared-git-index trap: a bare `git commit` swallowed another agent's staged bounds *after* the
regenerate had already run.

**Failure scenario.** A partner generates a client from the published document, which says
`POST /support/routing-rules` accepts an unbounded `conditions` array and `PATCH /users/{userId}`
accepts extra properties. They send 60 conditions and one unknown key. Both are rejected with a 400
the contract says is impossible. Worse, every downstream gate — `check:contract-registry`
(102 published operations with named external consumers), `check:contract-breaking-change`,
`check:bounded-contracts`, `check:envelope-consistency`, `check:openapi-coverage` — reads this
document. **They are all green over an artifact that does not describe the code**, and
`check:contract-vendor` proves the frontend ships the same stale copy
(`sha256 9cba20e2ca1d90f5…`, identical on both sides).

**Fix.** `pnpm openapi:generate`, re-vendor to `frontend/contracts/openapi.json`, and commit both
with the schema change that caused the drift. Longer term: `openapi:check` must run in the same job
as any commit touching `**/dto/*.schemas.ts`.

**Note for the sweep:** while I was auditing, a concurrent agent regenerated the *working-tree* copy
at 21:27, so a re-run of `openapi:check` now prints "current". The **committed** artifact at the head
I audited is still stale (`git show HEAD:openapi.json` proves it), and the frontend's vendored copy
is still stale on disk. Whether this closes depends on that agent committing both files.

### F-2 — `GET /blog/admin/categories` does not exist (P1)

`frontend/hooks/api/blog-admin.ts:131-139` declares `useAdminBlogCategories` and calls
`apiClient.get<AdminBlogCategory[]>("/blog/admin/categories")`. `BlogAdminController`
(`src/modules/blog/blog-admin.controller.ts:33`) is `@Controller("blog/admin")` and declares
`@Get("posts")`, `@Get("posts/:postId")`, `@Post("categories")`, `@Patch("categories/:categoryId")`,
`@Delete("categories/:categoryId")` — **no `@Get("categories")`**. `openapi.json` confirms:
`POST /blog/admin/categories` and `DELETE|PATCH /blog/admin/categories/{categoryId}` exist; the GET
does not. There is no Next route handler under `app/**` for it, and `apiClient` targets the backend
directly (`lib/api-client.ts:15,256`).

**Failure scenario.** Any user with `blog:categories:manage` opens the Blog admin → Categories tab.
The request 404s, `features/blog/admin/blog-admin-categories.tsx:184` renders `ErrorState`, and the
category list is never shown — so the Add/Edit/Delete flows (which *do* exist server-side) have
nothing to operate on. The screen is permanently broken.

Second-order: even after the route is added, the field is misnamed. The nearest existing handler,
`blog.service.ts getCategories`, projects `count: count(blogPosts.id)`; the client type declares
`postCount: number` (`hooks/api/blog-admin.ts:128`) and renders `row.postCount` at
`features/blog/admin/blog-admin-categories.tsx:95,99`.

**Fix.** Add `@Get("categories")` to `BlogAdminController` returning the admin projection, and align
on one name — either rename the service projection to `postCount` or the client field to `count`.

### F-3 — `GET /finance/bank-accounts/{id}` does not exist (P1)

`frontend/hooks/api/accounting/banking.ts:157` — `useBankAccount(id)` calls
`apiClient.get<BankAccountRecord>('/finance/bank-accounts/' + id)`.
`src/modules/finance/banking/bank-accounts.controller.ts` (`@Controller("finance/bank-accounts")`)
declares `@Get()` `:41`, `@Post()` `:51`, `@Patch(":bankAccountId")` `:62`,
`@Get(":bankAccountId/transactions")` `:73` — **no `@Get(":bankAccountId")`**. `openapi.json` agrees.

**Failure scenario.** `features/accounting/banking/components/bank-account-detail-client.tsx:142`
calls it on mount. `accountQuery` always errors, `isError` is always true (`:155`), and the bank
account detail page renders its error state with a Retry button that can never succeed. Accounting
is explicitly in release scope.

**Fix.** Add `@Get(":bankAccountId")` with a `@Validate({ params })` schema and an explicit DTO
projection, or repoint the hook at the list endpoint and select client-side.

### F-4 — the 360° feedback results panel reads four fields the API does not send (P1)

Backend `src/modules/hr/performance/feedback.service.ts:136-165` — `getResults` returns
`{ subjectId, requests, responses }` (and `{ subjectId, requests: [], responses: [] }` on the empty
path). Frontend `hooks/api/hr/feedback.ts:34-45` declares
`FeedbackResult { subjectId, totalRequests, completedRequests, avgRating?, responses[] }`.

`features/hr/feedback/results-tab.tsx`:
```ts
:23  const completionPct = results && results.totalRequests > 0
:25      ? Math.round((results.completedRequests / results.totalRequests) * 100) : 0;
:74  <StatCard label="Total Requests" value={results.totalRequests} …/>
:77  <StatCard label="Completed"      value={results.completedRequests} …/>
:78  <StatCard label="Avg Rating"     value={results.avgRating !== undefined ? … : "—"} …/>
:79  <StatCard label="Completion"     value={`${completionPct}%`} …/>
:88  <div style={{ width: `${completionPct}%` }} />
```

**Failure scenario.** An HR manager searches an employee with completed 360° feedback. `totalRequests`
and `completedRequests` are `undefined`, so two stat cards render nothing; `avgRating` is `undefined`
so the third shows "—"; `undefined > 0` is `false`, so `completionPct` is hard-coded to **0** and both
the fourth card and the progress bar always read **0 %** — including for an employee whose feedback
is 100 % complete. Four of four values on the panel are wrong, and `responses` (which the backend
*does* send) is never rendered. Both repos typecheck clean.

**Fix.** Either have `getResults` compute and return `totalRequests`/`completedRequests`/`avgRating`
(note it already filters `status = 'COMPLETED'`, so "total" needs a second, unfiltered count), or
derive them in the hook from `requests`. Then attach a `@ResponseSchema` so the interceptor asserts it.

### F-5 — the workflow publish optimistic lock never fires; concurrent publishes lose an update (P1)

Three independent reasons this is inert:

1. **The only caller omits the field.** `features/workflows/builder/workflow-builder-canvas.tsx:52`
   is the sole consumer of `usePublishWorkflow` and calls
   `publishWorkflow.mutate({ id: workflowId, definitionJson: definition })` — no `expectedVersion`.
2. **The server skips the check when it is absent.** `src/modules/workflows/workflows-crud.service.ts:186`
   — `if (dto.expectedVersion !== undefined && dto.expectedVersion !== workflow.version) throw …`.
   `workflow.schemas.ts:24` declares it `.optional()`.
3. **Even when supplied, it is a TOCTOU.** The read is at `:180-184`; the transaction opens at `:193`.
   Two publishes can both read version `N` and both pass.

And nothing catches it downstream: the live catalog has **no unique constraint on
`(workflow_id, version)`** —
```
uniq_workflow_versions_org_id  UNIQUE (org_id, id)
workflow_versions_pkey         PRIMARY KEY (id)
idx_workflow_versions_workflow_version   -- plain btree, NOT unique
```

**Failure scenario.** Two editors publish the same workflow within the same second. Both read
`version = 3`, both insert `workflow_versions` rows numbered `4`, both succeed. The workflow now has
two version-4 rows with different definitions, and whichever `workflows.version` update lands second
decides which definition is live. The other editor's publish is silently lost. Meanwhile the UI at
`workflow-builder-canvas.tsx:57-58` renders a carefully written 409 handler —
*"Another user published a newer version — refresh before publishing"* — that **can never fire**.
`hooks/api/workflows/workflows-mutations.test.tsx:94` asserts *"includes expectedVersion in the
publish request body"* against a synthetic input, so the test is green over a caller that omits it.

**Fix.** Make `expectedVersion` required in `PublishWorkflowDto`, have the canvas pass
`workflow.version`, move the comparison inside the transaction as a CAS on the `workflows` row
(`UPDATE … SET version = version + 1 WHERE id = ? AND version = ?`, 409 on zero rows — the pattern
`worker-engagements.service.ts:383` already gets right), and add a unique index on
`(org_id, workflow_id, version)`.

### F-6 / F-7 / F-8 — unvalidated numeric query params reach `LIMIT`/`OFFSET` (P1)

All three are the same class: a raw `@Query("x")` string, no Zod schema, coerced with `Number(...)`
or `parseInt(...)`, reaching SQL. I proved the SQL consequence on `scratch_head_1010`:
`LIMIT 'NaN'` → `invalid input syntax for type bigint: "NaN"` (22P02); `LIMIT -5` →
`LIMIT must not be negative` (2201W). Both surface as a 500.

**F-6 — `GET /me/login-history`** (`src/me/me.controller.ts:61-71`, `@Universal()`, reachable by
every authenticated user) → `me.service.ts:85-96`:
```ts
:64  @Query("page")  page  = 1,
:65  @Query("limit") limit = 20,
:71  return this.meService.getLoginHistory(u.userId, Number(page), Math.min(Number(limit), 100), …);
     // service: const offset = (page - 1) * limit;  findMany({ limit, offset })
```
- `?limit=abc` → `Math.min(NaN, 100)` = `NaN` → `LIMIT NaN` → **500**.
- `?limit=-5` → `Math.min(-5, 100)` = `-5` → **500** (no lower clamp).
- `?page=1e9&limit=100` → `offset = 99,999,999,900` — an unbounded OFFSET the database must scan and
  discard. No cap on `page` exists anywhere on the path.

**F-7 — `GET /chat/saved`** (`src/modules/chat/chat-saved.controller.ts:29-33`):
`parsedLimit = limit ? Math.min(Math.max(1, parseInt(limit, 10)), 100) : 30` — `Math.max(1, NaN)` is
`NaN`, so `?limit=abc` yields `safeLimit = NaN` in `chat-saved.service.ts` and `limit: NaN + 1` →
**500**. (The `cursor` arm is accidentally safe: `NaN` is falsy, so the service's `if (cursor)` drops
it — the cursor is silently ignored rather than erroring.)

**F-8 — negative limits.** `src/modules/support/core/support-sla.controller.ts:148`
(`Math.min(Number(limit) || 50, 100)`) and `src/modules/organization/setup/org.controller.ts:34-40`
(`Number.isFinite(parsedLimit) ? parsedLimit : undefined`) both guard `NaN` but **not sign**:
`?limit=-5` passes `Number.isFinite`/`||` and reaches `LIMIT -5` → **500**.

**Fix (one shape for all three).** Replace the raw `@Query("x")` bindings with
`@Validate({ query: z.object({ page: pageField(), limit: pageSizeField(20, 100) }).strict() })` —
the repo already has `pageSizeField` and applies it to 598 handlers. That fixes NaN, sign and the
upper bound in one place, and makes the bounds appear in `openapi.json`. The scanner I used found
**18 handlers with this exact shape**; the other 13 happen to be saved by a `|| default` fallback,
which is luck, not a contract.

### F-9 — two unbounded CSV exports, hidden by a wrong per-file FALSE-POSITIVE (P1)

`src/modules/clients/clients.service.ts:265-300` (`exportCsv`) selects every client row for the org
with **no `.limit()`**, then buffers the whole CSV into one string; served at
`clients.controller.ts:97-104` as `GET /clients/export`. Same shape at
`src/modules/quotes/quotes-lifecycle.service.ts:238-275`, served at `quotes.controller.ts:82`.

**Why no gate sees them** — `src/scripts/baselines/unbounded-reads-classification.json`:
```
"/clients/clients.service.ts":        {"verdict":"FALSE-POSITIVE",
   "justification":"client reads bounded by clientId+orgId (single-record lookups) or by explicit filter conditions 2026-09-01"}
"/quotes/quotes-lifecycle.service.ts":{"verdict":"FALSE-POSITIVE",
   "justification":"quote lifecycle reads bounded by quoteId+orgId (single-record state machine) 2026-09-01"}
```
Neither justification is true of the export path. `exportCsv` is an org-wide list, and
`clientPartyViewScope` is a *permission* scope, not a size bound. The classification is keyed **per
file**, so one wrong sentence suppresses all three flagged reads in `clients.service.ts` and the one
in `quotes-lifecycle.service.ts`. `check:unbounded-reads` reports exit 0 with
"310 FALSE-POSITIVE files · 2 ACTIONABLE files · 3 unbounded reads".

**Failure scenario.** A tenant with 400,000 clients calls `GET /clients/export`. The service
materialises every row in Node, builds one string of tens of megabytes, and the process OOMs or the
request times out — taking other tenants' requests on the same instance with it.

**Fix.** Stream both exports the way `contacts.controller.ts:98-110` already does (keyset page +
`res.write` + drain backpressure + `res.destroyed` check), and correct both classification entries so
the justification names the *export* method rather than the lookups.

### F-10 — two live routes are in no document (P1)

`src/main.ts:85-88` enables `VersioningType.URI` with
`defaultVersion: [API_VERSION_CURRENT ("1"), VERSION_NEUTRAL]`.
`src/modules/users/users.controller.ts:68` and `:259` carry `@Version(API_VERSION_NEXT)` = `"2"`, so
`GET /v2/users` (`listUsersV2`) and `GET /v2/users/{userId}` (`getUserV2`) are live. The frontend
depends on them: `hooks/api/users/queries.ts:26` and `:52`, consumed by `features/users/users-page.tsx:186`,
`features/users/user-detail-sheet.tsx:94`, `features/directory/people/person-modules-tab.tsx:35` and
`person-membership-tab.tsx:41`.

`openapi.json` contains **no path beginning `/v2`**. `SwaggerModule.createDocument` was never told
about the versioning, so both operations are invisible to every contract gate.

**Failure scenario.** `check:contract-registry` prints *"OK — all 3656 operations are classified"* and
`check:contract-breaking-change` prints *"OK — no breaking changes detected"* over a document that
omits the two routes serving the user directory. Renaming a field on `toUserIdentity` would break
four frontend screens with both gates green, and no external consumer generating a client from the
document can see the v2 identity API at all.

**Fix.** Pass the version set to the Swagger document builder in
`src/common/openapi/build-openapi-document.ts` so versioned handlers emit `/v{n}/...` paths, then
regenerate. Until then, `x-exposure: 3642/3642 stamped` is a count over an incomplete surface.

### F-11 — the storage-sweep per-org budget fix did not land (P2)

`contracts/route-budgets.json` at head, `GET /cron/storage-sweep`:
`"maxDownstreamCalls": 0, "measuredDownstreamCalls": 8` — and **no** `maxDownstreamCallsPerOrg`,
**no** `measuredOrgsSwept`, **no** `supersedes` block. (`maxDownstreamCallsPerOrg` appears twice in
the file and `measuredOrgsSwept` seven times, all on the retention worker batches, none on
storage-sweep.) `check:check-route-budgets.mjs` implements the per-org composition and the gate
script references `maxDownstreamCallsPerOrg` 15 times, so the mechanism exists and is unused here.

Consequence: `check:benchmark-manifest` is **exit 1** with two breaches
(`GET /cron/storage-sweep@reference` and `@minority`, downstream 8 > declared 0), and
`check:route-budgets-http` prints the same BREACH line (though it does not gate on it). The
underlying behaviour is correct — `forEachOrg` issues exactly one `ListMultipartUploadsCommand` per
active organisation, and the capture database has 8 — so this is a wrong **unit**, not a regression.

**Fix.** Re-apply `maxDownstreamCallsPerOrg: 1` + `measuredOrgsSwept: 8` with the fixed component
left at `0`, as the prior report described.

### F-13 — `POST`/`PUT /calendar/events` return every column (P2)

`src/modules/calendar/calendar.service.ts:149` (and `:267` for update) use a bare `.returning()`.
`calendar_events` has **29 columns**; 14 of them are declared by no client type and are internal:
`agenda`, `post_meeting_notes`, `linked_deal_id`, `linked_lead_id`, `reminder_15min_sent`,
`integration_connection_id`, `external_event_id`, `timezone`, `recurrence_end`,
`linked_lead_party_id`, `created_by_membership_id`, `visibility`, `local_version`, `rrule`.

The client's `CalendarEvent` (`frontend/hooks/api/calendar.ts:46-66`) declares 20 fields, **5 of
which this route never sends**: `createdBy` (the column is `created_by_membership_id`), `attendeeIds`,
`isRecurring`, `recurringRule` (the column is `rrule`), and the relation `creator`. The prior report
fixed `rrule`/`isRecurring` on the *list* route's projection; the *mutate* response type is still
drifted in both directions.

**Fix.** Project the create/update `.returning()` explicitly to the fields the client declares, and
correct the client's five phantom fields in the same change (it is a wire change, so both repos move
together). Attach a `@ResponseSchema` so the interceptor asserts it thereafter.

### F-15 — `GET /sign/admin/settings` returns a plaintext webhook secret (P2)

`src/modules/e-sign/sign-settings.service.ts:43-54` — `getOrCreate` returns the whole
`sign_org_settings` row; `sign-admin.controller.ts:35-38` returns it verbatim.
`src/db/schema/e-sign/settings.ts:45` declares `webhookSecret: text("webhook_secret")` with no
encryption helper anywhere in the module. This is org-scoped and gated on `sign:settings:manage`, so
it is over-exposure rather than a leak, but it is exactly what C088 says to omit — and it is the
kind of body F-16's BREACH argument applies to.

**Fix.** Project the read, mask the secret to a hint (the pattern `webhooks.service.ts` already uses),
and set `x-no-compression` on any route that does return it.

---

## 4. What head already gets right

Worth recording, because several of these are the failure shapes this repo has shipped before and
they are genuinely absent:

1. **Request-body validation is complete.** 1,392 handlers bind `@Body()`; **zero** lack a Zod body
   schema. `check:body-binding` confirms from the other side: 1,941 validated slots, 0 UNBOUND.
2. **`@ResponseSchema` is load-bearing, not documentation.** `ResponseContractInterceptor` is
   registered innermost (`app.module.ts:221`), throws under `NODE_ENV=test`, logs elsewhere, skips
   streams, and reports paths and Zod issue codes only — never values. 55 tests green at head.
3. **No floating-point money.** Of 944 live tables, exactly **2** columns are `real`/`double precision`
   with a money-ish name, and both are capacity telemetry.
4. **Secrets are handled correctly in three of the four plaintext-bearing modules I traced.**
   `webhooks.service.ts` strips on every read and reveals once on create/rotate;
   `hr-webhooks.service.ts` uses `columns: { secret: false }` on both reads;
   `support-channels.service.ts` does the same with `inboundSecret`.
5. **Home aggregation is bounded, parallel and independent** — and proven behaviourally, not by
   inspection (C087).
6. **Directory engagements are the one correct optimistic-concurrency implementation**: required
   version, CAS in the `WHERE`, 409 on zero rows, and the version actually round-trips to the client.
7. **`getPostgresErrorDetails` is used correctly at 192 call sites**, including all five in-scope HR
   SQLSTATE handlers. The 14 dead `err.code === "23505"` sites are all in CRM/Inventory.
8. **`check:openapi-coverage` and `check:envelope-consistency` now refuse to over-report.** The
   former prints *"NOT A PASS FOR THIS RULE — 0.69 % of the response contract is declared"*; both
   print what they did **not** scan. `gate-corpus.mjs` makes an empty corpus exit 2 rather than 0.
   This is the single biggest structural improvement since the prior report.
9. **Query-key scoping is intact** — `check:query-scope` (5,353 files) and `check:query-signal`
   (1,056 `queryFn` blocks) both exit 0, and all six hydrated routes' keys match.
10. **Backpressure is real**: admission 200/400/50 per org, DB pool lane admission with queue shed,
    AI per-org cap of 20, and a request deadline that is now reachable.

---

## 5. Blocked on infrastructure — explicitly NOT MEASURED

| what | why | what would measure it |
|---|---|---|
| `pnpm typecheck` (either repo) | 8–12 GB heap; forbidden under the 26-agent budget | the orchestrator's central run |
| `GET /calendar/events` p95 (915.944 ms vs the 800 ms PRD ceiling) | needs the seeded HTTP harness | `test/perf/route-budget-http.seeded-e2e-spec.ts` against `scratch_t23_http`, then `node test/perf/merge-http-route-budgets.mjs --write` |
| p50/p95/p99 **at the release commit** | the capture is `ef3c1960`, **358 commits behind head**, taken on a dirty tree | `node test/perf/measure-benchmark-manifest.mjs --samples=200 --replicates=3 --concurrency=8 --iterations=48 --plans --write` on `scratch_perf_seed` at head |
| the remaining 126/280 statement ceilings and 28/164 request-level slots | seeding gaps (7 modules have zero rows on one or more tenants) and declined slots | seed the missing tenants, then re-capture |
| end-to-end HTTP proof of F-6/F-7/F-8 | no running backend under this budget | `curl "$API/me/login-history?limit=abc"` against a booted server. I proved the SQL half against `scratch_head_1010` and traced the JS half by reading; the HTTP status is inferred, not observed |
| `check:alert-ack` | needs a real `ALERT_WEBHOOK_URL` and a human acknowledgement | out of reach here, as flagged in the shared context |

---

## 6. Verdict

**Not met.** 1 of 13 criteria (C087) is met with proof. C047, C048, C085, C086, C088, C089, C090,
C091 and C094 are partially met with measured residuals. C049, C092 and C093 are not met.

The single most consequential fact in this audit is **F-1**: the artifact that seven contract gates
read, and that the frontend vendors verbatim, does not describe the code at head — and the gate that
would have said so (`openapi:check`) sits outside the `check:*` naming convention, so it was absent
from the prior report's ledger of 40 gates. The ticket's stated goal is *"one validated, versioned
API contract whose backend, frontend, and OpenAPI representations agree."* At head, the backend and
the OpenAPI representation disagree on 13 operations, the OpenAPI representation omits 2 live
operations entirely (F-10), and the frontend calls 2 operations that do not exist (F-2, F-3) while
reading fields on 3 more that are never sent (F-4, F-13, and the carried-over `syncError`).
