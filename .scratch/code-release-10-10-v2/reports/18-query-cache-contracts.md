# 18 — Shared database, query and cache contracts (PRD-C065–C080)

**Repo:** `streamlineos-backend`, branch `release/code-10-10-v2`, HEAD `591cf663` at the start of this run.
**Database measured:** `scratch_perf_seed` — local Postgres, **1,729 MB**, 8 organisations, four application
tenants at 89.93 / 9.00 / 0.90 / 0.18 %. Journal at head is **677** entries.
**Role measured as:** `streamline_app` — verified live, `rolbypassrls = f`, `rolsuper = f`.
**RLS verified live, not assumed:** a read with no GUC raises
`ERROR: no tenant context: app.organization_id is not set for this transaction` from
`current_org_id()`, and every plan below carries `Index Cond: (org_id = current_org_id())`.

Nothing here is a checkbox. Every number was produced by a command in this run and every command's
exit code is recorded in §7.

---

## 1. THE HEADLINE — measured scan reach of every gate

All sixteen named gates pass. **Three of them enforce their rule over a population so much smaller
than their apparent scope that the PASS carries almost no information, and one of them scans nothing
at all.**

Reach was measured two ways and the two agree:

1. **Instrumented** — every gate re-run under a `--require` preload that patches `fs.readFileSync` /
   `readFile` / `readdirSync` before any ESM `node:fs` facade is instantiated, recording the absolute
   path of every file the gate actually opened. Harness:
   `<scratch>/trace-fs.cjs`. This is ground truth, not the gate's self-report.
2. **Independent walk** — a separate `find` / AST census of the corpus each gate claims.

### 1a. Files each gate actually opened (instrumented)

| gate | src/*.ts opened | under `modules/` | under `common/` | under `db/schema/` | self-reported |
|---|---|---|---|---|---|
| `check:query-projections` | 3,649 | 2,914 | 229 | 347 | "3648 source files" ✅ |
| `check:relation-hydration` | 3,649 | 2,914 | 229 | 347 | "3648 files" ✅ |
| `check:outbox-consumers` | 3,646 | 2,914 | 229 | 347 | "3645" ✅ |
| `check:log-secrets` | 3,649 | 2,916 | 229 | 347 | "3648" ✅ |
| `check:placement-bypass` | 3,653 | 2,916 | 229 | 347 | — |
| `check:fire-and-forget` | 3,662 | 3,046 | 229 | 347 | "3662" ✅ |
| `check:cache-invalidation` | 3,785 | 3,046 | 229 | 347 | "1076 service files" ⚠ |
| `check:bulk-id-limits` | 3,383 | 2,647 | 229 | 347 | "3382 schema files" ✅ |
| `check:unbounded-reads` | 2,301 | 2,301 | **0** | 0 | "2301 service files" ✅ |
| `check:n1-growing-loops` | 2,414 | 2,161 | 123 | 117 | "2161 service files" ⚠ |
| `check:db-call-count` | 2,161 | 2,161 | **0** | 0 | "2161 service files" ✅ |
| `check:transaction-callbacks` | 2,059 | 1,835 | 150 | 2 | "2108 spec files" ✅ |
| `check:namespace-coverage` | 1,081 | 1,061 | 20 | 0 | "1076 service files" ✅ |
| `check:idempotent-commands` | 526 | 526 | 0 | 0 | "546 controllers" ✅ |
| `check:tenant-indexes` | 347 | 0 | 0 | 347 | "347 schema files" ✅ |
| `check:hr-pagination` | 194 | 194 | 0 | 0 | "194 HR service files" ✅ |
| **`check:cache-key-shapes`** | **0** | **0** | **0** | **0** | **prints nothing** |

Denominators for comparison, from an independent `find`: **5,712** `.ts` under `src/`; **3,653**
non-spec; **1,916** specs; **2,916** non-spec under `src/modules/`; **229** non-spec under
`src/common/`; **349** under `src/db/schema/`; **550** controllers; **1,078** services.

**Reading the file counts is not enough.** A gate can open 3,648 files and still enforce its rule
over eleven sites. Section 1b is the number that matters.

### 1b. Enforced population vs. apparent scope — the four that do not survive it

#### ① `check:cache-key-shapes` scans 0 files and cannot fail. **VACUOUS.**

`pnpm check:cache-key-shapes` → **exit 0, zero bytes of output, zero files opened.**
`src/scripts/check-cache-key-shapes.mjs` (339 lines) has no top-level execution and no `main`; it is
a library of `export`ed helpers (`templateToShape`, `parseCacheKeyFactories`, `resolveAllSites`, …)
consumed by `check-cache-invalidation.mjs`. Running it as a gate executes module initialisation and
exits.

The logic is not lost — `check:cache-invalidation` imports it and does exercise it over 3,785 files.
But **`check:cache-key-shapes` as a named gate is a no-op**, and "it passed" about it means nothing.
Either drop the script entry or give the file a `main`.

#### ② `check:idempotent-commands` enforces over **11 of 2,126** mutating handlers — 0.52 %.

Reported: `Controllers scanned 546 · Handlers in scope 11`, then eleven `SKIP` lines and
`OK — every in-scope mutating handler carries @Idempotent`.

Independent walk (`<scratch>/idem-reach.mjs`, replicating the gate's own
`parseHandlers` and dropping only its criticality filter):

```
controller files walked                        546
  file-excluded controllers                     20
  @Public()-class controllers                   30
mutating handlers (POST/PUT/PATCH/DELETE)    2,126
  in a file-excluded controller                 96
  in a @Public() class                         106
  handler-level @Public()                       29
  carrying @Idempotent                         245   (11.5%)
  matching the CRITICAL regexes                133
IN GATE SCOPE (critical, no @Idempotent)        11   ← all 11 then allowlisted
SILENTLY OUT OF SCOPE                        1,723
```

Backend CLAUDE.md §2 says "**mutating endpoints** accept a client `Idempotency-Key`". **245 of 2,126
do.** The gate's scope is not "mutating handler" — it is two hardcoded keyword regexes
(`check-idempotent-commands.mjs:20` and `:23`) listing ~30 route words and ~35 method names. Anything
outside that vocabulary is invisible, and the gate's finding count is **0 by construction**: it only
records a handler if it is critical **and** lacks `@Idempotent`, and all 11 such handlers are in
`HANDLER_EXCLUSIONS`.

**And six of the route regex's own branches can never match.** `CRITICAL_ROUTE_RE` is
`/(?:^|\/)(?:…|\/post$|\/ship$|\/receive$|\/dispatch$|\/adjust$|\/reverse$|…)(?:\/|$)/i`. Those six
alternatives already carry a leading `/`, and the group prefix `(?:^|\/)` adds another, so each can
only match a literal `//post`. Measured:

```
"/journal/:entryId/post"  false      "/x/receive"   false
"/:entryId/post"          false      "/x/reverse"   false
"/:soId/ship"             false      "/x/adjust"    false
"/post"                   true       "/x/dispatch"  false
```

Consequence, with file:line: `src/modules/accounting/core/accounting-ledger.controller.ts:123`
`postJournalEntry("journal/:entryId/post")` and `:136`
`reverseJournalEntry("journal/:entryId/reverse")` — post and reverse a general-ledger journal entry —
carry no `@Idempotent` and are **not in scope**. `inv-sales-orders.controller.ts::ship` is in scope
only because the *method-name* regex happens to contain `ship`, not because the route matched.

#### ③ `check:bulk-id-limits` reports 0 findings over an empty set. **VACUOUS in practice.**

Reported: `scanned 3382 schema files; no unbounded id-array properties found` → exit 0.

Its rule (`check-bulk-id-limits.mjs` header) is scoped to `z.array(...)` properties **named `ids` or
ending in `Ids`**. Independent walk over the schemas actually bound to an HTTP body or query via
`@Validate({ body: … })` / `{ query: … }` (`<scratch>/array-caps-body.mjs`):

```
@Validate sites parsed on controllers               2,990
distinct schema identifiers bound to body/query     1,623
array properties inside those bound schemas           289
  capped with .max()                                  158
  UNCAPPED                                            131
  of the uncapped, matching `ids`/`*Ids`                 0   ← the gate's ONLY scope
  UNCAPPED AND INVISIBLE to the gate                   131
```

**Zero of the 131 uncapped attacker-controlled array inputs are in the gate's scope.** Its own
docstring states the vector — "one request can force an arbitrarily large `IN (…)` or an arbitrarily
large write transaction" — and that vector does not care what the property is called. Verified
instances:

- `src/modules/accounting/settings/dto/settings.schemas.ts:93` — `postOpeningBalancesSchema.lines:
  z.array(openingBalanceLineSchema).min(1)`. Unbounded journal post.
- `src/modules/e-sign/dto/e-sign.schemas.ts:323` — `pageNumbers: z.array(z.number().int().min(1))`.
- `src/modules/support/core/dto/support-tickets.schemas.ts:165` — `createRoutingRuleSchema.conditions`
  uncapped, while `candidateAgentIds` on **line 169 of the same object** carries `.max(50)`. The
  sibling was capped because the gate could see its *name*.

I capped the 10 sites in my territory (§4). The other 121 need routing.

#### ④ `check:log-secrets` enforces over **0 of 690** log call sites.

Reported: `Scanned 3648 source files · TIERS map 101 entries · Redactor 23 substrings + 18 exact names
· OK — … every name this gate guards is withheld by the runtime redactor.`

That closing clause is true and **vacuously so**: the gate guards a strict subset. Its
`SENSITIVE_NAME_RE` (`check-log-secrets.mjs:65-66`) holds ~15 secret-shaped names; the runtime
redactor (`src/common/observability/redact.ts:18-81`) withholds **41** — the same secrets *plus* nine
PII names (`emailaddress`, `phonenumber`, `mobilenumber`, `recipient`, `email`, `to`, `cc`, `bcc`,
`subject`, `filename`). Measured (`<scratch>/log-vocab.mjs`):

```
logger/console call sites on one line (excl. src/scripts, excl. specs)   690
  with a template-literal message interpolating a value                  126
  matching the gate's SENSITIVE_NAME_RE — its entire enforced population    0
  interpolating a name redact.ts withholds but the gate never checks        6
```

The gate is **not** blind to template literals — `stripStringLiterals` at
`check-log-secrets.mjs:162-169` deliberately preserves `${…}` spans. It is blind to the *vocabulary*.
Of the six, four are false alarms (the PII is in the meta object, which the redactor withholds). Two
are real leaks, both outside my territory — see report 23 §3.

### 1c. Reach holes that are real but currently cost nothing

Stated so they are not rediscovered as surprises:

- **`check:db-call-count` and `check:unbounded-reads` never open a single file under `src/common/`.**
  Measured: 2,161 and 2,301 files opened, **0** from `common/`. `db-call-count` also excludes all 545
  controllers and 203 `*.module.ts` (755 of the 2,916 non-spec module files). I checked what that
  costs today: 4 controllers issue Drizzle calls directly, 14 `src/common/` files do, and an
  independent scan of `src/common/` for a `findMany`/`select` with no `.limit()` within 12 lines
  returns **1 hit** (`src/common/outbox/external-effect-ledger.ts:153`) which is an aggregate, not a
  row read. So: **0 findings lost today, but the shared seam is outside both corpora.**
- **`check:db-call-count` self-reports skipping 2,081 of 4,843 loop openers (43 %)** — "statement
  ended on the opener line". I reproduced the blind spot independently (2,558 single-line loop
  openers under `src/modules/`) and searched all of them for a database or cache call: **12 hits, all
  12 correctly batched** (`cache.invalidateMany(xs.map(…))`, `employment.getFactsBatch(orgId,
  xs.map(…))`, `tx.insert(t).values(chunk.map(…))`). **0 real N+1 hidden today** in a 43 % blind spot.
- **`check:namespace-coverage`'s corpus is `*.service.ts` only** (1,061 module services + 20 common
  files). Four files hold six cache call sites it never opens:
  `src/modules/chat/chat-channel-members-implementation.ts:342`,
  `src/modules/inventory/purchase-orders/po-lifecycle.ts:41,63,82,109`,
  `src/modules/inventory/quality/quality-disposition.ts:158`. Confirmed by trace:
  `namespace-coverage NNNN` vs `cache-invalidation YYYY` on the same four paths. Its one reported
  DEAD BUMP (`chat:unread`) is genuine — two bump sites, zero reads, verified by grep.
- **Ratchets are ratchets, not clean rooms.** `query-projections` 1,378 unprojected reads against a
  ceiling of 1,383 (**5 slots of headroom**); `relation-hydration` 186 against 186, plus **81
  colliding const names it could not resolve** and 72 unenforced credential candidates;
  `n1-growing-loops` 97 against 102 plus 37 excluded in crm/inventory; `fire-and-forget` tier 2 at 255
  against 279; `hr-pagination` 35 against a baseline of 60. Each of those prints its own honest
  caveat; none of them is "satisfied".

### 1d. The gates that hold up

`check:tenant-indexes` claims 840 tenant tables / 840 with a leading tenant index, from 347 schema
files. This is the one I could check against something other than source text — the **live**
catalogue. That query is in §7 (it needs one rename: `leading` is a Postgres reserved word and the
first attempt failed with a syntax error). `check:outbox-consumers` builds a real module graph (216
modules from `AppModule`, 1,209 providers) and compares emitted-vs-registered event types — that is a
runtime-shaped check, not a text scan, and its 24-emitted / 29-registered result is meaningful.
`check:transaction-callbacks` (2,059 spec files, 473 transaction doubles, 266 invoking) directly
targets the "a bare `jest.fn()` voids every assertion" trap and is well-aimed.

---

## 2. C079 — what the benchmark tooling actually connects as

**Verdict: mostly compliant, with one tool that connects as the BYPASSRLS owner as shipped, and one
provenance field that is a hardcoded string rather than a measurement.**

Fifteen tools issue `EXPLAIN`. Ten of them cannot reach the owner — they read `APP_DATABASE_URL` (or
`OWNER_DATABASE_URL` + `SET LOCAL ROLE streamline_app`) and `process.exit(1)` when it is unset. All
of them set `app.organization_id` in the same transaction as the `EXPLAIN`. Three
(`test/perf/measure-heavy-query-plans.mjs:90-111`, `measure-benchmark-manifest.mjs:91-100`,
`measure-projection-bytes.mjs:171-173`) go further and **refuse to measure** after a live
`SELECT rolbypassrls`, one of them also proving RLS is live by asserting a no-GUC read raises `42501`.
That is the right shape and it exists here.

Two defects, both verified by me directly, both in `src/scripts/**` which I may not edit:

**C079-A — `src/scripts/capture-build-baseline.mjs:8` connects as the owner as shipped.**

```js
// :8
const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("APP_DATABASE_URL is required (the non-BYPASSRLS app role).");   // :10
```

The error message states the rule the line breaks. `package.json` wires
`baseline:build` → `node --env-file=.env src/scripts/capture-build-baseline.mjs`, and `.env:116` reads
`# APP_DATABASE_URL is deliberately unset.` while `DATABASE_URL` resolves to **`neondb_owner`**.
Every other read-cost script uses the strict form (`check-build-read-cost.mjs:7`,
`check-hr-list-read-cost.mjs:7`, `run-read-cost-budgets.mjs:275`, `run-workload-envelope.mjs:13`). It
is a one-token divergence, and `:16` also hardcodes `ssl: "require"`, so it cannot reach a local
scratch target even if the variable were set. The artifacts currently in
`docs/refactor/baseline/baseline.json` **do** carry `"One-Time Filter": "(current_org_id() = …)"` on
all 8 plans, so they were captured before the drift — but the tool as wired can no longer reproduce
them.

**C079-B — `contracts/route-budgets.json`'s role provenance is a literal, not a measurement.**

`src/scripts/measure-route-budgets.mjs:273`:

```js
role: "streamline_app (rolbypassrls = false, tenant GUC set)",
```

written by a script that **never opens a connection** — it reads the JSON artifact produced upstream
by `run-read-cost-budgets.mjs`, which requires `APP_DATABASE_URL` but never asks Postgres who it is.
Point that variable at an owner DSN and the manifest is stamped compliant anyway. This is the same
failure shape as the BOLA ratchet that formatted every key to `"undefined undefined"`: the field that
exists to prove the criterion is a constant. The fix is six lines already written twice in this repo
(`measure-heavy-query-plans.mjs:90-111`).

The **HTTP** half of the same file is genuinely verified —
`test/perf/route-budget-http.seeded-e2e-spec.ts:328-331` asserts `bypassrls === false` and
`merge-http-route-budgets.mjs:115` refuses a capture whose role string is not
`rolbypassrls = false`. So `route-budgets.json` has one verified provenance and one asserted one, in
the same file, under two adjacent keys.

**Recorded evidence.** The plan corpora
(`test/perf/benchmark-plans/plans-{large,mid,small}.txt`, 533/535/537 `current_org_id()` occurrences;
`approved-complex-{large,mid,small,tiny}.txt`) are app-role captures and say so.
`contracts/benchmark-manifest.json:63-65` carries a **measured** `{"name":"streamline_app",
"bypassrls":false}` written from a live `SELECT`. Two caveats worth carrying forward: the nine
`*-sdf` blocks show no RLS qual because a `SECURITY DEFINER` body is opaque to `EXPLAIN` — their
`shared hit=6` excludes the function's internal work and is **not comparable** to the direct-scan
numbers beside it; and `07-index-redundancy/index-redundancy.json` (256 entries) stores no role field
at all, so the artifact cannot prove which role produced it even though its producer does
`SET LOCAL ROLE streamline_app`.

**C069 coverage, from the file itself:** 92 route budgets. `dbCallBasis` = **55 `default-ceiling`** /
19 `declared-estimate` / 18 `counted-call-path`. `measuredDbCalls` populated on **3**, null on **89**.
`measuredBufferBlocks` populated on 54. So 60 % of the budgets carry the global default
`maxDbCalls: 10` and 96.7 % have never had their call count measured. C069 asks for "a maximum
database-call count for every critical route"; three routes have one.

---

## 3. THE MEASUREMENT THAT MATTERS MOST — planning, not execution, is the cost

I was asked whether other reads plan across all partitions. The answer turned out to be much larger
than partitions.

### 3a. Only one table in this repository is partitioned

- Live catalogue on `scratch_perf_seed`: `pg_class.relkind = 'p'` returns **exactly one row** —
  `notifications`, `RANGE (created_at)`, **49 partitions**, 214 MB.
- Across all 677 journalled migrations, table partitioning appears **once**:
  `migrations/0582_notifications_partition_by_created_at.sql` → `) PARTITION BY RANGE ("created_at");`.
  The other three `PARTITION BY` hits (`0337`, `0774`, `0993`) are `row_number() OVER (PARTITION BY …)`
  window clauses.

So the direct answer to "how many other reads plan across all partitions" is: **none — there is no
other partitioned table.** Backend CLAUDE.md §3's list (`ai_usage_logs`, audit logs, chat messages,
event/outbox streams) is aspirational; `src/db/partition-preconditions.spec.ts` pins that
`chat_messages` and the outbox are not partitioned.

### 3b. But every read pays a planning cost that dwarfs its execution

Eight read shapes × four tenants, third of three runs (warm cache), as `streamline_app` with the GUC,
under RLS. `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`; planning buffers taken from the `Planning` node,
execution buffers summed over the `Plan` tree. Harness `<scratch>/{measure,plan-vs-exec}.mjs`.

```
statement                                        tenant        planBuf  execBuf   ratio   rows plan_ms exec_ms
single-row PK probe on support_tickets           large 89.93%      348        6   58.0x      1   0.892   0.034
single-row PK probe on support_tickets           tiny   0.18%      348        6   58.0x      1   2.670   0.145
tasks page (LIMIT 25)                            large 89.93%      282        6   47.0x      0   3.482   0.063
organization_members lookup                      large 89.93%      261        6   43.5x     25   0.928   0.032
support_tickets count(*)                         large 89.93%      309       10   30.9x      1   2.997   0.433
support_tickets count(*)                         tiny   0.18%      309        6   51.5x      1   3.310   0.174
support_tickets page (LIMIT 25)                  large 89.93%      360      180    2.0x     25   3.463   1.240
support_tickets page (LIMIT 25)                  tiny   0.18%      360       15   24.0x      6   3.672   0.138
notifications keyset page                        large 89.93%   11,774      255   46.2x     25  11.143   0.290
notifications keyset page                        tiny   0.18%    11,774      102  115.4x      0  11.314   0.473
notifications unread count, NO created_at bound  large 89.93%   11,505   90,162    0.1x      1  11.770  36.867
notifications unread count, NO created_at bound  tiny   0.18%    11,505       72  159.8x      1  11.783   0.519
notifications unread count, 30-day bound         large 89.93%   11,735    8,859    1.3x      1  11.871   3.800
notifications unread count, 30-day bound         tiny   0.18%    11,735       12  977.9x      1  12.052   0.100
```

**24 of the 32 measurements read more buffers planning than executing. In 14 the planner reads more
than 40× what the executor does.** And because `prepare: false` is set on the Neon driver (backend
CLAUDE.md §3, and the reason `sql.placeholder` is inert here), **there is no plan cache — every
request pays it again.**

Three consequences, in order of importance:

1. **The `notifications` hot path reproduces, and its cause is the table, not the query.** I measure
   **11,505–11,774 planning buffers and 11.1–12.1 ms of planning on every notifications statement,
   on every tenant** — including the 0.18 % tenant whose entire answer is 12–102 execution buffers.
   That is the 49-partition planning floor. It is paid by the keyset page just as much as by the
   count.
2. **Adding the partition-key bound does not fix it.** A 30-day `created_at` bound cuts the large
   tenant's *execution* 90,162 → 8,859 buffers and 36.9 → 3.8 ms — a real and worthwhile 10× — while
   *planning* goes 11,505 → **11,735**, marginally worse. The planner enumerates all 49 partitions
   before pruning. So the pruning fix is worth doing for the large tenant and does **nothing** for the
   ~11 ms floor all four tenants pay. (Notifications is another agent's territory; this is the
   generalisable half, handed over.)
3. **The unpartitioned tables have the same disease at 1/40th the scale.** 261–360 planning buffers to
   plan a single-row indexed probe. That is the catalogue cost of planning against ~900 relations with
   RLS policies to inline, and it is the floor under every route in the product. The lever is
   `prepare: false` — a driver/pooler decision, not a query fix, and a product decision I am flagging
   rather than taking.

**This is invisible to every gate in the set.** `contracts/route-budgets.json`'s
`measuredBufferBlocks` are execution buffers; on the `support_tickets` count that is 10, and the real
per-request cost is 319. Buffers alone mismeasure in the other direction too — pair them with rows,
plan time and bytes, which is what the table above does.

### 3c. C074 — automatic totals on paginated reads

Full inventory produced this run; the sites are listed by class with file:line in §6. Summary:

- **Class A** (offset page + unconditional total): **61** sites — inventory 38, hr 9, kb 2, leads 2,
  finance 2, support 1, clients 1, feedbucket 1, invoices 1, expenses 1, automation 1,
  customer-executive 1, `src/me` 1.
- **Class B** (cursor/keyset page that *also* counts — the shape C074 names explicitly): **20** sites,
  of which **9 count on every page**: `hr/forms/hr-forms.service.ts:57`,
  `hr/forms/hr-forms-submissions.service.ts:202`, `hr/templates/hr-templates.service.ts:75`,
  `hr/import/hr-import.service.ts:128`, `hr/recruitment/recruitment-offer-list-query.ts:53`,
  `hr/recruitment/recruitment-jobs.service.ts:68`, `hr/lifecycle/termination-read.service.ts:73`,
  `hr/lifecycle/onboarding-views.service.ts:174`, `hr/time/attendance.service.ts:253`. The other 11
  are gated to the first page (`cursor === undefined`).
- **Class C** (opt-in): **0 of 81.** `grep -rniE "includeTotal|withCount|include_total|with_count"`
  over `src/` returns four hits, all in
  `src/modules/build/core/projects-work-query.service.ts:274,290,319,338`, and that parameter is fed
  `isFirstPage = !cursor` at `:199` — a derived heuristic, not a DTO field. No controller accepts a
  `count`/`includeTotal` query param. **`src/common/pagination/list-query.schema.ts:45`
  (`baseListQuerySchema`) has no total-opt-in field, so no endpoint in the product *can* be opt-in.**
  That is the single root cause and it is in the shared seam.
- **Class D** (shared helpers that force a total): `src/common/pagination/pagination.ts:8` (`total` is
  non-optional on `ListResponse<T>`), `:21` (`buildListResponse(items, total, …)` — `total` is a
  required positional), `src/common/pagination/window-count.ts:4` (`totalOverWindow =
  count(*) OVER ()`) and `:6`. `cursor.ts`, `keyset.ts`, `cursor.schema.ts` are clean —
  `cursor.ts:66` says so explicitly ("no second count query").
- **Counts over the partitioned table: 1.**
  `src/modules/notifications/unified-inbox.service.ts:381` — `count()` over `notifications` with no
  `created_at` bound. That is the 11,505-planning-buffer / 90,162-execution-buffer statement measured
  above.

**Measured, not assumed, for the one in my territory:** `support-tickets.service.ts:92` runs an
unconditional `count(*)` beside its offset page. On this seed it costs **6–10 execution buffers vs.
15–180 for the page**, so it is not the expensive case C074 targets and I did **not** "fix" it. It is
also already behind `cachedVersioned` with `CACHE_TTL.SHORT`. Reporting a negative result rather than
a cosmetic change.

I did **not** widen `baseListQuerySchema` or make `ListResponse.total` optional. Both would change a
wire contract 92 routes and the frontend read against, and C074 is a product decision about which
totals are worth their budget — not a shared-seam refactor to land unannounced. Routing it.

---

## 4. Changes I made

Six of the fifty-five `provider-in-transaction` violations, plus ten uncapped request-body arrays.

| file | change |
|---|---|
| `src/modules/e-sign/sign-ai.controller.ts` | `@NoTenantTransaction()` on `summarize` |
| `src/modules/e-sign/sign-ai.service.ts` | both reads moved into one `runInTenantTransaction(…, { orgId })` that commits before the object-store fetch, the text extraction and the LLM call |
| `src/modules/e-sign/__tests__/e-sign-services-tenant-isolation.spec.ts` | the two `SignAiService` cases now supply the ambient tenant context the new seam reuses |
| `src/modules/timesheets/core/timesheets-ai.controller.ts` | `@NoTenantTransaction()` on all five handlers |
| `src/modules/timesheets/core/timesheets-ai.service.ts` | `readEvidence()` helper; four evidence reads now commit before the gateway call |
| `src/modules/e-sign/dto/e-sign.schemas.ts` | caps on `allowedFileTypes`, `allowedAuthMethods`, `appliesStates`, `pages.pageNumbers` |
| `src/modules/support/core/dto/support-sla.schemas.ts` | `.max(5)` on both `pauseStatuses` |
| `src/modules/support/core/dto/support-tickets.schemas.ts` | `.max(50)` on both `conditions` |
| `src/modules/tasks/dto/task.schemas.ts` | `.max(100)` on `sequenceCreateSchema.steps` |
| `src/modules/timesheets/core/dto/settings.schemas.ts` | element and length caps on `requiredFields` |

`check:placement-bypass` moved **55 → 45** `provider in tx` (and `@NoTenantTransaction` 35 → 45).
It exits **1** both before and after — its non-zero status is a pre-existing condition of the
allowlist, not a regression from this work.
`<scratch>/array-caps-body.mjs` moved **131 → 121** uncapped, with **0** remaining in my territory.

The e-sign case was the worst of the six: `SignAiService.summarizeDocument` held a pooled connection
across an object-store `getFileStream` **plus a full stream drain per document**, a CPU-bound
`extractAttachmentText`, **and** the LLM call. All three now happen after the transaction commits.

`AiGatewayService` is safe under `@NoTenantTransaction` and I verified that rather than assuming it:
`AiUsageService.track` (`ai-usage.service.ts:82-97`), `AiCreditsReservationService.reserve/settle/
release/ensureWalletForOrg` (`:46-83`, `:110-113`, `:167-182`, `:192-274`, `:283-332`) and
`AccessService` (`access.service.ts:204,296,327,406,463`) every one pass an explicit `{ orgId }`, so
they open their own transaction when there is no ambient one.

---

## 5. Findings I could not fix — routed by owner

**C078 / C147 — the 45 remaining `provider-in-transaction` handlers.** The arithmetic that makes this
urgent, all from source:

- pool `max` = **10** on a direct Neon endpoint, **20** pooled, **5** in dev (`src/db/pool.config.ts:177`)
- queue depth = `max × 4` = **40**, `acquireTimeoutMs` = **5,000 ms** (`src/db/pool-admission.ts:33-34,253-254`)
- `idle_in_transaction_session_timeout` = **60,000 ms** (`pool.config.ts:122`)
- LLM per-attempt timeout = **30,000 ms** fast tier, **60,000 ms** standard, plus retries
  (`src/modules/ai/core/providers/llm.service.ts:100-101`, retry log at `:202`)

**Eleven concurrent AI requests exhaust the entire pool on a direct endpoint.** Each holds its
connection for the whole provider call. Requests 12–51 queue and are killed after 5 s. **One slow LLM
provider takes every unrelated route in the process down within five seconds.** A standard-tier call
that runs its full 60 s timeout sits exactly on the 60 s idle-in-transaction kill line. The guard at
`pool.config.ts:255-257` names this exact failure mode in prose — "every request runs inside a tenant
transaction, so a handler stalled on an external call pins its connection indefinitely" — and 45
handlers still do it.

Triage by blast radius:

| owner | sites | shape | recommended |
|---|---|---|---|
| **support** | **14** — `support-ai.controller.ts:90,102,114,126,138,154,170,182,193,207`; `support-automations.controller.ts:102`; `support-kb.controller.ts:258,282,294` | read → provider → **write** sandwich across 4 services (`support-ai-triage`, `-triage-analysis`, `-translation`, `-triage-data`), **0** of which use `runInTenantTransaction` today. `reindexAll` is also a whole-corpus job on a request thread (C146). | Highest count, highest risk. Needs explicit transactions on **both** sides and a booted-API exercise — a swallowed `42501` passes every static check (CLAUDE.md §8). Do not land blind. |
| kb | 7 | `kb-authoring:29,40,51`; `kb-ask:56`; `kb-media:30`; `kb-sources:48,66` | `kb-media`/`kb-sources` `upload` are blob + parse + LLM — the same shape as the e-sign fix, and `kb-article-ai.controller.ts` in the same module already carries the correct `@NoTenantTransaction()` pattern to copy. |
| hr | 7 | `employees:79 onboard`, `recruitment-candidate-records:75,86,100`, `recruitment-candidates:168,234`, `hr-email-templates:79` | `resumeParse` is blob + parse + LLM. |
| inventory | 4 | `inv-ai-explain:47,59,71,95` | read-only before the call; cheapest fix in the set. |
| accounting | 3 | `accounting-ai.controller.ts:33,45,57` | read-only before the call. |
| mail | 3 | `mail.controller.ts:170,181,192` | |
| leads | 3 | `leads.controller.ts:68,117`, `leads-detail:184` | reached via `AutomationService.runAutomationsForEvent` → `AiNodeExecutorService`, i.e. an **ordinary CRM write** silently becomes a provider call inside the write's own transaction. Least obvious, worth calling out. |
| feedbucket | 3 | `feedbucket.controller.ts:176,189`; `feedbucket-public.controller.ts:335` | `-public` is **unauthenticated** — denial-of-wallet *and* pool exhaustion from anonymous traffic. |
| cron | 2 | `cron-hr-notifications.controller.ts:81,88` | whole-org fanout on one connection. |
| deals · automation · payroll | 1 each | `deals.controller.ts:199`; `automation.controller.ts:23`; `payroll-ai-explain.controller.ts:43` | same `AutomationService` → `AiNodeExecutorService` path as leads. |

**C074 — 121 uncapped request-body arrays outside my territory** (§1b③). Worst by write amplification:
`accounting/settings/dto/settings.schemas.ts:93` (`postOpeningBalancesSchema.lines`),
`build/core/dto/template.schemas.ts` (`createTemplateSchema.tickets`),
`build/core/dto/custom-fields.schemas.ts` (`upsertCustomFieldValuesSchema.values`),
`finance/ar/dto/finance-ar.schemas.ts` (`createCreditNoteSchema.items`),
`finance/tax/dto/tax-adjustments.schemas.ts` (`createTaxAdjustmentSchema.lines`).

**C079 — `src/scripts/capture-build-baseline.mjs:8` and `measure-route-budgets.mjs:273`** (§2).
`src/scripts/**` is not mine.

**Gate scripts themselves** — `check-cache-key-shapes.mjs` (no `main`),
`check-idempotent-commands.mjs:20` (six unmatchable regex branches; scope 11/2,126),
`check-bulk-id-limits.mjs` (`ids`/`*Ids` name filter over an empty set),
`check-log-secrets.mjs:65` (15 names vs. the redactor's 41). All in `src/scripts/**`.

---

## 6. Artifacts

Under `<scratchpad>/` (session-local, not committed):
`trace-fs.cjs` (the fs-instrumentation preload) · `trace/*.json` (17 per-gate read manifests) ·
`idem-reach.mjs` · `array-caps.mjs` · `array-caps-body.mjs` · `log-vocab.mjs` ·
`measure.mjs` + `plan-vs-exec.mjs` (the EXPLAIN harness) · `gates/*.log` (17 gate outputs).

---

## 7. Commands run and exit codes

Every one executed in this session; the number each produced is beside it.

```
pnpm check:cache-key-shapes                                    EXIT 0   0 files, 0 bytes of output
pnpm check:query-projections                                   EXIT 0   3,649 files; 1,378/1,383 ratchet
pnpm check:relation-hydration                                  EXIT 0   3,649 files; 186/186; 81 unresolved
pnpm check:n1-growing-loops                                    EXIT 0   2,414 files; 97/102
pnpm check:db-call-count                                       EXIT 0   2,161 files; 2,081/4,843 openers skipped
pnpm check:unbounded-reads                                     EXIT 0   2,301 files; 3 actionable
pnpm check:bulk-id-limits                                      EXIT 0   3,383 files; 0 findings (empty scope)
pnpm check:tenant-indexes                                      EXIT 0   347 files; 840/840
pnpm check:hr-pagination                                       EXIT 0   194 files; 35/60
pnpm check:transaction-callbacks                               EXIT 0   2,059 spec files; 473 doubles
pnpm check:fire-and-forget                                     EXIT 0   3,662 files; tier1 0, tier2 255/279
pnpm check:outbox-consumers                                    EXIT 0   3,646 files; 24 emitted / 29 registered
pnpm check:idempotent-commands                                 EXIT 0   526 files; 11 in scope, all excused
pnpm check:log-secrets                                         EXIT 0   3,649 files; enforced population 0/690
pnpm check:namespace-coverage                                  EXIT 0   1,081 files; 75 reads / 76 bumps
pnpm check:cache-invalidation                                  EXIT 0   3,785 files; 187 writes / 475 invalidates
pnpm check:placement-bypass   (before)                         EXIT 1   147 bypasses, 55 provider-in-tx
pnpm check:placement-bypass   (after)                          EXIT 1   147 bypasses, 45 provider-in-tx
pnpm typecheck  (via heavy.sh, 8 GB heap)                      EXIT 0   0 errors
jest --runInBand --testPathPattern="(e-sign-services-tenant-isolation|timesheets)"
                                                               EXIT 0   30 suites, 236 tests, all passed
node <scratch>/idem-reach.mjs                                  EXIT 0   2,126 mutating handlers, 245 fenced
node <scratch>/array-caps-body.mjs (before)                    EXIT 0   289 arrays, 131 uncapped, 0 in scope
node <scratch>/array-caps-body.mjs (after)                     EXIT 0   289 arrays, 121 uncapped, 0 mine
node <scratch>/log-vocab.mjs                                   EXIT 0   690 log sites, gate population 0
node <scratch>/plan-vs-exec.mjs                                EXIT 0   32 measurements
psql scratch_perf_seed  (streamline_app)                       —        rolbypassrls=f, rolsuper=f, 1,729 MB
psql … relkind='p'                                             —        1 partitioned table, 49 partitions
psql … tenant-index census                                     ERR 1st  "syntax error at or near \"leading\"" —
                                                                        `leading` is a reserved word; §1d
```

**Not run:** the seeded e2e suite; `next build`; `pnpm check:route-budgets`; any measurement against
`scratch_gates_head`. Nothing in this report claims a result from a command I did not execute.
