# 18 — Shared database, query and cache contracts (PRD-C065–C080) — head audit

**Backend HEAD:** `66f09164f` on `release/code-10-10-v2`
**Frontend HEAD:** `ab6a77a69` on `release/code-10-10-v2`
**Prior report:** `reports/18-query-cache-contracts.md`, taken at backend `591cf663` — **15 commits behind this run.**

**Honesty caveat that colours everything below.** The shared working tree carries **268 modified
files** at the time of this run (`git status --porcelain | wc -l`), written by the ~26 concurrent
agents. Among them are `contracts/route-budgets.json`, `contracts/benchmark-manifest.json`,
`openapi.json`, `migrations/meta/_journal.json` and 30+ files under `src/db/schema/`. Every number
here was measured against **HEAD plus that uncommitted delta**, which is what a developer's checkout
actually holds right now, but is not what `66f09164f` alone contains. The journal moved from 681 to
683 entries *during* this session.

---

## 0. What I read, with numbers

### Source corpus walked

| corpus | count | how counted |
|---|---|---|
| backend `src/**/*.ts` | **5,787** | `find` |
| ” non-spec | **3,668** | `find` minus `*.spec.ts`, `__tests__`, `*e2e-spec.ts` |
| ” controllers | **550** | `*.controller.ts` |
| ” services | **1,078** | `*.service.ts` |
| ” `src/db/schema/**` | **350** | `find` |
| ” `src/scripts/**` | **363** | gate + tool scripts |
| journalled migrations | **683** | `migrations/meta/_journal.json` |
| live tables, `scratch_head_1010` | **1,028** | `pg_tables` |

### The shared seam, read line by line

- `src/common/cache/` — **22 files**. Read in full: `cache.service.ts` (297), `cache-fill.ts` (330),
  `cache-keys.ts` (267), `cache-region-router.ts` (59), `cache-hash.ts` (10),
  `cache-key-dimension-registry.spec.ts` (138), the 5-file invalidation matrix (1,055 lines total).
- `src/common/pagination/` — **13 files**. Read `pagination.ts`, `list-query.schema.ts`,
  `cursor.ts`, `window-count.ts`.
- `src/db/` non-schema — **23 files**. Read `query-fingerprint.ts` (95), `query-fingerprint-registry.ts`
  (152), `query-telemetry.ts` (241), `pool-telemetry.ts` (263), `borrow-scope.ts` (68),
  `pool.config.ts` (guards block).
- `test/perf/` — **28 files**. Read the 4-part heavy-query catalog and `measure-heavy-query-plans.mjs`.

### Cache call-site census (my own AST-free walk, non-spec only)

| method | sites |
|---|---|
| `cached` | 88 |
| `cachedVersioned` | 95 |
| `cachedForOrg` | 16 |
| `cachedVersionedForOrg` | 14 |
| **TOTAL READ SITES** | **213** |
| `invalidate` | 144 |
| `invalidateNamespace` | 220 |
| `invalidateForOrg` | 66 |
| `invalidateNamespaceForOrg` | 29 |
| `del` | 43 |
| `invalidateMany` | 7 |
| `invalidateNamespaceMany` | 1 |

`CACHE_KEYS` holds **132** factories. **7** take no `orgId` (each checked individually, §C067).

### Gates run at head — 18 of them, with exit codes

```
check:cache-key-shapes            EXIT 0   0 bytes, 0 files    ← VACUOUS, see F4
check:cache-key-shapes:self-test  EXIT 0   0 bytes             ← the anti-vacuity test is itself vacuous
check:cache-invalidation          EXIT 0   187 write / 475 invalidate sites, 131 factories
check:namespace-coverage          EXIT 0   75 reads / 76 bumps, 5 warnings
check:unbounded-reads             EXIT 1   2,308 files; 1 UNCLASSIFIED  ← FAILS AT HEAD, see F9
check:db-call-count               EXIT 0   2,175 files; 32 ACTIONABLE files / 51 sites; 3 INVISIBLE
check:n1-growing-loops            EXIT 0   2,175 files, 5,110 loop nodes; 97 GROWING (ratchet 102)
check:query-projections           EXIT 0   3,665 files; 1,377 unprojected (ceiling 1,383)
check:relation-hydration          EXIT 0   3,665 files, 896 tables, 1,729 call sites; 186 (ratchet 186)
check:relation-keys               EXIT 0   111 relation keys
check:bulk-id-limits              EXIT 0   3,393 files; 0 findings (name-filtered scope, see F6)
check:tenant-indexes              EXIT 0   347 schema files; 840/840
check:idempotent-commands         EXIT 0   526 files; 11 in scope, all excused
check:hr-pagination               EXIT 0   194 files; 35 (baseline 60)
check:transaction-callbacks       EXIT 0   473 doubles, 272 invoking, VOID 2
check:fire-and-forget             EXIT 0   tier1 0, tier2 255 (ratchet 279)
check:outbox-consumers            EXIT 0   24 emitted / 29 registered
check:conflict-targets            EXIT 0   364 onConflict, 162 explicit, 14 partial-index, 2 unresolved
check:placement-bypass            EXIT 0   147 bypasses, 45 provider-in-tx  ← was EXIT 1, see F3
check:declaration-column-drift    EXIT 0   (owner on scratch_head_1010)
check:declaration-constraint-drift EXIT 0  1,186 live-but-undeclared; 51 perf findings baselined
check:referential-action-drift    EXIT 0
check:tenant-relationships        EXIT 2   ← INCONCLUSIVE, 682 of 683 journal entries, see F13
```

### Live measurement actually taken

- **`node test/perf/measure-heavy-query-plans.mjs --org=large`** against `scratch_perf_seed` as
  `streamline_app` (`rolbypassrls=false`, no-GUC read denied `42501` — printed by the runner before it
  measures anything). **36 queries, 8 categories, all executed**, `EXPLAIN (ANALYZE, BUFFERS)`.
- **11 hand-written `EXPLAIN (ANALYZE, BUFFERS)`** as `streamline_app` with the GUC set, across
  three tenants (89.9 % / 9.0 % / tiny).
- **Two full drain simulations** in PL/pgSQL, summing buffers over every keyset page.
- **`jest --config jest-e2e.json --testPathPattern=route-db-call-budget`** — 5/5 pass, seeded.
- **`jest --testPathPattern="common/cache/"`** — 8 suites, **254 tests**, all pass.
- **Live catalogue census** of tenant-leading indexes over 825 tenant tables.

### Seed used

`scratch_perf_seed`, 1,729 MB, 8 orgs (4 application tenants at 89.93 / 9.00 / 0.90 / 0.18 %),
60,025 calendar events / 7,500 exceptions / 266,400 notifications / 3,336 support tickets on the
large tenant. **It is at 665 of 683 journal entries — 18 migrations behind head.** Nothing I measured
touched a column added in those 18, but the caveat is real and I did not re-bootstrap it (a
1.7 GB replay under a 26-agent laptop budget was not defensible).
`scratch_head_1010` is at **682 of 683**, which is why the tenant-relationship gate is inconclusive.

---

## 1. Per-criterion assessment

### PRD-C065 — explicit projections, tenant-leading indexes, no required full scan or avoidable sort

**PARTIALLY MET.**

**Tenant-leading indexes: MET, and verified against the live catalogue, not just the declaration.**
`check:tenant-indexes` claims 840/840 from 347 schema files. I checked the other half — the running
catalogue:

```sql
-- scratch_head_1010, every relkind r|p in public carrying an org_id column
live tenant tables = 825   with an org_id-leading index = 825   WITHOUT = 0
```

**Projections: ratchet, not clean.** 1,377 unprojected reads (287 `findMany`, 488 `findFirst`,
602 bare `.select()`) against a ceiling of 1,383 — **6 slots of headroom**. The specific prohibitions
*are* at zero: 0 unprojected count paths, 0 full-row reads of the 5 vector/tsvector/bytea tables,
0 relation hydrations onto global `users` or a credential-bearing table.

**Full scans: NOT met — three named, measured.** From the 36-query run on the large tenant:

| query | plan | rows read → returned | buffers |
|---|---|---|---|
| `recurrence-exceptions-uncapped` | **Seq Scan** `calendar_event_exceptions` | 8,328 → 800 | 134 |
| `reminder-recurring-candidates` | **Seq Scan** `calendar_events` | 1,418 → 200 | 38 |
| `search-ticket-ilike-under-rls` | **Seq Scan** `tickets` | 20,572 → 18 | 435 |
| `vector-ann-org-filtered-direct` | Result | 12,000 → 20 | **48,491** |
| `unified-inbox-unread-count-by-user` | Bitmap Heap `notifications_y2026_m07` | 23,584 → 1 | **10,231** |

The ticket ILIKE is a *documented fallback* (`search.service.ts:132-145` logs "falling back to an
unindexed scan" when the trigram probe function is missing), so it is a degraded path, not the
primary. The two calendar Seq Scans are the primary path — see F1.

**The unread-count head-to-head is the sharpest single number in the run.** Two shapes answering the
same question:

```
unified-inbox-unread-count-by-user   10,231 buffers, 23,584 rows read → 1
membership-unread-count-equivalent       40 buffers,    451 rows read → 1     ← 256x cheaper
```

**A measured NEGATIVE result I am reporting rather than hiding.** I found the large tenant's reminder
drain planning as a **pkey walk with `org_id` demoted to a `Filter`**:

```
Index Scan using calendar_events_pkey  Index Cond: (id > 0)
  Filter: (... AND (org_id = 'aaaa…001') AND ...)   Rows Removed by Filter: 1200
```

while the 0.18 % tenant correctly uses `idx_calendar_events_org_recurring_start` with `org_id` as the
leading `Index Cond`. That looks like the classic "tenant predicate demoted" defect. **It is not.**
I rewrote the drain onto the existing `uniq_calendar_events_org_id (org_id, id)` index with a
row-comparison keyset and measured the whole 43-page drain both ways:

```
ORDER BY id  (head's shape)                43 pages,  2,073 buffers
(org_id, id) row-comparison keyset         43 pages, 12,673 buffers   ← 6.1x WORSE
```

The composite index is not covering, so it pays 8,571 heap fetches; the pkey walk is cheaper
*because* this tenant is 89.9 % of the table. The planner is adapting correctly in both regimes.
**No finding filed.** The C065 defect in this file is the missing time bound (F1), not the index.

---

### PRD-C066 — exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data

**MET.** This is the one criterion the prior report left entirely open, and head has a real
deliverable for it.

`test/perf/heavy-query-catalog.mjs` declares exactly the eight categories the criterion names and
composes four domain files into **36 named queries**, each carrying a `source:` field naming the
service line it was transcribed from. I ran the whole catalogue live:

```
role streamline_app · bypassrls=false · no-GUC read denied 42501 · database scratch_perf_seed
org large (aaaaaaaa) · membership 272 · unread 451 · watermark 239746 · recurring 200 · roles 3
Measuring 36 queries…
```

Coverage by category, all executed, all producing a plan:

| category | queries | worst buffers |
|---|---|---|
| reminder | 4 | 38 |
| export | 1 | 3,873 |
| free/busy | 3 | 1,668 |
| recurrence | 2 | 507 |
| fanout | 3 | 302 |
| unread | 8 | **10,231** |
| search/vector | 8 | **48,491** |
| dashboard | 7 | 125 |

The runner refuses to start under a BYPASSRLS role and proves RLS is live by asserting a no-GUC read
raises `42501` before it trusts any number. Seven head-to-head comparisons are decided on measured
buffers, not opinion.

**One caveat worth carrying:** the catalogue has partially drifted from head. `reminder-recurring-candidates`
carries `note: "LIMIT 200 with no ORDER BY"` and its SQL has no `ORDER BY`, but
`calendar-reminder-sweep.service.ts:63,91` now orders by `id` and pages by keyset. The measured
number is therefore for a shape the service no longer issues. I re-measured head's actual shape by
hand (§C065) and the conclusion did not change, but the catalogue needs re-transcribing.

**Also measured:** `dashboard-recent-activity-fullrow` and `-projected` both cost **65 buffers**.
Projection changed nothing at this shape — the heap fetch is identical. Bytes-on-the-wire is a
different axis (`measure-projection-bytes.mjs` owns it). Recorded so nobody re-derives it.

---

### PRD-C067 — cache keys include tenant, subject, permission and resource dimensions

**PARTIALLY MET — the keys are mostly right; the *contract* that would prove it covers 8–10 %.**

**Backend keys — I checked all 7 factories that take no `orgId`, individually:**

| factory | verdict |
|---|---|
| `userSession(userId)` | user-scoped; correct (but see F2) |
| `membershipAccount(userId)` | user-scoped; correct |
| `mfaUserTotp(userId)` | user-scoped; correct |
| `salesKpisSubKey(from,to,repId)` | a *sub*-key, composed under `salesKpisNamespace(orgId)`; correct |
| `featureFlags()` | genuinely global; **0 call sites** — dead |
| `mailMessages(accountId,…)` | **0 call sites — dead**; `mail.service.ts:299` builds its own key inline |
| `externalCalendarEvents(connId,…)` | `conn.id` is a serial pre-filtered by `orgId+userId` at `external-calendar-events.service.ts:44-50`; correct |

Then the whole read surface: of **213** cache read sites, **13** carry no org dimension in the first
400 characters of their arguments. I opened all 13. Twelve are correct (`blog_posts` is genuinely
global — no `org_id` column, no RLS, confirmed against the live catalogue; `inv-reports-extended` and
`projects-reports` build `cacheKey` from an org-bearing factory a few lines earlier). **Zero
cross-tenant key collisions found.**

**Permission dimension:** 53 non-spec files call `applyScope`; **12 of them also hold a cache read.**
I read every one. The in-scope ones carry the caller's dimension in the key:

- `payroll-summary.service.ts:121` — `…-${scope}-${actorUserId}`
- `dashboard-leave.service.ts:124` — `…:${scope}:${audience}:${isApprover ? "approver" : "self"}`
- `search.service.ts:126` — `searchResults(orgId, userId, hash)` with the access **version** in the hash
- `deals-crud.service.ts:36` — `{ ...query, userId, scope }` (CRM, out of scope, but correct)

**Frontend — MET, structurally.** `frontend/lib/query-scope.ts:28-39` hashes every TanStack key as
`["authenticated:<orgId>:<userId>", key]`, wired at `components/providers/query-provider.tsx:50` and
`lib/prefetch/server-query-client.ts:31`, with a `key={scope}` provider remount at
`query-provider.tsx:97`. Tenant and subject are structural, not per-key discipline. (Detail belongs
to report 19.)

**What is not met is the proof.** See F4 and F5: the gate named for this criterion scans nothing, and
the dimension contract covers 10 of 132 factories and 14 of 143 matrix entries.

---

### PRD-C068 — mutation/revocation invalidation, TTL/negative-cache policy, stampede protection, Redis degradation

**PARTIALLY MET.** The machinery is genuinely good and I could not fault most of it. One race is
unguarded and unspecced.

**What holds, read in `cache-fill.ts` line by line:**

- **Stampede — three layers.** In-process single-flight (`inFlight`, `:143-155`); a distributed fill
  lease with an `nx`+`ex` set and a **token-checked Lua CAS release** (`:246-249`, `:275-279`) so a
  slow leader cannot delete a successor's lease; and a waiter that polls the *lease* as well as the
  value (`:311-314`) so a null-valued or crashed leader releases waiters immediately instead of
  burning the full 2,000 ms window.
- **TTL jitter applies to every path.** `resolveTtl` (`:322-325`) jitters at the point the TTL is
  resolved for the write — `±15 %` — so no caller can bypass it. The comment at `:166-179` records
  that it used to be wired into 30 of 213 sites only.
- **Negative caching is deliberately absent.** `:266` — a `null` is never written, so a denial cannot
  outlive the grant that ends it. Confirmed by test: *"never memoises a null, so a denial cannot
  outlive the grant that ends it"*.
- **Degradation is bounded.** The outage memo is 1 s / 2,000 keys, armed **only** when Redis could
  not answer, refuses authorization-scoped keys and nulls, expires by insertion-order sweep rather
  than a timer per key, and `drop()` runs *before* the `!redis` early return so an explicit
  invalidation bites during the outage too.
- **Invalidation is retried, not dropped.** 3 attempts with backoff, and a final failure is an
  `error` with the stable marker `cache.invalidation.dropped` plus a `droppedInvalidationCount`
  counter — not a swallowed warning.
- **254 tests across 8 suites pass at head**, with explicit positive *and* negative controls
  (*"negative control: bare cached() key without orgId makes org-B read org-A data"*,
  *"P4 bite: actor-only invalidation leaves non-actors with stale sessions on B"*).

**What does not hold:** F2 — the write-after-delete race. And F14 — the authorization denylist.

---

### PRD-C069 — a maximum DB-call count for every critical route and worker batch; regression tests fail on unexpected calls

**PARTIALLY MET.** Verified live at head.

`contracts/route-budgets.json` (dirty in the tree — another agent has edited it this session):

```
budgets                     93     (70 route + 23 worker-batch)
classes            list 44 · worker 23 · aggregate 11 · write 10 · shell 5
dbCallBasis        default-ceiling 55 · declared-estimate 19 · counted-call-path 19
measuredDbCalls    populated 3   null 90          ← 3.2%; 0 of 23 worker batches
measuredBufferBlocks populated 54
surface.totalOperations 3,613                     ← 93 budgets = 2.6% of operations
```

A maximum *exists* for all 93, but **59 % carry the global default `maxDbCalls: 10`** rather than a
route-specific number, and **96.8 % have never had their actual call count measured.** The three that
have: `GET /notifications` (3/3), `GET /notifications/unread-count` (2/5), `GET /clients` (5/10).

**The regression half is real and I ran it.**

```
APP_DATABASE_URL=…scratch_perf_seed PGSSLMODE=disable \
  jest --config jest-e2e.json --testPathPattern=route-db-call-budget
PASS  5 passed, 5 total
  ✓ GET /notifications/unread-count stays within its declared database-call budget
  ✓ GET /notifications does not add a database statement
  ✓ GET /notifications stays within its declared database-call budget
  ✓ the ratchet fails when a route issues one statement more than its budget   ← negative control
  ✓ row-level security is live for the counted session
```

It counts as `streamline_app` with the tenant GUC at session scope, uses a real `CacheService` with a
null Redis so every measurement is the cache-miss ceiling, and prints its skip loudly when
`APP_DATABASE_URL` is absent. That is the right shape. **It covers 2 routes of 93 budgets (2.2 %).**

**Staleness:** `measurement.commit` is `06b9d7257`, which is **300 commits behind HEAD** with
**634 changed files under `src/modules/`** since. The manifest's own `commitNote` says to re-run
after any commit that alters a measured route.

---

### PRD-C070 — minimum correct tenant transaction, reuse the handle, no nested/per-row transactions, no borrowed committed transaction

**PARTIALLY MET.**

The seam is well built. `runInTenantTransaction(db, fn, { orgId })` reuses an ambient transaction
when one exists and opens its own when not; `src/db/borrow-scope.ts` (68 lines) carries a per-borrow
statement clock through `AsyncLocalStorage` so "connection held while nothing ran on it" is a
measured quantity, not an assumption. `check:transaction-callbacks` (473 transaction doubles, 272
invoking, 0 rejecting, VOID 2) directly targets the "a bare `jest.fn()` voids every assertion" trap.
`check:placement-bypass` builds a real trail (`handler -> service -> service -> AiGatewayService`).

Two things are not met:

- **F1** — `POST /calendar/events` does an unbounded, tenant-size-growing read inside the write's
  own transaction. That is the opposite of "the minimum correct unit".
- **F3** — 45 handlers hold the request transaction across a provider call, and the gate that would
  say so now says OK.

The good counter-example is in the same repo and should be the template: `audit-log.controller.ts#exportCsv`
opens **one `runInTenantTransaction` per 500-row keyset page** and holds none across a `res.write` —
the allowlist reason spells out "the minimum correct unit, one page not one row".

---

### PRD-C071 — named columns only, minimal DTO projections, never hydrate full rows / global users / large JSON-blob-vector on list/count/existence paths

**PARTIALLY MET.** The named prohibitions are all at zero; the general rule is a ratchet.

```
check:query-projections   3,665 files
  unprojected reads: findMany 287 · findFirst 488 · bare .select() 602 = 1,377  (ceiling 1,383)
  unprojected COUNT paths (.length only):                    0  (allowed 0)
  unprojected EXISTENCE/COUNT paths, AST:                    0  in scope (7 deferred to crm/inventory)
  full-row reads of a vector/tsvector/bytea table:           0  (allowed 0) over 5 such tables

check:relation-hydration  3,665 files · 896 tables · 611 relation blocks · 1,729 call sites
  unprojected relation hydrations:      186  (ratchet 186)
    onto global users:                    0  (allowed 0)
    onto a credential-bearing table:      0  (allowed 0)
  colliding const names not resolved:    81
  base-table credential CANDIDATES (reported, not enforced): 71
```

So: **1,377 reads still hydrate whole rows**, and the gate's own closing line is *"this is a ratchet,
not a clean repository."* The gate has 6 slots of headroom before it fails. The 81 unresolved
colliding const names are a real blind spot in the relation gate — it says so itself.

---

### PRD-C072 — batch relationship/permission/unread/attachment/assignee/metadata lookups; forbid DB or cache calls inside growing loops

**NOT MET.** Both gates pass; both say in their own output that they are ratchets, not compliance.

```
check:n1-growing-loops   2,175 files, 5,110 loop nodes
  GROWING (one round trip per row):  97 site(s) across 73 file(s)   [ratchet 102]
  FIXED   (literal-bounded):         16
  PAGING  (page/chunk per pass):     77
  + 37 findings in excluded crm/inventory

check:db-call-count      2,175 files
  loop openers 4,849 — 2,766 inspected, 2,083 SKIPPED (43%, "statement ended on the opener line")
  150 files with loop-internal DB calls
    ACTIONABLE:            32 file(s) / 51 call site(s) to fix
    ACTIONABLE-UNDETECTED:  3 file(s) — a real N+1 the patterns cannot match
```

The 3 the patterns cannot see, named by the gate itself:
`hr/core/hr-effective-change-applier.service.ts`, `hr/time/leave-approver.service.ts`,
`timesheets/core/approvals-bulk.service.ts`.

Release-scope highlights from the 97 (`check:n1-growing-loops:list`), one round trip per row:
`e-sign/sign-envelope-dispatch.service.ts:196,321` · `e-sign/sign-bulk-send.service.ts:143` ·
`e-sign/sign-envelope-sweeps.service.ts:83` · `email/email-outbox-retry.ts:34` ·
`invoices/invoices-lifecycle.service.ts:148` · `invoices/invoices-write.service.ts:294` ·
`finance/ap/payment-run-executor.service.ts:94` (`handle.transaction` **per row** — a per-row
transaction, which C070 names explicitly) · `gdpr/gdpr-export-worker-implementation.ts:251,268,287` ·
`hr/import/hr-import.service.ts:195` (`handle.transaction` per row) ·
`hr/governance/retention/retention.service.ts:370` · `cron/cron-billing.service.ts:70,263` ·
`billing/core/plan-limits.service.ts:430` (`this.cache.get` in a growing loop).

**A CPU-side N+1 no gate can see**, found by reading: `calendar-reminder-sweep.service.ts:183` runs
`recurring.find((e) => e.id === ex.eventId)` **inside** `for (const ex of exceptions)`. Both arrays
grow with tenant size — measured 8,571 recurring × up to 7,500 exceptions on the seeded large tenant.
It is not a database call, so `check:n1-growing-loops` is blind to it by design, but it is the same
failure shape: work quadratic in tenant size while a pooled connection is held.

---

### PRD-C073 — existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`

**PARTIALLY MET.** `check:record-access` walks 1,192 `findFirst` calls (591 record reads, 61 conflict
checks, 540 other) and reports every record read excludes soft-deleted rows, with one named purge
exception. That half is solid.

The `LIMIT 1` half is not enforced anywhere. I scanned 295 files containing `count()` for a result
compared against `0` and found **20 candidates**; three in release scope are unambiguous — F7.
The worst is `accounting-settings.service.ts:52` which counts **every POSTED journal entry in the
org** to answer "is there at least one?".

**NOT MEASURED at volume:** `scratch_perf_seed` holds **0 rows** in `journal_entries`, so I could
only measure the empty case (`count(*)`: 13 buffers / 16.4 ms; `SELECT 1 … LIMIT 1`: 0 exec buffers /
0.02 ms — the gap is all planning). What would measure it: seed `journal_entries` for the large
tenant at ~10⁵ rows and re-run both plans as `streamline_app`.

Also in scope here: **F1's exceptions read has no `LIMIT` at all** — `calendar-conflict.service.ts:117-132`.

---

### PRD-C074 — exact totals opt-in and independently budgeted; cursor pages must not run an automatic `COUNT(*)`

**NOT MET.** Every one of the prior report's structural findings is unchanged at head, verbatim:

- `src/common/pagination/pagination.ts:8` — `total: number` is **non-optional** on `ListResponse<T>`.
- `src/common/pagination/pagination.ts:21` — `buildListResponse(items, total, …)`; `total` is a
  **required positional**.
- `src/common/pagination/list-query.schema.ts:45-50` — `baseListQuerySchema` is
  `{ page, limit, cursor, sortDir }`. **No total-opt-in field exists, so no endpoint in the product
  can be opt-in.** This one line is the root cause.
- `grep -riE "includeTotal|withCount|include_total|with_count"` over `src/` returns **4 hits**, all in
  `build/core/projects-work-query.service.ts:274,290,319,338`, and that parameter is fed
  `isFirstPage = !cursor` — a derived heuristic, not a DTO field.

My own independent census (a cruder block-splitter than the prior report's, so it *under*-counts —
I found 17 Class A where the prior found 61) confirms **10 ungated cursor+count sites**, 7 of which
match the prior report's list of 9:

```
hr/forms/hr-forms.service.ts · hr/forms/hr-forms-submissions.service.ts
hr/templates/hr-templates.service.ts · hr/import/hr-import.service.ts
hr/recruitment/recruitment-offer-list-query.ts · hr/recruitment/recruitment-jobs.service.ts
build/core/projects-work-query.service.ts
+ NEW, not in the prior list: rbac/principal-groups.service.ts · party/party.service.ts
```

And the count over the one partitioned table is measured, not asserted:
`unified-inbox.service.ts` unread count = **10,231 buffers / 23,584 rows read to return 1**, against
40 buffers for the membership-keyed equivalent.

---

### PRD-C075 — bounded bulk insert/update/upsert, conflict-safe unique keys, batches below lock/payload limits

**PARTIALLY MET.**

**Conflict arbiters: MET.** `check:conflict-targets` at head: 364 `onConflict` calls, 162 with an
explicit target, 160 resolved to table+columns, **14 targeting a partial index** (these now carry the
predicate — the `08b9274c4` chat fix and `0adae9e50` billing fix landed since the prior audit),
2 unresolved and both in specs. Shrink-only ratchet at 0.

**Bounded batches: MET where written.** `CacheService.INVALIDATE_KEY_CHUNK = 256` with a documented
reason (the Upstash REST transport puts the whole command in one request body);
`OUTBOX_INSERT_CHUNK = 500`; `EXCEPTION_PAGE_SIZE = 2000`; `ATTENDEE_PAGE_SIZE = 1000`.

**Bounded *inputs*: NOT MET** — F6. 105 uncapped attacker-controlled arrays in release-scope modules,
including `createJournalEntrySchema.lines` and `createInvoiceSchema.items`.

**Unbounded accumulation: NOT MET.** `src/modules/calendar/calendar-keyset-drain.ts:6-15` is a
`for(;;)` that pushes every page into one array with **no total cap**. Three call sites in
`calendar-reminder-sweep.service.ts:48,67,99`. The same unbounded-accumulate shape is hand-rolled at
`calendar-conflict.service.ts:60-109` (F1).

---

### PRD-C076 — concurrent counters, unread, seats, balances, ordering and idempotency use atomic SQL/upsert/locking

**PARTIALLY MET.**

I scanned 804 files containing `.update(` for JS-side arithmetic inside `.set({ … })` on a
counter-shaped column. **7 candidates.** I opened all 7. Six are correct compare-and-swap:

- `probation.service.ts:210-228` — `extensionCount: review.extensionCount + 1` with
  `eq(status, review.status) AND eq(extensionCount, review.extensionCount)` in the `WHERE` and a
  `ConflictException` on 0 rows returned. Textbook.
- The four `rowVersion: current.rowVersion + 1` sites in `hr/time/leaves-*` and
  `common/region/placement-lookup.ts:214` follow the same optimistic-concurrency shape.
- `hrEmployments.rowVersion` at `probation.service.ts:234` uses
  `sql\`${hrEmployments.rowVersion} + 1\`` — atomic in SQL, the strongest form.

**One is a lost update** — F8: `hr-document-templates.service.ts:140-151`.

`check:idempotent-commands` passes but its scope is 11 of 2,126 mutating handlers (the prior report
established this and it is unchanged: two hardcoded keyword regexes, six of whose route branches can
never match because they carry a leading `/` inside a `(?:^|\/)` group). I did not re-derive it.

---

### PRD-C077 — statement/query timeouts and cancellation propagation; reports/exports/reindexing/wide aggregates to resumable jobs

**PARTIALLY MET.**

**Timeouts: MET.** `resolveTransactionGuards` (`pool.config.ts:118-125`) →
`statement_timeout 30,000 ms`, `idle_in_transaction_session_timeout 60,000 ms`, `lock_timeout 5,000 ms`,
applied per transaction via `set_config(…, is_local => true)` at `common/tenant/with-tenant.ts:21-28`
(the comment records *why*: Neon's pooler drops them as startup parameters and hard-fails
`options=-c` with `08P01`). `pool.config.ts:252-266` refuses a configuration that disables either,
and refuses one where idle-in-transaction is below statement_timeout.

**Cancellation: MET.** `AbortSignal` plumbing exists in `common/tenant/tenant-context.ts` and
`tenant-context.interceptor.ts` with two dedicated specs (`tenant-context.abort.spec.ts`,
`tenant-context.deadline.spec.ts`), plus `common/http/stream-abort.ts`. The
`AiRequestAbortInterceptor` is applied wherever `@NoTenantTransaction` removed the tenant context's
disconnect signal — the allowlist reasons record this as a deliberate pairing (PRD-C091).

**Resumable jobs: NOT MET on at least one route.** `support-kb.controller.ts:294 reindexAll()` is a
whole-corpus reindex — `KbArticleReindexService.reindexAll -> reindexArticle -> indexAttachment ->
embedInBatches -> AiGatewayService.embedBatchWithCredit` — **on a request thread, inside the request
transaction**, allowlisted as `PRE-EXISTING, UNAUDITED`. Under a 30 s statement timeout and a 60 s
idle-in-transaction kill, this cannot complete for a real corpus; it will be killed mid-way with no
resumption point. `audit-log.controller.ts#exportCsv` and `contacts.controller.ts#exportCsv` are the
counter-examples done right (one transaction per 500-row keyset page, none held across `res.write`).

---

### PRD-C078 — measure connection acquisition, transaction duration and idle-in-transaction; release connections before external provider calls or long CPU work

**PARTIALLY MET — the measurement is excellent, the release is not done.**

**Measurement: MET, and better than the criterion asks.** `src/db/pool-telemetry.ts` records, per
borrow: wait time (`averageWaitMs`, `maxWaitMs`, `p95WaitMs` via a bounded reservoir),
`slowAcquires`, `failedAcquires`, `saturationEvents`, hold time (`averageHeldMs`, `maxHeldMs`,
`p95HeldMs`, `longHolds`), and — the part most systems lack —
`maxIdleInTransactionMs`, `p95IdleInTransactionMs`, `idleInTransactionBorrows`,
`statementsPerBorrowMax`, computed from the `borrow-scope.ts` statement clock. Exposed on
`GET /health/db` behind `INTERNAL_API_SECRET` (`health.controller.ts:195-222`).

**Release: NOT MET** — F3. 45 handlers still hold the request transaction across a provider call, and
the gate now passes.

---

### PRD-C079 — benchmark under the application role with tenant context and RLS, never only as owner

**PARTIALLY MET.** I re-verified the prior report's two findings at head. **Both unchanged.**

- `src/scripts/capture-build-baseline.mjs:8` —
  `const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;` with the very next line
  printing *"APP_DATABASE_URL is required (the non-BYPASSRLS app role)."* `.env` leaves
  `APP_DATABASE_URL` deliberately unset and `DATABASE_URL` resolves to `neondb_owner`. `:16` also
  hardcodes `ssl: "require"`, so the tool cannot reach a local scratch target even if the variable
  were set.
- `src/scripts/measure-route-budgets.mjs:273` —
  `role: "streamline_app (rolbypassrls = false, tenant GUC set)"` is a **string literal** written by
  a script that never opens a connection.

**What is right:** `measure-heavy-query-plans.mjs:90-118` does a live `SELECT rolbypassrls, rolsuper`
and `process.exit(1)`s if either is true, *then* proves RLS is live by asserting a no-GUC read raises
`42501`, and prints both facts before measuring. I saw that line print in my run. The same guard is in
`measure-benchmark-manifest.mjs:91-100` and `measure-projection-bytes.mjs:171-173`, and
`merge-http-route-budgets.mjs:115` refuses a capture whose role string is not `rolbypassrls = false`.

**New sibling defect found this run** (part of F10): `test/perf/route-db-call-budget.e2e-spec.ts:66`
defaults to `ssl: "require"` unless `PGSSLMODE === "disable"`. Against a local scratch target the
suite fails **5/5** with `Client network socket disconnected before secure TLS connection was
established` — which reads as a broken test, not a missing env var. Every sibling harness
(`prepare-perf-http-seed.mjs:174`, `route-budget-http.seeded-e2e-spec.ts:273-274`) uses `ssl: false`.

---

### PRD-C080 — slow-query fingerprints, call counts, rows read/returned, buffers, lock waits in test evidence, without sensitive bind values

**PARTIALLY MET.**

**What exists and is right, read in full:**

| C080 asks for | head has | where |
|---|---|---|
| slow-query fingerprints | `normalizeQueryShape` collapses block/line comments, dollar-quoted, `E''`, single-quoted, `$n`, numeric literals and `IN (?,?,…)` to `?`; FNV-1a id | `query-fingerprint.ts:17-64` |
| no sensitive bind values | only the normalised shape + hash is ever stored; `SELECT set_config(…)` is classified `db.guc.setup` and **never fingerprinted** | `query-fingerprint.ts`, `query-telemetry.ts:14-18,90-91` |
| call counts | `stat.calls`, per fingerprint | `query-fingerprint-registry.ts:94` |
| rows returned | `rowsReturnedOf` handles postgres.js `count`, `rows`, plain array | `query-fingerprint.ts:86-94` |
| lock waits | `55P03`→lockWait, `40P01`/`40001`→deadlock, `57014`→timeout | `query-fingerprint.ts:71-83` |
| buffers | **explicitly deferred offline** to `run-read-cost-budgets.mjs`, and the file says so | `query-fingerprint-registry.ts:47-54` |
| rows **read** | **absent** — only rows *returned* is captured | — |

Two design details worth recording because they are the right answers to traps this repo has hit:

1. `SLOW_QUERY_MS = 50` is deliberately low — *"the point is to find the query issued 4,000 times at
   3 ms each, which no per-statement threshold tuned for 'slow' would ever see."*
2. `FINGERPRINT_CAP = 256` with `fingerprintsDropped` counted rather than silently absorbed — a
   rising counter means the normaliser is missing a literal.

**The `err.code` trap does not apply here, and I checked rather than assumed.** Memory records that
`err.code === "23505"` is dead across this codebase because Drizzle wraps driver errors and the
SQLSTATE lands on `.cause`. `classifyContention` reads `Reflect.get(error, "code")` — but the
instrumentation wraps **postgres.js's own `client.unsafe`** (`query-telemetry.ts:197-212`), so the
rejection reason handed to `settle("error", reason)` is the *raw driver error*, before Drizzle sees
it. The SQLSTATE is on `.code` at that seam. Correct as written.

**What is missing:** *"in test evidence"*. The fingerprint registry is a process-global singleton
consumed by `GET /health/db` and by `src/scripts/route-budget-db-calls.ts`, and the only seeded
suite that reads it covers 2 routes. There is no artifact anywhere in the repo carrying
fingerprint × calls × rows × buffers × lock-waits for a run. `contracts/route-budgets.json` carries
`measuredBufferBlocks` on 54 entries and `measuredDbCalls` on 3, and never lock waits or rows read.

---

## 2. Findings

| # | Sev | file:line | Summary |
|---|---|---|---|
| **F1** | **P1** | `src/modules/calendar/calendar-conflict.service.ts:60`, `:117` | `POST /calendar/events` drains every open recurring event in the org, then reads exceptions with no `LIMIT`, inside the write's own transaction |
| **F2** | **P1** | `src/common/cache/cache-fill.ts:268` + `src/common/cache/cache.service.ts:167` | Lost-invalidation race: a `DEL` landing mid-fill is overwritten by the in-flight fetcher; `user:session:*` preserves revoked access for 60 s |
| **F3** | **P1** | `src/scripts/check-placement-bypass.mjs` (allowlist) | Gate exits 0 with **45 of 45** provider-in-transaction handlers excused as literally `PRE-EXISTING, UNAUDITED` |
| **F4** | **P2** | `src/scripts/check-cache-key-shapes.mjs` · `package.json:365-366` | Gate **and its self-test** both emit 0 bytes and exit 0 — no `main`, pure library |
| **F5** | **P2** | `src/common/cache/cache-key-dimension-registry.spec.ts:113` · `cache-invalidation-matrix.ts` | Dimension contract covers 10/132 factories (7.6 %) and 14/143 matrix entries (9.8 %); the anti-vacuity floor is set at the current population |
| **F6** | **P2** | `src/modules/accounting/core/dto/accounting.schemas.ts:56` (+104 more) | 105 uncapped attacker-controlled request arrays in release scope; `check:bulk-id-limits` sees 0 because its scope is a name filter |
| **F7** | **P2** | `src/modules/accounting/settings/accounting-settings.service.ts:52` | Existence tested by `count(*)` over every POSTED journal entry in the org (+2 more sites) |
| **F8** | **P2** | `src/modules/hr/config/hr-document-templates.service.ts:140` | Lost update: `version: existing.version + 1` with no version predicate in the `WHERE`; `existing` read outside the transaction |
| **F9** | **P2** | `src/modules/hr/lifecycle/hr-dashboard-attendance.ts:94` | `check:unbounded-reads` **exits 1 at head** — 1 unclassified path from a file split |
| **F10** | **P2** | `src/scripts/capture-build-baseline.mjs:8,16` · `measure-route-budgets.mjs:273` · `test/perf/route-db-call-budget.e2e-spec.ts:66` | C079 provenance: owner fallback, hardcoded role literal, and a TLS default that fails the C069 suite against local scratch |
| **F11** | **P2** | `contracts/route-budgets.json` | `measuredDbCalls` on 3 of 93 (0 of 23 worker batches); regression assertion covers 2 routes; measurement commit 300 commits stale |
| **F12** | **P2** | 73 files (see `check:n1-growing-loops:list`) | 97 growing-loop DB/cache sites + 51 ACTIONABLE N+1 call sites + 3 invisible; both gates pass as ratchets |
| **F13** | **P2** | (infrastructure) | `check:tenant-relationships` returns **exit 2 — INCONCLUSIVE** against `scratch_head_1010` (682 of 683 journal entries) |
| **F14** | **P2** | `src/common/cache/cache-fill.ts:74-89` | Outage-memo authorization guard is a 9-substring denylist; `ownership:modules:`, `ownership:incoming:`, `org:roles:`, `feature-flags:all` match none |

---

### F1 — P1 — unbounded tenant-size read inside the calendar write transaction

`src/modules/calendar/calendar-conflict.service.ts:60` (drain), `:117-132` (no `LIMIT`)

**Reached from a live route, traced:**
`calendar.controller.ts:137 @Post("events")` → `calendar.service.ts:100 createEvent` →
`:108 this.db.transaction(async (tx) => {` → `:118 this.conflict.checkConflictsInTx(tx, …)`.

**The two defects.** At `:60` a `for(;;)` keyset loop pages `calendar_events` at
`CONFLICT_SCAN_BATCH_SIZE = 100` and pushes every page into one `rows` array with no total cap. Its
recurring branch (`:85-92`) matches `startDate < endDate AND (recurrenceEnd IS NULL OR recurrenceEnd >
startDate)` — **any open-ended recurring series ever created matches, regardless of age**. Then
`:117-132` issues one query with `inArray(calendarEventExceptions.eventId, recurringIds)` and
**no `.limit()` at all**, with `recurringIds` as large as the drain produced.

**Measured on the seeded large tenant**, for a single 1-hour slot:

```sql
conflict_rows_1h   = 8,572      -- 86 round trips at CONFLICT_SCAN_BATCH_SIZE=100
recurring_of_those = 8,571      -- the IN (…) list handed to the exceptions query
```

and the exceptions query itself, from the catalogue run (`recurrence-exceptions-uncapped`, whose
`source:` field points at this exact line):

```
Seq Scan on calendar_event_exceptions   134 buffers   8,328 rows read → 800 returned  (-7,528 filtered)
```

**Failure scenario.** A user clicks "create meeting" on a tenant with 8,571 open recurring series.
One request: 86 sequential round trips, 8,572 rows into a JS array, one `IN (8,571 ids)` seq scan
reading 8,328 more rows, then `expandToOccurrences` over all 8,571 rules, then a linear
`recurring.find(...)` per exception (`calendar-reminder-sweep.service.ts:183` has the same shape).
All of it holds one of **10** pooled connections on a direct Neon endpoint (`pool.config.ts`), under
a 30 s `statement_timeout` per statement but **no bound on the loop's total wall time**. Ten
concurrent event creations on a large tenant exhaust the pool; requests 11–50 queue and are killed at
the 5,000 ms acquire timeout, taking unrelated routes down with them. The cost grows with calendar
size, so it is invisible in dev and arrives with the biggest customer.

**Proposed fix.** (a) Bound the recurring branch by the requested window — a recurring series whose
`start_date` is years before the slot still needs expansion, but the query can bound on
`recurrence_end` and on a configurable lookback rather than "all history". (b) Give the drain at `:60`
a total cap with an explicit truncation signal, or stream it instead of accumulating. (c) Chunk
`:117` over `recurringIds` and add a `.limit()`. (d) Move the whole conflict scan **out** of the
insert transaction — it is a read that informs a warning, not part of the write's atomicity; the
`audit-log.controller.ts#exportCsv` per-page pattern is the template already in this repo.

---

### F2 — P1 — lost invalidation preserves revoked access for the full TTL

`src/common/cache/cache-fill.ts:268` · `src/common/cache/cache.service.ts:167-172`

**The race.** `CacheService.invalidate(key)` does:

```ts
this.fill.drop(key);                                   // cache.service.ts:167
const redis = this.redis; if (!redis) return;
await this.invalidateWithRetry("invalidate", key, () => redis.del(key));
```

`CacheFiller.drop` (`cache-fill.ts:108-112`) deletes the key from `inFlight`, `memoUntil` and
`degradedFills`. It **does not cancel the pending fetcher and leaves no tombstone.** The in-flight
`loadOrFetch` continues to `:268`:

```ts
await this.timedRedis(() => redis.set(key, data, { ex: ttl }));   // unconditional
```

So the interleaving `fetcher reads row → writer commits → DEL → fetcher's SET` re-caches the
**pre-mutation** value with a full TTL. `retainOrRelease` (`:184-185`) correctly refuses to re-add to
`inFlight`, but the Redis write already happened inside `loadOrFetch`.

`cachedVersioned*` is immune — an invalidation bumps the generation, so the in-flight fill writes
under a key nobody will read. **104 of 213 read sites are not** (88 `cached` + 16 `cachedForOrg`).

**Failure scenario, concrete.** `CACHE_KEYS.userSession(userId)` is filled at `auth.service.ts:228`
with **TTL 60** (`:333`) and carries `organizationAccess`, `enabledModules`, `isOrgOwner`, `role`,
`plan`. It has **18 invalidation sites**, including
`org-membership-access-revocation.ts:370`, `role-permission.service.ts:85`,
`entitlements.service.ts:353`, `user-module-access.service.ts:199`,
`module-access-flat-members.service.ts:124,233,305`.

An admin revokes a user's module access. Concurrently that user's own request misses
`user:session:<id>` and starts a fill — which does a `users.findFirst`, a `resolvePreferredOrg`, a
`resolveActiveMembership`, and a tenant transaction for subscription + module statuses. That is a
10–50 ms window of DB work. The revocation commits and DELs mid-window. The fill then writes the
pre-revocation `enabledModules` with `ex: 60`. **The revoked module stays enabled for up to 60
seconds after the admin saw "saved".**

**No spec covers it.** I enumerated every `it(...)` in the 8 cache suites (254 tests). Every
invalidation test invalidates strictly before or strictly after a completed fill — including the
otherwise excellent negative controls (`"P2 bite: without session del B serves stale grant"`,
`"P4 bite: actor-only invalidation leaves non-actors with stale sessions on B"`). None invalidates
*during* one.

**Proposed fix.** Capture a per-key epoch before the fetcher runs and compare at `:268` — skip the
`set` if the epoch moved. A `Map<string, number>` bumped by `drop()` is enough for the single-process
case; for cross-instance correctness write a short-lived `cache:tomb:<key>` alongside the `DEL` and
check it in the same round trip as the `set` (or use `SET … XX` semantics keyed on the lease token,
which is already generated at `:243`). Cheaper alternative for the authorization subset: move
`userSession` and `membershipAccount` onto `cachedVersioned` under a per-user namespace, which is
exactly what `MembershipStateService.resolve` (`membership-state.service.ts:82`) already does.

---

### F3 — P1 — the provider-in-transaction gate now passes over 45 self-declared-unaudited handlers

`src/scripts/check-placement-bypass.mjs` (allowlist), exit at `:1367-1369`

The prior report recorded this gate at **EXIT 1** with 45 provider-in-tx sites and called the non-zero
status *"a pre-existing condition of the allowlist"*. At head it is **EXIT 0** with the same 45:

```
Bypass sites found       147
  @NoTenantTransaction   45
  provider in tx         45          ← unchanged from the prior report
  cron direct db         23
  withIdentity           23
  runOutsideTenantCtx    11
OK — every database bypass is on the allowlist with a reason.

provider-in-transaction SKIP lines: 45
  of which literally "PRE-EXISTING, UNAUDITED": 45      ← 100%
cron-bypass SKIP lines: 23
  of which literally "PRE-EXISTING, UNAUDITED": 20
```

**65 bypass sites are excused by a reason string that declares them unaudited, and the gate returns
0.** The gate's own vocabulary contains the word for what is wrong with them.

The arithmetic that makes this P1 rather than cosmetic is in the source and unchanged:
pool `max` = 10 on a direct Neon endpoint (`src/db/pool.config.ts`), queue depth `max × 4` = 40 with a
5,000 ms `acquireTimeoutMs` (`src/db/pool-admission.ts`), `idle_in_transaction_session_timeout`
60,000 ms (`pool.config.ts:122`), LLM per-attempt timeout 30,000 ms fast / 60,000 ms standard plus
retries (`src/modules/ai/core/providers/llm.service.ts:100-101`). **Eleven concurrent AI requests
exhaust the pool; requests 12–51 are killed after 5 s.** `pool.config.ts:255-257` names this exact
failure in prose.

Worst of the 45 by blast radius: `feedbucket-public.controller.ts:335 aiAssist()` is
**unauthenticated** — anonymous traffic can pin connections. `support-ai.controller.ts` holds 10 of
them across four services, all with a read→provider→**write** sandwich.
`support-kb.controller.ts:294 reindexAll()` is a whole-corpus reindex on a request thread (also C077).
`leads.controller.ts:68,117` and `deals.controller.ts:199` reach a provider through
`AutomationService.runAutomationsForEvent → AiNodeExecutorService` — an **ordinary CRM write silently
becomes a provider call inside the write's own transaction**, which is the least obvious of the set.

**Proposed fix.** Split `PROVIDER_IN_TRANSACTION_ALLOWLIST` into `AUDITED` (with the real reason, as
the e-sign and timesheets entries already have) and `PENDING` (with an owner and a deadline), and make
the gate **exit 1** on any `PENDING` entry — or at minimum on any reason string containing
"UNAUDITED". A gate that cannot fail is documentation.

---

### F4 — P2 — `check:cache-key-shapes` and its own self-test are both no-ops

`src/scripts/check-cache-key-shapes.mjs` (339 lines, 12 exports, no `main`) · `package.json:365-366`

```
pnpm check:cache-key-shapes             EXIT 0   bytes=0
pnpm check:cache-key-shapes:self-test   EXIT 0   bytes=0
```

The prior report found the gate vacuous. **The `:self-test` is vacuous too** — the mechanism whose
entire purpose is to prove a gate is not scanning an empty corpus produces zero bytes and returns
success. Running the file as a gate executes module initialisation and exits.

The logic is not lost: `check-cache-invalidation.mjs:34` imports from it and exercises it over 3,785
files. But two entries in `package.json` report PASS about nothing, and a release harness that sweeps
`check:*` will count both as green.

**Proposed fix.** Either delete both `package.json` entries (the logic is covered), or give the file a
`main` that runs `resolveAllSites` over the same corpus and a `--self-test` with a fixture that is
known to fail.

---

### F5 — P2 — the cache-key dimension contract covers 8–10 % of the surface

`src/common/cache/cache-key-dimension-registry.spec.ts:10-115` ·
`src/common/cache/cache-invalidation-matrix.ts` + 4 siblings

```
CACHE_KEYS factories                                       132
  covered by DIMENSION_REGISTRY                             10   (7.6%)
  anti-vacuity floor asserted at :113-115                  >=10   ← exactly the current population

invalidation matrix entries (5 files)                      143
  declaring `dimensions:`                                   14   (9.8%)
  declaring `staleToleranceSeconds:`                        11   (7.7%)
  anti-vacuity floor in the matrix spec                     >=8
```

Both floors are set at or below today's value, so neither can catch a regression that *removes*
coverage down to the floor, and neither pressures the 90 % that is uncovered.

C067 says keys must include tenant, subject, permission and resource dimensions *"where applicable"*.
The registry is the only artifact that says which dimensions apply to which key, and it answers for
10 of 132. Concretely uncovered and permission-bearing: `dashboardStats(orgId)`,
`supportTicketsList(orgId, hash)`, `executiveDashboard(orgId, projection)`,
`moduleAccessOwnership(orgId, moduleKey)`, `moduleOwnershipsList(orgId)`,
`incomingTransfers(orgId, userId)`.

**Proposed fix.** Generate the registry from `CACHE_KEYS` so a new factory without a declared
dimension set is a compile-or-test failure, and raise both floors to the live count in the same
commit that adds each entry.

---

### F6 — P2 — 105 uncapped attacker-controlled request arrays; the gate's scope is a name filter

`src/scripts/check-bulk-id-limits.mjs:3-4` (scope rule) · 105 sites

The gate's rule, from its own header: *"every `z.array(...)` property **whose name is `ids` or ends in
`Ids`**"*. Its docstring names the vector correctly — *"one request can force an arbitrarily large
`IN (…)` or an arbitrarily large write transaction"* — and that vector does not care what the
property is called.

My independent walk over schemas actually bound to an HTTP body or query via `@Validate`:

```
controllers with @Validate                         522
@Validate sites parsed                           2,995
distinct schema identifiers bound to body/query  1,627
  declarations my locator resolved                 863   (53% — so everything below is a LOWER bound)
z.array properties inside those                    282
  capped with .max()/.length()                     121
  UNCAPPED                                         161
    of which in release-scope modules              105   (excluding crm/inventory)
    of which named ids/*Ids — the gate's scope       10   ALL TEN in crm/ or inventory/
```

**The gate is correct within its scope** — all 10 name-matching uncapped arrays are in its excluded
modules, so its `0 findings` is honest. The problem is the scope. (I initially over-counted here by
requiring a numeric literal in `.max(...)`; `huddleInviteSchema.userIds` carries
`.max(HUDDLE_MESH_MAX_PARTICIPANTS)` and is fine. Corrected instrument, corrected number.)

**Worst by write amplification, all money or authorization paths, all verified by reading the file:**

- `src/modules/accounting/core/dto/accounting.schemas.ts:56-69` — `createJournalEntrySchema.lines`,
  `.min(2)` and **no `.max()`**. An unbounded general-ledger journal post.
- `src/modules/invoices/dto/invoice-write.schemas.ts:37,38` — `createInvoiceSchema.lineItems` and
  `.items`, `.min(1)` each, no max. `:97` — `recordPaymentSchema.allocations`, uncapped.
- `src/modules/accounting/settings/dto/settings.schemas.ts:93` — `postOpeningBalancesSchema.lines`.
- `src/modules/accounting/core/dto/accounting.schemas.ts:154` — `createPurchaseBillSchema.items`.
- `src/modules/rbac/dto/rbac.schemas.ts:29` — `setRolePermissionsSchema.items`. An unbounded
  permission write.
- `src/modules/automation/dto/automation.schemas.ts:106,107,115,116` — rule `conditions` / `actions`.

**Proposed fix.** Change the gate's scope from a name filter to *"every `z.array` in a schema bound to
`@Validate({ body })` or `{ query }`"* — the binding is already parseable (2,995 sites). Cap the
listed money paths first.

---

### F7 — P2 — existence answered with `count(*)`

- `src/modules/accounting/settings/accounting-settings.service.ts:52-59` — counts **every POSTED
  journal entry in the org** to decide whether the base currency may change. The result is used only
  as `> 0`.
- `src/modules/payroll/setup/components.service.ts:143-153` — counts every
  `employeeSalaryProfileComponents` row for a component, used only as `> 0`.
- `src/modules/rbac/roles.service.ts:283-306` — two separate `count()` queries summed and tested
  `> 0`.

**Failure scenario.** An accounting admin opens Settings on a tenant with a mature general ledger.
The page aggregates the whole `journal_entries` table for that org to answer a yes/no question, on
every settings write, inside the request transaction.

**NOT MEASURED at volume** — `scratch_perf_seed` has 0 rows in `journal_entries`. Empty-table
comparison as `streamline_app` under RLS: `count(*)` → 13 buffers / 16.4 ms; `SELECT 1 … LIMIT 1` →
0 execution buffers / 0.02 ms. What would measure it: seed `journal_entries` at ~10⁵ rows for
`aaaaaaaa-…-001` and re-run both plans.

**Proposed fix.** Replace each with `select({ one: sql\`1\` }) … .limit(1)` and test `rows.length > 0`.

---

### F8 — P2 — lost update on the HR document-template edit

`src/modules/hr/config/hr-document-templates.service.ts:140-151`

```ts
const [row] = await tx.update(documentTemplates)
  .set({ …, version: existing.version + 1, updatedAt: new Date() })
  .where(and(eq(documentTemplates.orgId, existing.orgId), eq(documentTemplates.id, existing.id)))
  .returning();
```

`existing` is a `TemplateRow` **passed in by the controller** (`hr-document-templates.controller.ts:125`),
read outside the transaction, with no `FOR UPDATE` anywhere in the file, and the `WHERE` carries **no
version predicate**.

**Failure scenario.** Two admins open the same template. Both read `version = 5`. Both enter the
transaction. Both insert a `documentTemplateVersions` archive row with `version: 5` at `:128-137` —
and the live catalogue has **no unique index on `(template_id, version)`**
(`document_template_versions` has only `pkey(id)`, `uniq(org_id, id)`, `idx(template_id)`,
`idx(org_id, archived_by_membership_id)`), so the duplicate lands silently. Both write `version = 6`.
The second write discards the first admin's `htmlContent` with no conflict raised, and the version
history claims one revision happened.

The correct pattern is already in this repo, two files away — `probation.service.ts:219-228` puts
`eq(status, review.status)` and `eq(extensionCount, review.extensionCount)` in the `WHERE` and throws
`ConflictException` when `returning()` is empty.

**Proposed fix.** Add `eq(documentTemplates.version, existing.version)` to the `WHERE` and throw
`ConflictException` on an empty `returning()`; add a unique index on
`(org_id, template_id, version)` for `document_template_versions`.

---

### F9 — P2 — `check:unbounded-reads` fails at head

`src/modules/hr/lifecycle/hr-dashboard-attendance.ts:94`, `:108`

```
FAIL — 1 gate violation(s):
  • 1 unclassified path(s) — classify before committing
UNCLASSIFIED paths:
  [UNBOUNDED] /hr/lifecycle/hr-dashboard-attendance.ts
      :94   .select({ count: presentPersonDays })
      :108  .select({ count: presentPersonDays })
EXIT=1
```

The prior report recorded this gate at EXIT 0. It fails at head. The cause is the file split in
`c7e4628ad` (*"split fourteen files by responsibility"*), which moved `buildAttendanceAnalytics` into
a new file without a matching entry in `src/scripts/baselines/unbounded-reads-classification.json`.

I read both sites. `presentPersonDays = countDistinct(sql\`(userId, date)\`)` — they are **aggregates,
not row reads**, so the correct verdict is `FALSE-POSITIVE`, not `ACTIONABLE`. This is a bookkeeping
failure, not a defect. But it is a **red gate on the release branch** and it will read as one.

**Proposed fix.** Add the `FALSE-POSITIVE` entry with the reason "countDistinct aggregate over a
month-bounded window, not a row read".

---

### F10 — P2 — C079 provenance, three sites

Two unchanged from the prior report (see §C079), plus one new:

`test/perf/route-db-call-budget.e2e-spec.ts:66` —
`ssl: process.env.PGSSLMODE === "disable" ? false : "require"`. Against a local scratch database the
C069 regression suite fails **5/5** with `Client network socket disconnected before secure TLS
connection was established`, which does not name the cause. Every sibling harness in the same
directory uses `ssl: false` unconditionally (`prepare-perf-http-seed.mjs:174`,
`route-budget-http.seeded-e2e-spec.ts:273-274`).

**Failure scenario.** An engineer follows the file's own docstring (*"Requires APP_DATABASE_URL naming
a database whose name contains 'scratch'"*), sets exactly that, and gets five red tests that look
like broken assertions. The likely response is "the perf suite is broken", not "set PGSSLMODE".

**Proposed fix.** Derive SSL from the DSN (`ssl: url.includes("sslmode=disable") ? false : "require"`,
which is what `measure-heavy-query-plans.mjs:69` already does), and for the two prior findings, reuse
the six-line live-role assertion from `measure-heavy-query-plans.mjs:90-111`.

---

### F11 — P2 — the DB-call ceiling is a global default for 59 % of routes and measured for 3 %

`contracts/route-budgets.json` · `test/perf/route-db-call-budget.e2e-spec.ts`

Numbers in §C069. The criterion has two halves; head has the second half working well over a very
small population and the first half satisfied mostly by a default.

**Proposed fix.** Extend the seeded regression suite from 2 routes to at least the 19
`counted-call-path` budgets (the call path is already traced for those), and populate
`measuredDbCalls` for the 23 worker batches — a worker that iterates tenant data is exactly where an
unnoticed extra call multiplies. Re-run `measure-route-budgets.mjs` so `measurement.commit` is not
300 commits stale.

---

### F12 — P2 — 97 growing-loop DB/cache sites remain

Numbers and site list in §C072. Both gates pass **as ratchets** and both say so. Two shapes deserve
naming because they are C070 violations as well as C072:
`finance/ap/payment-run-executor.service.ts:94` and `hr/import/hr-import.service.ts:195` both open
`handle.transaction` **per row** — a per-row transaction, which C070 forbids by name.

---

### F13 — P2 — `check:tenant-relationships` is INCONCLUSIVE against the provided database

```
EXIT=2
  The target's migration ledger holds 682 of 683 journal entries,
  so the chain is only partly present and constraints later in it have not been created yet.
```

The shared context stated that 8 of the 9 previously-inconclusive gates now pass against
`scratch_head_1010`. This one does not, at this moment, because the journal grew during the session
(681 → 683 in my working tree) while the database stayed at 682. **Exit 2 is not a pass.**

**Proposed fix.** Re-bootstrap `scratch_head_1010` after the migration wave settles, then re-run.

---

### F14 — P2 — the outage-memo authorization guard is a substring denylist

`src/common/cache/cache-fill.ts:74-89`

`AUTHZ_KEY_MARKERS` is 9 substrings (`user:session:`, `membership:`, `access:`, `rbac:`, `mfa:`,
`revoked:`, `perms:`, `permission`, `entitlement`). Any key not containing one of them is retained in
the degraded memo for 1 s during a Redis outage. Checked against all 132 factories, these
authorization-adjacent keys match **none** of the nine:

- `ownership:modules:${orgId}` (`moduleOwnershipsList`)
- `ownership:module:${orgId}:${moduleKey}` (`moduleOwnershipDetail`)
- `ownership:incoming:${orgId}:${userId}` (`incomingTransfers`)
- `org:roles:${orgId}` (`rolesList`)
- `feature-flags:all` (`featureFlags`)

Low severity: the window is 1 second, it is armed only when Redis is unreachable, and the file argues
the trade-off carefully. But it is a denylist over an open key space, so it decays every time someone
adds a factory.

**Proposed fix.** Invert it — mark the *allowed-to-retain* keys explicitly on the factory (the
dimension registry from F5 is the natural home), and default to "do not retain".

---

## 3. What head already gets right

Stated so a later wave does not re-litigate settled ground.

- **Tenant-leading indexes are real, verified against the running catalogue**: 825 tenant tables,
  825 with an `org_id`-leading index, **0 without**. This is the strongest single result in the run
  and it is a live-catalogue fact, not a source scan.
- **The RLS-role discipline in the benchmark tooling is the right shape and it works.** I ran
  `measure-heavy-query-plans.mjs` and watched it print
  `role streamline_app · bypassrls=false · no-GUC read denied 42501` before measuring anything. Ten of
  the fifteen EXPLAIN tools cannot reach the owner at all.
- **C066 has a genuine, executable deliverable**: 36 named queries across exactly the 8 categories the
  criterion lists, each carrying the service line it was transcribed from, with 7 head-to-head
  comparisons decided on measured buffers.
- **The cache fill path is well engineered.** Distributed lease with a Lua CAS release; a waiter that
  polls the lease as well as the value; TTL jitter at the one point no caller can bypass; no negative
  caching by design; an outage memo bounded by time, key count, null-ness and authorization scope,
  expired by insertion-order sweep rather than a timer per key. **254 tests, 8 suites, all green**,
  with paired positive and negative controls throughout.
- **Invalidation is retried and its failures are counted**, with a stable log marker
  (`cache.invalidation.dropped`) and a `droppedInvalidationCount` getter, rather than swallowed.
- **`invalidateMany` / `invalidateNamespaceMany` are real batching** with a documented 256-key chunk
  and a stated reason (Upstash REST puts the whole command in one body), replacing six sites that
  previously fanned out to as many as 10,000 concurrent commands.
- **The frontend query cache is tenant- and subject-scoped structurally**, not by per-key discipline:
  `scopedQueryKeyHashFn` prefixes `authenticated:<orgId>:<userId>` to every key on **both** the client
  provider and the server prefetch client, plus a `key={scope}` remount. The neutral-module comment
  records exactly why both sides must hash identically.
- **Connection telemetry exceeds what C078 asks**: wait p95, hold p95, `longHolds`, and
  `maxIdleInTransactionMs` / `p95IdleInTransactionMs` / `idleInTransactionBorrows` /
  `statementsPerBorrowMax` derived from a real per-borrow statement clock.
- **Query fingerprints cannot leak a bind value**: literals and `$n` are normalised to `?` before
  storage, and `set_config` statements are classified into a seam that is never fingerprinted.
  I verified the `err.code`-vs-`.cause` trap does **not** apply here — the instrumentation wraps
  postgres.js's own `unsafe`, so the SQLSTATE is on `.code` at that seam.
- **`ON CONFLICT` arbiters are checked and clean**: 364 calls, 160 fully resolved, 14 targeting a
  partial index with its predicate supplied, 2 unresolved and both in specs. The chat and billing
  arbiter fixes (`08b9274c4`, `0adae9e50`) landed since the prior audit.
- **Compare-and-swap is used correctly in 6 of the 7 counter-update sites**, including one
  (`probation.service.ts:234`) that does the arithmetic in SQL.
- **The C069 regression suite has a working negative control** — *"the ratchet fails when a route
  issues one statement more than its budget"* — and refuses to run silently, printing
  `SKIPPED … This suite proves nothing while skipped.`
- **A measured negative result:** the naive "make the tenant predicate lead the index" fix on the
  reminder drain is **6.1× worse** (12,673 vs 2,073 buffers). The planner is already adapting
  correctly across tenant sizes. Recorded so nobody "fixes" it.

---

## 4. Blocked on infrastructure — NOT MEASURED

| what | why | what would measure it |
|---|---|---|
| C066 on the mid / small / tiny tenants | ran `--org=large` only; three more runs at ~3 min each was not defensible against the 26-agent budget | `measure-heavy-query-plans.mjs --org={mid,small}` and the tiny profile |
| C073 cost of `count(*)`-as-existence on the accounting path | `scratch_perf_seed` holds **0** `journal_entries` | seed ~10⁵ journal entries for `aaaaaaaa-…-001`, re-EXPLAIN both shapes |
| F1 end-to-end request latency and connection hold | needs a booted API with the pool wired; I measured the SQL and the row counts, not the HTTP p95 | `test/perf/route-budget-http.seeded-e2e-spec.ts` extended to `POST /calendar/events` on the large tenant |
| F2 under concurrency | proving the race empirically needs a real Redis plus a controllable delay between the fetcher and its `set` | a spec that stubs `redis.set` to await a barrier, invalidates while it waits, then asserts the post-invalidation `get` is a miss |
| C069 for the 23 worker batches | no worker-batch call-count harness exists — only the route one | extend `route-budget-db-calls.ts` to drive a cron handler under `queryTelemetry` |
| C080 "in test evidence" | no artifact anywhere carries fingerprint × calls × rows × buffers × lock-waits for a run | emit `queryTelemetry.topFingerprints()` + `poolTelemetry.snapshot()` from the seeded suite into a committed artifact |
| `check:tenant-relationships` | exit 2 — `scratch_head_1010` is at 682 of 683 journal entries (F13) | re-bootstrap after the migration wave settles |
| `check:alert-ack` | needs a real `ALERT_WEBHOOK_URL` and a human acknowledgement | out of reach in any sandbox |
| Everything, cleanly | **268 uncommitted files** from concurrent agents, including `contracts/route-budgets.json`, `openapi.json` and `migrations/meta/_journal.json` | re-run this audit against a clean checkout of a settled commit |

---

## 5. Verdict

**PARTIALLY MET — 0 of 16 criteria fully met and clean; 13 partially met; 3 not met.**

| criterion | verdict |
|---|---|
| C065 projections / tenant-leading indexes / no full scan | **partially met** — indexes verified live 825/825; 1,377 unprojected reads at a 6-slot ratchet; 3 measured Seq Scans |
| C066 exercise the 8 named query families on seeded data | **met** — 36 queries, 8 categories, executed live under RLS as the app role |
| C067 tenant/subject/permission/resource dimensions in keys | **partially met** — keys are right (0 collisions found in 213 sites); the contract proving it covers 8–10 % |
| C068 invalidation / TTL / stampede / degradation | **partially met** — excellent machinery, one unguarded and unspecced lost-invalidation race (F2) |
| C069 max DB-call count per critical route and worker batch | **partially met** — 93 budgets, 3 measured, regression covers 2 routes, 0 of 23 worker batches |
| C070 minimum correct tenant transaction | **partially met** — good seam; F1 and F3 violate it |
| C071 named columns / minimal DTOs | **partially met** — named prohibitions at 0; 1,377 full-row reads remain |
| C072 batch lookups; no DB/cache in growing loops | **not met** — 97 growing sites, 51 ACTIONABLE N+1s, 3 invisible |
| C073 existence probes with `LIMIT 1` | **partially met** — soft-delete half clean; 3 release-scope `count(*)`-as-existence + F1's no-LIMIT read |
| C074 opt-in totals, no automatic `COUNT(*)` on cursor pages | **not met** — the shared schema has no opt-in field, so no endpoint can be opt-in |
| C075 bounded bulk writes, conflict-safe keys | **partially met** — arbiters clean; 105 uncapped request arrays; unbounded drain accumulation |
| C076 atomic counters / no read-then-write races | **partially met** — 6 of 7 correct, 1 lost update on a live route |
| C077 timeouts and cancellation; heavy work to resumable jobs | **partially met** — timeouts and cancellation solid; `reindexAll` on a request thread |
| C078 measure acquisition/duration/idle; release before providers | **partially met** — measurement exceeds the ask; 45 handlers still hold, gate now green |
| C079 benchmark as the app role under RLS | **partially met** — the good tools refuse to run as owner; 2 provenance defects unchanged + 1 new |
| C080 fingerprints / calls / rows / buffers / lock waits, no bind values | **partially met** — runtime capture is right and leak-free; buffers deferred, rows-read absent, no artifact |

**The single most important structural observation.** Three of this ticket's own gates report PASS
over a population that cannot fail: `check:cache-key-shapes` scans **0 files** (and so does its
self-test), `check:placement-bypass` excuses **45 of 45** provider-in-transaction sites with a reason
string that says "UNAUDITED", and `check:bulk-id-limits` enforces a name filter that matches **0** of
the 105 uncapped in-scope arrays. Meanwhile the one gate in the set that actually fails at head
(`check:unbounded-reads`) fails on a **false positive**. That is the exact inversion this project has
been burned by nine times, and it is the highest-leverage thing a repair wave could fix.
