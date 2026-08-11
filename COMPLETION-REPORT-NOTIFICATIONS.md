# COMPLETION REPORT — Notifications & Realtime Delivery

**Date:** 2026-08-11 · **Status:** Phase 0 complete, Phase 1 partially shipped — **26 of 39 tasks
done**. Not a finished programme; a verified checkpoint.

Tracker `TASKS-NOTIFICATIONS.md` · Decisions `DECISIONS-NOTIFICATIONS.md` · State
`REFACTOR-STATE-NOTIFICATIONS.md` · Audit `docs/refactor/notifications-phase0-audit.md`

---

## What was verified, and how

**Backend typecheck: `EXIT=0`, 0 errors** — exit code captured directly, not through a pipe.

**Unit specs: 50 passed, 50 total, 8 suites** — `notification-catalog-integrity` · `push-payload` ·
`email-webhook` · `rate-limit.service` · `notification-routing` · `quiet-hours`. The last two cover
code I changed (SCH-012 timezone resolution) and were re-run after each batch.

**Migrations applied and journalled: `0408`, `0410`–`0415`, `0417`.** Each verified against the live DB by
querying `pg_indexes` / `pg_constraint` / `pg_enum` / `to_regclass` after applying — never assumed
from the fact that the statement ran.

| Migration | Verified by |
|---|---|
| `0408` accounting enum | probe insert went `22P02` → `id=12 category=ACCOUNTING`; invalid-category events 19 → 0 |
| `0410`/`0411` visibility + `NO_ACCESS` | column and enum label present; `SUPPRESSED`/`NO_ACCESS` delivery row persists |
| `0412` suppressions | 3 indexes present; duplicate platform row rejected `23505`; per-org row coexists |
| `0413` retention indexes | 3 indexes present; sweep probe purged a 200-day body, deleted a 500-day row |
| `0414` key rename | `notification_events` 126 → 117, exactly 9 deleted, 0 `project.*` remain |
| `0415` prefs + catalog uniques | `notification_preferences_user_id_unique` gone from `pg_constraint`; both new indexes present; rows 0 → 0 |
| `0417` suppressions RLS | `relrowsecurity=true`, 1 policy; cross-tenant probe below |
| `0420` snapshot + TTL | 4 columns + partial expiry index present; probe: past-`expires_at` delivery evaluates EXPIRED and records `CANCELLED/EXPIRED`; rendered snapshot persists |
| `0419` notification_outbox | table + RLS + 3 indexes present; probe: in-transaction write, retried request inserted 0 rows, `FOR UPDATE SKIP LOCKED` lease claimed it |
| `0418` index hygiene | `uniq_notification_queue_delivery` + org-led partial `idx_notifications_org_user_unread` present; `idx_notifications_user_unread_created` and `idx_notifications_priority` gone; `last_seen_at`/`updated_at` added; 0 duplicate `delivery_id` verified first |

**Adversarial tenant-isolation test** on the table I created, as `streamline_app` (non-BYPASSRLS):

```
no tenant GUC → 1 row (platform-wide only)
as org B      → 1 row; org A's row NOT visible
as org A      → 2 rows (platform + own)
```

**Banned-pattern sweep** across the 11 files I authored: zero `any`, zero `@ts-ignore`, zero
`console.log`, zero non-null assertions, zero files over 500 lines (largest 150).

---

## Closed

**All three Phase 0 P0s**, plus five more:

| ID | What it was |
|---|---|
| REG-001 | All 19 `accounting.*` events had **never delivered** — `"ACCOUNTING"` was not in the pgEnum, an `as` cast hid it from tsc, a swallowed post-commit handler hid it at runtime |
| PIPE-003 | No permission re-check at delivery — zero `AccessService` refs in the entire path |
| SEC-002/003 | No bounce/complaint webhook; suppression unenforceable on the direct-email path |
| SEC-009 | Rendered bodies, including payslip net pay, retained forever |
| RT-001/002 | Push payloads carried record content; three tabs produced three OS notifications |
| REG-004 | Emitted keys were undeclared — code said `build:ticket:assigned`, catalog said `project.task.assigned`, so neither resolved |
| PIPE-011 | No self-notification exclusion |
| SCH-011/013, SEC-004 | Multi-org users shared one preference row; catalog uniqueness enforced nothing; 3 rate-limit tiers silently unlimited |
| REG-005 | `eventKey` was a free-form `string` — the exact hole REG-004 fell through. Now a union derived from the catalog; 2 dynamic sites surfaced and fixed properly |
| PIPE-015 | A delivery could sit in the queue across a deactivation and still send. Re-checked at the worker, so it catches revocation by any path |
| SCH-005/007/008/015 | Push staleness signal; org-led partial unread index; dead enum index dropped; one-queue-job-per-delivery now a DB invariant |
| PIPE-010 (partial) | Retry backoff had no jitter — an outage re-formed the herd on every step |

---

## Found during verification, not in the audit

Two defects the original audit missed. Both were caught by the verification passes, which is the
point of running them.

1. **SEC-010 — `email_suppressions` shipped with no RLS.** I created it in `0412` and did not enable
   row-level security, while every sibling table has it. As `streamline_app` with no tenant GUC the
   whole table was readable; tenant scoping was relying on the service's own `WHERE`, which is an
   application predicate, not isolation. Fixed in `0417` and proven with the cross-tenant probe above.
   **This was my own regression, introduced and closed in the same session.**

2. **REG-009 — 10 events were `mandatory: true` and `userConfigurable: true`.** The preference centre
   would render a toggle that `computeRouting` ignores. My own catalog-integrity spec failed on its
   first run and caught it.

3. **Two of my own regressions, caught only by running the specs — not by typecheck.**
   `pnpm typecheck` uses `tsconfig.build.json`, which **excludes `*.spec.ts`**, so neither showed up
   in eight clean typechecks:
   - REG-005 (the event-key union) broke `notification-dispatch-after-commit.spec.ts`, which passed
     a plainly-typed `string`.
   - PIPE-003 added `NotificationVisibilityRegistry` to the dispatch constructor, and that spec's
     test module did not provide it — a DI failure at runtime only.
   Both fixed; 8 suites / 50 tests green. **Typecheck is not sufficient verification in this repo.**

4. **SCH-006 was a wrong finding, and acting on it would have caused a privacy leak.** The audit
   proposed replacing `push_subscriptions`' bare global `UNIQUE (endpoint)` with
   `(org_id, user_id, endpoint)`. A Web Push endpoint identifies a *browser*, not a user — the
   global unique is precisely what stops two accounts registering the same device. The composite
   would have let both keep a row, and every notification for either user would have been delivered
   to that one device. Retracted before implementing; the constraint stays as it was.

---

## Corrections to earlier claims in this programme

- **The direct-email count was 31; it is 75.** My first sweep grepped `sendEmail(` and missed every
  *named* sender (`sendInvitationEmail`, …). Corrected in the audit and the tracker.
- **I wrongly reported Inventory's `0399`–`0407` as partially applied** and wrote that warning into
  their tracker. I had probed `to_regclass` with table names guessed from *migration filenames* —
  `0399_inv_uom_conversions.sql` creates `inv_product_uom_conversions`. Retracted there.
- **AC-02 (the Ably `chat:${orgId}:*` P0) is already fixed**, verified against `ably.service.ts` and
  its spec. `REFACTOR-STATE-ACCESS.md` updated to close it.
- **SCH-004 (partitioning) downgraded High → Deferred**, per §19 and the precedent Inventory set.

---

## Not done, and why

| Item | Reason |
|---|---|
| **PIPE-006** fan-out batching, **SCH-001** PK widening, **SCH-003** preference normalisation | Remaining Phase 1 scope. Designed in the plan, not built |
| **SCH-014** `email_outbox.organization_id NOT NULL` | **Blocked by SEQ-001.** Probed: the insert succeeds only *because* the column is nullable. Doing it before converting the ~14 fire-and-forget sites breaks every transactional email at once, silently, payslips included |
| **COMP-004** India DLT registration | **Hard external blocker** — weeks of registration only a human can complete. SMS cannot ship without it |
| **COMP-002/003** unsubscribe, consent | Not started. Required before non-transactional email |
| **SCH-004** partitioning | Deferred by decision D-2; trigger recorded at 50M rows |
| Frontend Phase 8 | Deferred by decision D-8. `sw.js` changed only because RT-001 required it |


---

## Needs your confirmation

1. **`DECISIONS-NOTIFICATIONS.md#D-6` — ZeptoMail webhook signing.** I used a constant-time shared
   secret rather than guess at an HMAC construction that would silently accept everything if wrong.
   Confirm the real scheme against a live ZeptoMail account and I will swap it in.
2. **`#D-5` — retention is the one irreversible decision here.** 90-day body purge destroys data.
   Nothing runs until an external scheduler is pointed at `/cron/notifications-retention-sweep`.
3. **`#D-7` — chat push previews are gone.** Users will notice. Reversible by restoring a field.
4. **`#SNAP-001` — the Drizzle snapshot chain is stale** for `0408`, `0410`–`0415`, `0417`. The next
   `db:generate` will re-propose applied work. I did not hand-craft snapshot JSON because a subtly
   wrong one bakes the error in.

---

## Honest limits of this report

- **Two pre-existing spec failures are unrelated to this work and remain failing:**
  `ownership-notifications.spec.ts` ("Number of calls: 0") and
  `org-membership-notifications.spec.ts` (`tx.select(...).leftJoin is not a function`, an incomplete
  test double). `git status` shows **both paths completely unmodified** in the working tree, so they
  fail against untouched committed code. I did not fix them — out of scope, and they are someone
  else's module.
- **The full suite was not re-run to completion.** It takes ~10 minutes and several suites hold open
  handles; I ran the specs covering my changes instead and said so rather than claiming a green suite.
- **Index usage is unproven.** The retention indexes exist, but `EXPLAIN` shows a seq scan because the
  table holds 36 rows — the correct plan at that size. No performance claim is made.
- **No before/after metrics.** There is no production traffic (5 orgs, 7 users), so latency and
  volume figures would be invented. The Phase 0 baseline records that absence deliberately.
- Nothing is committed. Working tree only, per the standing decision.
