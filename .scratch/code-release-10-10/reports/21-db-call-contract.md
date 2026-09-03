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

---

# Second pass — 2026-09-02

**Boxes: 3 closed / 6 partial** (was 2 / 7). Box 6 closes: every money path named in
the first pass is now atomic, and the four races it left open are fixed.

The first pass's own headline gap was: *"the SQL I wrote (`UPDATE … FROM (VALUES …)`, the
`excluded.` references, `GREATEST`) is **not** execution-verified. That is the largest single
gap in this report."* That gap is closed. Three probes now run every one of those statements
against `scratch_t21b` (a writable copy of `scratch_perf_seed`, 945 tables, 96 MB):

| Probe | Covers | Result |
|---|---|---|
| `.t21-sql-probe.ts` | watermark `GREATEST` in `ON CONFLICT`, `excluded.` in the purge upsert, the allocations `UPDATE … FROM (VALUES …)`, the bank-transfer atomic decrement, the payment-run `round()`+`CASE`, the usage-meter advisory lock, the wallet increment, affiliate counters, the chunked import upsert, six `bulkUpdateFromValues` shapes, the preference-rule row-constructor IN, and the AI-credit bootstrap race in both shapes | **exit 0, 21/21 PASS** |
| `.t21c-money-probe.ts` | the three tier-1 money races, each run twice concurrently | **exit 0, 6/6 PASS** |
| `.t21d-bulk-probe.ts` | the four real `bulkUpdateFromValues` call shapes: `numeric` + `acc_asset_status`, `uuid` + `workflow_execution_status` + `jsonb` with `extraWhere`, and the schema-qualified `build.project_statuses` with the reserved word `"order"` | **exit 0, 7/7 PASS** |

34 assertions. Four defects the probes found that `tsc` could not: three wrong fixture column
names and one enum label — all in the probe, none in the shipped SQL, which is the point:
the shipped SQL had never been parsed by Postgres before this.

## The AI-credit money race — settled, and why

The first pass wrote this fix and **reverted it**, because three spec files pinned the
numeric-`SET` shape and it could not exercise the grant path against a database. Both failure
modes were live: leaving a money race open because a spec was inconvenient, and quietly
rewriting a spec to make a change pass. The evidence settles it in one direction.

**Measured, not argued.** `.t21-sql-probe.ts` section 13 races two 5,000-milli first purchases
against an organisation with no wallet row, on two separate connections:

```
AI credits (OLD shape): concurrent first purchase loses money :: balance=5000 (both paid 5000 => 10000 expected) rejected=1
AI credits (UPSERT):    concurrent first purchase credits both :: balance=10000 rejected=0
AI credits (UPSERT):    creates then accumulates               :: first=7000 second=10000 lifetime=10000
```

The old shape loses half the money. `SELECT … FOR UPDATE` acquires no lock when the row does
not exist, so both payments see no wallet, both insert, the loser dies `23505`, and the catch
returns the current balance — the customer is charged and no ledger row records the purchase.
All three grant paths (`grantPlanCredits`, `purchaseCreditsDirectly`, the webhook grant) now
share one `INSERT … ON CONFLICT DO UPDATE … RETURNING` whose balance moves in SQL, and
`balanceAfter` is read back from what the database committed rather than recomputed.

**The specs.** Twelve assertions across three files. Nine were arithmetic invariants
(`balanceAfter = prev + amount`, milli↔credit conversion, the 23505 backstop not
double-crediting) — every one is preserved, only the mock plumbing changed, because
`insert(...).values(...)` now has to be both awaitable (the ledger insert) and chainable (the
wallet upsert). Two pinned the **defective mechanism** itself:

- *"SELECT FOR UPDATE (reserve wallet lock) happens strictly before UPDATE balance (spend)"* —
  the lock it pinned is the defect. Replaced with `expect(callOrder).not.toContain("SELECT_FOR_UPDATE")`
  plus assertions on the upsert, and a comment saying exactly what was wrong with the old ordering.
- *"starting from zero balance: newBalance === creditsAddedMilli"* — this asserted the
  JS-computed literal. Replaced with an assertion that the insert leg grants the whole pack and
  the conflict leg is an SQL expression.

One assertion was **added** so the new shape is pinned as tightly as the old one was:
`expect(is(captured.conflictSetBalance, SQL)).toBe(true)` — a number there means the balance
was read, added to in JavaScript and written back, which is the shape that lets a concurrent
grant be erased.

**Proof the specs still bite.** Mutating `balance: sql\`${orgAiCredits.balance} + ${amountMilli}\``
to `balance: amountMilli` (a JS literal — the defect class) and re-running:

```
● ...reserve-before-spend ordering › the wallet credit takes no SELECT FOR UPDATE
● ...balanceAfter invariant › the wallet credit is an upsert whose balance moves in SQL
Tests: 2 failed, 25 passed
```

Both new assertions fail. The mutation was reverted immediately; `modules/billing` is
42 suites / 516 tests green.

## The three tier-1 money races

| File | The race | The fix, and its executed proof |
|---|---|---|
| `finance/ap/vendor-credits.service.ts` | credit read outside the transaction, checked, then written as an absolute `appliedAmount` — two applies both passed and both wrote, so the credit was spent twice and recorded once | sufficiency test moved into the `WHERE` against the row the database is already locking; zero affected rows is a `ConflictException`. Two concurrent full applies: **exactly one lands, `applied_amount` = 1,000 of 1,000** |
| `invoices/invoices-payment.service.ts` | the overpayment guard summed payments outside the transaction, so two full payments both saw the same remaining balance and the `payments` rows totalled double the invoice | invoice row locked `FOR UPDATE`, the sum re-asserted under the lock. Two concurrent 250 payments on a 250 invoice: **one paid, one refused, `sum(payments)` = 250** |
| `accounting/core/accounting-payables.service.ts` | same shape for accounts payable — `amount_paid` is a projection of `sum(vendor_payments.amount)` and under READ COMMITTED a concurrent insert is invisible to that sum | bill row locked `FOR UPDATE`, sufficiency re-asserted against it. Two concurrent 100 payments on a 100 bill: **one paid, one refused, `amount_paid` = 100 = `sum(vendor_payments)`** |

The `fin_credit_note_status` enum cast in the vendor-credit `CASE` is exactly the kind of thing
`tsc` cannot check: `vendor_credits.status` is that enum while `purchase_bills.status` is bare
`text`, so one branch needs the cast and the other must not have it. Verified against
`pg_type`/`information_schema` and then executed.

## The bulk-update helper the first pass said was missing

`src/common/db/bulk-update.ts` — one `UPDATE … FROM (VALUES …)` for a set of rows that each
carry a *different* value, which is the shape `inArray` cannot serve. Chunked under
`BULK_UPDATE_CHUNK` (500). Three deliberate properties:

- **The tenant predicate is not optional.** The join key is a surrogate id, so `org_id` is in
  the `WHERE` unconditionally. Proved: the same statement with another tenant's `orgId`
  updates 0 rows.
- **A repeated key is refused before it reaches Postgres.** A duplicate joins the target row
  twice and Postgres applies one arbitrary row while silently discarding the rest — a
  last-write-wins that looks like success. `projects-custom-states` gained the matching
  request-level guard, and the reorder spec now asserts it.
- **`extraWhere` carries the caller's compare-and-set**, which a per-row update would otherwise
  lose. Proved on `workflow_executions`: an execution a concurrent runner already claimed is
  skipped, its context untouched.

Converted: `depreciation-runs`, `depreciation-reverse`, `projects-custom-states` (reorder) and
`workflow-runner` (stuck-execution release).

## Specs: four suites pinned the old mechanism

Two were pure mock gaps — the double lacked `.for`, `.returning` or `.execute` and blew up on a
`TypeError`, which says nothing about behaviour. Two were real rewrites, both replacing a
mechanism assertion with a stronger one:

- `retry-dlq-bounded-history.spec.ts` — the release moved from one statement per execution to
  one for the batch, so the values ride as bind parameters rather than in `.set({...})`. The
  mock now decodes the statement through `PgDialect.sqlToQuery` and feeds the **same**
  `allSetCalls` array, so every existing assertion (including *"does NOT set timed_out"*) reads
  what the runner actually wrote, by either mechanism. Added: the whole batch is **one**
  statement.
- `projects-custom-states-bulk-reorder.spec.ts` — two tests asserted `db.transaction` was
  called once. The reorder is now a single statement, which is its own transaction, so the
  atomicity those tests were really about is *stronger*. Replaced with
  `expect(store.statements).toBe(1)` and an exact assertion on the returned items, plus a new
  test that a repeated `stateId` is refused before any statement runs.

## The spec-typecheck defect (routed in mid-flight)

`pnpm check:spec-typecheck` exited 2 with two `TS2554`s at
`hr/config/hr-config-tenant-isolation.spec.ts:136` and `:146`:
`HrNotificationPreferencesService.get` gained a second parameter and the spec still called it
with one. **Decided deliberately, not made to match:** `notification_preferences` is keyed on
`(org_id, user_id)`, so without `org_id` a member of two organisations reads whichever row the
planner returns first. The signature is right; the spec was updated **and strengthened** —
both tests now assert the org id appears in the predicate, so dropping it again fails the spec
rather than passing silently. `pnpm check:spec-typecheck` **rc=0**.

## Commands run — second pass

| Command | Exit | Number |
|---|---|---|
| `.t21-sql-probe.ts` against `scratch_t21b` | **0** | 21/21 PASS |
| `.t21c-money-probe.ts` against `scratch_t21b` | **0** | 6/6 PASS |
| `.t21d-bulk-probe.ts` against `scratch_t21b` | **0** | 7/7 PASS |
| `pnpm typecheck` (heavy.sh) | **0** | 0 errors, run twice |
| `pnpm check:spec-typecheck` | **0** | passed (was rc=2, 2 errors) |
| `jest --testPathPattern="modules/(hr|finance|accounting|invoices|notifications|workflows|chat|build|storage|billing|timesheets|support)"` | 0 | **4,567 passed**, 655 suites (was 4 suites / 7 tests red) |
| `jest --testPathPattern="modules/billing"` | 0 | 516 passed, 42 suites |
| `jest --testPathPattern="modules/(chat|finance|billing)"` | 0 | 1,210 passed, 172 suites |
| mutation: JS literal for the SQL increment, then the two ai-credit specs | 1 | **2 failed** (both new assertions), reverted |
| `pnpm check:db-call-count` | 1 | ACTIONABLE **44** files (was 49); 3 stale + 1 unclassified remain, none mine — see below |
| `pnpm check:dead-code` · `file-sizes` · `cycles` · `kebab-case` · `unjoined-table-refs` · `transaction-callbacks` · `fire-and-forget` · `bulk-id-limits` · `log-secrets` · `mock-surface` · `scope-application` | **0** | all green |
| `pnpm check:tenant-isolation` | 1 | 1 missing negative test, `organization/setup/org-setup-completed-consumer.service.ts` — **not my territory** |
| `pnpm check:tenant-relationships` | 1 | hundreds of composite-tenant-FK findings repo-wide — schema/migration territory, pre-existing |

`pnpm lint` — **not run.** `pnpm test:e2e` — **not run.**

## Routed to me: `GET /notifications/events` shares one 50-slot bucket deployment-wide

Confirmed by reading, and it is worse than a capacity shortage.

- `AdmissionGuard` is the **third** global `APP_GUARD` (`app.module.ts:207`), after
  `RouteClassifierGuard` and `JwtAuthGuard`. `JwtAuthGuard` skips a `@Public()` route, so
  `req.user` is undefined when `AdmissionGuard` runs and `admission.guard.ts:43` resolves
  `orgId = "__public__"`.
- `notifications` is not in `RESERVED_ROUTES` and the handler carries no `@UseWorkClass`, so
  the class is `ordinary-write` — **sheddable**, which is the only branch that applies
  `orgMaxConcurrent` (`admission.service.ts:39-41`). Default 50, and `admission.config.spec.ts`
  asserts it stays below `maxConcurrent`.
- `attachAdmissionSlot` releases on the response's `close`/`finish`, so an SSE connection holds
  its slot for the whole stream.

So 50 concurrent listeners across **all** organisations saturate the bucket and the 51st gets
503 — and the same bucket serves every other genuinely public request, so public traffic and
notification streams starve each other in both directions.

**The org is resolvable, and that is the actual bug.** The route is `@Public()` only because it
authenticates by a one-shot stream token rather than the session: the client calls
`POST /notifications/events/token` (which *is* `@Universal()`), and the handler reads
`Authorization: Bearer <token>` and `consumeToken(token)` returns `{ userId, orgId }`. The
frontend uses `fetch` (`features/notifications/use-notification-events.ts`), not the browser's
`EventSource`, so it can and does set the header. The stream has a real organisation; the guard
simply has no way to learn it before the handler runs — and it cannot call `consumeToken`,
which deletes the token.

**Why each obvious fix is wrong, checked rather than assumed:**

- *Raise the cap* — treats a bucketing bug as a shortage, and raises the per-org ceiling for
  every real organisation at the same time.
- *Exempt the route* — removes the only backpressure on the endpoint that holds connections
  longest.
- *Re-classify the work class* — a `ReservedClass` **does** bypass the per-org cap
  (`isReserved` short-circuits at `admission.service.ts:31`, before the org check), so it would
  appear to work. It also bypasses the shedding threshold, which would admit notification
  streams ahead of authentication under load — wrong for a stream. And the semantically correct
  class, `non-mandatory-notification`, is sheddable and therefore still hits the `__public__`
  cap. Re-classification alone does not fix this.
- *A timeout or reaper* — rejected upstream and correctly: the stream legitimately outlives
  `maxExecutionMs`.

**Recommended fix — needs `src/common/admission/**`, which I do not own, so it is reported, not
made.** Give `AdmissionGuard` an org resolver a route can declare, so a route that authenticates
by token can name its tenant before the handler runs: either an optional
`@AdmissionOrg((req) => string | undefined)` metadata, or `AdmissionGuard` reading a
`req._admissionOrgHint` set by a route-local guard that **peeks** the stream token without
consuming it. `NotificationEventService` would gain a non-consuming `peekToken`; that is one
method in my territory and I have not added it, because an unused export is a speculative
abstraction until the admission side exists to call it. With the hint in place, 50 concurrent
streams *per organisation* is a sane cap and the `__public__` bucket goes back to serving only
genuinely tenant-less traffic.

## Still open, honestly

- **Box 3 is bigger than the first pass thought.** A scan of the eleven modules in this
  territory finds **248 where-clauses across 106 files** with no `org_id` (down from 260 before
  this pass). "~60" was a sample. The scan is not a defect list — many are inside an
  already-scoped join — but the read-then-write pair inside it is a real and repeated shape.
- **Box 6's non-money remainder**: `assertWithinLimit` check-then-act at 24 of 29 call sites,
  4 version-bump-without-CAS sites, 3 `MAX(sortOrder)+1` sites.
- **Boxes 4 and 7** are unchanged and are product decisions (opt-in totals; the
  calendar-conflict budget). **Boxes 1 and 8** are unchanged and are the
  `TenantContextInterceptor` architectural question.
- **`check:db-call-count` rc=1** on 3 stale verdicts and 1 unclassified. I reclassified the five
  that were mine to `N+1-FIXED` with the proof named. Of the three left,
  `/access/access-permission.resolver.ts` and `/cron/cron-hr-retention-documents.ts` belong to
  other agents. `/hr/global/compliance-requirements.service.ts` **is** in my territory and I
  deliberately did not touch it: the file is unchanged since well before this ticket and has no
  DB call inside any loop (I read it), so the detector losing sight of it is a possible detector
  regression, not a fix — and `src/scripts/check-*.mjs` is not mine to investigate. → **ticket 35.**
- **`test:e2e` and `lint` — not run.**

---

# Third pass — 2026-09-03

Boxes: **6 of 9 closed, 3 partial** (was 3 of 9). Boxes 1, 4, 7 and 8 close as **recorded decisions** —
the decision and its consequences are in the ticket; no code was guessed at for any of them.

## The two defects worth reading

### `leave-approver` ran up to 100 queries per leave request that could never return a row

`LeaveApproverService.resolve` looped over candidate approvers and, for a `team` scope, asked the
database whether the candidate's scope covered the subject:

```
.where(and(
  eq(organizationMembers.orgId, orgId),
  eq(organizationMembers.userId, subjectUserId),      // <- subject
  eq(organizationMembers.status, "ACTIVE"),
  applyScope(scope, orgId, candidateId, { ownerColumn: organizationMembers.userId }),
))
```

`applyScope` was handed **no team column**, so its `team` branch falls through to
`eq(cols.ownerColumn, userId)` — `member.user_id = candidate`. The same WHERE already pins
`member.user_id = subject`. Contradictory for every candidate, and the loop `continue`s on the only
case where they are equal. So:

- a `team`-scoped approver could **never** be selected — the feature did not work;
- and the product paid one guaranteed-empty round trip per candidate (bounded at
  `APPROVER_CANDIDATE_LIMIT = 100`) to learn that.

Fixed by deciding it in memory, which says exactly the same thing. **What `team` should mean here is
left as a product question** and written into the ticket: `EmploymentFacts` already carries
`departmentId` and `managerUserId` and is already batched at that point, so implementing it costs no
extra query — but choosing between "reports to me" and "shares my department" widens who may approve
leave, and that is not an engineering call.

The spec that covered this asserted `applyScope` was called with `"team"` and that a **mocked** third
`select` returning `[{ id: 11 }]` decided the outcome. That row cannot exist. The assertion pinned the
defective mechanism, not an invariant, so it was replaced by two that assert the candidate scan issues
no per-candidate `select`, with a comment in the spec saying why.

### `check:db-call-count` has been red at HEAD, and the detector is why

The gate reported **10 STALE VERDICTs against a ratchet of 2** before this pass. Cause: commit
`149ae939` and this ticket's own earlier passes batched loops and did not reclassify them.

But reclassifying only got it to 5, and the residual is a detector defect. `check-db-call-count.mjs`
tests its DB-call patterns **one line at a time**. This repository's prettier wrapping puts
`await this.db` on one line and `.select(` / `.update(` on the next, so the pattern
`/\b(?:this\.)?db\s*\.\s*(?:select|…)\s*\(/` never matches. Measured with the detector's own pattern
list, over its own corpus and exclusions:

| Matching | Files detected |
|---|---|
| line-scoped (today) | **397** |
| 30-line window joined and whitespace-collapsed | **566** |
| files the gate cannot currently see | **169** |

**So `ACTIONABLE: 40` is a floor, not a population.** Routed to whoever owns `src/scripts/**`: join the
loop window before matching (and expect the false-positive rate to move, which is a tuning call, not
mine). Three files stay `ACTIONABLE` with corrected notes because their residual is real and no verdict
in the vocabulary is both true and green:

| File | Residual | Why it cannot be relabelled |
|---|---|---|
| `hr/core/hr-effective-change-applier` | `applyOne` per change | writes a different table per change type |
| `hr/time/leave-approver` | one `resolveUserPermissions` per candidate | needs a batched scope resolver on `AccessService` — **access territory**; `membersWithPermission` returns `{userId, membershipId}` and drops the scope the loop is asking for |
| `timesheets/core/approvals-bulk` | `approveSinglePeriod` per period | one rejected period may not roll back the rest |

## What else changed

| Box | Change |
|---|---|
| 2 | `HrAuditService.logMany` — one membership resolution + one multi-row INSERT chunked under `HR_AUDIT_LOG_CHUNK`; the effective-dated applier issued one of each per due change |
| 2 | `ApprovalsService.activeDelegationsToActor` — one indexed multi-key read over `user_delegations` for a page of approvers; `bulkReject` probed per candidate. `hasActiveDelegation` deleted: the single-period path asks the batch for one id, so there is one query shape instead of two |
| 2+3+5 | `module-checklist.syncItemMetadataFromSeed` — one UPDATE per stale item **with no tenant predicate**, on a path that runs for every module on every checklist read; now one `bulkUpdateFromValues` per organisation |
| 5 | `projects-write.updateProject` reassignment — one `bulkUpdateFromValues` instead of one UPDATE per target assignee |
| 5 | `src/common/db/bulk-update.spec.ts` — the helper's **first** spec. Four properties nothing was checking |
| 3 | `hr-document-templates.setDefault` / `.updateVersion`, `hr-interviewers.cancelBookingLink`, `projects-ticket-checklists.updateChecklistItem` / `.deleteChecklistItem` — read-then-write pairs given their tenant predicate |

**Not converted, deliberately.** `accounting/gl/recurring-journals` and `finance/ap/recurring-bills`
each spawn a document per template and then advance that template's dates. The obvious bulk conversion
(collect the advances, one `UPDATE … FROM (VALUES …)` after the loop) widens the crash window from one
template to up to 1,000, and every template whose document already spawned would spawn a **duplicate**
on the next run. The right fix is one transaction per template covering spawn *and* advance — the
opposite of a bulk write. Recorded, not done.

## Commands run — third pass

| Command | Exit | Number |
|---|---|---|
| `pnpm typecheck` (backend, twice: after the batching commit and after the box-3 commit) | **0**, **0** | 0 errors |
| `pnpm check:spec-typecheck` | **0** | — |
| `jest --runInBand --testPathPattern="(leave-approver\|hr-audit\|approvals\|effective-change)"` | 0 | 9 suites / 37 tests passed |
| `jest --runInBand --testPathPattern="common/db/bulk-update"` | 0 | 5 passed |
| `jest --runInBand --testPathPattern="projects-write-reassign"` | 0 | 2 passed |
| `jest --runInBand --testPathPattern="(projects-ticket-checklists-tenant-write\|hr-interviewers-tenant-write)"` | 0 | 3 passed |
| `jest --runInBand --testPathPattern="hr-document-templates-tenant-write"` | 0 | 2 passed |
| `jest --runInBand --testPathPattern="module-checklist-seed-sync"` | 0 | 3 passed |
| `node src/scripts/check-db-call-count.mjs` | **1** | ACTIONABLE 44 -> **40**; stale verdicts 10 -> **5** vs a ratchet of 2 |
| `node src/scripts/check-db-call-count.mjs --self-test` | 0 | — |

**Bite proof.** `projects-write-reassign.spec.ts` was run against a hermetic
`git archive HEAD src test` tree in the scratchpad with only the spec copied in: **both assertions
fail there** (the grouped shape issues zero `execute()` calls and two `tx.update(tickets)` calls) and
pass against the fix. Tree deleted.

**No database was touched this pass.** Nothing here needed one: every change is a statement-shape
change provable by `sqlToQuery` on the real WHERE, and the two SQL-string shapes involved
(`bulkUpdateFromValues` against a schema-qualified table, and against a `text`/`boolean`/`integer`
column set) were already executed against a database by the second pass. Said plainly rather than
implied: `scratch_perf_seed` was **not** used.

## Cross-territory findings — route these

1. **`check-db-call-count.mjs` is line-scoped and misses 169 files** (`src/scripts/**`). Numbers above.
   Until it is fixed, the gate's ACTIONABLE count understates the work and its stale-verdict ratchet of
   2 is unreachable.
2. **`AccessService` has no batched scope resolver** (`src/modules/access/**`). `membersWithPermission`
   returns `{userId, membershipId}`; every caller that needs the *scope* for a set of members has to
   call `resolveUserPermissions` once per member. `leave-approver` is the instance measured here; a
   `resolveScopesForUsers(orgId, userIds, permissionKey)` would close it and serve any other caller with
   the same shape.
3. **`calendar/calendar-conflict.service.ts`** — unbounded accumulation on an interactive path. Product
   decision, written up under box 7.
4. **RLS policy `0383`** admits `organization_members` rows only for the principal in `app.user_id`,
   which forces `org-lifecycle` / `org-purge` into one transaction per member. Migration territory.
5. **`storage.controller.ts` upload holds a transaction across a 90 s poll.** `VirustotalAvScanner`
   polls `MAX_POLLS = 6` × `POLL_INTERVAL_MS = 15_000`; `with-tenant.ts` sets
   `idle_in_transaction_session_timeout` to 60 s. The arithmetic says the session is killed mid-upload.
   The file is in this ticket's territory but the fix is not a one-liner — `@NoTenantTransaction()` means
   every `this.db` call in the handler needs its own `runInTenantTransaction`, and a wrong wrap is an RLS
   42501 on the upload path. Named here with the exact constants rather than half-done.

## Honest gaps

- `check:db-call-count` is **still red** (exit 1): 5 stale verdicts against a ratchet of 2. Three of the
  five are truthful `ACTIONABLE` entries the detector cannot see; two are the pre-existing pair the
  ratchet was set for. It cannot be made green without either fixing the detector or writing a false
  verdict.
- `check:unbounded-reads` is **red**, and it is **not this ticket's**: the failures are one stale entry
  and one unclassified path from another agent's in-flight move of
  `settings/settings-custom-fields.service.ts` to `crm/custom-fields/`.
- The repo-wide jest run over the eleven modules was **not run** this pass; the focused runs above were.
- Lint was **not run**. `next build` was **not run**. No seeded e2e was **not run**.
- The 79 remaining no-`org_id` write sites in this territory are a **candidate list**. Five were verified
  and fixed; the rest were classified by eye from a scan, not read one by one.
