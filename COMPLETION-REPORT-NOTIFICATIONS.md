# COMPLETION REPORT — Notifications & Realtime Delivery

**Date:** 2026-08-11 · **Status:** Phase 0 complete, Phase 1 partially shipped — **39 of 39 tasks addressed** — 32 closed, 4 partial, 3 held by
recorded decision. Not a finished programme; a verified checkpoint.

Tracker `TASKS-NOTIFICATIONS.md` · Decisions `DECISIONS-NOTIFICATIONS.md` · State
`REFACTOR-STATE-NOTIFICATIONS.md` · Audit `docs/refactor/notifications-phase0-audit.md`

---

## What was verified, and how

**Backend typecheck: `EXIT=0`, 0 errors** — exit code captured directly, not through a pipe.

**Unit specs: 67 passed, 67 total, 10 suites** — run with `--runInBand`. Run in parallel, 4 suites
report failures that do not reproduce individually; the serial run is the reliable signal, and the
per-suite runs agree with it. — `notification-catalog-integrity` · `push-payload` ·
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
| `0426` timestamptz | bare-timestamp columns 39 → **0**, 44 timestamptz; row counts unchanged across 13 tables; sampled `created_at` intact; `ANALYZE` on the 5 largest |
| `0422` preference rules + consent | 3 tables created **with RLS from the start** (rls=true, 1 policy each); cross-tenant probe: no GUC → `42501`, org B 0 rows, org A 1 row |
| `0421` PK widening + SCH-018 | 3 ids `bigint`/identity; 6 FKs `convalidated=true`; row counts unchanged 3/5/2; identity issued 11 above max 10; dangling FK rejected `23503` |
| `0420` snapshot + TTL | 4 columns + partial expiry index present; probe: past-`expires_at` delivery evaluates EXPIRED and records `CANCELLED/EXPIRED`; rendered snapshot persists |
| `0419` notification_outbox | table + RLS + 3 indexes present; probe: in-transaction write, retried request inserted 0 rows, `FOR UPDATE SKIP LOCKED` lease claimed it |
| `0418` index hygiene | `uniq_notification_queue_delivery` + org-led partial `idx_notifications_org_user_unread` present; `idx_notifications_user_unread_created` and `idx_notifications_priority` gone; `last_seen_at`/`updated_at` added; 0 duplicate `delivery_id` verified first |

**Adversarial tenant-isolation test** on the table I created, as `streamline_app` (non-BYPASSRLS):

```
no tenant GUC → 1 row (platform-wide only)
as org B      → 1 row; org A's row NOT visible
as org A      → 2 rows (platform + own)
```

**Concurrency test (SCH-016)** — two simultaneous claimers against the same queue:

```
worker-a claimed: [3]     worker-b claimed: [4]
overlap: 0                both made progress concurrently: true
```

**Final state, verified against the live database:** 9 notification tables, every one
`rls=true` with 1 policy; **0 bare-timestamp columns**; **0 registry events with an invalid
category** (was 19).

**File sizes:** `notification-dispatch.service.ts` crossed the §9 500-line cap at 531 while I was
adding to it — template loading and rendering split into `notification-template-renderer.service.ts`
(140 lines), leaving dispatch at 420. `notification-events.catalog.ts` is 1075 and stays: §9 exempts
a single cohesive catalog artifact from being split artificially.

**Banned-pattern sweep** across the files I authored: zero `any`, zero `@ts-ignore`, zero
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
| PIPE-014 | Templates rendered in a hardcoded `"en"` rather than the recipient's language |
| REG-007 | An unknown `{{var}}` rendered as a blank in a live email; now logged and falls back to the catalog copy |
| PIPE-013 (partial) | The per-recipient rate-limit mechanism existed and was off on all 126 events; on for the 10 chatty ones |
| SCH-016 | Two-statement queue claim replaced with one `FOR UPDATE SKIP LOCKED` statement |
| RT-005 | The support Ably token granted the whole org's ticket channels to any `support:tickets:view` holder; now follows DataScope |
| SCH-001 | `serial` int4 PKs on the highest-fan-out tables, widened to bigint identity with all 5 dependent FKs (2 composite tenant) revalidated |
| COMP-002 | No unsubscribe at all; now a signed, expiring, org-scoped, single-purpose token honoured through the existing suppression choke point |
| COMP-003 | No consent record; current state + append-only event log, with source, legal basis and timestamps |
| SCH-002 | 39 bare-timestamp columns across 13 tables converted to timestamptz — the type quiet hours, digests and TTL all reason over |
| RT-006 | Ably tokens were never revoked; a removed member kept a live realtime connection for up to an hour |
| PIPE-006 (partial) | Sequential one-transaction-per-recipient fan-out now runs in bounded waves of 10 |

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

3. **A third regression of my own, caught by verifying rather than assuming.** The SCH-002 schema
   sync used a regex over `shared.ts`, which also defines `audit_logs`, `calendar_events`,
   `subscriptions` and seven other tables I never converted in the database — 23 columns marked
   `withTimezone` in code while the database still held bare `timestamp`. Reverted precisely, then
   checked every timestamp column in all three files against `information_schema`: **no drift**.
   A regex over a file that holds more than one concern is a blast radius, not a shortcut.

4. **Two of my own regressions, caught only by running the specs — not by typecheck.**
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
| **SCH-002** timestamptz | Rewrites every notification table. Zero production data makes it cheap, but it is a wide blast radius for the end of a long session |
| **SCH-003** read cutover | The normalised `notification_preference_rules` table ships; `computeRouting` still reads the JSONB columns. The read swap belongs with the preference-centre UI |
| **COMP-002** `List-Unsubscribe` headers | Token and endpoint exist; emitting the headers on outbound mail is the remaining piece |
| **PIPE-004/008** coalescing and digest | Both need the digest queue table; aggregation is a product decision as much as a technical one |
| **REG-003** 77 unemitted catalog entries | Deliberately kept — they are the Phase 2 specification |
| **SCH-017** `broadcasts` JSONB audience | No correctness impact; junction tables are a mechanical follow-up |
| **RT-006** Ably token revocation | Needs Ably's `revokeTokens` API; tokens are 1h TTL meanwhile |
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

## Final closing pass (2026-08-12)

The last four open work items are closed. Each is stated with the evidence that proves it,
not the intent behind it.

**PIPE-008 / PIPE-004 — digest queue.** `notification-digest.service.ts` wired into
`NotificationsModule` and `/cron/notification-digest-flush`. Dispatch routes a channel the
user set to DIGEST into `enqueue()`; **mandatory events bypass it** — a security alert held
for a daily digest is not a digest, it is a missed alert. Proven live against Neon in a
rolled-back transaction: 15 events on one entity produced **1 row with `occurrence_count=15`**,
where the old path produced one notification about event #1 and silently dropped fourteen.
`deliverAfter` is deliberately not extended on a repeat, or a continuously active thread
would reset its own window forever and the digest would never arrive — a spec pins this.

Two defects found and fixed while spec'ing it, both mine, neither visible to typecheck:
- The flush bucket key was reassembled with `key.split(":")`. A user id is opaque text; one
  containing a colon would have resolved to the wrong user. Now the tuple is carried, not parsed.
- The post-flush UPDATE was not scoped by channel, so flushing a user's EMAIL bucket also
  marked their IN_APP items delivered — those notifications would never have arrived.

**SCH-017 — broadcast audience.** `0430` adds `broadcasts.audience_type` and backfills both it
and `broadcast_audience_targets` from the existing JSONB. Dev holds **zero broadcasts**, so the
backfill was proven against synthetic pre-cutover rows instead: roles→2 targets, departments→1,
users→3, all→0, `audience_type` correct in each case, rolled back. The service now dual-writes
in a transaction and resolves recipients from the junction. The JSONB column is retained and
still written — dropping it is the contract step, and a broadcast resolving to the wrong
audience is not a defect anyone notices quietly.

**COMP-005 — WhatsApp template approval.** WHATSAPP previously resolved to the generic sandbox
provider, which reports SENT for everything — including templates the provider would reject.
`NotificationWhatsAppProvider` now owns the channel and refuses to send unless the template is
APPROVED *and* carries a provider template name. All failures are **non-retryable**: approval
takes hours or days, far outside the queue's backoff, so retrying only burns the provider's
rate limit and the account's standing. The transport is still simulated — no WhatsApp Business
account is connected — which is exactly why the gate exists now rather than later: it cannot be
forgotten when a real transport is dropped in behind it. 6 specs.

**RT-007 — realtime content leak.** `notification:message` and `notification:mention` carried the
full message body. An Ably capability is granted at connect time, so a user removed from a
channel keeps receiving on a subscription they already hold, and text delivered that way never
passes the read endpoint's authorization at all. `content` is removed from both payloads and
from the method signatures. **No client ever consumed it** — verified across the frontend — so
this cost nothing to fix and had been leaking for nothing.

**A cycle I introduced and did not notice until the final check.** `madge --circular` flagged
`notification-events.catalog.ts ↔ notification.types.ts`. REG-005 made `eventKey` a real union
derived from the catalog, which made types.ts depend on the catalog while the catalog already
depended on types.ts. Fixed per §24 by extracting the shared vocabulary into
`notification-event-definition.types.ts` and re-exporting it from the old home, so no importer
changed. Both repos are back to **zero circular dependencies**. Worth recording: this was
invisible to `tsc` because both edges are type-only imports.

### Verification of this pass

| Check | Result |
|---|---|
| Backend `tsc --noEmit` | exit 0, 0 errors |
| Frontend `tsc --noEmit` | exit 0, 0 errors |
| `madge --circular` (backend `src`) | ✔ none |
| Affected specs, `--runInBand` | 21 suites / 204 tests pass |
| Migration `0430` | applied + journalled; backfill verified on all 4 audience shapes |

---

## Honest limits of this report

- **Three pre-existing spec failures are unrelated to this work and remain failing:**
  `ownership-notifications.spec.ts` ("Number of calls: 0"),
  `org-membership-notifications.spec.ts` (`tx.select(...).leftJoin is not a function`, an incomplete
  test double), and `chat-channel-members.service.spec.ts` (6 tests, failing inside `assertMember`).
  `git status` shows **all three paths completely unmodified** in the working tree, and the
  chat-channel-members service holds **zero references** to either file I changed in that module, so
  they fail against untouched committed code. I did not fix them — out of scope, and they are someone
  else's module.
- **The full suite was not re-run to completion.** It takes ~10 minutes and several suites hold open
  handles; I ran the specs covering my changes instead and said so rather than claiming a green suite.
- **Index usage is unproven.** The retention indexes exist, but `EXPLAIN` shows a seq scan because the
  table holds 36 rows — the correct plan at that size. No performance claim is made.
- **No before/after metrics.** There is no production traffic (5 orgs, 7 users), so latency and
  volume figures would be invented. The Phase 0 baseline records that absence deliberately.
- Nothing is committed. Working tree only, per the standing decision.
