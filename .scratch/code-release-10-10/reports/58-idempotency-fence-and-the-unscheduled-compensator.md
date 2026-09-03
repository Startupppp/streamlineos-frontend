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
2. **The whole billing cron controller is unscheduled.** `ai-reservations-sweep` was one of six
   routes on `CronBillingController`; `trial-expiry`, `monthly-plan-grants`, `auto-topup-flush`,
   `provider-webhook-redrive` and `ai-jobs-flush` are all still reachable only by an external POST
   that the README's five-job table does not name. Trial expiry and monthly plan grants in
   particular are revenue-affecting. I scheduled only the one I was asked to and could prove.
   Owner: billing.
3. **`UsageMeteringService.sweepExpiredReservations` has no caller** — §5a.
4. **The 28 harmful `@Idempotent` routes still have no natural key of their own** — §2.
5. **`check:file-sizes` is red on `main`** for five files in other territories.
