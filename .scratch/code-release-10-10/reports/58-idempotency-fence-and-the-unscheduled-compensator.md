# 58 — The idempotency fence, and the compensator that had never run

Follow-on to `35f-swallowed-failure-triage.md` §5a. 35f's `@Idempotent` enumeration is taken as
given and not redone; everything else here was re-measured, and **four handed-down claims are
corrected** — two of them in the direction that makes the defect worse, two in the direction that
makes it smaller than reported.

**Headline.** The fence's completion write was swallowed *and* fire-and-forget, and the reason that
mattered is one nobody had stated: **the fence rides the request's own tenant transaction**, because
`DRIZZLE` is a proxy onto the ambient `tx` (`common/tenant/tenant-db.ts`). Awaiting the completion
therefore does not "propagate a failure to a caller whose payment already succeeded" — it makes the
fence stamp and the money movement the same transaction, so a lost completion write rolls the
transfer back instead of licensing a second one. Bite-proved against the pre-fix tree:
**2000 moved out of an account asked for 500**.

Part 2's premise holds and is stronger than stated: `@nestjs/schedule` is **not installed**, so
`@Cron` does not exist in this codebase at all. The compensator is now scheduled and proved end to
end against a real Postgres as the non-BYPASSRLS application role: wallet **1000 → 1250**,
reservation **RESERVED → RELEASED `{"reason":"expired"}`**.

---

## 1. What was verified before anything was changed

| Handed-down claim | Verdict |
|---|---|
| `POST /finance/transfers` moves the cash twice — no conflict target, unconditional `± amount` | **Confirmed.** `transfers.service.ts:131` inserts `fin_bank_transfers` with no `onConflict`; `:190` and `:210` are `balance ∓ amount::numeric`. The debit carries a sufficiency predicate, which is a *concurrency* guard, not a dedupe. |
| `command-fence-store.ts:123` `complete()` swallows, silently | **Confirmed**, and the catch had no log of any kind. |
| `requestHash` ignores path params | **Confirmed.** It was `sha256(JSON.stringify({commandName, body}))`. |
| The fence silently no-ops when `req.user.orgId` is absent | **Confirmed as code, unreachable in production.** `JwtAuthGuard:157` rejects an org-less request 403 unless the handler carries `@AllowNoOrg()`, and **no `@Idempotent` handler carries it** — measured across 120 controllers. 35f's example, `support:portal_ticket.create`, is `@UseGuards(JwtAuthGuard, …)` with a full `CurrentUserContext`; it is not a portal/public route. Fixed anyway, fail-closed, so the next `@Public` fenced route cannot inherit the hole. |
| "`@Idempotent` has no FAILED branch, so a retry after a timeout re-executes on the same key" | **Corrected — the mechanism is different and the consequence is not the one named.** See §3. |
| `sweepExpiredReservations` is scheduled nowhere | **Confirmed, and stronger.** `@nestjs/schedule` is not in `package.json` and not in `node_modules`; `grep -rn "@Cron(" src` over non-spec files returns **0**. There is no decorator to have forgotten. |
| Three services define the compensator — "three copies is itself a finding" | **Corrected. There is one implementation.** See §5. |
| `reserve` debits the wallet up front, so a lost settle over-charges | **Confirmed.** `ai-credits-reservation.service.ts:62` writes `balance: wallet.balance - credits` before the provider call. |

**The load-bearing fact nobody had recorded.** `DRIZZLE` is `createTenantAwareDb(...)`, a Proxy whose
`get` resolves to `getTenantContext()?.tx` when a tenant context is ambient
(`common/tenant/tenant-db.ts:14`). `TenantContextInterceptor` is registered at `app.module.ts:215`
and `IdempotencyInterceptor` at `:216` — global interceptors apply outermost-first — so
`claim()`, `complete()` and `fail()` **all execute on the request's own transaction**, not on the
pool. Everything in §2 and §3 follows from that, and the money spec now pins both halves of it
(registration order, and the proxy's routing line) so a future reorder fails a test instead of
silently moving the fence off the transaction.

`command_fences` also carries RLS (`tenant_isolation`, `organization_id = app.current_org_id()`,
verified on `scratch_perf_seed`), so the fence writes *cannot* be moved to the pool without a GUC —
the transaction is not an accident of the design, it is required by it.

---

## 2. Defect 1 — the swallowed completion write

**What I chose, and why it is not "propagate vs swallow".**

The brief frames the trade as: a completion write that fails must not license a double charge, but
must not fail a payment that already succeeded either. On this codebase that trade does not exist,
because the two writes are the same transaction. `complete()` now **propagates**, and the
interceptor awaits it inside the handler's transaction (`concatMap`, not `tap`). If the stamp fails,
the transaction that would have moved the money rolls back with it. There is no state in which the
money moved and the fence did not — so the retry is not a *second* transfer, it is the *first* one.

**Why not the outbox.** The outbox is the right mechanism for an effect that leaves the process and
whose loss is a correctness bug (`backend/CLAUDE.md` §4 mechanism 2). The completion stamp is
neither: it is a same-database write to a row the same transaction already inserted. Putting it on
the outbox would (a) not survive the failure mode the swallow was covering — a DB write failing
means the outbox insert fails too — and (b) make the stamp *asynchronous*, which re-opens exactly
the window that causes the double execution: fence not yet `COMPLETED`, lease expired, retry
proceeds. The outbox would make this defect harder to see, not smaller.

**The one case where propagation is wrong, handled separately.** A handler running *outside* a
tenant transaction (`@NoTenantTransaction`, of which `organization.controller.ts` and
`notifications.controller.ts` have instances, though none on a fenced handler today) has already
committed on its own. There, failing the response would report an error for work that happened.
`recordCompletion` checks `getTenantContext()` and, when there is none, retries the write three
times with backoff and then logs at **error** naming the fence, the command and the consequence.
The previous behaviour was an empty `catch` — a pool exhausted exactly as handlers finished would
have double-executed money commands invisibly.

**The 28 harmful routes.** 35f's recommendation (3) — "every one of them should carry its own
natural key or status guard" — remains the right end state and is **not done**; it is 28 service
changes across finance, accounting, billing, mail, notifications and e-sign, several of them inside
the active `feat/accounting-module` rewrite lane. What has changed is that the fence they currently
rely on is now exact rather than best-effort, so the residual exposure is a design debt rather than
a live double-charge path. Owner: the per-module owners; tracked, not closed.

---

## 3. Defect 3 — the FAILED branch, corrected

**The claim as written is not what the code does.** `fail()` exists, the interceptor called it, and
`claim()` handled `FAILED` by falling through to the lease compare-and-swap and returning `proceed`
— which is the *correct* behaviour for a failed command. The defect is one layer down and nobody
had named it:

> `fail()`'s UPDATE was issued on the transaction that was being rolled back, so **`FAILED` was
> never durably written**, and the fence row itself disappeared with the rollback. The status is
> unreachable in production.

Consequences, stated in both directions so the record is right:

- **Not a double charge.** A rolled-back claim means a rolled-back command: nothing to double.
  A retry gets a clean `INSERT` and executes once. This is all-or-nothing and is the behaviour you
  want.
- **A real residue, smaller than reported.** A handler that performs an *external* effect (a sent
  email, a provider order) and then fails leaves no fence behind, so the retry repeats the external
  effect. That is an outbox problem, not a fence problem — the request transaction should never
  have been the thing guarding a network call — and I did not restructure those handlers.
- **Noise.** `void this.store.fail(...)` issued an UPDATE on an aborting transaction, raising a
  second, misleading error into a silent catch.

Fixed: the interceptor calls `fail()` **only when the fence is durable** (no ambient tenant
transaction), the store logs at `error` when the stamp cannot be written, and `claim()` now states
its `FAILED` branch explicitly with the reason the hash is deliberately *not* compared there (a
retry correcting an invalid body is the ordinary reason a fenced command failed). The reclaim
compare-and-swap also now pins `status` as well as `leaseExpiresAt`, so two racing retries cannot
both win.

---

## 4. Defect 2 — the request hash, and what happens to existing rows

`requestHash` is now `sha256({v: 2, commandName, method, params, query, body})`, with `params` and
`query` **canonicalised by sorted key** — Express hands them back in URL order, so without that
`?a=1&b=2` and `?b=2&a=1` would hash as two different commands and 422 each other.

**Existing rows.** Rewriting the hash input invalidates every fence already on disk: a retry in
flight across the deploy would have been answered *422 — this Idempotency-Key was already used with
a different request*, which is a worse failure than the one being fixed. The interceptor therefore
also computes `legacyRequestHash` (the exact v1 string), and the store accepts it **only for a row
whose `created_at` precedes this process's start** (`PROCESS_STARTED_AT`, `requestHashMatches`).
A fence written by a fixed process can only carry v2, so the cross-`:id` hole is closed immediately
for everything new; the window applies only to rows an older process wrote and closes on its own
with the 24-hour `IDEMPOTENCY_TTL_MS`. `legacyRequestHash` and that branch can be deleted 24h after
the deploy — noted in the code as the exit condition, not left as folklore.

---

## 5. Part 2 — the compensator

### 5a. There is one implementation, not three

| Site | What it actually is |
|---|---|
| `ai-credits-reservation.service.ts:351` | **The implementation.** Sweeps `ai_credit_reservations` under `forEachOrg("sweep:expired-ai-reservations")`. |
| `ai-credits.service.ts:341` | A **one-line delegate**: `return this.reservation.sweepExpiredReservations()`. Not a copy. |
| `usage-metering.service.ts:363` | A **different compensator for a different table** — `billing_usage_reservations`, `status ACTIVE → EXPIRED`, per-meter advisory lock. Not a copy either. |

So "three copies of a compensator" is not a finding. The finding hiding underneath it is:
`UsageMeteringService.sweepExpiredReservations` has **no caller at all** outside
`db/__tests__/db-call-count-contract.spec.ts` — no route, no cron service, no scheduler. It is a
second unscheduled compensator, on the metered-usage side rather than the credit side. **I did not
schedule it**: unlike the credit sweep it is not obviously safe to run unattended (expiring an
ACTIVE usage reservation writes `settled_quantity: 0`, which is a billing decision), and its
absence has no wallet-visible cost. Escalated to billing, not closed.

### 5b. The RLS trap does not bite this job — measured, not assumed

The warning was that a naively scheduled job 500s as the app role under RLS. It is real, and I
reproduced it: connected to `scratch_idem_sweep` as `streamline_app`
(`rolbypassrls = f, rolsuper = f`), `select count(*) from ai_credit_reservations` with no tenant GUC
fails **`42501`**.

It does not bite here because `sweepExpiredReservations` already goes through `forEachOrg`, whose
opening query is over `organizations` — RLS **off**, **0 policies**, verified in `pg_class`/`pg_policy`
— and whose per-org callback runs inside `withTenant`, which sets `app.organization_id`. Measured in
the same session: **8 organizations enumerable with no GUC**, and the per-org work then succeeded.

**No dependency to record.** Scheduling this job did not require the RLS issue fixed first.

### 5c. What was scheduled

`ai-reservations-sweep` is now a `RETENTION_JOBS` declaration with a runner in
`CronRetentionSchedulerService`, a README row, and a dead-man alert entry — the four consumers
`retention-schedule-parity.spec.ts` keeps in agreement, so none of them can drift.

- **Cadence 15 minutes**, not the retention default of daily: the reservation window is 15 minutes,
  so a daily sweep leaves an over-charged wallet wrong for most of a day.
- **Lease 120s**, matching `cron-billing.controller.ts:139`, so an external `POST /cron/…` and the
  in-process scheduler take the same lock and compose through the shared `cron:heartbeat:` key.
- **Dead-man window one hour**, not 26.

`RETENTION_JOBS` is now slightly misnamed — it holds one compensator among thirteen drains. The doc
comment says so explicitly rather than leaving a reader to discover it; renaming the constant is a
follow-up, and standing up a second parallel list would have been worse.

### 5d. The N² wrapper, removed

`CronBillingService.sweepAiReservations` wrapped `forEachOrg` around a sweep that iterates every
organisation itself. Measured on the 8-tenant `scratch_idem_sweep`, counting scans of
`organizations` after `pg_stat_reset()`:

| Shape | `organizations` enumerations | Released |
|---|---|---|
| old (`forEachOrg` wrapper) | **9** | 8 |
| fixed (direct call) | **1** | 8 |

Nine enumerations is 1 outer + 8 inner; the tenant-block count goes with it (8 + 64 → 8). Each inner
`withTenant` also issued `set_config('app.organization_id', …, true)` inside the *outer* transaction,
leaving the outer tenant's GUC pointing at whichever organisation the inner loop reached last.

### 5e. Still open: the sweep refunds in full

When the sweep releases an expired reservation it refunds the **whole** ceiling
(`ai-credits-reservation.service.ts:387`, `balance + refunded`) for a call that really consumed
tokens, and `usageSvc.track(...)` has already written `ai_usage_logs` claiming those credits were
spent. So scheduling the sweep converts a silent **over**-charge into a silent **under**-charge, and
`ai_usage_logs` and the credit ledger still disagree with nothing reconciling them.

Both are wrong; the over-charge is the one a customer notices, so scheduling is strictly an
improvement and is the right first move. Settling at actual usage instead of refunding in full is a
**billing product decision** and is not taken here. Owner: AI gateway / billing.

---

## 6. Gates

Exit codes captured with `$?`, never through a pipe.

| Gate | Command | Exit | Number |
|---|---|---|---|
| BE typecheck | `pnpm typecheck` | **0** | run twice — after Part 1 and after Part 2 |
| BE spec typecheck | `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| Idempotent commands | `pnpm check:idempotent-commands` | **0** | every in-scope mutating handler carries `@Idempotent` |
| Vacuous assertions | `pnpm check:vacuous-assertions` | **0** | 1,934 spec files · 14,869 callbacks · 55,816 `expect()` · 4 registered |
| Dead-man self-test | `node src/scripts/alert-retention-dead-man.mjs --self-test` | **0** | 23 passed, 0 failed, **14** monitored sweeps |
| Fire-and-forget · type-assertions · mock-surface · transaction-callbacks · module-di · kebab-case · import-direction · cycles | `pnpm check:<each>` | **0** each | — |
| Focused jest | `jest --runInBand --testPathPattern="(common/idempotency\|modules/finance\|modules/billing\|modules/cron\|modules/mail\|modules/notifications\|db/__tests__/db-call-count-contract)"` | **1** | **1,642 tests passed, 0 failed**; 235 of 236 suites passed. The one failure is **not mine** — see §8. |
| `pnpm check:file-sizes` | — | **1** | **not mine** — 5 unregistered files over 500 lines in chat / clients / e-sign / hr-payroll-inputs / scripts, plus one stale registry line. No file I touched is listed. |
| FE type-check | — | **not run** | no frontend file was changed. |

### Bite proofs, both directions

Planted only in a hermetic `git archive` tree under the session scratchpad; the shared working tree
was never mutated.

| Tree | Run | Result |
|---|---|---|
| `36319620^` (pre-fix) + the new money spec, with the swallow planted back into the fence double | `jest --testPathPattern="transfers-idempotency-money-fence"` | **rc=1**, 5 failed / 5 passed — *"moves the money exactly once however many completion writes are lost"* reported **2000** where the account was asked for **500**; the reused key on a different `:id` **replayed silently** instead of 422; `DrizzleCommandFenceStore.complete()` **resolved instead of rejecting**; `fail()` wrote **nothing** to stderr |
| fixed | same | **rc=0**, 12 passed |
| fixed | `jest --testPathPattern="common/idempotency"` | **rc=0**, 13 passed |
| fixed | `jest --testPathPattern="(ai-reservation-compensator\|cron-retention-scheduler\|retention-schedule-parity\|s05-retention\|cron-dead-man)"` | **rc=0**, 51 passed / 5 suites |

Without the plant, the pre-fix tree does not merely fail the spec — the swallow's absence in the
double turns HEAD's `void this.store.complete(...)` into an **unhandled rejection that kills the
jest worker** (4 child-process exceptions). That is itself worth recording: the only thing standing
between a failed completion write and a crashed process at HEAD was the empty catch.

### Database proof, on a real Postgres

`scratch_idem_sweep` — a `CREATE DATABASE … TEMPLATE scratch_perf_seed` copy at journal head, 8
organizations, RLS live, driven as the non-owner `streamline_app` role. **Left in place as
evidence; do not drop.** Nothing was written to `scratch_perf_seed` itself.

```
role: {"role":"streamline_app","bypass":false}
a cross-org read with NO tenant GUC as this role: 42501
organizations enumerable with no GUC (forEachOrg's opening query): {"n":8}
sweepAiReservations: {"released":1} in 20ms
```
Wallet `1000 → 1250`; reservation `RESERVED → RELEASED {"reason": "expired"}`.

One thing the probe caught that is worth knowing for anyone seeding this table by hand:
`expires_at` is `timestamp without time zone` and the code compares it against a UTC-serialised
`Date`, while SQL `now()` on this machine is `Asia/Kolkata`. A row seeded with `now() - interval
'30 minutes'` is **five and a half hours in the future** as far as the sweep is concerned and is
silently not swept. Production is consistent (both sides UTC); a hand-seeded fixture is not.

---

## 7. Commits (backend repo, `main`)

| SHA | Files | What |
|---|---|---|
| `36319620` | `command-fence-store.ts`, `idempotency.interceptor.ts`, `idempotency.interceptor.spec.ts` | completion awaited inside the tenant transaction · widened `requestHash` with the legacy window · fail-closed on absent org context · explicit FAILED branch |
| `0525183a` | `finance/banking/__tests__/transfers-idempotency-money-fence.spec.ts` | the money assertion |
| `8d2fddde` | `retention-schedule.ts`, `cron-retention-scheduler.service.ts`, `cron-billing.service.ts`, `cron-retention-scheduler.spec.ts`, `ai-reservation-compensator-scheduling.spec.ts`, `alert-retention-dead-man.mjs`, `README.md` | the compensator scheduled · the N² wrapper removed |
| `b5fe8404` | `transfers-idempotency-money-fence.spec.ts` | pins the interceptor registration order the fix depends on |

Each verified with `git show --stat HEAD`; file counts 3, 1, 7 and 1, all mine.

---

## 8. Cross-territory, found and not fixed

1. **`razorpay-service-import-boundary.spec.ts` cannot run.** Its `walkTs` recurses through
   `.claude/worktrees/bold-napier-7a4a41/node_modules`, which is a symlink to the repo's own
   `node_modules` (created 2026-08-29, before this session), and dies `ELOOP`. Nothing to do with
   the code it tests. Either the walk needs to skip symlinks and `.claude/`, or the stale worktree
   should go. I touched neither — deleting another agent's worktree is not mine to do.
2. **The whole billing cron controller is unscheduled.** ~~I scheduled only the one I was asked
   to.~~ **Taken and resolved in §9 below** at the coordinator's direction.
3. **`UsageMeteringService.sweepExpiredReservations` has no caller** — §5a.
4. **The 28 harmful `@Idempotent` routes still have no natural key of their own** — §2.
5. **`check:file-sizes` is red on `main`** for five files in other territories.


---

# 9. Follow-on — the other five billing cron routes

Taken at the coordinator's direction after §8 item 2. Two are now scheduled, three are recorded
as deliberately not, each with the single thing that would have to change first.

## 9.1 Is the in-repo scheduler really the only mechanism?

Nothing in **either** repository schedules any of the six routes on `CronBillingController`:

| Checked | Result |
|---|---|
| `@nestjs/schedule` in `package.json` / `node_modules` | **absent** — the package is not installed, so `@Cron` does not exist to have been forgotten |
| `grep -rn "@Cron(" src` (non-spec) | **0** |
| `streamlineos-frontend/frontend/vercel.json` | present, but declares **no `crons` key** — only framework/build settings |
| `render.yaml` · `fly.toml` · `Procfile` · `app.yaml` · `cloudbuild.yaml` · `crontab` | **none exist** in either repo |
| GitHub workflows with a `schedule:` trigger | 6 — `alerts`, `cell-backup`, `cell-cold-bootstrap`, `cell-daily-samples`, `db-gates`, `ci`. `grep -rn "cron/\|CRON_SECRET" .github/` across both repos returns **one hit, a comment in `ci.yml:754`**. None POSTs a cron route. |
| Frontend `app/api/cron/**/route.ts` | **none exist** |
| The five job keys anywhere in either repo | only `cron-billing.controller.ts`, its own specs, the generated `openapi.json` / `api-contract-registry.json`, and this release's scratch reports |

**Stated explicitly, as asked: an out-of-repo scheduler cannot be ruled out from source.** A
platform-dashboard cron, an Upstash QStash schedule or a cloud scheduler would leave no trace in
either repository, and I have no production credentials to check.

**The decisive check, for whoever does have them:** `CronLeaseService.withLease` writes
`cron:heartbeat:<jobKey>` to Redis with a 7-day TTL on **every** successful run, from either entry
point. If `cron:heartbeat:monthly-plan-grants` and `cron:heartbeat:trial-expiry` are absent from the
production Redis, nothing has run them in at least a week. That is one `GET` per key and it settles
the question. `alert-retention-dead-man.mjs` already reads exactly these keys.

**Why a duplicate schedule would not double-grant anyway** — which is the risk the coordinator
rightly flagged. Two independent protections, in order of strength:

1. **The jobs are idempotent in the database** (§9.2). This holds regardless of how many schedulers
   exist, and it is the reason I was willing to schedule them at all.
2. The two mechanisms compose: `isDue()` reads the same `cron:heartbeat:<jobKey>` key an external
   POST refreshes, so the in-process scheduler stands down for the rest of the interval, and
   `withLease` is a distributed lock on top of that.

Protection 2 is **not** something to rely on: `withLease` runs **without dedup** when Redis is
absent or erroring (`cron-lease.service.ts:41,54`) and `isDue()` returns `true` with no Redis. So
the lease reduces duplicate *runs*; only the job's own natural key prevents a duplicate *effect*.
That distinction is now written into `retention-schedule.ts`'s doc comment, because it is the rule
that decides what may join the list.

## 9.2 Scheduled: `monthly-plan-grants` and `trial-expiry`

**`monthly-plan-grants` — daily, 300s lease.** Idempotent per calendar month at three layers:
`getMonthlyGrantedOrgIds` skips an org that already holds a `PLAN_GRANT` this month;
`grantPlanCredits` re-checks the `${plan}-monthly-YYYY-MM` reference *inside its own transaction*;
and `uq_ai_credit_txns_plan_grant_ref` — `UNIQUE (org_id, reference_id) WHERE type = 'PLAN_GRANT'
AND reference_id IS NOT NULL`, confirmed in `pg_index` — refuses the duplicate in the database,
with `isUniqueViolation` returning cleanly.

*Daily, not monthly, deliberately.* The coordinator's caution was right in general and the evidence
answers it: because the grant is idempotent **per calendar month**, a daily cadence grants once and
skips for the rest of the month, and self-heals if the process was down on the 1st. A monthly
cadence would make one missed run cost a customer a month of credits.

**`trial-expiry` — daily, 300s lease.** Idempotent by construction: the expiry is a single
conditional `UPDATE ... WHERE status = 'TRIAL' AND trial_ends_at < now ... RETURNING`, so a second
run matches no rows and emits no second churn event; the reminders carry
`dedupeKey = trial-expiry:<date>:<days>` against `uniq_notification_outbox_dedupe (org_id,
dedupe_key)`, a unique index rather than a cache TTL.

### Proved on a real database, as the application role

`scratch_idem_sweep`, schema head, RLS live, connected as `streamline_app`
(`rolbypassrls = f, rolsuper = f`). 8 organisations: 3 seeded `TRIAL` with `trial_ends_at` two days
past, 5 seeded `ACTIVE` on `PROFESSIONAL`.

```
role: {"role":"streamline_app","bypass":false}
trial-expiry run 1: {"expired":3,"reminded":0}
trial-expiry run 2: {"expired":0,"reminded":0}
churn events emitted across both runs: 3
monthly-plan-grants run 1: {"granted":5,"skipped":3}
monthly-plan-grants run 2: {"granted":0,"skipped":8}
monthly-plan-grants run 3: {"granted":0,"skipped":8}
```
After: `TRIAL 3 → EXPIRED 3`; **5 `PLAN_GRANT` rows under 1 distinct reference**; wallet sum
10,000,000 milli-credits. Three runs, one grant each.

### Bite proof — the guards are load-bearing

In a hermetic `git archive HEAD` tree (never the shared working tree), with both application
guards removed, against my own scratch copy:

| Tree / database | Three runs produced |
|---|---|
| both guards removed **and** `uq_ai_credit_txns_plan_grant_ref` dropped | **15 `PLAN_GRANT` rows, 30,000,000 milli-credits** — a 3× over-grant where 5 rows and 10,000,000 were owed |
| both guards removed, **index restored** | **5 rows, 10,000,000** — the partial unique index alone is sufficient |
| unmodified | **5 rows, 10,000,000** |

The middle row is the one that justifies the cadence: even if both application pre-checks were
bypassed — by concurrency, a lost lease, or two schedulers — the database refuses the second grant.
The index was recreated immediately afterwards and verified present.

**A harness correction worth recording.** My first run of this probe reported `42501 no tenant
context` for every organisation with an `ACTIVE` subscription. That was my harness, not the code: I
built the db as a bare `drizzle(client)` instead of `createTenantAwareDb(...)`, which is what the
`DRIZZLE` provider actually is. `processMonthlyPlanGrants` reaches `getMonthlyGrantedOrgIds` through
`this.db` rather than the `tx` that `forEachOrg` hands it, so **its GUC comes from the proxy and
from nowhere else**. Worth knowing generally: any service method reached via `this.db` inside a
sweep depends entirely on that proxy. The earlier `sweepExpiredReservations` probe was unaffected
because it uses the `tx` directly.

## 9.3 Not scheduled, and why — `UNSCHEDULED_BILLING_JOBS`

Recorded in `retention-schedule.ts` and enforced by `billing-lifecycle-scheduling.spec.ts`, which
asserts every leased route on the controller is either scheduled or excluded with a reason — the
same shape as `UNSCHEDULED_PURGE_JOBS`. Both blocking claims below were **verified by me directly**,
not accepted from the analysis that surfaced them.

**`ai-jobs-flush` — it cannot run at all as the application role.** `AiJobsService.claimBatch` is a
cross-tenant `UPDATE ai_jobs` with **no `org_id` predicate**, issued outside any tenant transaction
(`flush()` contains no `forEachOrg`, `withTenant` or `runInNewTenantTransaction` — verified by
grep), and `ai_jobs` carries RLS. Running that exact statement as `streamline_app`:

```
ERROR:  no tenant context: app.organization_id is not set for this transaction
CONTEXT:  PL/pgSQL function current_org_id() line 7 at RAISE
```

**This is the trap the coordinator warned me about, and it does bite — just not the job we first
suspected.** Scheduling it would register a job that fails silently forever. `releaseStaleLocks` has
the same shape. A second defect would then bite on the first *successful* tick: `crm.stale-pipeline`
is enqueued but no handler registers that type, the no-handler branch writes `status='DEAD'` with
`attempts = maxAttempts`, and `enqueue` returns the existing row whatever its status — so the first
run permanently poisons that idempotency key for every organisation.

**`provider-webhook-redrive` — it double-counts revenue on an overlapping run.**
`BillingWebhookEffects.apply` pushes the `addon_purchase` revenue entry *after*
`externalEffectLedger.execute(...)` **without reading its outcome**, so a grant that returns
`ALREADY_SUCCEEDED` still emits a second revenue event; and the `payment.status === "refunded"`
branch pushes a `refund` entry with **no ledger guard at all** (both read directly at
`billing-webhook-effects.ts:70-77` and `:109-117`). `revenue_events` has no natural key and each
emit mints a fresh `randomUUID()`, so neither the outbox dedupe nor the database catches it. The
credit grant itself is safe — `uq_ai_credit_txns_purchase_ref` plus the effect ledger's token-fenced
compare-and-set. Fix the revenue push, then a 5-minute cadence matches `REDRIVE_MIN_AGE_MS`.

**`auto-topup-flush` — the payment leg does not exist.** `purchaseCreditsDirectly(orgId, null,
packId, true)` credits the wallet and writes a `PURCHASE` transaction, and **nothing in
`ai-credits.service.ts` calls a payment provider**. Putting it on a timer issues credit packs for
free to every org under its auto-top-up threshold. Note the distinction, because it changes who owns
it: its double-run protection is actually sound (`auto-<packId>-<UTC date>` under
`uq_ai_credit_txns_purchase_ref`, with an in-transaction pre-check), so this is **not** an
idempotency gap — it is a missing charge, and a product decision rather than a cadence.

*A latent inconsistency in the same path, not blocking:* `hasSameDayTopUpIst` uses the **IST** day
while the reference key uses the **UTC** day. They disagree for 5½ hours daily; both directions
resolve to "no double credit" (one skips, the other hits the in-transaction check), so it is a
correctness smell rather than a defect.

## 9.4 `UsageMeteringService.sweepExpiredReservations` — left, as instructed

Still no caller outside `db/__tests__/db-call-count-contract.spec.ts`. Not scheduled: expiring an
`ACTIVE` usage reservation writes `settled_quantity: 0`, which decides what a customer is billed for
work that may have happened. That is a billing decision, not a cadence. Owner: billing.

## 9.5 Gates for §9

| Gate | Exit | Number |
|---|---|---|
| `pnpm typecheck` | **0** | |
| `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `pnpm check:vacuous-assertions` | **0** | 4 registered, all within ratchet |
| `pnpm check:idempotent-commands` | **0** | |
| `node src/scripts/alert-retention-dead-man.mjs --self-test` | **0** | 23 passed, **16** monitored sweeps |
| `jest --testPathPattern="(billing-lifecycle-scheduling\|cron-retention-scheduler\|retention-schedule-parity\|ai-reservation-compensator\|s05-retention\|cron-dead-man\|cron-billing)"` | **0** | 75 passed / 7 suites |
| `jest --testPathPattern="(common/idempotency\|modules/cron\|modules/billing\|modules/finance/banking\|modules/ai/jobs)"` | **1** | **930 tests passed, 0 failed**; 96/97 suites. The one suite failure is the same pre-existing `ELOOP` in §8 item 1. |
| `pnpm check:file-sizes` | **1** | unchanged, other territories |

**Commit:** `119ec277` (7 files, all mine).

## 9.6 What I did not do

- No production Redis or database was touched; the heartbeat check in §9.1 is left for whoever holds
  those credentials, and it is the only thing that can rule out an out-of-repo scheduler.
- I did not fix the three excluded jobs. Each is a real defect with a named owner, and two of them
  (the unguarded revenue emit, the cross-tenant `ai_jobs` claim) are worth tickets of their own.
- No e2e run of the newly scheduled jobs through their HTTP routes; the proof is at the service
  level against a real database, plus the scheduler tick in unit tests.
