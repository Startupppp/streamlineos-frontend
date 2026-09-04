# Findings — ticket 35 / PRD-C186, C187, C188

Backend `45f8a2e99494483526e357e27f18c76961ebf266` (generation 1) and
`dcd5a20717dc6d5a6eb2ff40aa54ae58abe2bc8a` (generation 2, F-11 and F-12). Every finding below was
**reproduced by a command whose output is in `runs/`**; none is inferred from reading alone.

Findings are not deleted when they are fixed. F-3 and F-11 carry a **FIXED** header naming the
commit and the run that re-measured them; their original evidence stays, because the record of a
gate that used to report green over nothing is the reason the fix is trustworthy.

Severity key: **P1** = a release blocker — a privacy obligation cannot be met, or the tool that
proves it cannot run. **P2** = real defect, bounded impact or a gate that reports green over
nothing.

---

## F-1 · P1 · `drill:erasure` aborts on the first audited subject and abandons 219 tables

`src/scripts/drill-erasure.mjs:269-283`

The drill iterates every table with a non-CASCADE FK to `users.id` and issues a `DELETE`. That set
includes `public.audit_logs.user_id`. `audit_logs` carries the trigger
`audit_logs_append_only` (`BEFORE DELETE OR UPDATE … EXECUTE FUNCTION
app.prevent_audit_log_mutation()`), so the `DELETE` raises SQLSTATE **42501**. The `catch` at
`:279-281` treats anything other than `42P01`/`42703` as a printed `WARNING` and **continues
looping inside a transaction Postgres has already aborted**, so every remaining table fails
`25P02` and is silently skipped. Step 3 — the re-query that is the drill's only proof of absence —
never runs. Exit 1.

**Controlled experiment, one variable, `runs/15` vs `runs/16`:**

| | subject | `audit_logs` rows | result |
|---|---|---|---|
| Control A (`runs/15`) | `drill-user-nonowner-a` | **0** | `RESULT: PASS … 0 residual row(s)`, exit **0** |
| Control B (`runs/16`) | *the same subject* | **1** | 219 `WARNING` lines, exit **1** |

The only change between A and B was inserting one `audit_logs` row. **`drill:erasure` can only
pass for a subject who has never been audited — that is, never for a real user.**

RB-10 §6 Step 3 lists `RESULT: PASS … 0 residual row(s) in simulation` as a release pass
criterion. It cannot be met as written.

*Fix:* exclude the `KEEP-FOREVER` audit tables (`audit_logs`, `hr_audit_logs`,
`notification_audit_logs`) from the delete set — they are already classified `KEEP-FOREVER` in
`check-retention-coverage.mjs`'s own matrix — and make any unexpected SQLSTATE abort loudly
instead of degrading to `WARNING`. Continuing to loop inside an aborted transaction is the part
that turns one failure into 219 invisible ones.

## F-2 · P1 · `purge:user` fails before deleting a single row, for every org owner

`src/scripts/purge-user.mjs:277-278`

```js
// organizations.owner_membership_id -> organization_members is a cycle; break it first.
await tx`UPDATE organizations SET owner_membership_id = NULL WHERE id = ANY(${orgIds})`;
```

`organizations.owner_membership_id` is `integer NOT NULL` in the current schema (verified against
`information_schema.columns` on `scratch_head_1010`). The cycle-breaking `UPDATE` therefore always
raises `23502`.

`runs/11-purge-user-dryrun.txt`, dry run, exit 1:

```
Failed: null value in column "owner_membership_id" of relation "organizations"
        violates not-null constraint
```

The failure happens before the first `DELETE`, so **no owned organisation can be purged by this
tool at all**. The script is the documented remedy in its own `--help` text and is the only
whole-user purge path outside the org saga.

*Fix:* defer the constraint (it is the same circular owner-membership FK noted elsewhere in this
repo) or delete `organization_members` before nulling, rather than nulling first.

## F-3 · P2 · `check:retention-coverage` passes green having measured **zero** tables

> **FIXED at `dcd5a20717dc6d5a6eb2ff40aa54ae58abe2bc8a`.** The divisor is now `1048576.0`
> (numeric, not integer) and two corpus floors — `MIN_TABLES_SCANNED = 200` and
> `MIN_HIGH_GROWTH_TABLES = 1` — make an unmeasured corpus exit **2 (INCONCLUSIVE)** rather than
> 0, the same shape as `MIN_SEALS`/`MIN_SEALED_FILES` in `check-evidence-seal.mjs`. The gate no
> longer calls `dotenv.config()`, which used to substitute the `.env` connection string when
> `DATABASE_URL` was unset (making the documented exit-2 path unreachable) and to write a banner
> ahead of the JSON report. Re-measured in `runs/23`: 41 tables cleared 1 MB where generation 1
> saw 0. Pinned by `src/scripts/retention-coverage-gate.db.spec.ts` (`runs/25`, 9 tests) and by
> four new `--self-test` checks (`runs/24`). Bite-proved in `runs/28`: putting the single missing
> decimal point back turns the self-test red and fails 2 of the 9 db-spec tests.
>
> The fix was **not** a lower `--threshold-mb`. Under integer division every sub-1 MB threshold
> selects zero rows, so lowering the bar could not have reached one extra table; it would only
> have hidden the arithmetic. The original evidence below is kept verbatim.

`src/scripts/check-retention-coverage.mjs:291` and `:342-351`

```sql
pg_total_relation_size(c.oid) / 1048576 AS total_mb
```

`pg_total_relation_size` returns `bigint`, so this is **integer division**. Every table under 1 MB
reports `total_mb = 0`, and `--threshold-mb` values below 1 can never select anything.

Measured on `scratch_head_1010`: `audit_logs` is 196 608 bytes = 0.1875 MB, reported as `0`.
Across all 944 public tables, `count(*) filter (where pg_total_relation_size(c.oid)/1048576 >= 1)`
= **0**.

The gate exits 1 only when `uncovered.length > 0` (`:342`) and otherwise exits 0 (`:351`). There is
no floor on how many tables were measured, so an empty or small database is an automatic pass:

- `runs/05` — default threshold: `{"highGrowthTables": 0, "covered": 0, "keepForever": 0,
  "uncovered": 0}`, exit **0**.
- `runs/05b` — `--threshold-mb=0.001`: **identical**, `highGrowthTables: 0`, exit **0**. Lowering
  the threshold a thousand-fold changes nothing, which is the integer-division bug in one line.

The 22-check `--self-test` (`runs/06`) passes, but it only validates the hard-coded
`RETENTION_MATRIX` *literal* — it never touches the database, so it cannot catch this.

*Fix:* `pg_total_relation_size(c.oid) / 1048576.0`, and add an anti-vacuity floor — refuse to exit
0 when `highGrowthTables === 0`, exactly as `check-evidence-seal.mjs` refuses to pass on zero
seals (`MIN_SEALS`, `MIN_SEALED_FILES`).

## F-4 · P2 · `compliance-drill-e2e` reports `PASS (13 passed, 0 failed)` without erasing anything

`src/scripts/compliance-drill-e2e.mjs:352-356`

```js
if (isOwner) {
  pass("Subject is org owner — erasure correctly refused (transfer ownership first); dry-run skipped for owner");
  return;
}
```

The skip is counted as a **pass** and Phase 3 returns. `runs/14` shows exactly this:

```
=== Phase 3 — Erasure dry-run (rolled-back transaction) ===
  PASS  Subject is org owner — erasure correctly refused …; dry-run skipped for owner
…
=== RESULT: PASS (13 passed, 0 failed) ===
```

This is not a rare path: `compliance-drill.mjs:104-112` — the drill that manufactures the
synthetic subject in the first place — always inserts it with `role = 'OWNER', is_owner = true`.
**The e2e drill's own subject generator guarantees its erasure phase is skipped.**

And when the subject *is* a non-owner, Phase 3 deletes from exactly one table
(`DELETE FROM organization_members`, `:366`) and asserts a residual count on that same one table.
The `compliance-drill-e2e` header advertises "re-query to prove 0 residual rows"; the reach is 1 of
the 220 tables that reference `users.id`.

*Fix:* report the owner branch as `SKIP`, not `PASS`, and fail the run if the erasure phase was
never exercised; provision a non-owner subject in the drill so the phase actually runs.

## F-5 · P2 · Object-store purge runs after the transaction commits, with no durable manifest

`src/modules/gdpr/gdpr-subject-erasure.service.ts:155-213` then `:218`

The manifest is built pre-transaction and held **in memory**. The database transaction commits at
`:213`; `purgeFromManifest` is called at `:218`, outside it. A crash, deploy or pod eviction in
that window leaves the database saying the subject is erased while every object is still in the
bucket **and the only list of their keys is gone** — the `*_key` columns that would let you rebuild
it have just been anonymised, which is the exact hazard the code comments at `:123-125` describe
for the ordering, but the durability half is not addressed.

*Fix:* persist the manifest (an outbox row, or `gdpr_export_jobs`-style bookkeeping) before the
commit, and drain it from a worker that can resume.

## F-6 · P2 · A non-zero storage `failed` count is audited but never retried

`src/modules/gdpr/gdpr-storage-purge.service.ts:161-190`

`purgeFromManifest` retries an individual delete three times (`STORAGE_DELETE_ATTEMPTS`, `:31`),
then pushes the key into `failed` and moves on. `recordErasureAudit` (`:196`) writes `failedCount`
into the audit row, and `eraseSubject` returns `storage.failed` to the caller — so the failure is
*discoverable*. Nothing re-queues it, no alert fires, and the erasure is reported as complete.
Objects that survived three delete attempts stay in the bucket indefinitely.

*Fix:* treat a non-zero `failed` count as a non-terminal erasure — leave the `hr_data_requests`
row short of `completed` and raise the existing dead-letter alert path.

## F-7 · P1 · The subject's e-mail address and message bodies survive erasure in the delivery tables

`src/modules/gdpr/` touches none of them (verified by grep: the only matches are the *export*
fetchers at `gdpr-export-fetchers-notifications.ts:123`).

| Column | Retains | Cleared only by | Window |
|---|---|---|---|
| `email_outbox.to_email` | the subject's live address | `CronNotificationRetentionService` record delete | **13 months** (`cron-notification-retention.service.ts:20`) |
| `email_outbox.html` / `.text` / `.subject` | rendered bodies | same worker, body purge | **90 days** (`:19`) |
| `notification_deliveries.recipient_address` | the subject's address | same worker | 13 months |
| `notification_deliveries.rendered_body` / `.rendered_subject` | rendered bodies | same worker (`:95-106`) | 90 days |
| `outbox_events.payload` | payloads that may embed PII | `CronOutboxRetentionService`, terminal states only | 30 days |

`anonymiseGlobalIdentity` rewrites `users.email`, but these are **denormalised copies with no FK**,
so nothing follows. Ageing out on a retention schedule is not erasure: an erasure request completed
today leaves the address readable for up to 13 months.

*Fix:* add the delivery tables to the subject erasure transaction — null `to_email` /
`recipient_address` and blank the rendered bodies for the subject, the same treatment
`anonymiseSubjectSupportTickets` already gives `support_tickets.requester_email` (which was added
for precisely this reason, see the comment at `gdpr-subject-erasure.service.ts:178-180`).

## F-8 · P2 · Directory-shaped caches are not invalidated on erasure

`src/common/cache/cache-invalidation-matrix.ts:31`, `:40`, `:143`, `:155`;
`src/modules/gdpr/gdpr-subject-erasure.service.ts:215`

`GdprSubjectErasureService.erase` appears in the cache-invalidation registry exactly once, on
`membership:status:<userId>` (`cache-invalidation-rbac-auth.ts:79`). `hr:directory:<orgId>` and
`hr:celebrations:<orgId>` — the latter holding **name plus birthday / work anniversary** — are
declared as invalidated by hierarchy and onboarding/termination events only, none of which erasure
raises. Both are `CACHE_TTL.MEDIUM` = **300 s**, so the erased person can still be served from
cache for up to five minutes. `org:members:list:<orgId>` and `org:profile:<orgId>:<userId>` are
generation-versioned rather than TTL'd, so their stale entry persists until an unrelated
membership write bumps the generation.

Graded P2 because the TTL bound is short and self-healing; it is nonetheless a real window in
which a completed erasure still serves the subject's data. See
`C187-downstream-store-trace.md` §4 for the full table.

*Fix:* one `invalidateNamespaceForOrg(orgId, …)` call per namespace at
`gdpr-subject-erasure.service.ts:215`, and add `GdprSubjectErasureService.erase` to those matrix
entries so the registry stays the authority.

## F-9 · P2 · Analytics copies and provider mirrors have no deletion path at all

`src/modules/organization/core/lifecycle/organization-purge-adapters.ts:340`, `:344`

Both are `failedAdapter(...)` — "Analytics warehouse client not wired; manual cleanup required" and
"No Composio client available at purge time to reconcile or disconnect provider accounts in
`user_integration_connections`". This is honest: the adapters **return `FAILED` rather than
claiming success**, which is the correct behaviour and blocks a purge from being marked confirmed.
It is recorded here because the *subject* path has no equivalent step at all — not even a failing
one — so a subject erasure never even asks the question.

## F-10 · P2 · `compliance:drill` prints two false statements about the system into compliance evidence

`src/scripts/compliance-drill.mjs:286-287` (and the same text in the file header, `:20-31`)

```
INCOMPLETE: object_storage purge adapter — returns FAILED ('not yet implemented, manual cleanup required').
INCOMPLETE: database_rows adapter — marks statusV2=PURGED but does NOT physically delete tenant data rows.
```

Both are stale at this head:

- The string `not yet implemented, manual cleanup required` **exists nowhere in `src/`** except in
  this drill's own output. The real `object_storage` adapter
  (`organization-purge-adapters.ts:91-290`) enumerates file-key columns from `pg_catalog`, deletes
  with three retries, re-lists, and returns `FAILED` only with a count of what actually remained.
- The real `database_rows` adapter (`:61-89`) returns `CONFIRMED` with the detail "the purge
  orchestrator physically deletes the organization row after all adapters confirm" — which RB-10 §6
  known-gap 3 also records.

This text is printed under the heading "**Known gaps (honest report)**" and lands verbatim in
`runs/01` and, via delegation, in `runs/14`. A drill that misreports the system's own state
understates the implementation to an auditor. That is a different failure from overstating it, but
it is still a compliance artifact that does not match the code.

*Fix:* delete both lines, or derive them from `PURGE_ADAPTER_REGISTRY` at run time so they cannot
drift again.

---

## F-11 · P2 · The legal-hold drill asserted only against its own `INSERT`

> **FIXED at `dcd5a20717dc6d5a6eb2ff40aa54ae58abe2bc8a`.** Re-run in `runs/27`; bite-proved in
> `runs/29`.

`src/scripts/drill-legal-hold.mjs:39-44` (at `45f8a2e99`)

```js
function holdCheck({ hrActive, orgActive }) {
  return { erasureBlocked: hrActive, retentionBlocked: hrActive, ... };
}
```

"Erasure is blocked" was **defined** as "an HR hold row is active". The run body INSERTed into
`hr_legal_holds` at `:136-139`, then passed "Erasure blocked" on nothing but its own
`activeHrHold()` SELECT (`:85-91`), and passed "Retention sweep blocked" on a second hand-written
`SELECT 1 FROM hr_legal_holds … LIMIT 1`. The PASS string said so out loud: *"hold check query
returns the active hold"*. `--self-test` asserted `holdCheck({hrActive:true}).erasureBlocked ===
true` — a restatement of the identity function.

The file named no service, no helper and no sweep. **All nine assertions in `runs/03` would have
stayed green if every legal-hold guard in the product had been deleted**, which is exactly what
`runs/29` now demonstrates by deleting one.

This matters beyond the script: `runs/03` is the row this bundle offered as evidence that "hold
blocks erasure, retention and org purge". That row was false when it was written.

*Fix (landed):* the verdict now comes from `src/scripts/legal-hold-drill-probe.ts`, which
constructs the real `RetentionService`, `GdprSubjectErasureService`, `GdprStoragePurgeService` and
`LegalHoldsService` against a real database inside one rolled-back tenant transaction, and asks
them. Fifteen checks across nine production paths, in three phases:

- **control** — with no hold, `RetentionService.processRequest` must run an unheld delete request
  through to `completed`. Without this phase "blocked" would also be the answer from a product
  that erases nothing for anybody, and the drill would certify it.
- **held** — `processRequest` must raise `ForbiddenException`, the request must stay `approved`,
  `eraseSubject` and `buildManifest` must answer `blocked=true` with the real hold id and zero
  work done, and `sweepStrandedDeleteRequests` must report `processed=0 skipped=1`. The
  organisation-scoped hold is asserted separately, so it cannot ride on the HR one.
- **released** — the same request must then complete.

`drill-legal-hold.mjs` keeps no assertion of its own; it is argument handling, floors
(`MIN_CHECKS`, `MIN_PRODUCTION_PATHS`, `REQUIRED_PHASES`) and an exit code. A run that covers too
little of the contract is exit **2**, never 0. `--self-test` now resolves the eight production
symbols on their real classes, so a rename fails the gate instead of silently emptying it.

---

## F-12 · P2 · 22 high-growth tables have no retention decision — **OPEN**

`src/scripts/check-retention-coverage.mjs` `RETENTION_MATRIX`, measured in `runs/23`

Fixing F-3 made the gate measure, and what it measured is a gap. Against `scratch_gates_head`
(946 tables) 41 clear 1 MB: 17 COVERED, 2 KEEP-FOREVER and **22 UNCOVERED**, so the gate exits 1:

`inv_stock_transactions` · `business_parties` · `event_attendees` · `calendar_events` ·
`perf_jitter_pool` · `inv_product_variants` · `perf_topic_pool` · `leads` · `inv_products` ·
`hr_leave_ledger` · `deals` · `contacts` · `inv_stock_levels` · `contact_party_map` · `kb_pages` ·
`lead_party_map` · `calendar_event_exceptions` · `support_tickets` · `organization_people` ·
`inv_purchase_orders` · `leave_requests` · `users`

Most are core tenant business records (CRM parties, inventory movements, calendar, KB pages,
leave). Two — `perf_jitter_pool` and `perf_topic_pool` — are scratch tables created in this
database by a performance seeding script and are not product schema; their presence is a property
of the measured database, not of the product, and is recorded here rather than filtered out,
because filtering the corpus is the failure mode this whole finding is about.

**This is not closed by adding matrix rows.** Each entry is a product decision — KEEP-FOREVER, or
RETAIN-BOUNDED naming the worker that actually enforces it — and a KEEP-FOREVER written to turn
the gate green without an owner is the allowlist-instead-of-a-fix that this release's closure
definition rejects. The 22 need a named Privacy/DPO and Product decision per table, and any
RETAIN-BOUNDED row needs a sweep that exists.

Related and unfixed: 11 of the 16 retention/purge services under `src/modules/cron/` contain no
reference to a legal hold at all (`cron-ai-usage-retention`, `cron-announcements-retention`,
`cron-build-retention`, `cron-gdpr-export-retention`, `cron-kb-chunk-retention`, `cron-mail-retention`,
`cron-notification-outbox-retention`, `cron-notification-retention`, `cron-outbox-retention`,
`cron-retention-scheduler`, `cron-storage-sweep`). The shared helper
`src/modules/hr/governance/legal-holds/legal-hold-check.helper.ts` has exactly one production
importer, `retention.service.ts:18`. A hold is therefore opt-in per sweep rather than a
precondition, which `runs/27` cannot see because it exercises the paths that do consult it.

---

## Disposition (PRD-C189 input)

Two of the twelve are closed by code at `dcd5a20717dc6d5a6eb2ff40aa54ae58abe2bc8a`: **F-3** and
**F-11**, both defects in the drills rather than in the product, each with a regression test and a
bite proof in `runs/28`/`runs/29`.

The other ten are open. F-1, F-2 and F-7 are **P1** and, on the wording of PRD-C189 ("close or
formally disposition every … P1 finding"), each needs either a fix or a named
accepted-residual-risk record before release. F-4 through F-6, F-8 through F-10 and **F-12** are
**P2**. F-12 did not exist as a visible finding until F-3 was fixed; it is the product gap the
vacuous gate was concealing, and it is the reason `check:retention-coverage` now exits 1. A
decision-record author is required for any of these that are to be accepted rather than fixed;
**no such record exists and this agent has not signed one.**
