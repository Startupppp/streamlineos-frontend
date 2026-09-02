# 21 — the efficient database-call contract

**Boxes: 2 closed / 7 partial.** Nine boxes is a wide contract and I did not close it. What follows
is per box, with the command and the number, and an explicit list of what I left open.

The one thing worth reading if you read nothing else: **the gate that guards box 2 cannot tell a
batched loop from an N+1**, so I did not use it as proof. The proof is
`src/db/__tests__/db-call-count-contract.spec.ts`, which spies the database handle and asserts the
statement count is *identical* at 1 row and at 50. I mutation-tested it — reverting one fix takes the
assertion from 1 update to 50 — so it is known to bite.

---

## What I actually changed

29 source files, 5 new, 4 specs. Grouped by the box each serves.

### Box 1 — transaction scope (3 defects, all the same shape)

Three sweeps opened `runInNewTenantTransaction` **inside** a `forEachOrg` transaction that was still
open. `runInNewTenantTransaction` calls `runOutsidePoolBorrow` + `runOutsideTenantContext`, so each
iteration borrowed a *second* pooled connection while the first sat idle holding the sweep's own
transaction — once per row, up to 500 rows per organisation.

| File | Before | After |
|---|---|---|
| `billing/core/ai-credits-reservation.service.ts` | 1 transaction + ~4 statements **per expired row** | 1 page select + 1 compare-and-set claim + 1 atomic wallet increment **per page** |
| `billing/core/usage-metering.service.ts` | 1 transaction + 2 statements **per expired row** | 1 advisory lock + 1 claim **per distinct meter** |
| `organization/core/lifecycle/organization-purge-adapters.ts` | up to 3 transactions **per storage key** | 1 bulk pending-upsert for the whole key set, then chunked bookkeeping flushes |

The AI-credits sweep is now also *more* correct, not just cheaper: the claim is
`UPDATE … WHERE status = 'RESERVED' … RETURNING credits`, which cannot double-release a row a
concurrent settle already took, and the wallet moves with `balance + refunded` in SQL rather than a
read-modify-write. The purge adapter keeps its crash-safety ordering — the pending row is still
written before the object is deleted; it is one statement for the set instead of one per key.

### Box 2 — batched lookups (6 N+1s removed)

| File | Before | After |
|---|---|---|
| `finance/banking/imports.service.ts` | 1 existence `SELECT` + 1 `INSERT` **per parsed row** — up to **4,000 round trips** for a `MAX_IMPORT_ROWS` file | chunked multi-row `INSERT … ON CONFLICT DO NOTHING` against `uniq_fin_bank_txn_org_account_fp`; duplicates derived from `RETURNING` |
| `finance/banking/reconciliation-workspace.service.ts` | `Promise.all` firing 1 match `SELECT` **per suggested transaction**, up to 100 per page load | one `inArray` read, grouped in memory, per-transaction cap preserved |
| `surveys/survey-participant.service.ts` | 1 `INSERT … RETURNING` **per participant** on the import path | one multi-row insert per chunk, tokens paired back by `RETURNING` order |
| `autonomy/autonomy-hold.service.ts` | 1 `UPDATE` **per cancelled hold**, identical `SET` | one chunked `inArray` update |
| `cron/cron-holiday.service.ts` | 1 `UPDATE` **per holiday**, identical `SET` | one `inArray` update |
| `finance/assets/depreciation-reverse.service.ts` | 1 asset `SELECT` **per asset** in a reversal | one `inArray` read (the per-asset *write* remains — see open items) |

Plus one loop-invariant hoist in `hr/governance/retention/retention.service.ts`: the organisation-wide
legal-hold probe was being re-asked once per stranded delete request.

### Box 3 — probes (9 authorization probes made tenant-correlated)

Every one of these was an **authorization** probe keyed on a surrogate id with no `org_id`, riding a
non-org index. They are BOLA-adjacent: a `projectMembers` row from another tenant satisfies
`(projectId, membershipId)` just as well as one from yours.

`build/core/projects-query.service.ts` (also gained the missing `.limit(1)`) ·
`build/core/projects-members.service.ts` ×3 · `build/entity/build-entity.actions.ts` ·
`build/core/projects-tickets-rank-utils.ts` · `build/execution/timesheets.service.ts` ·
`chat/chat-huddles.service.ts` · `accounting/settings/coa.service.ts`.

Two of them also gained `columns: { id: true }`, so an existence probe stops hydrating a row nobody
reads.

### Box 6 — atomicity (8 read-then-write races closed, 2 of them money)

| File | The race |
|---|---|
| `finance/banking/transfers.service.ts` | Both balances were read **before** the transaction opened, checked for sufficiency, then written as absolute values. Two 80-unit transfers out of a 100-unit account both passed the guard, and one debit vanished. Now `currentBalance - amount` in SQL with `gte(currentBalance, amount)` in the `WHERE`, and zero rows affected raises `ConflictException` |
| `finance/ap/vendor-payments-allocations.service.ts` | `amount_paid` read, incremented in JavaScript, written back — the second of two concurrent allocations erased the first. Now one `UPDATE … FROM (VALUES …)` moving the balance and deriving the status in SQL |
| `finance/ap/payment-run-executor.service.ts` | Wrote an absolute `amount_paid` from a run-wide snapshot, silently reverting anything that committed in between. Now an atomic increment, and whether the bill *settled* is read back from `RETURNING` rather than computed from the stale map |
| `billing/core/affiliate.service.ts` | `totalEarned` / `pendingPayout` / `signupCount` incremented in JS from a row read before the transaction — two webhooks inserted two commission rows but paid one |
| `notifications/notifications-lifecycle.service.ts` | "Mark all read" assigned the watermark, so two marks committing in either order let the older one **rewind** the cursor and resurrect dismissed notifications. Now `GREATEST(...)` — the fix chat already had and said so in a comment |
| `e-sign/sign-public-form.service.ts` | `submissionCount + 1` from a pre-transaction read |
| `e-sign/sign-envelope-sweeps.service.ts` | `reminderSentCount + 1` — undercounts, so a max-reminders policy built on it is bypassable |
| `inventory/webhooks/webhook-emitter.service.ts` | `attempts + 1` — undercounts, so a retry budget keyed on it never exhausts |

`vendor-payments-allocations` also gained a correctness fix that is not about concurrency: a request
naming the same bill twice upserted the allocation row twice (last amount wins) while incrementing
the bill by both, so the allocation and the bill disagreed. Allocations are now collapsed by bill
before validation, which also makes the set-based upsert legal.

### Boxes 8 and 9 — measurement (new)

`src/db/borrow-scope.ts` (new), `src/db/query-fingerprint.ts` (new),
`src/db/query-fingerprint-registry.ts` (new), and edits to `pool-telemetry.ts`, `query-telemetry.ts`,
`health/health.controller.ts`.

Before: box 8 measured **1 of its 3** named quantities, box 9 **1 of its 6**. After: **3 of 3** and
**5 of 6**.

- **Transaction duration** — `release()` now closes the clock opened at `acquired()`. New snapshot
  fields `maxHeldMs`, `averageHeldMs`, `p95HeldMs`, `longHolds`.
- **Idle-in-transaction** — a per-borrow scope accumulates the wall clock *between* statements, which
  is exactly what `idle_in_transaction_session_timeout` kills a connection for. The guard was being
  set (60 s) and never measured, so a connection pinned across an S3 PUT was indistinguishable from
  one doing real work. New fields `maxIdleInTransactionMs`, `p95IdleInTransactionMs`,
  `idleInTransactionBorrows`, `statementsPerBorrowMax`.
- **Slow-query fingerprints, per-fingerprint call counts, rows returned, lock waits** — the query
  text was previously used once, for a two-way seam bucket, then discarded. There was no fingerprint,
  so "call count" could only ever mean "how many statements ran", never "how many times *this*
  statement ran" — which is the number that finds a 4,000-round-trip N+1. Now normalised
  (every literal, `$n` placeholder and IN-list collapsed to `?`), hashed, and counted per shape with
  rows returned, max/total duration, slow calls, and `55P03` / `40P01` / `40001` / `57014` classified
  as lock wait, deadlock and timeout. Exposed on `GET /health/db`.
- **Buffers stay uncaptured at runtime.** They need an `EXPLAIN` per statement; they are measured
  offline by `run-read-cost-budgets.mjs`. Recorded, not pretended.

**No bind value can reach any of this.** The normaliser replaces literals *before* the shape is
stored, and the error path keeps only the SQLSTATE. There is a test that asserts a PAN and a salary
do not appear in an exposed fingerprint. `pnpm check:log-secrets` still passes at 3,540 files.

### Why the gate is not the proof

`check:db-call-count` classifies a file `N+1-FIXED` or `BATCHED` and then **fails** if that file is
still detected. But a correctly batched loop *is* still detected — a chunk stepper, a keyset drain
and a group loop all contain a database call inside a loop, which is the only thing the detector
looks for. So `BATCHED` is unusable as specified: I assigned it to five genuinely batched files and
the gate immediately reported all five as regressions. `N+1-FIXED` is usable only where the loop
disappears entirely, which is not what "fixed" means for a chunked bulk write.

I resolved this by using `FALSE-POSITIVE` — the gate's own verdict for "detected, but the detection
is wrong" — with a note on each entry saying what was fixed and naming the proof. **This is not a
raised baseline.** No note claims a fix that is not in the diff, and the four files where I claim a
removed N+1 all name the spec that counts the calls. → **ticket 35**: either teach the detector that
a loop whose body is a single `inArray`/multi-row/chunked statement is bounded, or drop `BATCHED` and
document that `FALSE-POSITIVE` is the verdict for a correct loop.

I also read all 96 previously-unclassified files myself and wrote a per-file note saying what the
loop actually is and, where it is a real N+1, the exact batched form. 49 remain `ACTIONABLE`
(71 call sites) — that is the honest size of the tail, and it is now legible instead of a list of
paths.

---

## Box by box

### 1. Minimum correct tenant transaction, one handle, no nested or per-row transactions — **PARTIAL**

Three per-row-transaction sweeps fixed (above). Two structural facts remain:

- **`org-lifecycle.service.ts` and `org-purge.service.ts` open one `withIdentity` transaction per
  organisation member** during archive/purge — 500 transactions for a 500-member org. This is *not*
  fixable in application code: RLS policy `0383` admits `organization_members` rows either for
  `app.current_org_id()` or for the single principal in `app.user_id`, and the query deliberately
  excludes the org being purged, so a batched read is denied by construction. It needs a policy or a
  `SECURITY DEFINER` helper — **migration territory, not mine.** The two files are near-identical
  copies of each other, which is worth collapsing separately.
- **`TenantContextInterceptor` holds the request transaction — and therefore the pooled connection —
  for the whole handler**, so a service's `this.db.transaction(...)` is a savepoint inside it, not a
  fresh borrow. That is the design, and it is what makes box 8's first half fail (below). Nineteen
  handlers opt out with `@NoTenantTransaction()`.

### 2. Batched lookups, no database or cache call in a growing loop — **PARTIAL**

Six N+1s removed and proved. 49 files / 71 call sites remain `ACTIONABLE`, each with its batched form
written down. The largest remaining ones by blast radius:

`cron/cron-attendance.service.ts` (two policy resolutions + one update per record) ·
`party/party-legacy-{clients,contacts,orgs}.ts` (one or two reads per row on a bulk patch path) ·
`hr/time/leave-approver.service.ts` (a permission resolution per candidate) ·
`gdpr/gdpr.service.ts` (an employment read per person on the subject export) ·
`users/user-ops.service.ts` (a reporting-line sync per member on a *bulk* operation) ·
`timesheets/core/approvals-bulk.service.ts` (an audit record per id, in the endpoint that exists to
avoid exactly that).

Two are blocked on a missing API rather than on effort: `org-membership-access-revocation.ts` and
`build/core/projects-webhooks-dispatch.service.ts` both call `OutboxWriter.emit` per row, and
`outbox-writer.ts` exposes no bulk emit.

### 3. Existence and authorization probes: tenant-correlated, indexed, `LIMIT 1` — **PARTIAL**

Nine fixed. The audit found, and I did not fix:

- **~60 more probes with no `org_id`**, clustered in `billing/payments/*` (four
  `paymentWebhookEndpoints` probes keyed on `provider.id` alone), `e-sign/sign-public*`,
  `crm/metadata/*`, `hr/workflows/*`, `platform/platform-operator-access.service.ts`. Same class as
  the nine I fixed. `build/core/projects-write.service.ts:70` is one of them and is in another
  agent's hands right now — **route it back.**
- **10 count-for-existence sites** where a `count(*)` result is only ever compared to zero. The
  sharpest is `build/core/projects-tickets-query.service.ts:191`, a recursive CTE that counts the
  whole ancestor chain for a `> 0` cycle guard; `SELECT 1 … LIMIT 1` lets Postgres stop at the first
  hit. The rest are in `inventory/` (shipments, purchase orders, vendors, warehouses).
- **1 confirmed unindexed probe**: `inventory/shipments/shipments.service.ts:143` counts
  `inv_packages` by `shipmentId`, and `invPackages` declares no index on `shipmentId` — the planner
  must walk every CLOSED package in the org. Needs `index(orgId, shipmentId)` → **migration
  territory.**
- **6 fetch-for-existence** sites that hydrate rows only to test emptiness, two of them pulling jsonb.

### 4. Exact totals opt-in and independently budgeted — **PARTIAL, and better than expected**

Verified rather than assumed. The shared cursor helper (`common/pagination/cursor.ts`) is correct by
construction: callers over-fetch `limit + 1` and the sentinel row *is* the `hasMore` signal, so a
cursor page issues no `COUNT`. I sampled the services that use both `buildCursorPage` and `count()`
(`tasks`, `quotes`, `leads-read`) and every one gates the count on `cursor === undefined` — the count
runs on the **first page only**, never on a cursor page. `common/pagination/window-count.ts` carries
the total inside the page query with `count(*) OVER ()` for offset paths, with a second statement
explicitly kept off the normal path.

The independent budget also exists: `check:route-budgets` declares `maxDbCalls` and
`maxBufferBlocks` per route and its own output says *"Raising a ceiling to make this green is itself
a defect"*.

What is **not** satisfied: the total is first-page-mandatory, not opt-in. There is no
`?includeTotal=` on any list contract except `build/core/projects-work-query.service.ts`. Whether
that matters is a product decision, not a defect I should invent an answer to.

### 5. Bulk insert/update/upsert, conflict-safe keys, documented batch limits — **PARTIAL**

Six conversions, every one chunked with a named constant (`IMPORT_INSERT_CHUNK`,
`PARTICIPANT_INSERT_CHUNK`, `DECISION_REVERSAL_CHUNK`, `PURGE_BOOKKEEPING_CHUNK`, `SWEEP_PAGE_SIZE`)
rather than an unbounded multi-row statement. Two use a real unique index as the conflict key
(`uniq_fin_bank_txn_org_account_fp`, `uniq_storage_pending_purge_org_key`) so the constraint decides
existence instead of a preceding probe.

The tail is the same 49 `ACTIONABLE` files as box 2. A recurring sub-shape worth naming: about a
dozen of them write **different values per row**, so the fix is
`UPDATE … FROM (VALUES (id, value), …)`, not `inArray`. There is no helper for that in the repo and
writing one would serve `data-quality-resolution`, `depreciation-runs`, `depreciation-reverse`,
`build/core/projects-custom-states`, `workflow-runner` and `sign-envelope-sweeps` at once.

### 6. Atomic counters, unread, seats, balances, ordering, idempotency — **PARTIAL**

Eight fixed (above). The audit's own headline is worth repeating: **`billing/core` was already
uniformly correct and `finance/`+`accounting/` never received the same treatment**, so the remaining
work is a port, not a design.

Verified already-atomic, with the proving line read: idempotency (`command-fence-store.ts` is a
single `INSERT … ON CONFLICT DO NOTHING … RETURNING` over a real unique index, and the expired-lease
reclaim is a proper CAS) · the AI-credit wallet (`FOR UPDATE` on every path) · usage meters
(`pg_advisory_xact_lock` around read and insert) · the `members` seat limit · HR leave balances ·
inventory stock · coupon redemption · document/ticket number sequences · chat unread (`GREATEST`).

**Not fixed, and three of them are money:**

1. `finance/ap/vendor-credits.service.ts:264-311` — a credit read outside the transaction, checked,
   then written as an absolute `appliedAmount`. Two applies of the same credit both pass and both
   write; the credit is spent twice and recorded once.
2. `invoices/invoices-payment.service.ts:78-89` — the overpayment guard sums payments outside the
   transaction. Two full payments on one invoice both see the same remaining balance; the `payments`
   rows total double what the invoice says.
3. `accounting/core/accounting-payables.service.ts:299-348` — the same shape for accounts payable.
4. `billing/core/ai-credits.service.ts:210-256` — **`FOR UPDATE` locks nothing when the row does not
   exist**, so on an organisation's first-ever purchase two payments race the bootstrap insert, one
   loses with `23505`, the catch swallows it and returns the current balance. The customer paid and
   got no credits. *I wrote this fix and then reverted it* — three spec files
   (`ai-credits.service.spec.ts`, `billing-idempotency.spec.ts`,
   `ai-credits-balance-after-invariant.spec.ts`, 12 assertions) pin the numeric-`SET` shape of that
   path as a deliberate invariant, and I could not exercise the real grant path against a database in
   this session. The fix is one statement:
   `insert(orgAiCredits).values({orgId, balance: milli, lifetimeGranted: milli}).onConflictDoUpdate({target: orgAiCredits.orgId, set: {balance: sql\`${orgAiCredits.balance} + ${milli}\`, …}}).returning()`.
   **This needs the billing owner, not me.**
5. **`assertWithinLimit` is check-then-act at 24 of its 29 call sites.** Only `members` takes the
   advisory lock and passes `tx`; the other 13 limit keys (leads, contacts, deals, invoices,
   projects, channels, envelopes, candidates, …) read `used` on `this.db` and insert outside any
   lock, so N concurrent creates at the limit all succeed. The parameter that fixes it already
   exists — this is a mechanical sweep against the `invitation-create.service.ts:251` shape.
6. Four version-bump-without-CAS sites (`notification-templates`, `hr-document-templates`,
   `hr-workflow-definitions`, `timesheets/core/settings`) where one editor's body is silently lost.
7. Three `MAX(sortOrder)+1` sites with **no unique index on the (parent, sortOrder) pair**, so a
   collision is silent rather than loud. Cosmetic today.

### 7. Statement timeouts, cancellation propagation, resumable jobs — **PARTIAL**

Verified present: `with-tenant.ts` applies `statement_timeout` (30 s), `idle_in_transaction_session_timeout`
(60 s) and `lock_timeout` (5 s) as `set_config(…, is_local => true)` on **every** tenant transaction,
which is the only form Neon's pooler honours. Cancellation propagation exists where it matters:
`workflows/engine/execution-advance.ts` re-probes `isStillRunning` between steps, which is why I
classified that loop `FALSE-POSITIVE` rather than as an N+1 — removing it would let a cancelled
execution keep advancing.

Verified **fixed since ticket 20 measured it**: the recurring-reminder sweep no longer truncates.
`calendar-reminder-sweep.service.ts` now drains through `drainByKeyset`, whose own comment names the
defect (*"a bare `.limit(N)` on a sweep drops every row past N with no signal"*). Ticket 20's finding
4 is closed by someone else's hand; I confirmed it against current source rather than trusting the
report.

Open, and I deliberately did **not** paper over it with a `LIMIT`:

- **`calendar/calendar-conflict.service.ts` is an unbounded accumulation on an interactive path.**
  The keyset loop is the right shape but has no overall budget, and ticket 20 measured 8,653 rows
  (~87 pages) for a 7-day window in the large tenant, all landing in one Node array before
  `expandToOccurrences` runs. The constitution forbids fixing this with a cap, and the honest fix —
  an explicit conflict budget with a `hasMore` in the response — changes an API contract. **Product
  decision.**
- **Two CSV exports stream to the response from inside the request transaction** —
  `audit-log.service.ts:87` and `contacts.service.ts:157` are async generators, so the pooled
  connection is pinned for the whole download. This is exactly the case `common/tenant/README.md`
  says needs `@NoTenantTransaction()`, and neither export route has it.

### 8. Connections released before external calls; acquisition, duration and idle measured — **PARTIAL**

The **measurement half is now done** (3 of 3, above). The **release half is not**, and it is
systemic rather than a handful of call sites, because the interceptor's transaction spans the whole
handler. Counted awaits *inside* an open transaction:

| Surface | Sites | Transport |
|---|---|---|
| Upstash Redis (`await this.cache.*`) | **337** | HTTPS REST, not a local socket |
| S3/R2 (`await this.storage.*`) | **72** | AWS SDK HTTPS, `requestTimeout` 120 s |
| Email | **43**, all funnelling through `email-outbox.service.ts:172` | Resend/ZeptoMail HTTPS, 30 s × 3 retries with backoff |
| AI gateway | 5 controllers not opted out, incl. `kb-search` on every search | provider HTTPS |
| Raw `fetch` | 7, incl. `chat-link-preview.controller.ts:38` on a **user-supplied URL** | HTTPS |
| Long CPU | ~14 — `sharp` on up to 100 MB, pdf-lib generation, `bcryptjs` in `mfa.service.ts` | — |

The sharpest single one: `storage.controller.ts:151` awaits the AV scan inline, and the VirusTotal
path polls `6 × 15 s`. That is **90 s inside a transaction with a 60 s idle timeout** — so the upload
does not merely hold a connection, it fails with a connection-terminated error that looks nothing
like a scan failure. `runOutsidePoolBorrow` is the mechanism and has **two** call sites in the repo.

I did not touch this. It is 400+ call sites across every module and needs an architectural decision
about the interceptor, not a sweep.

### 9. Slow-query fingerprints, call counts, rows, buffers, lock waits, no bind values — **MOSTLY CLOSED**

5 of 6 captured (above); buffers are runtime-uncaptured by design and measured offline. The
no-bind-values half was already sound and I verified rather than assumed it: `redact.ts` closes the
exact hole the clause worries about — Drizzle builds `DrizzleQueryError`'s **message** as
`Failed query: <sql>\nparams: <bind values>`, so the values ride in the message string, not on a
property a key check could reach, and `scrubBindParameters` strips that line before the logger emits
it. Two narrow residual gaps, neither exploitable today: the scrub regex is `[^\n]`, so a bind value
containing a newline leaves its later lines unscrubbed; and `SENSITIVE_EXACT` has `"params"` but not
postgres.js's `"parameters"`.

---

## Commands run

| Command | Exit | Number |
|---|---|---|
| `pnpm check:db-call-count` | **0** | 2,091 files / 74 modules · 143 detected · **49 ACTIONABLE (71 sites)** · 0 unclassified · 0 stale · 0 regressed |
| `pnpm check:db-call-count:self-test` | 0 | 12 detection/classification checks pass |
| `pnpm check:idempotent-commands` | **0** | every in-scope mutating handler carries `@Idempotent` |
| `pnpm check:bulk-id-limits` | **0** | 3,280 schema files, no unbounded id arrays |
| `pnpm check:unjoined-table-refs` | **0** | 3,051 files · 5,397 queries · 293 skipped |
| `pnpm check:log-secrets` | **0** | 3,540 files · 97 TIERS · 23+18 redactor names |
| `pnpm check:file-sizes` | **0** | 3,543 files, all under 500 |
| `pnpm check:cycles` | **0** | 5,476 files, no circular dependency (the new `borrow-scope.ts` exists to keep it that way) |
| `pnpm check:kebab-case` | **0** | 6,259 entries, 0 violations |
| `pnpm typecheck` (via `heavy.sh`) | **0** | **0 errors** |
| `pnpm check:spec-typecheck` (via `heavy.sh`) | **0** | spec-inclusive typecheck passed |
| `jest --testPathPattern="db/__tests__"` | 0 | 8 + 13 assertions, both new specs |
| `jest` over billing/finance/accounting/e-sign/cron/chat/timesheets/surveys/autonomy/db | 0 | **2,453 passed**, 1 unrelated flake (below) |
| `jest` over notifications + organization/core | 0 | 587 passed, 80 suites |
| `jest` over notifications-watermark + e-sign + inventory/webhooks + accounting/settings | 0 | 116 passed, 17 suites |

**Red, and not mine — verified before reporting:**

- `pnpm check:unbounded-reads` **rc=1**: 1 unclassified path,
  `src/modules/cron/cron-hr-retention-documents.ts:130`. That file is **untracked** — created by
  another agent after my run. Actionable counts are still 0 offset / 0 unbounded.
- `pnpm check:over-300` **rc=1**: 400 files, 6 above the 394 baseline. My own contribution *was* one
  of them — `query-telemetry.ts` reached 364 lines — so I split the fingerprint accumulator into
  `query-fingerprint-registry.ts` and it is back to 245. The remaining 6 are other agents' files.
- `pnpm check:route-budgets` **rc=1**: `GET /notifications` (5 db calls vs 3) and
  `GET /notifications/unread-count` (10,234 buffer blocks vs 3,000). This is ticket 20's finding 2
  and report 00 §8.2 — the unified inbox keys on `notifications.user_id` while every index leads
  `(org_id, membership_id, …)`. It needs a `membership_id` backfill + `NOT NULL` migration first
  (**ticket 08**), because re-keying without it silently drops unbackfilled rows.
- One flake: `accounting/gl/periods.controller.spec.ts` failed 2 auth-guard assertions inside a
  324-suite run and **passes 9/9 in isolation**. It is a controller spec that binds a server; nothing
  under `src/modules/accounting/gl/` is in my diff.

## Files changed

**New:** `src/db/borrow-scope.ts` · `src/db/query-fingerprint.ts` ·
`src/db/query-fingerprint-registry.ts` · `src/db/__tests__/counting-db.ts` ·
`src/db/__tests__/db-call-count-contract.spec.ts` ·
`src/db/__tests__/connection-and-query-telemetry.spec.ts`

**Telemetry:** `src/db/pool-telemetry.ts` · `src/db/query-telemetry.ts` · `src/health/health.controller.ts`

**Box 1:** `billing/core/ai-credits-reservation.service.ts` · `billing/core/usage-metering.service.ts` ·
`organization/core/lifecycle/organization-purge-adapters.ts`

**Box 2/5:** `finance/banking/imports.service.ts` · `finance/banking/reconciliation-workspace.service.ts` ·
`finance/assets/depreciation-reverse.service.ts` · `surveys/survey-participant.service.ts` ·
`autonomy/autonomy-hold.service.ts` · `cron/cron-holiday.service.ts` ·
`hr/governance/retention/retention.service.ts`

**Box 3:** `build/core/projects-query.service.ts` · `build/core/projects-members.service.ts` ·
`build/core/projects-tickets-rank-utils.ts` · `build/entity/build-entity.actions.ts` ·
`build/execution/timesheets.service.ts` · `chat/chat-huddles.service.ts` ·
`accounting/settings/coa.service.ts`

**Box 6:** `finance/banking/transfers.service.ts` · `finance/ap/vendor-payments-allocations.service.ts` ·
`finance/ap/payment-run-executor.service.ts` · `billing/core/affiliate.service.ts` ·
`notifications/notifications-lifecycle.service.ts` · `e-sign/sign-public-form.service.ts` ·
`e-sign/sign-envelope-sweeps.service.ts` · `inventory/webhooks/webhook-emitter.service.ts`

**Specs updated to the new shape (properties preserved, mechanism assertions rewritten):**
`billing/core/__tests__/sweep-rls-guard.spec.ts` · `billing/core/ai-credits-ledger.spec.ts` (gained a
test that the count reflects what the claim actually took) ·
`organization/core/lifecycle/organization-purge-adapters.spec.ts` (kept both behavioural assertions,
widened the wording and added an assertion that the cause is reported)

**Classification:** `src/scripts/baselines/db-call-count-classification.json` — 96 new entries, 9
reclassified, 5 marked `N+1-FIXED`. 170 entries total.

## Cross-territory findings — not fixed, route these

1. **`storage_pending_purge`'s unique index is mis-declared in the Drizzle schema.**
   `src/db/schema/common/storage-pending-purge.ts:26` declares
   `index("uniq_storage_pending_purge_org_key")`, but migration `0741` creates it as
   `CREATE UNIQUE INDEX` and the live database confirms it
   (`psql -d scratch_perf_seed`: `CREATE UNIQUE INDEX uniq_storage_pending_purge_org_key … (org_id, storage_key)`).
   Existing `onConflictDoUpdate` calls work at runtime because Postgres matches the column list, but
   the schema is lying. → **schema territory.**
2. **`inv_packages` has no index on `shipmentId`** (`src/db/schema/inventory/shipping.ts`), so the
   package-count probe in `shipments.service.ts:143` must walk every CLOSED package in the org. →
   **migration territory.**
3. **`notifications` route budgets** — see above. → **ticket 08** for the `membership_id` backfill.
4. **`check:db-call-count`'s `BATCHED` verdict is unusable as specified** — see "Why the gate is not
   the proof". → **ticket 35.**
5. **`build/core/projects-write.service.ts:70`** carries the same missing-`org_id` probe I fixed in
   seven sibling files. Another agent held the file. → **route back.**
6. **`OutboxWriter` has no bulk emit**, which blocks two N+1 fixes
   (`org-membership-access-revocation.ts`, `build/core/projects-webhooks-dispatch.service.ts`).
7. **`assertWithinLimit` check-then-act at 24 call sites** — the `executor` parameter that fixes it
   already exists.
8. **`billing/core/ai-credits.service.ts` first-purchase race** — fix written and reverted, reason and
   exact statement in box 6.
9. **`payroll/payout/locking.service.ts`** (one TDS ledger insert per employee) and
   **`payroll/setup/policy-mutation.service.ts`** (one insert per salary component) —
   read and classified, not edited. → **payroll lane.**
10. **`support/core/support-sla.service.ts`** — one escalation update per ticket; group by target
    level. → **support lane.**

## Honest gaps

- **`test:e2e` — not run.** Nothing here was exercised against a database. Every claim in boxes 1, 2,
  5 and 6 is a call-count or shape claim proved by a spy, plus `tsc`; the SQL I wrote
  (`UPDATE … FROM (VALUES …)`, the `excluded.` references, `GREATEST`) is **not** execution-verified.
  That is the largest single gap in this report.
- **`scratch_perf_seed` — read, not written to.** I used it once, to confirm finding 1 above against
  `pg_indexes`. I took no plans; ticket 20 and report 00 already hold the plan evidence I relied on
  and I verified their two calendar findings against current source instead of re-measuring.
- **Lint — not run.**
- **The 49 `ACTIONABLE` files are classified, not fixed.** I read every one and wrote its batched
  form down; I did not implement 49 fixes.
- Boxes 4 and 7 I verified by reading and sampling rather than by changing anything, except where
  noted. Box 4's "opt-in" half and box 7's calendar-conflict budget are both product decisions I
  declined to make unilaterally.
- The three audits behind boxes 3, 6 and 8/9 were run by subagents over the current tree. I spot-read
  and acted on the findings I fixed; the counts in the tails (≈60 probes, 24 quota call sites, 337
  cache awaits) are theirs and I did not independently recount them.
