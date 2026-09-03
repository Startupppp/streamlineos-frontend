# RB-05 — independent re-run: no load was driven, and the guard proves it cannot be

**This file is not a captured evidence bundle and must never be treated as one.**
It is `.md`, not `.json`, so `manifest-readiness.mjs` and `ops:evidence:check` will not
mistake it for a manifest. RB-05 must keep reporting as missing deployed evidence.

Ticket `34-production-ops-alerts-cost`, work item `34-capacity-cost`.
Criterion: **PRD-C166** — *"Run realistic load and capture pools, queues, CPU, memory, errors,
replica behavior and sustained/burst capacity."*
Runbook: `architecture-refactor/runbooks/RB-05-production-load.md` — its own status line reads
`OPEN — operator-blocked`.

This is a **second, independent execution** of the RB-05 scripts. The first, at 16:20Z the
same day, is recorded in `RB-05-local-run-NOT-deployed-evidence.md`. That file's analysis of
the dataset vacuity guard and of the Windows-only browser-driver defect is correct and is not
restated here. This file adds two things: **the re-run's own exit codes**, and **an executed
probe of the vacuity guard** — the earlier run reasoned about that guard from source, this one
made it fire.

---

## Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent. No named human operator. |
| Date (UTC) | 2026-09-03, 16:38:07Z – 16:39:00Z |
| Backend branch / SHA | `release/code-10-10-v2` / `45f8a2e99494483526e357e27f18c76961ebf266` |
| Frontend branch / SHA | `release/code-10-10-v2` / `7469d27895add587f9427e7c50c457f56e0048bf` |
| Host | macOS 26.6.2, arm64, 15 cores, 24 GB RAM, Node v25.9.0 |
| Database | LOCAL `scratch_head_1010`, PostgreSQL 18.4 (Homebrew), 944 public tables |
| Load driver | **not run** — see "What was deliberately not run" |
| Application server | **not running** — nothing was serving HTTP during this window |

Same exported local-only environment as
`../RB-07-per-cell-cost/C167-C172-independent-rerun-and-variance.md`.

---

## Commands run, with real exit codes

| Command | Exit | Headline | Raw capture |
| --- | --- | --- | --- |
| `npm run cell:load:self-test` | **0** | `SELF-TEST PASS: 39% headroom (12.2ms against 20ms target) is correctly reported as FAIL — the guard can bite` | `c166-rerun-cell-load-self-test.txt` |
| `npm run cell:load` | **1** | `MISSING PREREQUISITE: …/.load-driver-results.json does not exist.` | `c166-rerun-cell-load.txt` |
| `npm run cell:load -- --results=<probe>` | **1** | `VACUITY GUARD: results were produced with 2 members but the cell envelope requires 100000.` | `c166-cell-load-vacuity-guard-probe.txt` |
| `npm run load:drive:verify` | **0** | 15 / 15 assertions pass | `c166-rerun-load-drive-verify.txt` |
| `npm run browser:measure:self-test` | **1** | `SELF-TEST FAIL: no browser found at any candidate path` | `c166-rerun-browser-measure-self-test.txt` |

All five results reproduce the earlier run exactly, on a backend tree that has moved from
`138709f3` to `45f8a2e9` in between. Nothing in this area regressed or improved.

---

## New: the dataset vacuity guard was made to fire, at the real local member count

The earlier run showed `cell:load` exiting 1 on the *missing file* branch, which never reaches
the dataset check. To confirm the dataset guard itself bites — and bites at this database's
actual occupancy, not a hypothetical one — a synthetic results file was fed to it. The file is
saved verbatim as `c166-cell-load-vacuity-guard-probe-input.txt` and carries its own warning in
its first field:

```json
"_comment": "SYNTHETIC GUARD PROBE INPUT — NOT A LOAD MEASUREMENT. organizationMembers is set
 to the real count observed in scratch_head_1010 (2) to show that cell:load refuses a
 laptop-scale fixture. The single objective is a placeholder that would otherwise PASS, so the
 only reason for a non-zero exit is the vacuity guard."
```

The single objective in it (`p95-simple-db-roundtrip`, measured 1.0 ms against a 20 ms target,
95% headroom) would sail past the headroom floor. The run still exited 1, and printed only:

```
VACUITY GUARD: results were produced with 2 members but the cell envelope requires 100000.
Seed the fixture first: pnpm -C backend seed:envelope
```

**This is a guard probe, never a load result.** It measures nothing about the system's speed.
Its whole content is: a fixture at this database's real scale cannot satisfy `cell:load`, and
`cell:load` will not be tricked into saying otherwise by an attractive latency number.

The measured occupancy behind the "2":

```
SELECT count(*) FROM organization_members;   ->  2
SELECT org_id, count(*) ... GROUP BY org_id  ->  drill-4373b133 | 2
```

Two members in one drill organisation, against the 100,000-member largest-org figure that
`envelope-profile.mjs` declares. Short by a factor of 50,000.

---

## What was deliberately not run, and why

`load:drive` was not executed. Three reasons, in order of weight:

1. **It would not have produced a usable result.** `check-cell-load-headroom.mjs` reads
   `organizationMembers` straight out of the results file and refuses anything below 100,000.
   A local run writes the real count (2). The probe above already demonstrates the outcome.
2. **It mutates the shared scratch database.** The driver creates and drops a probe table
   (`PROBE_TABLE_DDL` / `PROBE_TABLE_DROP`) and writes rows. Several agents are measuring
   `scratch_head_1010` concurrently, and the RB-07 capacity readings are already visibly
   distorted by one such bulk insert — 20,000 dead rows in `tickets` from an aborted 60,000-row
   load, which drove that guard's limiting resource to 298.5% and closed the cell. Adding more
   churn would corrupt other agents' measurements.
3. **It was not in this work item's command list.** `load:drive` is not among the scripts this
   task named; `cell:load` and `cell:load:self-test` are, and both were run.

`browser:measure` was not run because it cannot run on this host — see below.

---

## Confirmed on re-run: the browser driver cannot run outside Windows

`browser:measure:self-test` exits **1** with `SELF-TEST FAIL: no browser found at any candidate
path`, despite Chrome being installed at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. The cause, in
`streamlineos-backend/src/scripts/browser-driver.mjs`, is that the candidate list holds only
Windows paths:

```js
const BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
```

`findBrowser()` walks only that list. Independently verified on re-run: there is **no**
environment-variable or CLI override — `grep` over the file finds `BROWSER_PATH` only in a
header comment ("Requirements: a browser at `BROWSER_PATH`"), never read at runtime.

RB-05 records `browser:measure:self-test passes (confirmed 2026-08-30): SELF-TEST PASS: 3
navigation(s), min TTFB=1.4ms`. That result is not reproducible on this host and, given the
code, could not have been produced on macOS or Linux. **This is a code defect, not an operator
blocker**, and it is fixable without any deployed environment. It was not fixed here because
this work item's write scope is the evidence directories only.

Its consequence for C166/C167: two of the fourteen latency objectives —
`p95-browser-cached-read` (150 ms) and `p75-first-useful-view` (1,000 ms) — are fed from
`.browser-driver-results.json` in `run-load-driver.mjs`, and can only ever report `NOT_DRIVEN`
on a non-Windows host.

---

## What this run does and does not establish

**Established (A — runnable here, and run):**

- The headroom guard can bite: a 39% headroom measurement is reported FAIL against the 40%
  floor. `cell:load:self-test` exit 0.
- The load-driver percentile and verdict logic is internally correct: 15/15 assertions,
  including *"an objective with no samples is NOT_DRIVEN, not MET"* and *"every not-driven
  reason says what would be needed, not just that it was skipped."*
- `cell:load` refuses to report headroom when no measurement exists (exit 1), and refuses a
  fixture below the declared envelope even when the fixture's own latency looks excellent
  (exit 1).

**Not established — and not claimable from this machine:**

**PRD-C166 asks for nine things. Here is what the local run produced for each.**

| C166 asks for | Local run produced |
| --- | --- |
| Realistic load | **nothing** — no load driver run, no HTTP server running, 2 members against a 100,000-member envelope |
| Connection pools | nothing — the only pool reading anywhere in this exercise is `pg_stat_activity` on a laptop with `max_connections=100`, 29 backends of which were other agents' psql sessions across 4 databases |
| Queues | `outbox-queue-depth = 0` of 10,000. Zero events exist; a zero-depth queue under no load says nothing about queue behaviour |
| CPU | **not captured at all** — no script in this family samples CPU |
| Memory | **not captured at all** — `shared_buffers` (a laptop default of 128 MiB) is not a memory utilisation measurement |
| Errors | **not captured** — no requests were issued, so no error rate exists |
| Replica behaviour | **impossible** — there is no physical read replica on this machine |
| Sustained capacity | not measured. The envelope declares 50 RPS per cell; 0 requests were driven |
| Burst capacity | not measured. Objective 14 (2× RPS for 60 s, zero 5xx) was never exercised |

Of RB-05's fourteen workload objectives, **zero were driven**.

**Classification: (B) needs a deployed environment.** Concretely, C166 requires all of:
a staging cell seeded to ≥20,000 active organisations with one org at 100,000 members
(`seed:build-load` / `seed:envelope`); a load driver colocated with the cell at <1 ms RTT;
a physical read replica; a working browser driver (which additionally needs the macOS/Linux
defect above fixed first); and pool, CPU, memory and error telemetry from the running cell.
None of that exists on this machine.

**Plus (C) a named human signature** for the evidence bundle itself: the RB manifest contract
in `../README.md` requires an `operator.name` and an `approvedAt`, and states that the gate
"does not itself establish facts about a cloud account; that remains the named operator's
attestation." No operator has attested anything here, and this agent must not sign as one.

---

## The evidence gate was left red, and verified red

Nothing written for this work item is a `.json` manifest — the guard-probe input is saved as
`.txt` precisely so `manifest-readiness.mjs` cannot mistake it for one. Confirmed by running
the gate after writing these files:

```
$ npm run --silent ops:evidence:check          # exit 1
Error: PRODUCTION OPS EVIDENCE GATE FAILED
- missing passing deployed evidence for RB-05
- missing passing deployed evidence for RB-07
```

Full output in `../RB-07-per-cell-cost/c166-c172-ops-evidence-check-still-red.txt`. That
failure is the correct current state for C166 and must not be waived.
