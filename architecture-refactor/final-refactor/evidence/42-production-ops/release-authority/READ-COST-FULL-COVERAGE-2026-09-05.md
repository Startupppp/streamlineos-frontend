# Read-cost coverage 58/75 → 75/75, and a CI step that had never run

Date: 2026-09-05 · Branch: `scratch-verify-2026-09-05` (Neon, `scratch_verify_0905`)
Measured as `streamline_app` (NOBYPASSRLS) with the tenant GUC set, samples=3.

## What moved

| | before | after |
|---|---|---|
| read-cost budgets measured | 58/75 (77.3%) | **75/75 (100%)** |
| read-cost outcome | 56 PASS / 16 FAIL | **75 PASS / 0 FAIL** |
| vacuous budgets | 2 | **0** |
| below seed floor | 12 | **0** |
| `c145-realtime-and-inbox-budgets.spec.ts` | 17/25 | **25/25** |
| `measure-route-budgets --write` | 46 written, 12 refused | **58 written, 0 refused** |
| db-gates `.db.spec.ts` suites selected | **0 of 56** | 56 |

No ceiling, floor, threshold, denominator, allowlist or ratchet was lowered.
The C104 suppression ratchet stands at 29.

## Four defects, none in the code under test

**1. `pnpm test:db-specs` matched zero suites.** `--testPathPattern='\\.db\\.spec\\.ts$'`
reaches jest as a regex where `\\` is a *literal backslash*, demanding
`<backslash><anychar>db` — a sequence no path has, on either platform. jest printed
`Pattern: \\.db\\.spec\\.ts$ - 0 matches` and exited 1. Introduced in `31b83208a`, the
commit that added both the script **and** the scheduled step in `db-gates.yml`, so that
step has never executed one test. Every tally previously quoted for it came from invoking
jest directly with a working pattern. Fixed in `d2bb0e2b8`; the corrected pattern selects
56 — the same 56 the PRD records.

**2. Three RLS probes pointed at the owner.** `CALENDAR_`, `EMAIL_` and `PUSH_PROBE_DATABASE_URL`
named the `ci` owner, which the step's own comment warns against: a spec reads its
`*_PROBE_DATABASE_URL` in preference to `APP_DATABASE_URL`, so those three ran with
BYPASSRLS. Calendar asserts `rolbypassrls = false` outright and email expects a 42501 the
owner never raises, so both failed loudly. **push passed** — "re-registers instead of
raising 42501" is free when RLS never applies. Fixed in `454c03ac7`; as `streamline_app`,
calendar 9/9, email 9/9, push 9/9 including push's own net-bites test.

**3. Two fixtures seeded a shape the application never writes.** Migration 0520 moved
notification recipient authority from `user_id` to `membership_id` and every live index
followed, but the seed still wrote `user_id` alone: all 150 rows had a NULL `membership_id`,
so `notifications-list` and `inbox-unified-notifications-page` returned 0 rows against a
150-row table. Production is correct (`notifications.service.ts:49`). Separately,
`leave_requests` at 1,200 rows was 2.4 per member for a 500-member tenant — 33 pages, at
which a Seq Scan is the *cheaper* plan, so `dashboard-leaves-today`'s `forbid-seq-scan`
assertion failed whether the index existed or not. At 24,000 the index wins: 588 rows
scanned of 26,688, 82 buffers against a 2,000 ceiling. Fixed in `0ca6b6cde`, with floors
for `notifications/mine` and `support_tickets` so a partial seed fails at the seed.

**4. Two party specs passed only on an empty org.** `party-legacy-writer` asserted the
*whole tenant* was divergence-free; seeded it reports CONTACT 200 / LEAD 200 — which is
`DEFAULT_LIMIT`, the page size, reported alongside the service's own `truncated` flag.
`PartyDivergenceService` is correct. `party-identifiers` re-runs a full-table backfill per
test under a declared `statement_timeout = '60s'` that jest's unstated 5s default
contradicted. Fixed in `2e376779b`; 14/14. The anti-vacuity guard added to the first is
bite-proved (`after: id + 1000000` → `Expected: > 0, Received: 0`).

## db-gates `.db.spec.ts`, run through the script CI actually invokes

`51 passed, 3 failed, 2 skipped of 56` (282 tests passed, 5 failed, 23 skipped), then the
two party suites repaired above → **53 passed, 1 failed**. The remaining failure is
`crm-permissions-reach-somebody` — CRM, out of release scope under PRD-C157.

## What this does not cover

`measuredLatencyP95Ms` is still null on 4 critical routes: that is an HTTP-level capture
(PRD-C141), not a read-cost one, and the ~448 ms tenant-transaction floor recorded in
LATENCY-FLOOR-2026-09-04.md still applies to it from this machine.
`contracts/benchmark-manifest.json` coverage (63/300) is four tenant profiles; this run
measured the reference profile only.
