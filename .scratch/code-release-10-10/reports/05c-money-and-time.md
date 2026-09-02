# 05c — Money is exact, and time is pinned

Session S2 · 2026-09-02 · closes the two PRD §4 criteria that ticket 05 proved open and that no
ticket owned:

- *"Money is stored in integer minor units, never floating point."* — **closed for the arithmetic**,
  with two named residuals below.
- *"Timestamps and audit columns are consistent and timezone-correct."* — **mitigation shipped and
  asserted**; the 1388-column `timestamptz` conversion is costed and recommended, not attempted.

Every number below came from a command whose output I read. Nothing was measured against the shared
remote Neon database; the timestamp proof ran against a local `scratch_money` on PostgreSQL 18.4.

---

## P2-11 — Timezone

### What was actually true

Ticket 05 called this latent, and it is — for the worst possible reason. On this machine the
PostgreSQL server's `TimeZone` is `Asia/Kolkata` **and** the Node process's `TZ` is `Asia/Kolkata`.
They agree, so nothing is broken. Neither is configured anywhere; they agree by coincidence.

I ran the project's own `postgres` driver against PostgreSQL 18.4 across the full 2×2 of
(process TZ) × (session TimeZone), writing `2026-09-02T12:00:00.000Z` and reading it back:

| process `TZ` | session `TimeZone` | naive column reads back | drift |
|---|---|---|---|
| UTC | Asia/Kolkata (server default) | `2026-09-02T17:30:00.000Z` | **+5h30m** |
| UTC | UTC (pinned) | `2026-09-02T12:00:00.000Z` | 0 |
| Asia/Kolkata | Asia/Kolkata (server default) | `2026-09-02T12:00:00.000Z` | 0 |
| Asia/Kolkata | UTC (pinned) | `2026-09-02T06:30:00.000Z` | **−5h30m** |

`timestamptz` round-tripped correctly in all four.

**The finding ticket 05 could not see from static analysis: pinning the connection alone makes it
worse.** Row 4 is the configuration you get if you set `TimeZone=UTC` on the pool and deploy onto a
host that is not UTC — a correct system (row 3) becomes a −5h30m-wrong system. The mitigation is
only safe as a *pair*.

### What shipped

1. `BE/src/db/pool.config.ts` — `connection.TimeZone = "UTC"` on every pooled connection. Pins the
   database end. (`application_name` and `TimeZone` are both in the classic pgbouncer-tracked
   startup-parameter set, which is why the existing `application_name` survives Neon's pooler; that
   the Neon pooler honours `TimeZone` specifically is **reasoned, not measured** — I may not touch
   the shared endpoint. Worth one confirming query on a staging endpoint before release.)
2. `BE/Dockerfile` — `ENV TZ=UTC` in the run stage, with a comment tying it to the pool config so
   neither is removed alone. Pins the process end.
3. `BE/src/db/pool.config.ts` — `describeTimezoneRisk(utcOffsetMinutes)`, appended to the pool
   warnings that `drizzle.module.ts:101` already logs at boot. A process running at any non-zero
   offset now says so at startup, naming the exact shift, because the image's `TZ=UTC` covers the
   container and nothing else (dev, a CI job, a cron worker, a laptop).

### The assertion

`BE/src/db/timestamp-round-trip.e2e-spec.ts` (new). It asserts identity — not a tolerance, not a
skip. Jest's worker environment does not propagate a later `process.env.TZ` assignment to Node's
timezone cache, so the spec **owns its probe processes** (`execFileSync` with an explicit `TZ`) and
is therefore deterministic on any host, including this IST one. Six tests:

- the pool config the application itself resolves carries `TimeZone: "UTC"`, and the session agrees;
- six instants (including a DST boundary and a pre-epoch-offset date) round-trip **unchanged**
  through `timestamp without time zone`;
- the same six round-trip unchanged through `timestamptz` in all four TZ pairings;
- leaving the session unpinned shifts every naive value by exactly +5h30m — the regression the pin
  prevents, asserted so the test has teeth;
- leaving the *process* off UTC shifts every naive value by exactly −5h30m — so `TZ=UTC` in the
  image is provably load-bearing and not decoration.

```
TZ=Asia/Kolkata APP_DATABASE_URL=<local scratch_money> \
  npx jest --config ./jest-e2e.json --runInBand --forceExit src/db/timestamp-round-trip.e2e-spec.ts
→ 6 passed, 6 total
```

`BE/src/db/pool.config.spec.ts` gained three unit tests for the pin and the warning; the whole file
is 23 passed / 23 total. The two pre-existing `warnings).toEqual([])` assertions now pass an explicit
`{ utcOffsetMinutes: 0 }` runtime so they stay deterministic rather than depending on the host.

### The cure, costed — recommendation: do NOT attempt it in this release

Converting 1388 `timestamp` columns to `timestamptz`:

- **Every `ALTER TABLE … ALTER COLUMN … TYPE timestamptz` rewrites the whole table under
  `ACCESS EXCLUSIVE`.** Postgres has a fast path (no rewrite) only when the session `TimeZone` is
  `UTC` at DDL time — which is precisely what is *not* guaranteed today, and the guarantee is what
  this change is trying to establish. Ordering matters: pin first, ship, then convert.
- 1388 columns across ~700 tables is 1388 rewrites. Several of these tables are the high-volume
  append-only ones (`ai_usage_logs`, audit logs, notifications, chat messages, outbox) that
  `backend/CLAUDE.md` §3 already earmarks for time partitioning — a type change on a partitioned
  table must be done per partition.
- 28 tables already **mix** the two types (`invitations` stores `revoked_at` as `timestamptz` and
  `expires_at` naive), so a partial conversion leaves a worse state than either endpoint.
- It requires migrations, which this ticket may not write.

**Recommendation.** A separate programme, module by module, starting with the 53 expiry/lock columns
ticket 05 named (`api_keys.expires_at`, `agent_tokens.expires_at`, `user_sessions.expires_at`,
`email_otp_codes.expires_at`, `magic_link_tokens.expires_at`, `sign_recipients.otp_expires_at`,
`sign_recipients.auth_locked_until`) — those are the ones where a 5h30m error is a *security*
failure rather than a reporting one. With `TimeZone=UTC` now pinned, each of those conversions is a
metadata-only change rather than a rewrite, which is the whole reason to ship the pin first.

### `created_at` / `updated_at` uniformity — not regressed

I touched no schema file. Re-measured across `BE/src/db/schema/**`: **744 `createdAt` + 464
`updatedAt` = 1208 columns, 1208 with a default, 0 missing.** Ticket 05's finding holds.

---

## P2-12 — Money

### The pattern that already existed

`money.util.ts` in `accounting/core` already held exact bigint decimal arithmetic at the ledger's
4dp scale — and only seven files used it, none of them a report. The float damage was entirely in
the read path. So this is not a new mechanism, it is the existing one applied where it was missing,
the same shape as the AI credit ledger's integer milli-credits with fractional credits at the
boundary.

`money.util.ts` gained: `sumDecimals`, `roundDecimal` (half-up; `formatDecimal` truncates and
callers depend on that, so it was left alone), `negateDecimal`, `absDecimal`, `divideDecimals`,
`toDecimal` (the one place a nullable `numeric` column becomes an amount, so no caller needs
`Number(x ?? 0)`), `decimalFromNumber` (the one place a JSON double is pinned to the ledger scale),
and `allocateDecimal` — a largest-remainder split whose parts sum to the total **exactly**, for the
two places money is apportioned pro rata.

### The proof a finance person would want

A trial balance is supposed to net to zero. Here is one that does — and didn't.

Dataset: 250 expense accounts each carrying the third and fourth decimals an FX-converted or
tax-apportioned line leaves behind (`1000.0025`, `1037.0075`, `1074.0050`, …) against one control
account holding the exact contra. **The ledger balances exactly at `numeric(18,4)`.**

| | totalDebit | totalCredit | imbalance | `balanced` |
|---|---|---|---|---|
| **Before** (`Number(sum).toFixed(2)` per account, then float-summed) | `1401626.39` | `1401626.25` | **`0.14`** | **`false`** |
| **After** (bigint at 4dp, rounded once for display) | `1401626.25` | `1401626.25` | `0.0000` | `true` |

Fourteen paise of imaginary money, and a trial balance that reports itself broken on a ledger that
is fine. Both error sources are real and both are now gone: rounding each account to 2dp *before*
totalling, and accumulating the result in IEEE-754.

`BE/src/modules/accounting/core/trial-balance-exact-money.spec.ts` (new, 5 tests) keeps both halves
in the repo — one test asserts the service now balances this ledger, another **reproduces the old
0.14 imbalance from the same data**, so the regression cannot come back unnoticed. It also asserts
the canonical `0.1 + 0.2 !== 0.3` case nets to exactly zero, that a fourth-decimal balance is not
rounded away twice, and that the balance sheet balances on exact comparison rather than a
one-paisa tolerance.

`money.util.spec.ts` went from 29 to 48 tests, including `sumDecimals` staying exact over 100,000
rows of `1234.5600` where the double sum has already drifted by 2×10⁻⁴, and `allocateDecimal`
summing back to the total across 100 uneven weights (what a tax apportionment looks like).

```
npx jest src/modules/accounting/core/money.util.spec.ts --maxWorkers=2            → 48 passed
npx jest src/modules/accounting/core/trial-balance-exact-money.spec.ts            →  5 passed
npx jest src/modules/accounting --maxWorkers=2                                    → 207 passed, 25 suites
npx jest src/modules/payroll --maxWorkers=2                                       → 875 passed, 112 suites
npx jest src/modules/finance src/modules/invoices src/modules/expenses …          → 683 passed
```

### Every site changed

**Accounting — reports (the read path ticket 05 named):**

| File | What it was doing |
|---|---|
| `core/accounting-statements.service.ts` | trial balance, P&L and balance sheet all summed `Number()` doubles; `balanced` hid up to a paisa behind `< 0.01`. Now exact throughout; `balanced` is `compareDecimals(...) === 0`. Near-zero accounts are now filtered on *exact* zero rather than `>= 0.005`, so a dropped row can no longer unbalance the total. |
| `core/accounting-cash-flow.service.ts` | pro-rata allocation of cash movement across offsetting lines by float weights, then `reconciled` behind `< 0.01`. Now `allocateDecimal`, so the sections sum to the net change **exactly** and `reconciled` is an equality. |
| `core/accounting-aged-receivables.service.ts`, `core/accounting-vendor-query.service.ts` | aged AR and AP accumulated buckets as `(Number(existing) + outstanding).toFixed(2)` — rounded on **every** invoice. Now accumulated at 4dp and rounded once for display; bucket totals sum the exact values. |
| `core/accounting-receivables.service.ts` | customer ledger running balance and totals. |
| `core/accounting-gst.service.ts`, `core/accounting-gst.helpers.ts` | GSTR-1 apportions each invoice's CGST/SGST/IGST across its lines by float ratio — a filing document whose rate buckets must sum to the invoice tax. Now `allocateDecimal`. GSTR-3B net tax payable is exact. |
| `gl/general-ledger.service.ts` | opening/closing/running balances accumulated in doubles. Now accumulated exactly with a **single** conversion at the response edge (see residual 1). |

**Accounting — the gates that were supposed to catch an unbalanced entry:**

| File | The hole |
|---|---|
| `core/accounting-journal-entry.service.ts:57` | `Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)` — rounding to **2** decimals a ledger stored at **4**. An entry genuinely unbalanced in the 3rd or 4th decimal passed. Now exact at 4dp. |
| `core/dto/accounting.schemas.ts` | the Zod refine let `Math.abs(d - c) < 0.01` through, so the DTO admitted what the service should have rejected. Now exact. |
| `posting/journal-posting.service.ts:72` | `assertBalanced` compared integer minor units at 2dp against a 4dp ledger, then stored `toFixed(4)`. Now scaled to 4dp. |
| `gl/recurring-journals.service.ts:258` | `diff > 0.009` tolerance, then persisted `toFixed(4)` — a 0.005-unbalanced template materialised an unbalanced DRAFT entry every cycle. Now exact. |
| `settings/opening-balances.service.ts:91` | the auto-balancing plug line was only added when `\|diff\| > 0.009`, so a sub-cent opening imbalance produced no plug and then hit `assertDebitsEqualsCredits` (which is exact) downstream. Now plugs on any non-zero diff. |
| `core/posting-rules.ts` | `splitTaxPool` rounded each half; now allocates, so `cgst + sgst` is the pool to the last paisa and the journal built from it balances. |
| `core/accounting-payables.service.ts` | bill line amounts, tax, subtotal, total, the GST split, the overpayment check, the paid-status threshold and the FX gain/loss base amounts were all doubles with `round2`/epsilon comparisons. All exact. |

**Payroll.** The payroll *calculation engine* was already correct and I left it alone: every payroll
money column is `numeric(15,2)`, `runs/lib/money.ts` converts to integer paise at the boundary, and
`calc-earnings-phase`/`hra-tds` accumulate `…Paise` integers throughout. That is the PRD's rule,
already satisfied. The float leaks were in reporting:

| File | The hole |
|---|---|
| `insights/lib/period-reconciliation.ts` + `insights/period-reconciliation.service.ts` | the payroll analogue of the trial balance. `journal_balanced` is a **blocker** check and it compared `Math.abs(a - b) <= 0.009` on doubles parsed out of `numeric` columns; "payout fully settled" and "credits cover run net" used the same epsilon. All three are now exact string-decimal comparisons; the money inputs are decimal strings end to end. Its spec was updated with them. |
| `insights/reports-read.service.ts:75` | `(parseFloat(b) - parseFloat(a)).toFixed(2)` — month-over-month cost deltas. |
| `insights/journal-outbox.service.ts:40` | the `money()` used to write batch line debits/credits. |
| `insights/ess-self-service.service.ts:60` | outstanding loan balance = remaining EMIs × EMI amount, in floats. |
| `hr-payroll/incentives.service.ts:121` | incentive totals and average-per-conversion (a float division). |

### Two residuals I did not close, and why

1. **The general-ledger endpoint emits money as JSON numbers** (`openingBalance`, `closingBalance`,
   `debit`, `credit`, `runningBalance`, `periodDebit`, `periodCredit`, `netActivity`). Changing
   those to strings is a frontend-visible contract change and the frontend is another agent's
   territory. Every sum behind them is now exact bigint arithmetic and there is exactly **one**
   conversion, at the response edge, so nothing accumulates. The remaining exposure is a client that
   does its own arithmetic on them. Recommend a follow-up that moves the GL response to strings in
   lockstep with the frontend, the way every other accounting report already does it.

2. **`DraftLine.debit` / `.credit` are still `number`.** The posting contract in
   `accounting/posting/journal-posting.data.ts` is float-typed, and its callers live in `finance/`,
   `invoices/` and `expenses/` — outside my territory. Every such number is now pinned to the
   ledger scale exactly once via `decimalFromNumber` before any arithmetic or storage, so no error
   accumulates; but the *type* still says "float money". Recommend changing `DraftLine` to decimal
   strings as one cross-module change.

### One behaviour change with blast radius outside accounting — flag for the orchestrator

Tightening `assertBalanced` from 2dp to 4dp means a caller that submits an entry unbalanced in the
third or fourth decimal now **throws** where it previously posted a silently unbalanced ledger. That
is the fix, but the blast radius reaches modules I do not own:

- `BE/src/modules/finance/ap/bills-workflow.service.ts:154` computes
  `taxPool = Math.round((cgst + sgst + igst) * 100) / 100` from 4dp columns and posts it against a
  4dp `total`. If a purchase bill ever carries 4dp component amounts, approving it will now 400/500
  instead of writing an unbalanced journal. Bills written by `accounting-payables` are always
  2dp-valued (before and after this change), so I believe the practical risk is nil — but the
  correct fix is to convert that line the same way, and it is one line.
- `BE/src/modules/finance/ap/payment-run-executor.service.ts:141` and
  `BE/src/modules/invoices/invoices-payment.service.ts:161` post through the same gate.

I did not run the seeded e2e suite (it is the orchestrator's end-of-session job and contends on a
shared branch), so this coupling is **reasoned from the source, not measured**. It deserves one
seeded run of the accounting/finance golden paths before release.

### Other defects found, not fixed (outside territory)

- **P2** `BE/src/modules/accounting/gl/general-ledger.service.ts:166` — the GL **CSV export** ends in
  a bare `.limit(10000)`. That is silent truncation on a drain: an org with more than 10,000 posted
  journal lines in the range exports a file that looks complete and is not. This is an accounting
  file but a pagination defect, not a money-arithmetic one, so I left it; it wants keyset paging or
  a stream. Whoever owns ticket 07/08's pagination sweep should take it.
- **P3** `BE/src/db/schema/**` — `cell_capacity_measurements.limit_value` and `.per_org_cost` are
  the only two `double precision` money-ish columns in the codebase (ticket 05's finding). Harmless
  as capacity telemetry; a defect the day `per_org_cost` feeds pricing. Schema is another agent's
  territory.

---

## Gates run

| Gate | Result |
|---|---|
| `tsc --noEmit -p tsconfig.json` (8 GB heap, exit code checked) | exit 2, **5 errors, all in another agent's files** — 3 in `src/modules/cron/__tests__/` (explicitly excluded territory) and 2 in `src/common/tenant/__tests__/for-each-org-failure-sink.spec.ts`, which appeared mid-session from a concurrent edit. **Zero in `db/`, `accounting/` or `payroll/`.** The error set moved twice while I worked (it was `common/cache/zz-temp-brand-probe.ts` + `modules/goals` earlier), which is what a shared working tree looks like. |
| `eslint` over every file I changed | **0 errors.** (2 pre-existing unused-import warnings in files I did not author.) |
| `jest src/modules/accounting src/modules/payroll` | **1082 passed / 137 suites** (accounting 207/25, payroll 875/112) |
| `jest src/modules/finance src/modules/invoices src/modules/expenses` | 683 passed |
| `jest src/db src/health src/degradation src/common/admission` | 863 passed, 1 suite skipped |
| `jest src/db/pool.config.spec.ts` | 23 passed |
| `jest --config jest-e2e.json src/db/timestamp-round-trip.e2e-spec.ts` (local `scratch_money`) | 6 passed |
| `jest src/config` | **1 failure, not mine** — `env-coverage.spec.ts` flags `REDIS_COMMAND_TIMEOUT_MS` (`common/cache`) and `RETENTION_SCHEDULER_*` (`modules/cron`) as unvalidated. I introduced no env variable; `TimeZone` is hardcoded precisely so this gate stays untouched. |

## Files changed

```
BE/Dockerfile
BE/src/db/pool.config.ts
BE/src/db/pool.config.spec.ts
BE/src/db/timestamp-round-trip.e2e-spec.ts                                   (new)
BE/src/modules/accounting/core/money.util.ts
BE/src/modules/accounting/core/money.util.spec.ts
BE/src/modules/accounting/core/trial-balance-exact-money.spec.ts             (new)
BE/src/modules/accounting/core/accounting-statements.service.ts
BE/src/modules/accounting/core/accounting-cash-flow.service.ts
BE/src/modules/accounting/core/accounting-aged-receivables.service.ts
BE/src/modules/accounting/core/accounting-vendor-query.service.ts
BE/src/modules/accounting/core/accounting-receivables.service.ts
BE/src/modules/accounting/core/accounting-gst.service.ts
BE/src/modules/accounting/core/accounting-gst.helpers.ts
BE/src/modules/accounting/core/accounting-journal-entry.service.ts
BE/src/modules/accounting/core/accounting-payables.service.ts
BE/src/modules/accounting/core/posting-rules.ts
BE/src/modules/accounting/core/dto/accounting.schemas.ts
BE/src/modules/accounting/gl/general-ledger.service.ts
BE/src/modules/accounting/gl/recurring-journals.service.ts
BE/src/modules/accounting/posting/journal-posting.service.ts
BE/src/modules/accounting/settings/opening-balances.service.ts
BE/src/modules/payroll/insights/lib/period-reconciliation.ts
BE/src/modules/payroll/insights/lib/__tests__/period-reconciliation.spec.ts
BE/src/modules/payroll/insights/period-reconciliation.service.ts
BE/src/modules/payroll/insights/journal-outbox.service.ts
BE/src/modules/payroll/insights/reports-read.service.ts
BE/src/modules/payroll/insights/ess-self-service.service.ts
BE/src/modules/payroll/hr-payroll/incentives.service.ts
```

No schema file, no migration, and no file outside the declared territory was edited. No git command
was run.

**Scratch database:** `scratch_money` on `127.0.0.1:5432` (owner `neondb_owner`) holds one
throwaway `tz_probe` table from the manual measurement; the committed spec is read-only and creates
nothing. `scratch_boot_a/b/c` were not touched. Drop `scratch_money` when the evidence is no longer
wanted.
