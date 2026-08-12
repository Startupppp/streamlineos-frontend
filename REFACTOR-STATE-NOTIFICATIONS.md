# REFACTOR-STATE — Notifications & Realtime Delivery

> Concurrent programs keep separate trackers. Build → `REFACTOR-STATE.md`. CRM → `REFACTOR-STATE-CRM.md`.
> Access/RBAC → `REFACTOR-STATE-ACCESS.md`. This file is the notification + realtime delivery program.

**Scope:** in-app feed · web push · email · pipeline, preferences, templates, delivery tracking, admin surface.
SMS (Twilio) and WhatsApp as built-but-not-enabled adapters. Mobile push / Slack / webhooks designed for, not built.
**Phase:** 1 — Core model & schema. Design complete and gated. **Five slices shipped.**
**Updated:** 2026-08-11

**Shipped so far** (all backend, uncommitted on `main`, migrations `0408`/`0410`–`0413`):
REG-001 accounting blackout · PIPE-003 permission re-check before render · SEC-002/003 bounce
webhooks + suppression · SEC-009 retention sweep · RT-001/002 push payload minimisation.
**All three Phase 0 P0s are closed.**

**Next by value:** REG-004 (align Build event keys → unlocks the `build.ticket` resolver) ·
PIPE-001 (durable intent, migration `0414`) · COMP-002 (unsubscribe + `List-Unsubscribe`) ·
RT-007 (Ably carries content) · SEC-007 (net pay rendered into the payslip body).

## Shipped — RT-001, no content in push payloads (and RT-002)

**Decision: strip everywhere, no exceptions** (2026-08-11). Chat loses its lock-screen preview
deliberately — a chat message can contain anything and the push service is a third party.

**The fix is structural, not a convention.** `pushPayloadSchema` previously had
`{ title, body, url }`; it now has `{ category?, url?, notificationId? }` and **no free-text field
at all**. `category` is the pgEnum, so the only thing that can cross the boundary is a fixed label.
§20 is explicit that a "safe usage" flag is the pattern that failed in `kb-rag.service.ts` — a
`body` field commented "nothing sensitive here" is the version that eventually leaks. Removing the
field made all four call sites fail to compile until they carried nothing.

| Call site | Was | Now |
|---|---|---|
| `notifications.service.ts:113` | `title: input.title`, `body: input.message.slice(0,140)` | `notificationId` + `category` |
| `providers/notification-web-push.provider.ts:21` | same 140-char body | `url` only (delivery rows carry no category) |
| `chat-messages.service.ts:213` | sender name + `content.slice(0,80)` | `category: "CHAT"` |
| `chat-huddles.service.ts:181` | generic strings | `category: "CHAT"` |

All user-facing copy is now generated in `frontend/public/sw.js` from the category, so nothing
sensitive reaches a lock screen even if a caller regresses. **RT-002 closed in the same edit:** the
service worker is shared across tabs, so tagging by `notif-${notificationId}` collapses the
three-tabs-three-notifications duplication at the OS level.

The `sw.js` change is frontend but not scope creep — without it push would render an `undefined`
body. The rest of Phase 8 stays deferred.

**Verification.** Backend `pnpm typecheck` **exit 0, 0 errors**. `push-payload.spec.ts` asserts on
the payload rather than the UI, per the brief: allowed keys exactly `{category, url,
notificationId}` · no `title`/`body`/`message`/`content`/`subject`/`name`/`preview` key ·
a caller smuggling `body: "Net pay ₹120000"` has it **stripped by the parse**, checked by asserting
the serialised payload contains neither `120000` nor `payslip` · a non-enum category throws, so it
cannot become a free-text channel. **Tests not run** (§3).

Mid-run a typecheck showed 4 errors in `db/schema/build/**` from the Build programme's concurrent
schema split — none in my files, and clean once their refactor landed. Second time this session;
worth checking whose errors they are before reacting.

**Still open nearby:** RT-007 — Ably still publishes `content: message.content` to
`notifications:${orgId}:${userId}` (`chat-notifications.service.ts:44,84`). That is the user's own
authenticated channel rather than a third party, so it is a lesser issue than push, but the brief
wants realtime to carry an invalidation signal rather than content.

## ⚠️ PENDING — the Drizzle snapshot chain is stale

**Do not run `pnpm -C backend db:generate` without reading this.** Migrations `0408`, `0410`–`0413`
were hand-authored and journalled but have **no `migrations/meta/NNNN_snapshot.json`**. Drizzle
diffs against the last snapshot, so the next `db:generate` will re-propose work that is already
applied — re-adding `visibility_resource_kind`, re-creating `email_suppressions`, and so on.

Options, none of them free: regenerate the snapshot chain from the live DB, or discard the
re-proposed statements by hand on the next generate. I did not hand-craft snapshot JSON — getting
it subtly wrong is worse than the stale state, because the error would then be baked in.

Related: [[custom-migrations-leave-snapshot-stale]] — `generate --custom` has the same effect for
a different reason, so this repo has two independent paths to a desynced `meta/`.

## Shipped — SEC-009, retention sweep

Migration `0413_notification_retention_indexes`, applied and journalled.
**Retention decided 2026-08-11: 90 days for rendered bodies, 13 months for the metadata row.**
Metadata outlives the body so a delivery dispute or bounce history stays answerable long after the
content stops being worth the exposure.

`CronNotificationRetentionService.sweep()` behind `GET|POST /cron/notifications-retention-sweep`
(cron-secret auth, matching the other 35 jobs — `@nestjs/schedule` is not installed, so an external
scheduler must call it).

- `email_outbox` sweeps **globally** — every row has `organization_id IS NULL` and its RLS policy
  escapes on that, so no tenant context is needed.
- `notification_deliveries` sweeps **per tenant via `forEachOrg`** — it enforces
  `org_id = app.current_org_id()`, so a global sweep is denied `42501` (§20).
- Deletes are **batched at 1000 with a 100-batch cap**, and hitting the cap **logs a warning**
  rather than returning silently — a silent cap reads as "everything is purged" when it is not.

**Verification.** Typecheck **exit 0, 0 errors**. Live-DB probe against seeded rows: a 200-day-old
payslip email keeps its subject, recipient and status but its `html` becomes `""` — the net-pay
figure is gone; a 500-day-old row is deleted entirely. Both rolled back.

Honest caveat: `EXPLAIN` shows a **seq scan**, because the table holds 36 rows and that is the
correct plan at that size. The three indexes exist (verified in `pg_indexes`) but their use is
**not demonstrated** and cannot be until the table is seeded to scale.

**Still open in this area:** SEC-007 — the payslip email still *renders* net pay into the body.
Retention now bounds how long that is stored; it does not stop it being sent or stored for 90 days.

## Shipped — SEC-002/SEC-003, bounce webhooks and suppression at the choke point

Migration `0412_email_suppressions` (new table + two new enum **types**, so no `ADD VALUE`
transaction constraint), applied and journalled.

**D-1's leverage, realised.** `EmailService` overrides the base sender to route through
`EmailOutboxService.enqueueAndTry` (`email.service.ts:46`), so putting the suppression gate in
that **one method** covers all 75 direct-send call sites without touching one of them.
Suppression applies to mandatory types too — a hard-bounced address is not deliverable regardless
of policy, and continuing to send to it degrades delivery for every other recipient on the domain.

**`email_suppressions` is keyed on the address, not a user FK.** `notification_suppression_rules`
cascades on user delete, so purging a user would resurrect their bounced address; a hard bounce
must outlive the account. `org_id IS NULL` = platform-wide (correct for a bounce, which is a
property of the address); a tenant may additionally suppress for itself. **Two partial uniques**
rather than one nullable composite — `NULL <> NULL` in a btree unique would leave the
platform-wide rows unconstrained, which is the SCH-013 defect.

**Multi-recipient sends are filtered, not dropped.** Suppressed addresses are removed and the
remainder still sends; a withheld send writes an `email_outbox` row with `status = 'SUPPRESSED'`
and **no body** (there is no delivery to reconstruct, and `email_outbox` still has no retention
sweep — SEC-009). It never throws: many callers `void` this method, so a throw would surface as an
unhandled rejection on an unrelated request.

**`POST /webhooks/email/:provider`** — `@Public()`, because a provider cannot carry a session.
Authentication is the signature check, run before anything is parsed or written.

| Provider | Verification |
|---|---|
| `resend` | Full Svix HMAC — SHA-256 over `${id}.${timestamp}.${body}`, base64 key after the `whsec_` prefix, multiple `v1,<sig>` candidates accepted for key rotation, and a **5-minute replay window**. Implemented with node `crypto`; no new dependency |
| `zeptomail` | Constant-time shared secret (`x-zeptomail-webhook-secret`). **Deliberately not a guessed HMAC** — inventing a construction that is wrong would silently accept everything. Replace once the provider's real scheme is confirmed |

Every path fails closed: no secret configured → 401, no headers → 401, forged or stale → 401.
`@UseRateLimit`-equivalent check uses tier `"webhook:email"`, **and the `TIERS` entry is
registered** — without it `check()` returns `allowed` for an unknown key and the guard is a no-op,
which is exactly how `hr-form:public-view` ended up unprotected.

**Verification.** Backend `pnpm typecheck` **exit 0, 0 errors**. Live-DB probe of the partial
uniques: a platform-wide hard bounce inserts; **a redelivered duplicate is rejected `23505`**, so
webhook redelivery is idempotent; a per-org row for the same address coexists with the global one.
`email-webhook.spec.ts` added — 10 cases covering valid signature, missing headers, forged
signature, signature over a different body, replay outside the window, no secret configured,
non-bounce events, complaints, and both ZeptoMail branches. **Tests not run** (§3).

New env: `RESEND_WEBHOOK_SECRET`, `ZEPTOMAIL_WEBHOOK_SECRET` (both in `.env.example`; unset means
the endpoint rejects everything, so bounces are never suppressed).

**Not in this slice:** consent records, the unsubscribe endpoint and `List-Unsubscribe` (COMP-002/003),
and the `email_outbox` retention sweep (SEC-009).

## Shipped — PIPE-003, permission re-check before render

Migrations `0409` (`notification_events.visibility_resource_kind`) and `0410`
(`suppression_reason` gains `NO_ACCESS`), both applied and journalled.

**The mechanism.** An event declares `visibilityResourceKind`; the dispatch loop re-checks that
recipient's object-level access **immediately before render**, per recipient
(`notification-dispatch.service.ts`, top of the `for (const userId of targets)` loop). A denied
recipient gets no notification and a `notification_deliveries` row with
`status = 'SUPPRESSED'`, `suppression_reason = 'NO_ACCESS'` — auditable, and distinguishable from
a mute. Uses the same idempotency key, so a replay does not double-record.

**Deny by default** (`notification-visibility.registry.ts`): a declared kind with no registered
resolver denies, a declared kind with no `entityId` denies, and a resolver that throws denies.
Events with no declared kind cost nothing — 122 of 126 are untouched.

**Modules push, notifications never pulls.** Build/KB/Support/CRM all already import
`NotificationsModule` to emit, so the reverse edge would be a cycle (§24). Each owning module
registers its own resolver in `onModuleInit`.

**Registered: `kb.page` only** (`kb-notification-visibility.ts`), wrapping the existing
`assertPageAccessible` — a real object-level predicate (space/project membership, creator,
org-owner bypass) that needs no request context. Membership is resolved from the DB via the global
`MembershipStateService`, never from a token claim (§21).

This one bites today: `knowledge.page.comment_created` / `review_requested` / `review_approved` /
`review_rejected` are all actually emitted and all carry `entityId: String(pageId)` (verified at
`kb-page-comments.service.ts:78`, `kb-page-reviews.service.ts:171,223,276`). Confirmed there are
**0 org-specific override rows**, so the catalog annotation takes effect with no reseed, and
`rowToDefinition` makes the catalog win for this field — a tenant row may add a visibility check
but never remove one.

**Behavioural consequence, stated deliberately:** `knowledge.page.review_requested` renders the
page title into the notification. A reviewer assigned to a project-scoped page who is not a member
of that project will now be suppressed rather than told the title. That is the intended
fail-closed behaviour; if reviewer assignment is meant to confer access, that grant belongs in the
assignment path, not in the notification.

**Deliberately NOT registered — registering them would be security theatre:**

| Kind | Why not |
|---|---|
| `support.ticket` | `SupportTicketsService.getTicket(orgId, ticketId)` checks **tenancy only** — no DataScope on the single-record read (`support-tickets.service.ts:255`). It answers "does this exist in the org", which is not visibility |
| `crm.deal` | Same: `DealsCrudService.getDeal` is tenant-only (`deals-crud.service.ts:121`), and `DealsModule` has no `exports` array at all |
| `build.ticket` | `ProjectsTicketsService.getTicket` **is** a real check (DataScope + assignee/reporter, `projects-tickets-read.service.ts:392`) and is exported — but every Build catalog event is dead (REG-003/004: code emits `build:ticket:assigned`, the catalog declares `project.task.assigned`). Annotating them changes nothing until REG-004 lands. It is the next resolver, paired with that fix |

`IMPLEMENTED_VISIBILITY_RESOURCE_KINDS` + a spec assertion mean annotating an event without
shipping its resolver fails CI rather than silently suppressing every delivery.

**Verification.** Backend `pnpm typecheck` **exit 0, 0 errors**. Live-DB probes: a
`SUPPRESSED`/`NO_ACCESS` delivery row persists; `visibility_resource_kind` column present;
`NO_ACCESS` label present. **Tests not run** (§3). Known cost: one visibility query per recipient
per annotated event — acceptable at watcher/assignee cardinality, and no broadcast event declares
a kind.

## Shipped — REG-001, the accounting blackout

| What | Where |
|---|---|
| `ACCOUNTING` added to the pgEnum | `db/schema/common/enums.ts` + `migrations/0408_notification_category_accounting.sql` (one statement, per the `ADD VALUE` transaction rule) |
| **The TS union is now derived from the pgEnum** — `(typeof notificationCategoryEnum.enumValues)[number]` | `notifications.types.ts`. The parallel hand-maintained union is gone, so the two can never drift again (§7: never hand-maintain a parallel type) |
| The cast that hid it for the life of the product is deleted | `notification-dispatch.service.ts:244` — `definition.category as NotificationCategoryValue` → `definition.category` |
| `NotificationEventDefinition.category` narrowed `string` → `NotificationCategoryValue` | `notification.types.ts`; the `e()` catalog helper too. A wrong category is now a compile error |
| DB-sourced category narrowed by a type predicate, not a cast | `isNotificationCategory()` in `notifications.types.ts`, used at `notification-event-registry.service.ts:104`. `notification_events.category` is a `text` column, so an org override row was the remaining drift vector — it now falls back to the catalog value |
| Regression guard | `notification-catalog-integrity.spec.ts` — 7 assertions: category ∈ pgEnum · channels ∈ pgEnum · `defaultChannels ⊆ allowedChannels` · no duplicate keys · key format · mandatory ⇒ not user-configurable · `IN_APP` always allowed |

**Verification.** Backend `pnpm typecheck` **exit 0, 0 errors** (exit code captured directly, not
through a pipe). Tightening the type surfaced two real errors — the catalog helper and the registry
row mapper — both fixed without a cast. **Lint and tests NOT run** (§3 — not requested); the spec
is present, not executed.

**Proof the defect is closed**, against the live dev DB, in a rolled-back transaction:

```
before:  INSERT … category 'ACCOUNTING' → 22P02 invalid input value for enum
after:   INSERT ACCEPTED → id=12 category=ACCOUNTING event=accounting.depreciation.run_posted
registry events with an invalid category: 0  (was 19)
```

**How it was applied.** The single `ALTER TYPE … ADD VALUE IF NOT EXISTS` was run directly and the
journal entry appended with a `when` above the DB high-water mark (per
[[migration-journal-desynced]] — Drizzle skips by timestamp, not hash). Confirmed recorded:
`created_at = 1786416216285` is in `drizzle.__drizzle_migrations`, and `IF NOT EXISTS` keeps a
re-run a no-op.

> **Correction.** I initially held back from `db:migrate` on the belief that Inventory's
> `0399`–`0407` were only partially applied, and wrote that warning into the Inventory tracker.
> It was wrong: I probed `to_regclass` with table names inferred from migration *filenames*, and
> those files create differently-named tables. Re-probed correctly — the Inventory batch is fully
> applied. Retracted there. The one real cross-programme item is that **`0408` is now taken**;
> Inventory's deferred `inv_txn_type` change must renumber past `0417`.

No page changed, so `PAGES.md` is untouched. `madge` is not installed in this repo, so the
repo-wide acyclic claim is not re-verified; the edges added here cannot cycle, because the only
new dependency terminates in `db/schema/common/enums.ts`, which imports nothing but
`drizzle-orm/pg-core`.

- Phase 0 audit: **`docs/refactor/notifications-phase0-audit.md`**
- Phase 1 plan: **`docs/refactor/notifications-phase1-schema-plan.md`**
- Rollback: **`docs/refactor/notifications-phase1-rollback.sql`**

## Phase 1 at a glance

10 migrations, `0408`–`0417`, all additive or free-at-zero-rows. Preconditions verified against
the live DB: no duplicate global event keys (0414 will build), `max(notifications.id) = 10`
(0416 rewrite is instant), `notification_preferences` empty (0413 unique swap is free).

**D-1…D-4 are answered in the plan** under stated assumptions, since no decision arrived.
Reversing any is a document edit at this stage, not a migration. The two that changed the shape
of the work:

- **D-1 — the 75 direct-email sites are NOT migrated.** `EmailService` overrides the base seam
  (`email.service.ts:46`: `override sendEmail(o) { return this.outbox.enqueueAndTry(o) }`), so
  every named sender already funnels through **one method**. Suppression and consent go there.
  This turns the largest item in the programme into a one-method change plus 3 real migrations
  (the `AutomationEmailService` sites, which skip the outbox entirely).
- **D-2 — partitioning deferred**, PKs widened now. §19 forbids partitioning a table that is not
  demonstrably large, and the partition key would have to join every unique — which would make the
  Wave-4 composite tenant FKs `(id, org_id)` undeclarable. Same call the Inventory programme made,
  for the same reasons. Recorded trigger: 50M rows in `notifications`.

---

## Verdict

The engine is real and better than a greenfield brief assumes — 126 declared events, a
DB-enforced idempotency constraint, one correct preference resolver, DST-safe quiet hours,
per-org claiming via `forEachOrg`, stepped retry with a DEAD state. Four gaps are structural,
and one of them is that **half the product does not use the engine at all**.

---

## Context (verified from the repo, not assumed)

| Question | Answer |
|---|---|
| API deployment | Long-lived container (`Dockerfile` `CMD node dist/main.js`, `app.listen`) — Railway hostname referenced in frontend env |
| Frontend deployment | Vercel (`frontend/vercel.json`) |
| Realtime transport | **Ably** (managed). Not forced by deployment — it is a free choice, and today a liability (AC-02) |
| Redis | **Upstash REST**. No TCP, no pub/sub, no blocking pops → **BullMQ is architecturally impossible** |
| Job queue | None. Postgres table + 15s `setInterval` + HTTP-triggered `/cron/*` flush |
| Scheduler | **`@nestjs/schedule` is not installed.** 35 cron jobs are `@Public()` HTTP endpoints behind `CRON_SECRET`, driven by an external scheduler. No distributed lock |
| Email provider | ZeptoMail (default) or Resend, via `EMAIL_PROVIDER` |
| SMS / WhatsApp | Twilio env vars exist and are unset → both channels hard-wired to `SandboxProvider` |
| Web push | `web-push` v3.6.7 + VAPID env keys |
| Mobile apps | None, none planned in-repo |
| Per-tenant provider creds | `notification_provider_accounts` exists (encrypted config, sandbox flag, daily/monthly caps) — **0 rows** |
| Data residency | Not determinable from the repo (provider dashboards) |
| Live production tenants | **None — 5 orgs / 7 users, dev only** |

**Consequences that constrain every later phase**
- No BullMQ. The queue will stay Postgres-backed; make that a decision, not an accident.
- No in-process scheduler. Digests and retention sweeps must be `/cron/*` endpoints, and their
  absence is silent — nothing alerts when the external scheduler stops.
- No production tenants → **no expand-contract obligation, no customer-visible figures to
  preserve, and the strangler migration is far cheaper now than it will ever be again.**

---

## Findings — open

Severity ranked. Full evidence in the audit doc.

| ID | Sev | One-line |
|---|---|---|
| **REG-001** | **P0** | **All 19 `accounting.*` events have never been delivered.** Catalog sets `category: "ACCOUNTING"`; the `notification_category` enum has 18 values and that is not one. Proven by probe: `22P02 invalid input value for enum`. The `as NotificationCategoryValue` cast hides it at compile time; `registerAfterCommit(…).catch(logger.error)` hides it at runtime |
| **PIPE-003** | **P0** | No permission re-check at delivery — **zero `AccessService` references** in notifications/push/realtime. Only ACTIVE-membership is checked, at enqueue |
| **SEND-BYPASS** | **P0** | **Six parallel send systems, 181 paths inventoried.** 63 engine sites vs **75 direct-email sites across 18 modules**, plus `notifications.create()` raw inserts, `AutomationEmailService` (no outbox at all), direct Ably/WebPush, and Twilio SMS/WhatsApp with no retry. **The engine is the minority path.** Nothing outside it has preferences, suppression, quiet hours, dedupe or a delivery record |
| **SEQ-001** | **P0** | **SCH-014 and the fire-and-forget sites are load-bearing for each other.** Probed: an `email_outbox` insert with no tenant GUC succeeds **only** when `organization_id` is NULL (which is why 34/34 rows are). Making it NOT NULL without first converting the 14 `void …` send sites to `registerAfterCommit` + `runInNewTenantTransaction` breaks **every fire-and-forget email at once**, silently, payslips included — each is already wrapped in a `.catch` that discards the error |
| **SEND-001** | High | **Dual send** — `cron-hr.service.ts:200,220` fires the automation event *and* a direct email for `document.expiring`. §9 forbids dual-send outright |
| **SEND-002** | High | Broadcasts (`broadcasts.service.ts:160`), birthday cron and interview no-show INSERT into `notifications` directly, skipping `announce()` → no SSE, no push, stale bell count |
| **PIPE-001** | **P0** | Delivery intent is not durable — `registerAfterCommit` is an in-memory hook; `outbox_events` is the right table, is disconnected from notifications, and `isDispatchConfigured()` returns `false` |
| ~~**SEC-002/003**~~ | ~~**P0**~~ | **CLOSED** — signature-verified bounce/complaint webhook + `email_suppressions`, enforced at the `enqueueAndTry` choke point (covers all 75 direct-send sites) |
| **REG-003** | High | **79 of 130 declared events are never emitted** — all of CHAT, PROJECTS, PAYROLL, RECRUITMENT, INVENTORY, SURVEYS, CALENDAR, SIGN are aspirational |
| **REG-004/005/006** | High | 10 keys emitted but undeclared (build uses `build:ticket:assigned`, catalog declares `project.task.assigned`; e-sign emits `sign.envelope.*`, catalog declares `sign.document.*`). `eventKey` is a free-form `string`, and **no CI check** exists — which is why REG-001…004 coexist |
| ~~**RT-001**~~ | ~~High~~ | **CLOSED** — `pushPayloadSchema` has no free-text field; payload is `{category?, url?, notificationId?}` |
| **SCH-004** | High | **Nothing is partitioned** — `notifications`, `notification_deliveries`, `notification_queue`, `outbox_events`, `email_outbox` all `parts=0` |
| **SCH-001** | High | `serial` int4 PK on `notifications` + `notification_deliveries` against a 100M-row target (§19 requires identity/UUID) |
| **SCH-003** | High | Preferences are four JSONB blobs — unindexable, un-toggleable, no server-side preference centre |
| **SCH-014** | High | `email_outbox.organization_id` nullable, **34/34 rows NULL** → the table's RLS policy escapes on NULL, so it has no tenant isolation and no cost attribution |
| SCH-011 | High | `notification_preferences` UNIQUE on `(user_id)` alone → a two-org user shares one preference row across orgs |
| SCH-012 | High | `quiet_hours_timezone` defaults `'UTC'` while `user_preferences.timezone` defaults `'Asia/Kolkata'` → quiet hours land 5.5h off for the default user |
| SEC-004 | High | `hr-form:public-view` / `hr-form:public-submit` tiers absent from `TIERS` → both public endpoints are unlimited while looking protected |
| SEC-005/006 | High | No unsubscribe endpoint, no `List-Unsubscribe`, no consent record (source/timestamp/legal basis) |
| COMP-004 | High | **India DLT registration not started** — weeks-long, blocks SMS regardless of code |
| PIPE-006 | High | Fan-out is sequential, one transaction per recipient. 50k recipients = 50k transactions |
| PIPE-015 | High | Deactivation does not cancel already-queued deliveries |
| RT-003/004 | Med | `requestPermission()` fires **on mount**, spending the one prompt each user ever gets. Denied state has no UX. (**RT-002 CLOSED** — SW tags by `notif-<id>`) |
| RT-005/006 | Med | Support Ably token grants `support:${orgId}:*`; Ably tokens are 1h TTL with **no revocation** on deactivation |
| REG-007/008 | Med | Unknown `{{var}}` renders as `""` silently; **no rendered-content snapshot** on the delivery record, so "what did you send my employee" is unanswerable |
| REG-002 | Med | Catalog has 130 entries, live `notification_events` has 126 — seeding is not reconciled |
| PIPE-013 | Med | `rate_limit_max = 0` on **all 126** events — the mechanism exists and is switched off. No per-tenant cap |
| PIPE-008 | Med | `digestMode` is a stored field with no scheduler and no aggregation — users who pick it get nothing |
| PIPE-004 | Med | Dedupe is first-write-wins, not aggregation: 15 comments → "comment #1", not "15 new comments" |
| PIPE-011/012/014 | Med | No self-notification exclusion, no TTL/expiry, locale hardcoded `"en"` |
| PIPE-010 | Med | Backoff has no jitter; no circuit breaker per provider |
| ~~SEC-009~~ | ~~Med~~ | **CLOSED** — 90-day body purge / 13-month row delete via `/cron/notifications-retention-sweep` |
| SEC-007/008 | Med | Net pay and deal value rendered into email bodies (subjects are clean) |
| SCH-013 | Med | `uq_notification_events_org_key` is `(org_id, event_key)` with `org_id` nullable and **all 126 rows NULL** → covers nothing |
| SCH-005/006 | Low | `push_subscriptions` has no `last_seen_at`/`deleted_at`; `UNIQUE(endpoint)` is bare global |
| SCH-007/008 | Low | Unread index is not org-led; `idx_notifications_priority` is a useless single-column enum index |
| SCH-015..018 | Low | No unique on `notification_queue.delivery_id`; two-statement claim without `SKIP LOCKED`; `broadcasts.audience` JSONB; `notification_audit_logs.broadcast_id` has no FK |

---

## Non-findings — verified, do not re-raise

- **Idempotency is DB-enforced.** `uq_notification_deliveries_idempotency` UNIQUE on
  `idempotency_key` + `onConflictDoNothing` — not an application `if (exists)`. Confirmed in live DDL.
- **Preference resolution is correct and lives in one function** — `computeRouting()`
  (`notification-routing.service.ts:66-95`), order `mandatory → org policy (event > category >
  module > default) → user preference → catalog default`.
- **Quiet hours handle DST** — `Intl.DateTimeFormat` with IANA zones (`quiet-hours.util.ts:26-34`).
- **The delivery worker is tenant-safe** — `processQueue()` iterates `forEachOrg`
  (`notification-delivery-worker.service.ts:90`), so it does not trip the RLS GUC.
- **Composite tenant keys exist** on notifications, deliveries, queue, push subscriptions.
- **`notifications.entity_type`/`entity_id` is the grandfathered display/dedupe pointer** (§19),
  used exactly that way by `idx_notifications_dedupe`. Not a polymorphic-FK violation.
- **No file in `modules/notifications/` breaches the 500-line cap.** Three exceed the 300 target.
- **Recipient resolution is a single batched query, Set-deduplicated**, ACTIVE-membership filtered.
- **The Ably `chat:${orgId}:*` P0 (Access AC-02) is FIXED** — per-channel capability from a DB
  membership query, spec-asserted. `REFACTOR-STATE-ACCESS.md` updated. Residuals are RT-005/RT-006.
- **A 404/410 from the push service deletes the subscription** — both codes (`web-push.service.ts:40-61`).
- **VAPID absent → no-op, not fail-open** (`web-push.service.ts:26-27`).
- **Unread badge uses a dedicated `/notifications/unread-count` endpoint**, not `data.length`;
  the realtime update is a pure `invalidateQueries`, not content pushed into cache.
- **A preference centre already exists** at `/notifications/preferences`, grouped by concern,
  and the bell renders a `Drawer` below `md`. The UI phase is smaller than the brief assumes.

## Retracted from the 2026-07-31 audit (`docs/hrms/_recon/L-jobs-notifications.md`)

| Old claim | Status |
|---|---|
| "Outbox `deliver()` marks events DELIVERED with zero delivery" — P0 | **Retracted.** `flush()` now short-circuits and leaves rows PENDING. Fails safe. `outbox-publisher.service.ts:41-61` |
| "Notification worker sweeps globally" | **Retracted.** Uses `forEachOrg` |
| "Every emit is `void …catch(() => undefined)`" (design doc 2026-08-05) | **Retracted.** `registerAfterCommit` + logged failure |
| "Three timezone sources including `users.timezone`" (this session's schema agent) | **Corrected.** `users.timezone` does not exist in the live DB. There are two: `user_preferences.timezone` and `notification_preferences.quiet_hours_timezone` |

---

## Baseline (live DB, 2026-08-11)

No production volume; the baseline is a floor, not a figure to preserve.

`notifications` 3 · `notification_deliveries` 5 (`IN_APP/DELIVERED` 3, `EMAIL/SENT` 2) ·
`notification_queue` 2 · `push_subscriptions` 2 · `email_outbox` 34 (**`SENT` 30, `PENDING` 4,
oldest stuck 10 days**) · `notification_templates` **0** · `notification_preferences` **0** ·
`notification_suppression_rules` **0** · `outbox_events` **0** · `notification_events` **126**.

Provider spend is unmeasurable: `notification_deliveries.cost_amount` exists and is never written.

Registry population across 126 rows: `mandatory` 15 · `rate_limit_max > 0` **0** ·
`template_key` **0** · `audience_resolver` **0** · `dedupe_window > 0` 110.

---

## Decisions taken

| Question | Decision |
|---|---|
| Branch / commits | Stay on `main`, no commits until asked (§0.11) |
| Sequencing | **AC-02 (Ably capability) is owned by the Access program and lands first.** This program does not re-fix it |
| Migration strategy | Strangler per §9 of the brief. No production tenants means shadow-running is cheap — do it anyway, because it is the only way to prove the recipient sets match |
| Queue technology | **Postgres stays.** Upstash REST cannot support BullMQ; adding a TCP Redis is a new dependency and needs approval |

## Decisions needed before Phase 1 work starts

| # | Question | Why it blocks |
|---|---|---|
| **D-1** | Do the 75 direct-email sites migrate onto the engine, or does the engine gain a "transactional, no-preference" class that they adopt? | Decides whether suppression/consent can ever be enforced in one place. Payslips and magic links must not be preference-suppressible, but must be bounce-suppressible. At 75 sites across 18 modules this is the largest single piece of work in the program |
| **D-2** | Partition now or after the PK change? | The partition key must be in every PK/UNIQUE, so `notifications.id` → `(id, created_at)`. Doing them separately means rewriting the same tables twice. §19 also asks for the triggering row count — which today is 3 |
| **D-3** | Is `notification_templates` adopted or deleted? | 0 rows, 0 `template_key`s. §0.9 says delete dead code; but per-tenant/per-locale templates are the natural home for WhatsApp's approved-template state |
| **D-4** | Ably or self-hosted transport for the invalidation signal? | Ably is already paid for and already carries chat. Keeping it is right, but the badge signal must be an invalidation, not content |

---

## Corrections made while planning Phase 1

- **SCH-004 (partitioning) downgraded High → Deferred.** I raised it on the strength of the
  brief's "partitioned from day one"; §29 puts `CLAUDE.md` above the brief and §19 is explicit in
  the other direction at this table size. Recording the reversal rather than dropping it quietly.
- **SEND-BYPASS was scoped as a 75-site migration. It is a one-method fix.** See D-1.
- **The 0416 FK graph was denser than the first draft assumed.** `pg_catalog` shows five dependent
  constraints, including two Wave-4 composite tenant FKs on `(id, org_id)` and one from
  `notification_audit_logs`. The naive `ALTER COLUMN TYPE` would have failed on execution; the
  plan now drops and re-adds all five with `NOT VALID` → `VALIDATE`.
- **The enum vocabulary already carries `BOUNCED`, `CANCELLED`, `UNSUBSCRIBE`, `CONSENT_MISSING`
  and `INVALID_RECIPIENT`.** The words exist and nothing writes them, so the plan reuses them and
  adds exactly one new label (`NO_ACCESS`).

## Phase 0 status

Complete. **Gate: findings + D-1…D-4 need approval before any code change.**

Recommended order:

1. **REG-001** — smallest possible change with the largest effect: add `ACCOUNTING` to the
   `notification_category` enum (additive, no rewrite, no lock of consequence) and delete the
   `as NotificationCategoryValue` cast that hid it. Resurrects 19 events across the product's
   largest emitter. Ship a spec that asserts every catalog `category` is an enum member, or it
   comes back.
2. **PIPE-003** — permission re-check immediately before render. Self-contained, testable, and
   the only finding that is silently leaking content to the wrong people today.
3. **SEC-002 + SEND-BYPASS** — bounce/complaint webhook, then move suppression into the data
   layer so the direct-email path cannot bypass it. Order matters: suppression is worthless
   until something populates it.
4. **PIPE-001** — durable intent via `outbox_events`, which already has the right shape.
5. **SCH-001 + SCH-004 together**, per D-2.

**Do not start 3–5 before D-1…D-4 are answered.**
**Do not touch SCH-014 (`email_outbox.organization_id` NOT NULL) before the 14 fire-and-forget
sites are converted** — see SEQ-001. That ordering is not a preference; the reverse order is an
immediate silent outage of every transactional email.

## Not done in Phase 0

- Frontend feed / preference-centre / push-prompt audit — reported separately below once complete
- Per-type registry cross-check (declared-but-never-emitted, emitted-but-undeclared)
- Load measurement of the unread-count query at realistic row counts (3 rows today proves nothing)
- Ably channel/capability re-verification — deferred to the Access program which owns AC-02

## 2026-08-12 — closing pass

All work items are closed except those held by an explicit decision or a hard blocker.

- **PIPE-008 / PIPE-004** digest queue wired, cron endpoint live, coalescing proven on Neon.
- **SCH-017** migration `0430`; audience reads/writes cut over to `broadcast_audience_targets`.
  JSONB column retained — the contract step is a separate decision.
- **COMP-005** `NotificationWhatsAppProvider` enforces template approval before any send.
- **RT-007** message bodies removed from Ably payloads.
- Fixed a type-only import cycle I introduced with REG-005; `madge --circular` is back to zero.

Still open, each by decision rather than omission: **REG-003** (77 declared-but-unemitted events —
held as the Phase 2 spec), **SCH-004** (partitioning, deferred by D-2 until 50M rows),
**SCH-014** (blocked by SEQ-001), **COMP-004** (India DLT, human-only), **SNAP-001** (Drizzle
snapshot chain stale — `db:generate` will re-propose applied work until it is rebuilt).

Nothing committed; working tree only.

