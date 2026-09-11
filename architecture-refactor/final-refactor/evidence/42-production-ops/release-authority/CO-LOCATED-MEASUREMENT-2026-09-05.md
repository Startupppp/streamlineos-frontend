# Co-located measurement environment and captures — 2026-09-05

Bears on PRD-C005, C006, C018, C085, C140, C141, C142, C143, C145, C148, C149, C151, C158.
Verified results only. Anything not measured is recorded as not measured, never as passing.
Figures below are filled in as each capture completes; a section without a table has not run.

## Why this exists

[LATENCY-FLOOR-2026-09-04.md](LATENCY-FLOOR-2026-09-04.md) established that from this machine every
tenant transaction against Neon `ap-southeast-1` costs ~448 ms and one Upstash round trip ~120 ms, so
PRD-C141 (p95 ≤ 300 ms) and PRD-C143 (cache hit p95 ≤ 100 ms) could not be judged remotely. The
criteria call for a controlled, co-located PostgreSQL + Redis + backend + production frontend. That
stack now exists on this machine, outside both repositories, in `D:\localstack`:

| Component | Version | Provenance | Listen |
|---|---|---|---|
| PostgreSQL | **18.6** (x86_64-windows, msvc 19.44) | EDB `postgresql-18.6-1-windows-x64-binaries.zip` | 127.0.0.1:5432 |
| pgvector | 0.8.6 for PG18 | `andreiramani/pgvector_pgsql_windows` release `0.8.6_18` | in-process |
| Redis | 5.0.14.1 (Windows build) | `tporadowski/redis` zip | 127.0.0.1:6379 |
| Upstash REST shim | `backend/src/scripts/local-upstash-shim.mjs` | this repository | 127.0.0.1:8079 |

PostgreSQL 17 was tried first and **cannot run this schema**: the migration chain uses
`ALTER TABLE … ADD CONSTRAINT <name> NOT NULL <column>`, which is PostgreSQL 18 syntax, and the Neon
project reports `pg_version: 18`. The 17 cluster was stopped and replaced.

The application talks to Redis only through `@upstash/redis` (REST). The shim serves that protocol on
localhost and forwards each command verbatim to the local RESP server, so **no application code or
configuration surface changed**: the run points `UPSTASH_REDIS_REST_URL` at the shim, and the committed
`.env` keeps the real Upstash endpoint (retained by the owner; its plan is currently invalid).

Cluster settings that change a plan (recorded because a percentile without them is not comparable):
`shared_buffers=3GB`, `effective_cache_size=10GB`, `work_mem=32MB`, `random_page_cost=1.1`, `jit=off`,
`fsync=off`, `synchronous_commit=off`, builtin `C.UTF-8` locale, superuser `neondb_owner` (migration
`0431` pins that role name), `trust` auth on loopback.

## Transit measured on the co-located stack

| Operation | n | p50 | p95 |
|---|---:|---:|---:|
| Upstash-REST shim `GET` (200-byte value) from Node `fetch` | 50 | **1.95 ms** | 4.63 ms |
| `GET /health` on the built backend (`dist/main.js`, `NODE_ENV=production`) | 1 | 27 ms (first request) | — |
| `/health/ready` dependency latency reported by the API | 1 | database 3 ms · cache 5 ms | — |

## Database build and seed

| Step | Command | Result |
|---|---|---|
| Role | `CREATE ROLE streamline_app LOGIN NOBYPASSRLS` (same password as `.env`) | created before the chain — migration ~0166 GRANTs to it |
| Cold build | `DATABASE_URL=<local owner> node src/scripts/apply-chain-cold.mjs` | `RESULT: REACHED_HEAD 691/691 already_present=0 chain_gaps=0` |
| App role | `node src/scripts/db-bootstrap-app-role.mjs` | `tables granted: 1027/1027 … bypassrls=false … RESULT: READY` |
| Layer 1 | `SCRATCH_DATABASE_URL=<local owner>?sslmode=disable node src/scripts/seed-scratch-e2e.mjs` | `All sections completed without errors.` in **13.0 s** (935 s on Neon) |
| Layer 2 | `node test/perf/seed-heavy-query-load.mjs` | `Seed complete — every section succeeded.` chunks 13,560 · notifications 271,200 · event_attendees 120,144 |
| Layer 3 | `node src/scripts/seed-perf-scratch.mjs` | *pending — first run exposed two new-section defects (reporting-line overlap, locked payroll run), fix in progress* |

Two harness defects were found by the cold build and fixed in `apply-chain-cold.mjs`:
1. A statement that raised a duplicate or "does not exist" error re-entered the retry loop forever
   (`continue` inside `while (true)`); on Neon those branches had never fired. Now it advances.
2. A single-session cold build fails at `0619` with `42883 current_org_id() does not exist` because
   `0431`'s `ALTER ROLE … SET search_path` reaches only new sessions; rerunning the chain after `0431`
   resumes it. Recorded, not yet patched into the script.

## What the disposable local database found — fixture and application defects

A database built from empty by the migration chain and filled only by the seeds exposes every
assumption a long-lived scratch database hides. Fixed in the seed layers (backend commits
`0c7c2a743`, `5006c67b5`):

| # | Symptom on the local stack | Cause | Fix |
|---|---|---|---|
| 1 | every seed statement `read ECONNRESET`, swallowed as WARN; PG log `invalid length of startup packet` | seeds default to `ssl: "require"`; a local server speaks no TLS | `?sslmode=disable` on every local URL (documented in the environment memory, not a code change) |
| 2 | every request for the mid tenant 401 ("has no region") | layer 2 created org `…0003` without an `organization_placement` row | layers 2 and 3 place every org they create or find unplaced |
| 3 | `POST /deals`, `/leads`, `/invoices`, `/support` answered **402** on both tenants | no `subscriptions` row, so `PlanLimitsService` treated an 8,000-lead tenant as FREE | every seeded org carries an ACTIVE ENTERPRISE subscription |
| 4 | every authenticated page redirected to `/org-setup`; the first Web Vitals capture measured the setup wizard on 64 samples and was refused by its own gate | `organizations.onboarding_completed_at` and `users.onboarding_completed_at` never stamped | both stamped (COALESCE) for every seeded org and user |
| 5 | `search/*` read-cost budgets `42501 permission denied for schema app` on every profile | `db-bootstrap-app-role.mjs` granted `public,build,build_events` only; migration `0374` grants `app` only when the role already exists at that point of the chain | `app` added to the bootstrap-role defaults |
| 6 | layer 3 `excl_hr_reporting_lines_no_overlap` and `payroll_line_items are immutable while run N is locked` on every profile | new sections inserted open-ended lines over existing ones and line items into CLOSED runs | overlap-safe two-phase reporting lines; DRAFT-then-CLOSED payroll runs |
| 7 | seeded-e2e preflight "ledger does not match current 691-entry journal" over a database at head | another session's checkout flipped `0956_dashboard_read_path_indexes.sql` to CRLF after the chain hashed its LF bytes | bytes restored to the ledger's form; recorded in memory, no code change |

Application defects the HTTP route capture surfaced, fixed with bite-proven unit tests (backend
`1dba501a2`), plus the two the live BOLA sweep had found earlier (`50e973473`):

| Route / worker | Failure | Root cause | Fix |
|---|---|---|---|
| worker `monthly-leave-reset` | SQLSTATE `42804` on every organisation, 82 of 82 samples | `UPDATE leave_balances … FROM (VALUES ($1,$2),…)` bound untyped, so Postgres inferred `text` against `numeric` | rows cast `::integer`/`::numeric` (`cron-leave.service.ts`) |
| `POST /build/{projectId}/tickets` | 500, `23505 uniq_tickets_project_number` | `project_ticket_counters` behind `max(ticket_number)` after a bulk load; allocator trusted the counter | allocator self-heals from `GREATEST(counter, max+1)` under the existing lock |
| `POST /timesheets/entries` | 500 | duplicate `(org, membership, date)` propagated as an unhandled `23505` | `ConflictException` (409) on `uniq_timesheets_work_log` |
| `GET /hr/engagement/polls/{id}/results` | 500 `opts.map is not a function` | JSONB `options` read as an array without parsing | Zod `safeParse`, empty on mismatch |
| `GET /hr/forms/{id}/submissions` · `POST …/submit` | 500 `formSchemaSnapshot.filter is not a function` | JSONB schema read as an array without parsing | Zod parse; a malformed stored schema now rejects a submission with 422 and masks every value for a non-sensitive viewer |

Found on 2026-09-06 by the second pass over the same stack (backend `b4bd4ac90`, `a70509b42`):

| Route / worker | Failure | Root cause | Fix |
|---|---|---|---|
| worker `notifications-retention-detach` (hourly) | PostgreSQL log `must be owner of table notifications` on every expired partition, every hour; the sweep logged a warn and returned 0/0, so retention has never removed a partition since it shipped | the sweep issued `DETACH PARTITION … CONCURRENTLY` through the application pool (`streamline_app`), which owns no table; and `notifications` carries `notifications_default` from migration `0582`, which makes PostgreSQL refuse `CONCURRENTLY` outright even for the owner | `PartitionMaintenanceService` runs the DDL on a one-connection owner client from `DATABASE_URL` (refuses when absent or when it names the application role), decides per parent from `pg_inherits` whether a DEFAULT partition exists, and where it does detaches plainly — one partition per sweep under `lock_timeout = '1s'`, because a plain DETACH queues every new reader behind its ACCESS EXCLUSIVE wait (two-client proof: a reader issued while the DETACH waited was blocked 1,210 ms until the 1 s timeout fired). Proven end-to-end on a throwaway `notifications_y2023_m12` partition: `to_regclass` present → detached and dropped → null. 27 unit tests |
| `GET /calendar/events` | p95 2,079–2,147 ms on the large tenant (declared 800 ms), 43–45 statements, 372,179-byte body; 241 ms on the small tenant | the loader paged 2,000 candidate rows per branch (831 KB transferred per request, descriptions included) although the source registry truncates every source to 400 projections before serving, so 80% of the fetch was discarded; the tickets and attendance sources had no LIMIT at all | candidate page bounded to the registry's 400-per-source cap, LIMITs on the tickets and attendance sources; wire shape unchanged. Focused seeded spec (20 samples per tenant): large p95 569 ms, small 189 ms, ≤ 45 statements |

Two more environment findings from this pass, both recorded so the next operator does not lose an hour to them: (1) the PostgreSQL 18 cluster crashed under memory pressure at 04:50 IST (an autovacuum worker died with `0xC0000142` while six agents and two builds held the box at 3.8 GB free of 31 GB) and from then on every new backend failed with Windows error 487 (`could not reserve shared memory region`), which clients see only as a bare `ECONNRESET`; `pg_ctl restart` recovered it in 40 s, and the two HTTP replicates and the manifest run that started in that window were discarded rather than merged. (2) Another session staged a comment-only edit to the applied migration `1064_revenue_events_currency.sql`; the seeded preflight hashes migration bytes, so it refused every run until the disposable database's ledger row for `1064` was re-pointed at the current bytes — the same class as fixture defect 7 above, and again no schema object changed.

Found on 2026-09-06 by the third pass (backend `bf51e66a6`):

| Route / worker | Failure | Root cause | Fix |
|---|---|---|---|
| `POST /build/{projectId}/tickets` | 17 swallowed after-commit failures on the reference tenant. The route still answered 201, and `merge-http-route-budgets` refused to publish the entire route-budget capture because of them | `createAutomation` never checked a `set_status` action's value against `project_statuses`, so the live BOLA sweep's `bola-<nonce>` probe strings were stored as status names on four automations. Every later ticket creation in that project fired all four, and each violated the composite FK `fk_tickets_status (org_id, project_id, status)` from migration `0146`, aborting the tenant transaction. The after-commit hook caught it, logged, and returned — so the failure was real, repeated and invisible to the caller | three places, because any one alone leaves a hole: the runner checks the status exists in that project and skips with a named warning instead of throwing into the hook; `createAutomation` and `updateAutomation` reject an unknown status with 422 naming it, so the row can no longer be written; the scratch seed plants one valid automation so the corpus exercises the path. 22 focused tests, and a verification capture records `deferredFailures` 0 on that route against 17 before, with no non-zero `deferredFailures` across all 188 measured routes |

This one is worth stating plainly as a product defect rather than a fixture artifact: **any user who could create an automation could name a status their project does not have, and every subsequent ticket creation in that project would fail its after-commit hook silently.** The sweep found it by accident; the measurement is what made it visible.

### Fixture integrity — what a mutating security sweep leaves behind

The BOLA sweep and the seeded corpus write to the same disposable database the benchmarks measure. Three
pieces of residue were found and repaired before the final capture, and they are recorded because each one
had already distorted a published number:

| Residue | How it read | Repair |
|---|---|---|
| 775 of 1,149 tickets in the reference project sat in a status named `bola-eac92cee`, and the original `TODO` and `IN_PROGRESS` rows were gone | the sweep created a status, then deleted `TODO` with reassignment — correct, authorized application behaviour. But **69% of the project's tickets were in a status no application filter matches**, so every read filtering on the app's own vocabulary (`ACTIVE_TICKET_STATUSES`) measured an empty set and read as a fast query rather than a broken fixture. This is the exact failure the seed's own comment warns about | the 775 tickets returned to `TODO` (type-preserving: the junk status was `unstarted`), the four `bola-*` statuses and five `bola-*` automations deleted. The original `TODO`/`IN_PROGRESS` split is unrecoverable and was collapsed into `TODO` rather than invented |
| the reference tenant's only MONTHLY leave policy was `is_active = false`; every other tenant's was true | `run-read-cost-budgets` resolves `leaveTypeIds` from active MONTHLY policies, so both `leave-accrual-ledger-dedup@large` and `leave-accrual-balance-read@large` skipped as "no fixture data for this budget". Manifest coverage silently fell from **241/244 to 239/244** with no gate turning red — the instrument reported the skip honestly, but a published number had moved | the policy reactivated, restoring the seed's invariant of exactly one active MONTHLY policy per tenant. Both budgets now have real workloads (501 and 500 rows) |
| four `bola-*` automations on the reference project | the after-commit failures above | deleted with the statuses |

The lesson is not that the sweep is wrong to write — it is required to, and the routes behaved correctly.
It is that **a measurement fixture and a mutating security corpus cannot share a database without a
restoration step between them**, and that a fixture defect degrades a coverage number quietly rather than
failing a gate.

### Gates that are not green, each with a verified reason

Five gates were run one at a time and read against their own source rather than their exit codes:

| Gate | Exit | Mechanism | Verdict |
|---|---|---|---|
| `check:test-suppressions` | 1 | scans 2,319 spec files, classifies unconditional skips and runtime-gated aliases, caps the conditional class at a ratchet of 29 | **Red by design and deliberately held.** 76 conditional suppressions against a ratchet of 29. The script's own note records that the raise was considered and refused at release close, because the `db-gates.yml` step that would run those suites is unproven. **The count has not grown:** measured with the gate's own alias pattern, the release-close commit `f184b875f` and `HEAD` both carry 71 files / 72 matches, and exactly one conditional site was added across every commit since — in the release-close batch itself. An earlier reading that it had grown by ten is not supported by the history |
| `check:alert-ack` | 2 | reads a drill state file and verifies a human confirmed a nonce inside its TTL | Blocked on environment: `ALERT_WEBHOOK_URL` is unset, so no measurement was attempted. Needs a configured webhook and a human drill |
| `check:replay-ledger` | 2 | compares `drizzle.__replay` on a cold-bootstrap database against the journal | Blocked on environment: `COLD_DATABASE_URL` unset; no database was opened |
| `verify:chat-mentions` | 1 | seeds an org, subscribes two users over Ably, posts a mention through the live API, asserts exactly one delivery | Blocked on environment: the API on :1500 is up and answers a structured 401, but the script's `AUTH_SIGNING_KEYS` and the running server's keyring differ, so the token is rejected before the assertion runs |
| `verify:multi-org-employment` | 1 | finds a user with two active memberships and proves their employment records are independent | Blocked on fixture: no user holds two active memberships; the script reports `{"skipped":true}` by design. No seeder creates this fixture |

None of the five is broken, and none is masking a defect in the code it checks. No ratchet, ceiling or
baseline was moved to change any of these results.

### 2026-09-06, later pass — what the frontend captures settled and what they could not

Four captures were taken after the frontend performance work landed. They settle the byte half and
refuse the timing half, and the split is worth stating precisely because the two are not equally
trustworthy.

**Settled — bundle bytes.** `check-route-bundle-budget` went from 2 breaches to 1 at build
`WklbjYSWVhWz3T7CHJwUU`: `/crm/inbox` is inside its 524,288-byte ceiling and `/crm/leads` is 17,581
bytes over. Byte counts are deterministic and do not move with host load, so this result stands.
The recorded `/crm/leads` figure had been **813,370 bytes and was stale** — a 2026-09-02 capture on a
build predating the icon fix, which the manifest's own `breachOwnerNote` says overstates. Re-measured
it was 572,722, so the real gap was 48,434 rather than 289,082. Chasing the stale number would have
been three agents' work against a defect that had already been half fixed.

**Refused — Core Web Vitals timings.** The final capture reports `/build/my-work` mobile INP at
1,844 ms against 38 ms in capture 8, on a route whose code did not change. The host was measured at
**100% CPU** with twenty node processes and a user browser on it. A 4x-throttled mobile profile on a
saturated host measures the host, and the driver says exactly that in its own `conditions.host` note —
but **its guard never fired, because `os.loadavg()` returns 0 on Windows**, so every capture in this
series recorded `loadAverage1mAtStart: 0` and `loadAverage1mAtEnd: 0` regardless of the real load.
That is a defect in the instrument, not in the app: a contention guard that cannot observe contention
on the platform it runs on is inert, and it read green while the numbers it guards were meaningless.
Recorded as a NEW REQUIREMENT against the driver — it should read CPU time or process count on
Windows, or refuse to publish rather than stamp a zero it did not measure.

**What the timing captures did establish, on a quieter host earlier in the sequence:** all three mobile
LCP breaches carried from capture 8 are closed — `/support/inbox` 3,051 -> 882 ms, `/chat`
3,477 -> 902 ms, `/calendar` 2,567 -> 397 ms, `/dashboard` 2,358 -> 783 ms — and server TTFB p95 is
33-77 ms on every route.

**Two process traps, both of which produced numbers that looked like code defects:**

1. A capture ran against a `next start` server whose port was still held by an earlier instance. The
   new server failed with `EADDRINUSE` and the old one kept serving — but the rebuild had already
   overwritten `.next`, so its in-memory manifest pointed at chunks that no longer existed. Result:
   **154 of 156 samples hit an error boundary on every route**, which reads as an app-wide regression
   and was nothing of the kind. `pkill -f "next start"` does not reach these processes on Windows;
   the port has to be resolved to a PID with `netstat -ano` and stopped with `taskkill`.
2. `/chat` mobile is refused as evidence and the refusal cannot be excepted — by design, because the
   exceptions mechanism annotates budget failures and deliberately cannot excuse a capture the
   producer itself disowned. The cause is that the driver requires three distinct in-app navigation
   links and chat's mobile bottom navigation genuinely has two destinations. An `sr-only` link added
   to satisfy that counter was reverted. Including `/chat` therefore refuses the whole capture; it is
   reported unmeasured rather than measured-and-passing.

**One deferral was reverted as instrument-gaming rather than accepted.** An agent gated `/crm/leads`'
record list behind `useAfterLoad` and stated the intent plainly: the chunk "is not counted in
`measuredScriptBytes` ... because the download starts after `window.load`". That moves the
measurement rather than the work, and it makes the table appear late for every user. Removing it put
17,581 bytes back on the books, which is why that route is still recorded as over rather than fixed.

## Captures

### C143 — cache-hit latency and Redis outage

Instrument: `pnpm -C backend measure:cache-hit` (`src/scripts/measure-cache-hit-latency.mjs`, self-test
6/6). It signs an EdDSA probe token with the run's `AUTH_SIGNING_KEYS` for the seeded owner of the
large tenant, warms each route, then records wall-clock per request over `n` samples at concurrency 1
and 8 against the built API (`dist/main.js`, `NODE_ENV=production`, workers disabled). The three routes
are the shell's cached reads: the access snapshot (`GET /me/access`, Redis under
`(userId, permissionsVersion, isOrgOwner)`), `GET /organization` and `GET /billing/entitlements`.

**Host condition during these runs: CPU at 100% from unrelated processes** (three `tsc` runs from
other sessions and another project's jest suite). The concurrency-1 figures are the criterion's
figures; the concurrency-8 rows are recorded as taken and are re-measured below once the host is quiet.

Hit phase (`.artifacts/cache-hit-latency.json`, sha256 `411b34a3…fbc72d`), n=200 per row, warm-up 20:

| Route | c | n | p50 ms | p95 ms | p99 ms | max ms | statuses |
|---|---:|---:|---:|---:|---:|---:|---|
| `/me/access` | 1 | 200 | 22.1 | **31.2** | 69.7 | 190.3 | `{"200":200}` |
| `/me/access` | 8 | 200 | 163.6 | 533.4 | 555.2 | 864.6 | `{"200":200}` |
| `/organization` | 1 | 200 | 23.9 | **33.3** | 41.7 | 53.4 | `{"200":200}` |
| `/organization` | 8 | 200 | 239.8 | 589.5 | 778.6 | 780.5 | `{"200":200}` |
| `/billing/entitlements` | 1 | 200 | 26.4 | **38.0** | 89.2 | 94.7 | `{"200":200}` |
| `/billing/entitlements` | 8 | 200 | 218.8 | 396.9 | 581.0 | 582.9 | `{"200":200}` |

Outage phase — the Upstash-REST shim process was killed (every Redis call fails with
`ECONNREFUSED`), n=100 per row (`.artifacts/cache-outage-latency.json`, sha256 `1bf1fdad…765f226`):

| Route | c | n | p50 ms | p95 ms | p99 ms | max ms | statuses |
|---|---:|---:|---:|---:|---:|---:|---|
| `/me/access` | 1 | 100 | 32.7 | 45.9 | 330.4 | 330.4 | `{"200":100}` |
| `/me/access` | 8 | 100 | 272.0 | 488.3 | 489.7 | 489.7 | `{"200":100}` |
| `/organization` | 1 | 100 | 43.1 | 58.5 | 277.5 | 277.5 | `{"200":100}` |
| `/organization` | 8 | 100 | 423.2 | 737.9 | 774.7 | 774.7 | `{"200":100}` |
| `/billing/entitlements` | 1 | 100 | 167.7 | 258.3 | 331.4 | 331.4 | `{"200":100}` |
| `/billing/entitlements` | 8 | 100 | 425.9 | 625.1 | 630.0 | 630.0 | `{"200":100}` |

Every request answered 200 with Redis unreachable; no request paid the 3,000 ms command timeout
(worst single sample 774.7 ms under contention), and the API did not open more than one loader per
key — the in-process single-flight plus the new circuit breaker (`CacheFiller`, opens after 5
consecutive failures, probes every 5 s) are pinned by `src/common/cache/cache-prd-c143.spec.ts`
(14 tests, including N concurrent callers → 1 loader and a bite-proof). This outage was a
connection-refused outage; the slow-Redis (timeout) shape is covered by the unit tests, not by a live
probe.

Recovery phase — shim restarted, first probe 6 s later, n=100 (`.artifacts/cache-recovery-latency.json`,
sha256 `813ddf0b…0a3f5`): `/me/access` p95 **27.8 ms**, `/organization` **30.7 ms`,
`/billing/entitlements` **34.4 ms**, all 200 — the breaker closed on its next probe.

Quiet-host re-measurement (02:08, host load 6%, backend rebuilt at `06462e062`, n=200 per row,
`.artifacts/cache-hit-latency-quiet.json`):

| Route | c | n | p50 ms | p95 ms | p99 ms | max ms | statuses |
|---|---:|---:|---:|---:|---:|---:|---|
| `/me/access` | 1 | 200 | 11.9 | **17.3** | 25.5 | 38.2 | `{"200":200}` |
| `/me/access` | 8 | 200 | 44.7 | **60.3** | 160.7 | 162.3 | `{"200":200}` |
| `/organization` | 1 | 200 | 12.9 | **18.1** | 29.1 | 35.5 | `{"200":200}` |
| `/organization` | 8 | 200 | 58.2 | **75.0** | 82.7 | 83.9 | `{"200":200}` |
| `/billing/entitlements` | 1 | 200 | 13.0 | **20.1** | 28.7 | 29.2 | `{"200":200}` |
| `/billing/entitlements` | 8 | 200 | 48.6 | **63.8** | 68.8 | 74.2 | `{"200":200}` |

Verdict on the criterion's own terms: cache-hit p95 is 17–20 ms at concurrency 1 and 60–75 ms at
concurrency 8 against a 100 ms ceiling (`RESULT: PASS`; unmeasurable at 120 ms transit before);
misses and an outage degrade to the loader with no non-2xx and no storm; invalidation is
version-keyed and gate-checked (`check:cache-invalidation`, `check:cache-key-shapes` green), and
the seeded corpus then caught the one authorization-bearing key that could outlive a revocation in
the degraded path (`kb:acc-spaces:`, fixed in `7015c13a6`). The earlier concurrency-8 rows above
were host-contention artefacts (the same routes, same code, 5–9× slower under 100% CPU).

### C140 / C142 / C148 — benchmark manifest, statement ceilings, regression comparison

Command (from `backend/`, HEAD `5006c67b5`, clean catalogs — `uncommittedAtCapture: []`):

```
APP_DATABASE_URL=postgresql://streamline_app:…@127.0.0.1:5432/scratch_local?sslmode=disable \
DATABASE_URL=postgresql://neondb_owner@127.0.0.1:5432/scratch_local?sslmode=disable PGSSLMODE=disable \
  node test/perf/measure-benchmark-manifest.mjs --samples=50 --replicates=3 --concurrency=8 --plans --write
```

Baseline `contracts/benchmark-manifest.json` (sha256 `4490013a…767d9`, 789,338 B, captured
2026-09-05T19:11Z) and, on identical code, a fresh comparison capture
`.artifacts/benchmark-manifest-local-fresh.json` (sha256 `823a7a27…7f9bd`) without `--plans`.
Environment recorded in the manifest: `scratch_local` 962 MB, PostgreSQL 18.6, loopback TCP, role
`streamline_app` (`bypassrls=false`, tenant GUC set inside a rolled-back transaction), AMD Ryzen 5
5625U 12 threads, 32 GB, and the note that the box ran other agents concurrently.

| Profile | Statement slots measured | Before (2026-09-04, Neon) |
|---|---:|---:|
| large (reference) | **75/75** read-cost · 105/105 with heavy plans | 58 |
| mid | **73/75** | 3 |
| small | **72/75** | 2 |
| tiny | **61/75** | 0 |
| total | **281/300 (93.7%)** | 63/300 (21.0%) |

Plan signatures 75/75 on every profile; approved-complex plan text retained for 14 statements per
profile in `test/perf/benchmark-plans/`. Every measured slot is inside its ceiling: on the reference
tenant the worst ordinary statement p95 is **4.4 ms** (ceiling 50) and the worst approved-complex
statement p95 is **2.4 ms** (ceiling 200); the per-module c1 p95 spans 1.1–7.9 ms (was 497–623 ms
on Neon, which was the transaction floor). Error rate 0 across all 105 benchmarks.

The 19 unmeasured slots, by name: 12 are CRM/Inventory (out of scope by PRD-C140's own text and
recorded in `codeReleaseScope`: `crm/contacts-list`, `leads-active`, `leads-assigned-to-me`,
`deals-pipeline`, `search-lead-party-sdf`, `search-deal-sdf`, `search-contact-party-sdf`,
`search-client-party-sdf` on tiny; `inventory/inv-products-list`, `inv-stock-levels`,
`inv-purchase-orders` on tiny; `inv-vendors-list` on small and tiny); 3 are
`hr/employee-record-list-canonical` on mid/small/tiny (`minRows` 5,000 on `hr_employments` — a
minority tenant with 5,000 employments would erase the skew the four-tenant seed exists to measure,
so this is recorded as by-design unmeasurable on skewed tenants, not lowered); the remaining in-scope
slot is `search/kb-page-id-probe-sdf`, vacuous on mid/small/tiny (fixture fix in progress).
**No ceiling, floor, threshold, allowlist or denominator was changed.**

Regression comparison (`node src/scripts/check-benchmark-manifest.mjs --against=.artifacts/benchmark-manifest-local-fresh.json`,
277 benchmark×tenant pairs): db-calls 0 · downstream-calls 0 · buffers 0 (1 advisory) · rows 0 ·
payload-size 0 · memory 0 regressions; latency 0 regressions with 260 advisories, all DISARMED
because sub-millisecond statements swing 30–61% between replicates (0.27 → 0.30 ms). The arming rule
is being made absolute-floor-aware (a move under `absFloorMs` = 1 ms is not a regression on a
0.3 ms statement) and the comparison is re-run below.

### C085 / C141 / C145 — route and worker budgets over HTTP

Instrument: `test/perf/route-budget-http.seeded-e2e-spec.ts` through `test/helpers/run-seeded-e2e.ts
scratch_local` (in-process Nest app on `APP_DATABASE_URL` as `streamline_app`, RLS live, journal
head asserted 691/691, Redis off so every figure is the **cache-miss** ceiling, `--expose-gc` heap
sampling, control probe with and without the token before and after every tenant, subject row-count
hash before and after, 30 s deadline per send). Plan: `test/perf/route-budget-http-plan.ts` — 102
budget entries (76 routes + 26 worker batches: every `GET /cron/<job>` plus `POST
/cron/retention-delete-sweep`), 40 samples per read, 12 per write, 5 heap samples, on the reference
tenant `…0001` and the minority tenant `…0002`. Four replicates were run back to back
(`.artifacts/route-budget-http-local-{1,2,3,4}.json`, sha256 prefixes `9c069c1d…`, `b80153f2…`,
`b09f76e4…`, `f6a68e05…`), each `93 measured / 9 refused / 0 failed of 102` on both tenants with the
control probe HELD and the subject STABLE; `merge-http-measurement.mjs` folds them into
`contracts/benchmark-manifest.json` `requestLevel` (186 of 204 unique route×tenant slots, n=3
replicates) and `merge-http-route-budgets.mjs --write` fills `contracts/route-budgets.json`
(sha256 `9ba688c5…dfe1ea`).

| Dimension | Coverage | Result |
|---|---:|---|
| Latency p50/p95/p99 per route and worker | 93/102 entries; 26/26 workers | routes: median p95 **31.9 ms**, p90 50.8 ms; workers: median p95 28.8 ms, max 160.6 ms |
| Request DB statements (`measuredRequestDbCalls`) | 93/102 | min 7 · median 12 · max 55 (`GET /calendar/events`) |
| Downstream provider calls (foreground + after-commit accounted separately) | 93/102 | **0** on every measured entry |
| Response bytes p50/p95/p99 | 93/102 | max 372,179 (`GET /calendar/events`), 160,258 (`GET /chat/channels`, minority) |
| Memory p50/p95/p99 (heapUsed over a post-GC baseline) | 93/102 | max p95 55.6 MB |

The critical set (shell paths + the 27 first-render operations of the 11 in-scope pages + the 58
read-cost paths, CRM/Inventory excluded): 53 routes, **0 without a budget entry**, 2 unmeasured —
the two realtime-token routes, declared unattemptable because the isolated process carries no
Ably key (their database read path is measured at statement level). The 9 refusals per tenant are
all declared: 6 mail routes are provider-backed (no connected mailbox exists in a seed), 2
realtime-token routes, and `POST /timesheets/entries` (answered 409/400 — plan fix in progress).

Against PRD-C141 (ordinary p95 ≤ 300 ms, approved complex ≤ 800 ms, application-controlled time
only): **every measured ordinary route is under 100 ms p95** and one aggregate route breaches —
`GET /calendar/events` at **989.7 ms** on the reference tenant (60,072 events in a two-month
window, 55 statements: the range read issues per-item work). Against declared ceilings
(`check:route-budgets`): one breach, `GET /chat/channels` 160,258 response bytes on the minority
tenant against 131,072 (the channel list embeds per-channel collections). Both are real findings,
both are owned and fixed below, and the routes are re-captured after the fix; nothing else exceeds
a declared ceiling. The recorded 5,043 ms chat-send p95 from 2026-09-04 is gone:
`POST /chat/channels/{channelId}/messages` now measures inside its 1,000 ms budget with 0
foreground downstream calls.

### C006 / C149 / C151 — production-build Web Vitals and payload budgets

Stack: `next build` with `NEXT_PUBLIC_API_URL=http://localhost:1500` (`.env.production.local` would
otherwise bake the deployed API into the bundle), `next start -p 1000`, build `9CLqL5fOFkidtMRbqd3Pq`,
root HEAD `1693c93d`; backend `dist/main.js` on `:1500` against `scratch_local` and the shim; cookie
minted by `scripts/mint-session-cookie.mjs` for the seeded owner `user-1@scratch-seed.test`.
Driver `scripts/measure-web-vitals.mjs`, 11 in-scope routes × 6 repeats × desktop (1440×900, no
throttling) and mobile (390×844, 4× CPU, ~1.6 Mbps/150 ms RTT); `--write-manifest` writes the
over-the-wire byte fields into `contracts/route-bundle-manifest.json`.

**Capture 1 (00:00) was refused by its own gate — correctly.** 64 samples landed on `/org-setup`
and 26 rendered an unauthorised shell: the minted session token carried the seeded tenant's NULL
`onboarding_completed_at`, and the wizard gate sent every route to setup until the token refreshed.
Fixture defect #4 above; the tenant is now stamped by the seed and the cookie was re-minted.

**Capture 2 (00:24–00:36, `.browser-driver-results.json`, 132 samples, 0 off-route, 0 unauthorised,
0 hydration mismatches, provenance current).** p75 per route/profile (ms; CLS unitless):

| Route | Profile | LCP p75 | INP p75 | CLS p75 | FCP p75 | TTFB p95 |
|---|---|---:|---:|---:|---:|---:|
| `/mail` | desktop | 948 | 64 | 0.002 | 193 | 57 |
| `/mail` | mobile | 432 | **846** | 0.002 | 341 | 46 |
| `/inbox` | desktop | 259 | 92 | 0.001 | 259 | 52 |
| `/inbox` | mobile | 956 | **1044** | 0.000 | 494 | 47 |
| `/build/inbox` | desktop | 232 | 72 | 0.014 | 232 | 68 |
| `/build/inbox` | mobile | 567 | **1022** | 0.000 | 382 | 60 |
| `/support/inbox` | desktop | 223 | 88 | 0.007 | 223 | 54 |
| `/support/inbox` | mobile | 1316 | **798** | 0.000 | 576 | 61 |
| `/dashboard` | desktop | 1370 | 102 | 0.003 | 217 | 65 |
| `/dashboard` | mobile | 929 | **620** | 0.000 | 577 | 65 |
| `/chat` | desktop | 218 | 134 | 0.001 | 218 | 54 |
| `/chat` | mobile | 997 | **486** | 0.000 | 614 | 47 |
| `/calendar` | desktop | **1585** | 134 | 0.002 | 252 | 340 |
| `/calendar` | mobile | **4458** | **892** | 0.002 | 369 | 48 |
| `/notifications` | desktop | 243 | 112 | 0.001 | 243 | 60 |
| `/notifications` | mobile | 1057 | **1028** | 0.000 | 508 | 53 |
| `/settings` | desktop | 1169 | 78 | 0.002 | 211 | 57 |
| `/settings` | mobile | 804 | **670** | 0.007 | 428 | 57 |
| `/build/my-work` | desktop | 266 | 200 | 0.001 | 266 | 78 |
| `/build/my-work` | mobile | 1107 | **1022** | 0.001 | 911 | 66 |
| `/parties` | desktop | **1556** | 80 | 0.050 | 278 | 53 |
| `/parties` | mobile | 811 | **1262** | 0.000 | 517 | 52 |

Budgets: desktop LCP ≤ 1500 · mobile LCP ≤ 2500 · INP ≤ 200 · CLS ≤ 0.1 · desktop FCP ≤ 1200 /
mobile ≤ 1800 · TTFB p95 desktop ≤ 400 / mobile ≤ 600. **Bold = breach.** What moved since the
2026-09-04 capture: TTFB, previously p50 503 ms and the dominant term of every metric, is now
46–78 ms p95 on ten routes and 340 ms on `/calendar` — the access-snapshot cache plus a co-located
database removed it as a factor; CLS and TTFB pass everywhere; desktop LCP passes on 9 of 11 routes.
What remains is real frontend work, not transit: **mobile INP breaches on all 11 routes** (the
driver's probe click on the shell's first interactive element costs 486–1262 ms at 4× CPU), desktop
LCP on `/calendar` (1585) and `/parties` (1556), and mobile LCP on `/calendar` (4458 — the
big-calendar chunk now mounts after the load event, so the grid, which is the LCP element, paints
late). The gate additionally refused this capture because 2 of 6 mobile `/build/my-work` samples hit
the 6 s settle cap (the DOM never went quiet), which it treats as a CLS floor. Both are assigned
(shell interaction; calendar/parties/my-work) and the capture is repeated after those changes.

**Capture 7 (2026-09-06 12:26–12:37, build `2a-9evJ8ytb3UkEfxw10p`, root `7ffeae48a`, 132 samples,
0 off-route, 0 hydration mismatches).** Measured after the server-selected shell variant, the
server prefetches, the virtualised and deferred lists, and the My Work bundle work. p75 per
route/profile (ms; CLS unitless):

| Route | mobile INP | mobile LCP | mobile CLS | desktop INP | desktop LCP |
|---|---:|---:|---:|---:|---:|
| `/mail` | 56 | 466 | 0.000 | 88 | 223 |
| `/inbox` | **734** | 525 | 0.000 | 110 | 274 |
| `/build/inbox` | **646** | 834 | 0.000 | 130 | 212 |
| `/support/inbox` | **322** | 1007 | 0.000 | 96 | 243 |
| `/dashboard` | **368** | 543 | 0.000 | 80 | 254 |
| `/chat` | **336** | 809 | 0.000 | 86 | 187 |
| `/calendar` | 64 | 841 | 0.001 | 54 | **1762** |
| `/notifications` | 80 | 967 | 0.000 | 120 | 318 |
| `/settings` | 164 | 428 | 0.032 | 86 | 222 |
| `/build/my-work` | **208** | 426 | 0.001 | 86 | 212 |
| `/parties` | **770** | 1064 | 0.000 | 80 | **2137** |

**Bold = breach** against INP p75 ≤ 200 and desktop LCP ≤ 1500. Every mobile LCP, every CLS and
every TTFB passes, and desktop INP passes on all eleven routes (54–130 ms). Against capture 2 the
mobile INP work landed where it was aimed: `/notifications` 1028 → 80, `/settings` 670 → 164,
`/mail` 846 → 56, `/calendar` 892 → 64, `/build/my-work` 1022 → 208, `/parties` 1262 → 770. Mobile
LCP on `/calendar` fell 4458 → 841 and desktop LCP breaches went from two to two but moved: this
capture introduced one. **The two desktop LCP breaches are a regression this capture caught**:
`/parties` went 271 → 2137 ms and `/calendar` 1247 → 1762 ms in the same session that made those
pages async server components awaiting a prefetch before returning their tree — awaiting the
backend round trip inside the page body blocks the HTML response, so first paint now waits on the
list query. It is assigned with the remaining mobile INP breaches; the fix is to stream the shell
and let the prefetched query arrive in a later flush rather than to drop the prefetch.

Six mobile `/chat` samples were refused as evidence: the page renders 2 distinct in-app navigation
links and the driver requires 3 before it will treat a sample as an authorised shell. An earlier
attempt added `sr-only` links purely to satisfy that counter; it was reverted, because moving a
number by feeding the instrument is the failure mode these gates exist to prevent. The route is
therefore recorded as unmeasured on mobile, not as passing.

**Capture 8 (2026-09-06 14:21-14:32, build `R3If1XUBWjLPTezFUEMNR`, root `a3dd753eb`, 132 samples,
0 unusable, 0 off-route, 0 hydration mismatches) — the final capture, taken with nothing else running.**
Two earlier attempts that morning were discarded rather than reported: one measured against a machine
running four builds and driver runs at once (a 4x CPU throttle plus a saturated host reads as
1,200-1,400 ms INP on routes that measure 600-700 ms quiet), and one refused itself when 97 of 132
samples hit an error boundary - the browser could not reach the backend at all, because the capture
origin `http://localhost:1005` was not in the API's `CORS_ORIGINS`, so every client query failed and
the shell fell over. Neither was a product defect; both are recorded because a number taken under
either condition would have been wrong in a way nothing downstream could see.

| Route | mobile INP | mobile LCP | mobile CLS | desktop INP | desktop LCP |
|---|---:|---:|---:|---:|---:|
| `/mail` | 40 | 404 | 0.002 | 46 | 749 |
| `/inbox` | **614** | 454 | 0.000 | 72 | 189 |
| `/build/inbox` | **570** | 449 | 0.000 | 62 | 182 |
| `/support/inbox` | 80 | **3051** | 0.000 | 64 | 187 |
| `/dashboard` | **244** | 2358 | 0.050 | 80 | 1167 |
| `/chat` | **206** | **3477** | 0.000 | 80 | 1138 |
| `/calendar` | 48 | **2567** | 0.002 | 40 | 945 |
| `/notifications` | 40 | 1028 | 0.000 | 78 | 220 |
| `/settings` | 48 | 398 | 0.039 | 54 | 155 |
| `/build/my-work` | 38 | 642 | 0.001 | 136 | 200 |
| `/parties` | **708** | 1007 | 0.000 | 62 | **1548** |

**Bold = breach** (INP p75 <= 200, mobile LCP <= 2500, desktop LCP <= 1500, CLS <= 0.1). Desktop INP
passes on all eleven routes (40-136 ms) and every CLS passes. Against capture 2 on 2026-09-04, where
mobile INP breached on all eleven routes at 486-1262 ms, seven routes now pass: `/mail` 846 -> 40,
`/support/inbox` 798 -> 80, `/calendar` 892 -> 48, `/notifications` 1028 -> 40, `/settings` 670 -> 48,
`/build/my-work` 1022 -> 38, and `/dashboard` 620 -> 244 remains a breach but a much smaller one. The
mechanisms were: the server picks the shell variant from the request, so a phone never hydrates the
desktop sidebar and header; the notifications, parties and dashboard lists are prefetched on the
server; rows are memoised and formatters hoisted to module scope; and the `useAfterLoad` gates that
deferred primary list content until `window.load` were removed, because deferring the list moved its
render into the window where the probe tap lands.

**What is still open, stated as measured.** Four routes breach mobile INP: `/inbox` 614, `/build/inbox`
570, `/parties` 708 and marginally `/chat` 206 and `/dashboard` 244. Three breach mobile LCP:
`/support/inbox` 3051, `/chat` 3477 and `/calendar` 2567 - these three moved the wrong way when the
after-load gates came off, which is the honest trade that bought the INP reductions elsewhere, and it
means the remaining work is to make the first paint of those three cheap rather than late. `/parties`
desktop LCP is 1548 against 1500, down from 2137 when the page awaited its prefetch inline but not yet
back to the 271 ms it measured with no prefetch at all. **No budget was moved and no route was dropped
from the run to make this read better.**

Six mobile `/chat` samples were again refused as evidence: the page renders 2 distinct in-app
navigation links and the driver requires 3. The chat mobile bottom navigation genuinely has two
destinations (`/chat` and `/chat/channels`); no Threads or Mentions route exists in the product. An
attempt to add `sr-only` links purely to satisfy the counter was reverted. `/chat` mobile is therefore
recorded as unmeasured-by-refusal rather than as passing, and `check:web-vitals-budget` publishes no
verdict for this capture for that reason - the gate refuses a run its own producer refused.

Over-the-wire bytes before the load event (`measuredScriptBytes` ceiling 524,288; bytes):

| Route | script | css | font | image | third-party | document | total |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/mail` | 508,459 | 58,718 | 55,580 | 3,076 | 0 | 20,838 | 649,163 |
| `/inbox` | 486,277 | 58,718 | 55,580 | 3,076 | 0 | 20,606 | 626,749 |
| `/build/inbox` | 490,418 | 58,718 | 55,580 | 6,488 | 0 | 21,127 | 634,823 |
| `/support/inbox` | 503,832 | 58,718 | 55,580 | 6,976 | 0 | 24,341 | 651,939 |
| `/dashboard` | 496,819 | 58,718 | 55,580 | 3,076 | 0 | 20,869 | 637,554 |
| `/chat` | **545,598** | 58,718 | 55,580 | 10,694 | 0 | 21,976 | 695,058 |
| `/calendar` | **542,498** | 58,718 | 55,580 | 3,076 | 0 | 21,814 | 684,178 |
| `/notifications` | 500,648 | 58,718 | 55,580 | 3,076 | 0 | 21,983 | 642,497 |
| `/settings` | 477,793 | 58,718 | 55,580 | 3,076 | 0 | 22,499 | 620,158 |
| `/build/my-work` | **535,278** | 58,718 | 55,580 | 3,076 | 0 | 23,236 | 678,380 |
| `/parties` | 513,519 | 58,718 | 55,580 | 3,076 | 0 | 23,179 | 656,564 |

Against the 2026-09-04 figures (`/notifications` 834,045, `/build/inbox` 818,251, `/inbox` 807,371,
`/settings` 795,865, `/calendar` 779,636, `/dashboard` 684,705, `/build/my-work` 657,248, `/chat`
627,049) eight in-scope breaches became three, by 10,990–21,310 bytes, after deferring the
notification bell, the big-calendar chunk and the analytics tags past the load event (root
`6816b6b91`). `check:route-bundle-budget` at this capture: 5 breaches, 2 of them the out-of-scope
CRM routes. No ceiling was changed.

### C018 — seeded E2E corpus and live cross-tenant BOLA sweep on the disposable local database

The disposable database here is `scratch_local` itself: name contains `scratch` (every seed and
harness guard keys on that), built from empty by `apply-chain-cold.mjs`, app-role grants verified,
placement and onboarding stamped by the seeds, three seed layers, and two fixture organisations for
the sweep (`…0001` source, `…0002` prober). Runner: `test/helpers/run-seeded-e2e.ts scratch_local
<30 explicit in-scope spec files>` (CRM's three specs excluded by the criterion; the runner refuses
them by path), which pins `DATABASE_URL`/`APP_DATABASE_URL` to the scratch server, strips every
provider key, disables every background worker and asserts the ledger equals the journal before
booting anything.

**First full run (01:28–01:47, backend `8f8d17121`, journal 691):** 26 suites passed, 2 failed,
2 skipped (both by design: `t15-own-tenant-500` is opt-in, and `bola-live-cross-tenant` runs in its
own lane), 156 tests passed / 1 failed / 11 skipped. The two failures were worth the run:

1. `kb/kb-acl-purge-reindex` — *"stops citing a space's article the moment the asker is removed"*
   still cited the article. Root cause: with Redis absent (the isolated process strips it), every
   cache fill is degraded and `CacheFiller.retainOrRelease` keeps a settled degraded promise for one
   second unless the key is authorization-scoped; `kb:acc-spaces:` carried no such marker and
   `invalidateNamespace` is a no-op without Redis, so the removed member's space list was served from
   the memo. Fixed in `7015c13a6` (key marked authorization-scoped; revocation test bites); the spec
   then passed 3/3 standalone.
2. `perf/route-budget-http` — "Jest worker encountered 4 child process exceptions" inside the
   30-suite in-band run, while the same spec had just completed four standalone replicates with 0
   failed routes; it is a 12-minute measurement instrument rather than a domain suite and is
   recorded from its standalone runs.

The BOLA sweep queued after that run refused its preflight — *"ledger does not match current
695-entry journal"* — because a concurrent session journaled three AR-02 accounting migrations
(`5f4dc134d`) and this pass added `1068_c142_hr_leave_ledger_dedup_index` while the local database
stood at 691; the chain was resumed to 695/695 and the corpus and sweep are re-run at the final
commit below.
