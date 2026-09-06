# Co-located measurement — 2026-09-06

Verified results only. Anything not measured is recorded as not measured, never as passing.
No budget, ceiling, ratchet, floor, allowlist or denominator was moved to make anything green.

Environment: the co-located stack in `D:\localstack` — PostgreSQL 18.6 (`scratch_local`) on
127.0.0.1:5432, Redis 6379, Upstash REST shim 8079. The backend on :1500 runs with
`--env-file=D:/localstack/backend-local.env`; all three DB-resolving keys in that file
(`DATABASE_URL`, `APP_DATABASE_URL`, `DIRECT_DATABASE_URL`) resolve to `127.0.0.1:5432/scratch_local`
and no `REGION_KEYS` / `REGION_CELL_2_*` key is present, so there is no split brain. `backend/.env`
still names the production host, which is why every seeder must be given the local env file
explicitly — the multi-org seeder below refused `neondb` on its own guard before it was repointed.

---

## 1. The driver stamped a load average this platform never provides

`measure-web-vitals.mjs` recorded `loadAverage1mAtStart` / `loadAverage1mAtEnd` from `os.loadavg()`
beside a note reading "a 1m average above the CPU count means the numbers are not the application's".
Both were inert on Windows: `os.loadavg()` is unimplemented there and returns `[0, 0, 0]`
unconditionally. The guard therefore read "perfectly idle" for every capture ever taken on this host,
including the one that recorded `/build/my-work` mobile INP at **1,844 ms against 38 ms** on a route
whose code had not changed, taken while the host sat at 100% CPU.

Measured side by side on this host after the fix:

| Signal | Reading |
|---|---|
| `os.loadavg()[0]` | `0` (unimplemented on win32) |
| measured CPU busy, `os.cpus()` tick deltas over 1000 ms | **11.8%** |

`os.cpus()` carries per-core cumulative tick counters on every platform, so a delta over a real
interval is a measurement rather than a constant. The baseline is taken **before the browser
launches** — the only contention question a driver can honestly ask is about load it did not create.
`loadAverage1m` is now recorded as `null` on platforms that do not implement it rather than as `0`,
because a stamped zero reads as an idle host.

**Known limitation, stated rather than hidden:** the two readings bracket the run (before launch,
after the browser exits). A spike that begins and ends inside the run is caught by neither. Captures
are therefore still scheduled onto a quiet host rather than relying on the guard alone.

`check-web-vitals-budget.mjs` consumes this as a sixth evidence signal and refuses a contended
capture. It refuses an **unmeasured** host exactly as it refuses a busy one, so the Windows case
cannot pass by returning nothing. Proved against the real artifact rather than only a fixture: the
existing capture is refused with "the results file carries no `hostContention` block … an unasserted
capture is not a clean one."

Self-tests: producer `measure:web-vitals:self-test` PASS, including a busy-host case, an
unmeasured-host case and an exact-at-ceiling case; gate `check:web-vitals-budget:self-test` PASS with
busy-host and unmeasured-host fixtures added to the six that existed.

---

## 2. `/chat` was unmeasured because a proxy misclassified a correct page

The driver decided whether a sample rendered an AUTHORIZED shell by counting in-app navigation links
against `MIN_AUTHORIZED_NAV_LINKS = 3`. The purpose is real and is preserved: when `/me/access` is
refused the shell paints almost nothing, and those numbers *flatter* the product — an error page is
fast. But the chat mobile bottom navigation genuinely has two destinations, so a correct, fully
authorized `/chat` page tripped a guard aimed at unauthorized ones, and the refusal mechanism
deliberately cannot be excepted. `/chat` stood recorded as **unmeasured, not passing**.

The discriminator is now the shell's own marker. `DashboardShell` renders
`<main id="dashboard-content">` on its authorized branch (`dashboard-shell.tsx:270`); its
access-refused branch returns early with an `ErrorState` div and renders no `<main>` at all
(`dashboard-shell.tsx:216-230`). Verified against the running server rather than from source:

| Request | `id="dashboard-content"` occurrences |
|---|---|
| `/dashboard`, `/chat`, `/calendar` with a session cookie | 1 each |
| `/dashboard` with no cookie | 0 |

The nav-link count is retained as corroborating evidence and as the fallback for captures predating
the field. The check **fails closed**: if the id is ever renamed, every sample becomes unauthorized
and the capture is refused, rather than every sample becoming authorized.

An earlier attempt to satisfy the old counter by adding `sr-only` links was reverted and is not
reinstated. This change alters *what is asserted*, not *how much is tolerated*.

---

## 3. Gates that moved from prerequisite-blocked to a real verdict

### `verify:multi-org-employment` — now PASSES

It had been exiting 1 with `{"skipped":true,"reason":"no user holds two active memberships"}`. That
is a loud failure rather than a silent pass, but it is not a verdict either: per PRD-C016 a
prerequisite-blocked gate never counts as passing.

The fixture seeder existed but had deliberately never been run, on the belief that it would disturb
an exact ratchet. That belief was checked rather than inherited:

- The seeder is idempotent on all four tables (`ON CONFLICT DO NOTHING` / `WHERE NOT EXISTS`); a
  second run inserts nothing.
- The gate is non-destructive — it writes two designations, reads them back, and restores the
  originals in a `finally`.
- The belief was right that the `rows` dimension is EXACT and that the seeder writes to three tables
  it covers.

Row counts measured directly, confirming the predicted effect exactly:

| Tenant | `organization_members` | `hr_people` | `hr_employments` |
|---|---|---|---|
| large `aaaaaaaa-…-0001` | 500 → **501** | 5602 → **5603** | 5100 → **5101** |
| small `aaaaaaaa-…-0002` | 10 → **11** | 51 → **52** | 51 → **52** |

Gate result with the fixture present — a real verdict, exit 0:

    { "userId": "cccccccc-0001-0000-0000-000000000001",
      "orgA": { "orgId": "aaaaaaaa-1111-0000-0000-000000000001", "employmentId": 5679,
                "designation": "Contractor in org A" },
      "orgB": { "orgId": "aaaaaaaa-1111-0000-0000-000000000002", "employmentId": 5680,
                "designation": "Head of Engineering in org B" },
      "independent": true, "legacyFallbackPossible": false }

Two distinct `employmentId`s, each org reading only its own designation, is the product property the
gate protects: a person employed by two organizations must hold wholly independent employment records
per organization.

**Consequence measured, not left stale.** The fixture moved `contracts/benchmark-manifest.json`, so the
manifest was **re-measured** with the exact parameters its own `reproduce` field records
(`--samples=50 --replicates=3 --concurrency=8 --iterations=48 --plans --write`) rather than left
describing a pre-fixture database. One of the two predicted moves was **refuted by the measurement**:
`org-members-list@small` did go 10 → 11, but `employee-reporting-line-lookup@small` stayed at **51**,
because it queries `hr_reporting_lines` — a table the fixture does not write to — and a new employment
record does not create a reporting line. The prediction was reasoning; the measurement is the answer.

Fields that moved fall into two classes and nothing else. **Fixture consequences:** dataset
`tenantRows` (`org-access` large 504 → 505, small 14 → 15; `hr` large 43972 → 43974, small 496 → 498)
and the member-scanning benchmarks — `org-members-list`, `fanout-all-members-page`,
`dashboard-member-headcount`, `employee-record-list-canonical`, `module-access-roster`. **Ordinary
noise:** calendar and vector-ANN buffer counts, some of which went *down* (`vector-ann-direct-under-rls`
1533 → 1513), which is the signature of buffer-cache state rather than of a data change.

A third apparent class was investigated and dissolved: a `dashboard-announcements` diff showing
`tenantRows: undefined → 400` was an artifact of the comparison script, which matched two benchmarks
sharing one id by `Array.find()`. Matched by `source`, every ratcheted value is identical before and
after.

**No ratchet was widened.** Buffers stay exact on 284/284 pairs and rows exact on 284/284; statement
counts and plan shape stay EXACT; timing stays DISARMED as before. The false-positive proof still
fires on 0 of 568 unchanged-code comparisons. `check:benchmark-manifest` reports the same status as
before the fixture: `STATUS: PARTIAL — in scope 241/244 (98.8%)`, exit 0.

### `verify:chat-mentions` — now PASSES, and a recorded P1 does not reproduce

The blocker had been recorded as an `AUTH_SIGNING_KEYS` keyring mismatch. That premise was wrong. The
keys in `backend/.env` and `D:/localstack/backend-local.env` are identical — same `kid`, same material
— JWKS confirms the running server loaded the right key, and a local `jwtVerify` against the server's
public key succeeds.

The real cause was the split-brain that `backend/.env` invites. The gate ran with `--env-file=.env`,
seeding probe fixtures into the remote Neon branch, while the server
(`--env-file=D:/localstack/backend-local.env`) queried `127.0.0.1:5432/scratch_local`.
`isAccountActive` found no row for the probe user and the guard threw **401 on every request**. A 401
from an absent membership row is indistinguishable, from the outside, from a delivery failure.

Repointed via `CHAT_PROBE_DATABASE_URL` — an escape hatch the script already documented for exactly
this case. Result:

    Alex received      : 1        (direct @alex — the person named)
    Alexander received : 0        (correctly not reached by @alex)
    @everyone reached Alex      : 1
    @everyone reached Alexander : 1
    chat_messages rows : 2
    PASS — the mention reached exactly the person named.

Self-test bite confirmed on the DB tier: a planted 1-message fixture produces `FAIL: expected 2
persisted messages, got 1`. The Ably delivery-count tier needs a booted API and was exercised by the
live run above rather than by the self-test.

**This retires a P1.** The 2026-09-04 signed record carried "chat mentions are not delivered and
`@everyone` expands to nobody" as the one genuine P1 among its 26 open criteria. It does not
reproduce, and no product defect was found in mention delivery. The most likely reading is that the
original observation was this same environment fault rather than a code fault.

### `check:alert-ack` — a guard on a variable it never read

The check refused to run without `ALERT_WEBHOOK_URL` and **never read the value**. That URL is used
by `drill-alert-system.mjs`, which sends the POST; the check's only evidence is the acknowledgement
state file. The guard blocked the gate on a prerequisite with no bearing on what it measures.

Removed — 1 insertion, 14 deletions. The state-file check is untouched, so the gate still exits 2,
now naming the real prerequisite: no acknowledgement record exists because the drill has never been
run on this machine. Self-test 7/7.

That remaining prerequisite is a **human** one — a person must receive an alert and type back a
nonce. It cannot be satisfied by code and belongs in the deployed/human bucket, not the code bucket.

---

## 4. Gates that remain red, and why widening is refused

### `check:test-suppressions` — FAIL, correctly

`Spec files 2319 · suppression sites 20 · conditional aliases 75` → `conditional 76 · placeholder 13
· quarantine 6`. One condition fires: **76 runtime-selected suppressions against a ratchet of 29.**

The mechanism was verified before the number was believed. The denominator is accurate: the gate's 75
conditional aliases match `git grep` exactly, and the single +1 call-site difference is the
`test/helpers/db-describe.ts` helper the walker includes by name. A bite test confirmed the gate
fires — a planted `it.skip` was reported immediately by file, line and class, then removed.

The ratchet is **not** widened. The script's own comment states the only legitimate way to move it:
the `db-gates.yml` "Database-gated spec suites" step must go green and then be promoted off its `if:`
guard, because the +47 conditional aliases are `.db.spec.ts` files gated behind environment variables
and not one of them ran in any CI workflow at release time. Raising the ratchet to fit a test net
that runs nowhere converts a measurable debt into a green tick. This is a CI infrastructure gap, not
a code defect.

### `check:replay-ledger` — INCONCLUSIVE, and a hazard was removed

Exits 2: `drizzle.__replay` does not exist in `scratch_local`. That database was built with
`db:migrate` — 695 applied rows against a 695-entry journal — not with `replay-chain-cold.mjs`, the
only script that creates and populates that ledger. Closing this needs a **blank** database.

A `COLD_DATABASE_URL` pointing at `scratch_local` was added during this session and has been
**removed**. `scratch_local` is the live measurement fixture, and pointing a cold-replay script at it
invites the destruction of every row count recorded in §3.

---

## 5. Commits

| Repo | SHA | Change |
|---|---|---|
| root | `634bd16a3` | measure host contention instead of a load average Windows never provides |
| root | `d476efa28` | discriminate an authorized shell by the shell, not by a link count |
| backend | `980b81013` | stop `check:alert-ack` demanding a variable it never reads |
