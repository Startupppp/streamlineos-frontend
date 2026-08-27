# S5 — Right models, right throughput: partitioning, retention, one delivery policy

**You are executing this session.** Read this whole file, then start. The user is not watching and
cannot answer questions — proceed on reversible decisions and record them. Read `CLAUDE.md` and
`backend/CLAUDE.md` before your first edit.

Repo: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout. **No worktree, no new
branch.** Four other sessions are running in parallel.

---

## Your 3 tickets — 19 open boxes

| # | File | Boxes | Shape |
|---|---|---|---|
| c21-04 | `architecture-refactor/c21-fanout-retention-and-polling/issues/04-three-growing-tables-are-partitioned.md` | 12 | the big one — RANGE partitioning by `created_at` |
| c21-05 | `.../issues/05-retention-detaches-rather-than-deletes.md` | 2 | detach/drop is implemented; finish the proof |
| c21-07 | `.../issues/07-one-delivery-policy.md` | 5 | classes are modelled but nothing consults them |

**Order:** c21-04 → c21-05 (05 depends on the partitions existing) → c21-07.

## c21-04 — decide before you partition, and the decisions are irreversible

`backend/CLAUDE.md` §3 states the house rules and they are load-bearing here:

- **The partition key must be in every PK/UNIQUE**, so the PK becomes `(id, created_at)` and bare
  `id` stops being globally unique. **Keep the `(org_id, id)` tenant key.** Anything holding a bare
  FK to these tables has to be reconsidered *before* the migration, not after.
- **Do not partition a table that is not demonstrably large. Record the triggering row count in the
  migration.** No database has been touched this program, so you cannot measure — say so, and write
  the migration against the stated design intent rather than inventing a number.
- Partitions are pre-created; archival is `DETACH PARTITION CONCURRENTLY` + `DROP TABLE`, **never a
  bulk `DELETE`**.
- **`CREATE INDEX CONCURRENTLY` and `DETACH PARTITION CONCURRENTLY` cannot run inside a migration
  transaction.** House pattern: the in-transaction form guarded with `IF NOT EXISTS`, plus the exact
  `CONCURRENTLY` statements in the migration's comment block for an operator to run by hand first.
  Precedent: `0374_build_partial_indexes.sql`.
- Every migration sets `lock_timeout` (~5s) so it fails fast instead of queueing.
- **After any table rewrite, `VACUUM ANALYZE`** — a rewrite kills the statistics *and* empties the
  visibility map. One table went 53 → 201,875 blocks until analysed.

## c21-05 — most of it is already done; verify before rebuilding

`NotificationRetentionService` implements detach-and-drop, is registered in `CronModule`, and is
reachable at `POST /cron/notifications-retention-detach`. `notification-retention.spec.ts` asserts
no statement contains `DELETE`, that nothing runs under a held lease, that the policy covers every
named table, and that in-window partitions are retained. Its remaining boxes are the ones that need
partitions to exist — i.e. they depend on c21-04, and one is operator-gated.

Note it is **not** a duplicate of `CronNotificationRetentionService`, which issues row-level
`DELETE`s per org. The detach implementation is the correct one.

## c21-07 — two boxes are open for one reason: nothing consults the registry

`notification-delivery-class.ts` defines five classes (PRODUCT_EVENT, USER_AUTHORED,
WORKFLOW_EXTERNAL, OPERATOR_ALERT, MARKETING) with an authorization rule, an audit flag and a retry
policy. **`DELIVERY_CLASS_POLICIES` has exactly one importer — its own spec.** No dispatch path,
worker or adapter reads it, so no delivery is governed by it. Same for
`requireConsentProofForMarketing`, which throws without a proof that nothing in production supplies.

**Your job is to make the dispatch and delivery-worker paths resolve a class and apply its retry and
audit rules.** That is what closes both boxes. Do not tick them on the registry existing.

`notification-caller-inventory.ts` lists all 56 direct email-adapter call sites, and
`notification-delivery-class.spec.ts` walks `src/modules` asserting the inventory equals the tree in
both directions — **it is proven to fail on a new sender**. If you migrate a caller, that test keeps
you honest. Note `modules/mail/**` is **S4's territory**: request changes there, do not edit.

Correct premise on record: CRM outbound email **is** already consent-governed —
`crm-outbound-email.service.ts:39` drops every address `CrmConsentService.suppressedEmails` returns.
What is missing is unsubscribe handling and any consent record for org **members**.

---

## Territory

**You own, exclusively:**

```
backend/src/modules/notifications/**
backend/src/modules/cron/**
backend/src/db/schema/common/notifications.ts
backend/src/scripts/alert-dead-delivery.mjs, alert-dead-outbox.mjs
backend/migrations/0580_*.sql … 0589_*.sql
```

**`modules/mail/**` belongs to S4.** Do not edit it. For any caller migration that needs it, write
the exact file, line and change to `lane-requests/s5.md` and leave the box unticked with the reason.

**Never edit:** `migrations/meta/_journal.json` · `db/schema/index.ts` · `app.module.ts` ·
either `permissions/index.ts` · `architecture-refactor/README.md`. Write the exact journal entry
JSON to `lane-requests/s5.md`; the orchestrator applies it. **A migration absent from
`_journal.json` never runs and `db:migrate` reports success anyway** — for a partitioning migration
that means the partitions silently never exist.

---

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** with no tenant GUC — it does not return
  null. **Cron handlers have no ambient tenant**; iterate with `forEachOrg`, and open a fresh
  transaction with `runInNewTenantTransaction(db, orgId, fn)`.
- **After-commit hooks and `void something(...)` have no ambient tenant** — the transaction has
  committed and the GUC is gone. Use `registerAfterCommit` (returns `boolean`). **Never
  `.catch(() => undefined)`**: that swallow produced zero notification rows platform-wide across
  ~50 call sites, and the outage was invisible because the failure was discarded.
- **A JS `Date` inside a `` sql`` `` template dies at runtime** — it broke notification delivery for
  every org while cron returned 200.
- **A new tenant table (or partition) with no RLS policy is readable org-wide** — grants arrive via
  `ALTER DEFAULT PRIVILEGES`. Policies go in the same migration.
- **`notification.broadcast.published` deliberately omits `IN_APP`** from `allowedChannels`: c21-02
  serves it from `GET /broadcasts/inbox` by absence-of-receipt, so the pipeline never writes one row
  per recipient. `notification-catalog-integrity.spec.ts` encodes this as a documented exemption —
  do not "fix" it by adding `IN_APP`, which would restore the fan-out c21-02 removed.
- **A `db.transaction` mock must invoke its callback, and its tx needs `execute()`.**
- **An alert predicate must match the real emission** — one alert grepped for a string no log line
  contained, and its self-test hand-wrote the fixture.
- **`*.e2e-spec.ts` is in `testPathIgnorePatterns`.**
- **Typecheck needs `NODE_OPTIONS=--max-old-space-size=8192`.**
- **Do not rewrite a test to accommodate a change.**

---

## Definition of done

**Update a ticket only when the work is complete and tested.**

1. **Tick a `- [ ]` only when you can name the file and line that satisfies it**, written into the
   box's own line. Unsatisfied boxes stay unticked with the blocker written in. **Never delete or
   reword a criterion.** Several of c21-04's boxes will be honestly unclosable without a database —
   say which and why, rather than narrowing them.
2. `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` — clean.
3. **Run the specs you added or changed, scoped by path.** Authorised for this session, overriding
   the standing "never run tests" rule. Not the full suite — workers get killed. Report exact
   pass/fail counts; never report a suite as passing that you did not run.
4. Only at **zero** `- [ ]`: set `**Status:**` to `done` and update the row in
   `c21-fanout-retention-and-polling/README.md`. **Do not touch `architecture-refactor/README.md`.**
5. **Never delete a ticket file.**

## Git

You may `commit` verified work on `main`, one commit per ticket. **Never push, checkout, branch,
merge, pull, fetch, reset, stash, rebase, or create a worktree.** Subagents run no git.

The index is **shared with four sessions**. `git add` by explicit pathspec — never `-A` or `.` — and
prefer `git commit -- <paths>`, which takes only those paths regardless of what else is staged.
Re-check `git status --short` after staging. `backend/` is a separate git repo from the root.

## Report

Per ticket: Findings · Root cause · Solution · Files changed · Validation (typecheck, exact spec
counts) · anything left open with its blocker · the contents of `lane-requests/s5.md`, including
every journal entry you need. For c21-04, state the PK change and what it breaks, explicitly.
