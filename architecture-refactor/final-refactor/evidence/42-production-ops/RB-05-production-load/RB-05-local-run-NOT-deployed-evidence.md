# RB-05 — production-shaped load: LOCAL RUN, NOT DEPLOYED EVIDENCE

**This file is not a captured evidence bundle and must never be treated as one.**
It records guard-correctness self-tests that ran on a developer laptop, and it records
precisely why the load test that PRD-C166 and PRD-C167 actually ask for could not run here.
It is deliberately written as `.md`, not `.json`, so that
`pnpm -C backend ops:evidence:check` does not pick it up as a manifest. That gate must keep
reporting `missing passing deployed evidence for RB-05`, and after this file it still does.

Ticket: `34-production-ops-alerts-cost` — work item `34-capacity-cost`
Criteria addressed: PRD-C166, PRD-C167 (PRD-C172 is in `../RB-07-per-cell-cost/`)
Runbook: `architecture-refactor/runbooks/RB-05-production-load.md` (its own status line reads
`OPEN — operator-blocked`)

---

## Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent, no named human operator |
| Date (UTC) | 2026-09-03, 16:20:31Z – 16:22:34Z |
| Backend repo | `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend` |
| Backend branch / SHA | `release/code-10-10-v2` / `138709f35befcd558c86ab04f65edf8344f6a545` |
| Frontend branch / SHA | `release/code-10-10-v2` / `7469d27895add587f9427e7c50c457f56e0048bf` |
| Host | macOS 26.6.2, aarch64, 15 cores, 24 GB RAM, Node v25.9.0 |
| Database | LOCAL `postgresql://…@localhost:5432/scratch_head_1010`, PostgreSQL 18.4 (Homebrew) |
| Environment class | developer laptop — **not** a deployed cell, no TLS edge, no pooler, no replica, no queue, no object store |
| Load driver | not executed — see "What is blocked" |

Env used for every command below (exported, so they win over `backend/.env`, whose
`DATABASE_URL` points at a shared remote Neon branch that was deliberately not touched):

```
APP_DATABASE_URL=postgresql://streamline_app:***@localhost:5432/scratch_head_1010
DATABASE_URL=postgresql://tarunchintakunta@localhost:5432/scratch_head_1010
DIRECT_DATABASE_URL=postgresql://tarunchintakunta@localhost:5432/scratch_head_1010
PGSSLMODE=disable
CELL_ID=local-scratch-1010
```

`PGSSLMODE=disable` is itself proof of locality: the remote Neon endpoint requires
`sslmode=require` and would have refused every one of these connections.

---

## Commands run, with real exit codes

| Command | Exit | Headline | Raw output |
| --- | --- | --- | --- |
| `npm run cell:load:self-test` | 0 | `SELF-TEST PASS: 39% headroom (12.2ms against 20ms target) is correctly reported as FAIL — the guard can bite` | `cell-load-self-test.txt` |
| `npm run load:drive:self-test` | 0 | `SELF-TEST PASS: a breach is reported as BREACHED and an unsampled objective as NOT_DRIVEN — the guard can fail` | `load-drive-self-test.txt` |
| `npm run load:drive:verify` | 0 | 15/15 unit assertions pass, including *every PRD latency objective is either driven or has a written reason* | `load-drive-verify.txt` |
| `npm run cell:load` | **1** | `MISSING PREREQUISITE: …/.load-driver-results.json does not exist.` | `cell-load.txt` |
| `npm run browser:measure:self-test` | **1** | `SELF-TEST FAIL: no browser found at any candidate path` | `browser-measure-self-test.txt` |

---

## What these passes do establish

They establish **guard correctness only** — that the measuring instruments can report a
failure rather than silently passing:

- `check-cell-load-headroom.mjs` computes `headroom = (target − measured_p95) / target` and
  fails anything below the **40% floor**. Its self-test feeds a deliberately marginal 12.2 ms
  measurement against a 20 ms target (39.0% headroom) and confirms the result is `FAIL`, not
  `PASS`. A one-percentage-point miss is caught. The floor is not decorative.
- `run-load-driver.mjs` judges a fast workload `MET`, a slow one `BREACHED`, and an
  **unsampled** one `NOT_DRIVEN` — never `MET` by default and never estimated.
- `load:drive:verify` asserts that percentiles come from sorted samples, that an empty sample
  set yields `null` and not `0 ms`, that a measurement exactly at target is `MET` and not
  `BREACHED`, and that every objective the driver cannot exercise carries a written reason
  saying what would be needed.

That is a real and non-trivial result: the instrument is honest. It is not a measurement.

---

## What is blocked, and by what exactly

**`cell:load` exited 1.** It is the script that decides PRD-C167. Two independent, code-level
gates stand between this laptop and a headroom verdict:

1. **No results file.** `cell:load` reads `.load-driver-results.json`, which only
   `load:drive` writes, and `load:drive` only writes it after actually driving traffic.
2. **A vacuity guard on the dataset.** Even given a results file,
   `check-cell-load-headroom.mjs:150-155` refuses any run whose
   `organizationMembers` is below `CELL_SHARE.largestOrgMembers`, which
   `envelope-profile.mjs` fixes at **100,000**:

   ```js
   if (members < CELL_SHARE.largestOrgMembers) {
     console.error(`VACUITY GUARD: results were produced with ${members} members but the cell envelope requires` +
       ` ${CELL_SHARE.largestOrgMembers}. Seed the fixture first: pnpm -C backend seed:envelope`);
     process.exit(1);
   }
   ```

   The local database currently holds **1 user, 1 organization and 2 `organization_members`
   rows** against a required 100,000 — short by a factor of 50,000. Manufacturing a results file
   to get past gate 1 would be caught by gate 2, and forging the member count to get past gate 2
   would be fabricating evidence. Neither was done.

**`load:drive` itself was deliberately not run**, and this is a judgement call worth stating
plainly rather than hiding. It would not have refused outright — the local database does hold
2 `organization_members` rows, so `largestOrganization()` would have returned an organization
and the run would have proceeded. It was not run because:

1. it executes `PROBE_TABLE_DDL` against the target database, and `scratch_head_1010` is
   shared with other agents working concurrently on this machine;
2. it would have driven loopback traffic on a contended 15-core laptop, which cannot stand in
   for a colocated driver against a deployed cell — the resulting p95s would describe this
   machine's scheduler, not the system;
3. **the result could not have produced a C167 verdict anyway.** A results file naming an
   organization with 2 members is rejected downstream by `cell:load`'s 100,000-member vacuity
   guard. The only way to turn such a run into a headroom "pass" would be to edit the member
   count in the results file, which is fabrication.

RB-05's own preconditions require ≥20,000 active organizations, a colocated host with
sub-millisecond RTT to the API, `APP_BASE_URL` on a staging cell, and a reachable Chrome. None
exists here.

### The 14 workload objectives — every one unmeasured

RB-05 lists 14 workload objectives and `envelope-profile.mjs` declares 14 latency/reliability
objectives. **Zero were measured.** `cell:load` would have printed each one as
`NOT_DRIVEN — no measurement produced`; it did not get that far, because the results file is
absent. For the record, the declared objectives that remain unmeasured are:

`authenticated-interactive-availability` (99.95%/mo), `cross-org-data-exposure` (0 incidents),
`p99-in-process-authorization` (100 µs), `p95-redis-operation` (2 ms),
`p95-simple-db-roundtrip` (20 ms), `p95-complex-db-read` (50 ms),
`p95-browser-cached-read` (150 ms), `p75-first-useful-view` (1,000 ms),
`p95-transactional-write` (500 ms), `permission-revocation-explicit` (5,000 ms),
`durable-event-loss-after-ack` (0 events), `node-failure-committed-loss` (0 transactions),
`regional-rpo` (5 min), `cell-rto` (60 min).

### PRD-C166's named dimensions — what was and was not captured

C166 asks for "pools, queues, CPU, memory, errors, replica behaviour and sustained/burst capacity".

| Dimension | Captured here? | Reality |
| --- | --- | --- |
| Connection pool | No | `cell:capacity` read `pg_stat_activity` on the local cluster (25/100 backends), which is idle-agent connections, not pool saturation under load. See RB-07 evidence. |
| Queue depth | Partly, and vacuously | `outbox-queue-depth` measured **0 of 10,000**. Nothing is producing events. |
| CPU | No | Nothing sampled application or database CPU. |
| Memory | No | Nothing sampled process RSS or working set. |
| Errors | No | No requests were issued, so the error rate is undefined, not zero. |
| Replica behaviour | No | No physical read replica exists on this machine. |
| Sustained capacity | No | Target is 50 rps/cell (`TARGET_RATES`); 0 rps was driven. |
| Burst capacity | No | Target is 100 rps/cell for 10 minutes; 0 rps was driven. |

---

## Defect found while running this: the browser driver cannot run outside Windows

`npm run browser:measure:self-test` exits **1** with `SELF-TEST FAIL: no browser found at any
candidate path`, even though Google Chrome is installed at
`/Applications/Google Chrome.app`. The cause is in
`streamlineos-backend/src/scripts/browser-driver.mjs`:

```js
const BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
```

`findBrowser()` only tests those two literal paths and there is no environment override, so the
script is unrunnable on macOS and on any Linux CI runner. The file header says
"Requirements: a browser at `BROWSER_PATH`", but `BROWSER_PATH` is never read.

This also means RB-05's own pass-threshold line is stale in two ways:

> `browser:measure:self-test` passes (confirmed 2026-08-30):
> `SELF-TEST PASS: 3 navigation(s), min TTFB=1.4ms — the browser driver can measure`

The code's current success string is
`SELF-TEST PASS: ${n} navigation(s), LCP and INP captured, min TTFB=…ms` — a different message —
and on this host the script cannot reach it at all. The runbook's "confirmed" line should not be
read as evidence that the check passes today. No file was edited to fix this; it is reported.

---

## Honest classification

- **PRD-C166 — "Run realistic load and capture pools, queues, CPU, memory, errors, replica
  behavior and sustained/burst capacity."** → **BLOCKED: needs a deployed environment.** The
  criterion's own words name a *replica* and *realistic load*. There is no physical read replica
  and no deployed cell on this machine, and the load driver's dataset guard requires 100,000
  members against ~20,000 active organizations. What ran locally is the load driver's guard
  self-test, which proves the instrument can fail — not the load.
- **PRD-C167 — "Prove declared SLOs with at least 40% capacity headroom."** → **BLOCKED: needs a
  deployed environment.** The 40% floor is implemented and verified correct
  (`cell:load:self-test` catches a 39% miss), but the script that applies it exited 1 for want
  of a real run. Any headroom number produced on this laptop would be a model output over an
  unpopulated database, not a proof. See `../RB-07-per-cell-cost/` for exactly how far a local
  model output diverges from a capacity measurement.

**What would unblock them:** a staging cell seeded to RB-05's preconditions (≥20,000 active
orgs, one org at 100,000 members via `seed:envelope`), a colocated load driver
(RTT < 1 ms), `APP_BASE_URL` pointed at that cell, a Chrome reachable by a fixed
`browser-driver.mjs`, and a named operator to attest the run through
`ops:evidence:capture`.
