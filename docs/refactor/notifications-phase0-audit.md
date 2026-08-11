# Notifications & Realtime Delivery — Phase 0 Audit (read-only)

**Date:** 2026-08-11 · **Scope:** every path that sends anything to a human
**Method:** code read + live-DB introspection (`pg_catalog`, RLS probes as both roles)
**Status:** Phase 0 complete. **Gated — no code changed.**

> Supersedes `docs/hrms/_recon/L-jobs-notifications.md` (2026-07-31) where they disagree.
> Three of that document's findings are **retracted below** — the code changed since.

---

## 0. Verdict in one paragraph

The engine exists and is better than the brief assumes: a declared registry, a DB-enforced
idempotency constraint, a single preference resolver in the correct order, quiet hours that
handle DST, per-org claim via `forEachOrg`, and stepped retry with a DEAD state. What is wrong
is worse than a design gap. **An entire module's notifications have never been delivered** —
all 19 `accounting.*` events carry `category: "ACCOUNTING"`, which is not a member of the
`notification_category` Postgres enum, so every insert dies `22P02` and is swallowed by the
after-commit error handler (§4, REG-001, proven by transaction probe). Beyond that: **no
permission re-check at delivery** (zero `AccessService` references anywhere in the path),
**delivery intent is not durable** (`registerAfterCommit` is an in-memory hook; the real outbox
is disconnected and switched off), **the engine is the minority send path — 63 sites against 75
direct-email sites across 18 modules, in a 181-path inventory** — **61% of the catalog has never
been emitted**, and
**nothing is partitioned** while `notifications` carries a `serial` int4 PK against a 100M-row
target. Everything else is an adapter or a column.

**The three P0s ranked by what they cost today:** REG-001 (accounting is silently dark) →
PIPE-003 (content leaks to users who lost access) → SEC-002/SEND-BYPASS (bounces never
suppress, and half the product cannot be suppressed at all).

---

## 1. Context (answered from the repo, not assumed)

| Question | Answer | Evidence |
|---|---|---|
| API deployment target | Long-lived Node process — `setInterval` workers exist and run | `notification-delivery-worker.service.ts:43` |
| Realtime transport | **Ably** (managed) | `.env.example` `ABLY_API_KEY`; `modules/realtime/` |
| Redis | Yes — **Upstash REST** (`UPSTASH_REDIS_REST_URL`) | `.env.example` |
| Job queue | **No BullMQ.** Postgres table + 15s poll | `notification-delivery-worker.service.ts:40-46` |
| Email provider | **ZeptoMail** (default) or **Resend**, selected by `EMAIL_PROVIDER` | `email/email.provider.ts:10-23`; `.env.example` |
| SMS / WhatsApp | **Twilio env vars already present, unset → channel disabled** | `.env.example` `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER` |
| Web push | VAPID keys env-configured | `.env.example` `VAPID_PUBLIC_KEY/PRIVATE_KEY` |
| Mobile apps | None in repo | — |
| Per-tenant sending domain | `notification_provider_accounts` table exists, **0 rows** | live DB |
| Live production tenants | **5 orgs / 7 users — dev only** | live DB |

**Consequence of "long-lived server":** the transport decision is not forced. Ably is already
paid for and already carries chat; keeping it is the cheap answer, but it is currently the
source of the platform's worst authorization defect (§6, AC-02).

---

## 2. Baseline (live DB, 2026-08-11)

There is no production volume. This is the number to beat, not to preserve.

| Table | Rows | Size | Partitioned | RLS |
|---|---:|---:|---|---|
| `notifications` | 3 | 160 kB | **no** | yes |
| `notification_deliveries` | 5 | 128 kB | **no** | yes |
| `notification_queue` | 2 | 96 kB | **no** | yes |
| `notification_events` (registry) | **126** | 128 kB | no | yes |
| `notification_templates` | **0** | 56 kB | no | yes |
| `notification_preferences` | **0** | — | no | yes |
| `notification_suppression_rules` | **0** | — | no | yes |
| `push_subscriptions` | 2 | 80 kB | **no** | yes |
| `email_outbox` | 34 | 304 kB | **no** | yes |
| `outbox_events` | **0** | 56 kB | **no** | yes |

Deliveries by channel: `IN_APP/DELIVERED: 3`, `EMAIL/SENT: 2`.
`email_outbox`: `SENT 30`, **`PENDING 4` — oldest stuck since 2026-08-01** (10 days).

**Registry completeness across all 126 rows** — the columns exist, the values do not:

| Attribute | Populated |
|---|---|
| `mandatory` | 15 / 126 |
| `rate_limit_max > 0` | **0 / 126** — rate limiting is declared but disabled everywhere |
| `dedupe_window_seconds > 0` | 110 / 126 |
| `template_key` | **0 / 126** |
| `audience_resolver` | **0 / 126** |
| `user_configurable` | 121 / 126 |

Channels: `IN_APP+EMAIL` 73 · `IN_APP` 37 · `IN_APP+PUSH` 11 · `IN_APP+PUSH+EMAIL` 5.
Quiet hours: `respect` 107 · `always_bypass` 14 · `bypass_if_high` 5.
Events by module: accounting 22 · crm 10 · knowledge 10 · build 9 · hr 7 · chat 6 · sign 6 ·
payroll 6 · support 6 · recruitment 6 · ownership 6 · inventory 6 · security 5 · calendar 5 ·
organization 5 · surveys 5 · billing 5 · system 1.

Provider spend: not measurable — `notification_deliveries.cost_amount` exists and is never written.

---

## 3. Retractions from the 2026-07-31 audit

Verified against current code. Do not re-raise these.

| Old claim | Status |
|---|---|
| "Outbox drain `deliver()` marks events DELIVERED with zero delivery" — P0 | **RETRACTED.** `flush()` now short-circuits when `isDispatchConfigured()` is false and leaves rows PENDING. It fails *safe* and warns once. `outbox-publisher.service.ts:41-61` |
| "Notification worker sweeps globally" | **RETRACTED.** `processQueue()` iterates `forEachOrg`. `notification-delivery-worker.service.ts:90` |
| "Every emit is `void …catch(() => undefined)`" (design doc, 2026-08-05) | **RETRACTED.** `emit()` uses `registerAfterCommit` and logs failures. `notification-dispatch.service.ts:55-64` |

---

## 4. Correctness findings

| ID | Location | Evidence | Failure mode | Duplicate? Drop? | Sev |
|---|---|---|---|---|---|
| **REG-001** | `notification-events.catalog.ts:265-287`; `db/schema/common/enums.ts:75-78`; `notification-dispatch.service.ts:244` | Live probe: `INSERT … category 'ACCOUNTING'::notification_category` → **`22P02 invalid input value for enum notification_category`**. The enum has 18 values, none of them `ACCOUNTING`. `notification_events.category` is `text` so the registry row seeds fine; `notifications.category` is the enum so the delivery insert dies. The `as NotificationCategoryValue` cast at `:244` hides it at compile time | **All 19 `accounting.*` events have never produced a notification.** Accounting is the largest emitter in the catalog (22 events, 21 emit sites). `emit()` wraps the work in `registerAfterCommit(…).catch(logger.error)`, so the business transaction commits, the error is logged once, and nothing else surfaces | **Drops 100%** | **P0** |
| **PIPE-003** | whole notification path | **Zero `AccessService` / `applyScope` references** in `modules/notifications`, `modules/push`, `modules/realtime` | Only `filterOrgMemberIds` (ACTIVE membership) gates delivery. A user removed from a project, or whose record ACL changed, between enqueue and send still receives title + body | **Drop required, does not happen** | **P0** |
| **PIPE-001** | `notification-dispatch.service.ts:55` | `registerAfterCommit(() => this.emitNow(input)…)` | In-memory hook. Crash between COMMIT and hook = notification lost with no durable record of intent. `outbox_events` is the right table and is disconnected + `isDispatchConfigured() === false` | **Drops** | **P0** |
| **SEND-DIRECT** | `email-outbox.service.ts:22-101` | No suppression query on the direct path | Payslips, invitations, HR mail, magic links bypass the engine: no preference, no suppression, no delivery record, no quiet hours | **Drops user intent** | **P0** |
| PIPE-006 | `notification-dispatch.service.ts:103-112` | `for (const userId of targets) { await this.persistForUser(…) }`, each opening its own `db.transaction()` | 50,000 recipients = 50,000 sequential transactions. Broadcasts batch at 100 (`broadcasts.service.ts:174`); dispatch does not | Neither, but unusable at scale | High |
| PIPE-015 | `notification-delivery-worker.service.ts:169-212` | Worker re-checks nothing when claiming | Deactivation does not cancel already-queued deliveries | Sends after revocation | High |
| PIPE-011 | `notification.types.ts:55`; dispatch | `actorUserId` stored, never compared to `targetUserIds` | Self-notification suppression is a per-caller convention, unenforced | Duplicates noise | Med |
| PIPE-012 | module-wide | No TTL column, no expiry sweep | Stale notifications deliver late instead of expiring | — | Med |
| PIPE-014 | `notification-dispatch.service.ts:172` | `channelRows.find(r => r.locale === "en") ?? channelRows[0]` | Locale hardcoded; recipient locale never consulted | — | Med |
| PIPE-010 | `notification-delivery-worker.service.ts:12` | `BACKOFF_MINUTES = [1,5,15,60,360]` | No jitter → provider-wide failures retry in lockstep. No circuit breaker | — | Med |
| PIPE-008 | `notification-preferences.service.ts:23` | `digestMode` stored, no scheduler, no aggregation | Digest is a field with no runtime effect; users who select it get nothing | **Drops** | Med |
| PIPE-013 | live DB | `rate_limit_max = 0` on **all 126** events | Per-recipient rate limiting is implemented and switched off. No per-tenant cap at all | Runaway loop unbounded | Med |
| PIPE-004 | `notification-dispatch.service.ts:188-191` | Time-bucket key + `onConflictDoNothing` | First-write-wins dedupe, **not** aggregation. 15 comments → 1 notification about comment #1, not "15 new comments" | — | Med |

**PIPE-009 idempotency is PRESENT and correct** — `uq_notification_deliveries_idempotency`
UNIQUE on `idempotency_key`, enforced by the DB via `onConflictDoNothing`, not by an
application `if (exists)`. Verified in live DB.

**PIPE-005 preference resolution is PRESENT and correct** — one function, `computeRouting()`
(`notification-routing.service.ts:66-95`), order `mandatory → org policy (event > category >
module > default) → user preference → catalog default`.

---

## 5. Schema findings

| ID | Table / column | Evidence | Problem | Fix | Migration risk |
|---|---|---|---|---|---|
| **SCH-001** | `notifications.id`, `notification_deliveries.id`, `push_subscriptions.id`, `notification_preferences.id` | `integer DEFAULT nextval(...)` — live DDL | **`serial` int4 PK on the highest-fan-out table in the product.** §19 requires UUID or `generatedAlwaysAsIdentity`. int4 caps at 2.1B; fan-out-on-write at the stated scale reaches that | `bigint GENERATED ALWAYS AS IDENTITY` | High — FK'd by `notification_deliveries.notification_id`, `notification_queue.delivery_id` |
| **SCH-002** | all notification tables | every timestamp is `timestamp without time zone` — live DDL | Quiet hours, digests, scheduling and DST all reason over a type with no offset | `timestamptz` | Med — rewrite, needs a stated source offset |
| **SCH-003** | `notification_preferences.categories`, `.channel_categories`, `.event_preferences`, `.module_preferences` | all `jsonb` — live DDL | **Preferences are four JSONB blobs.** Cannot index, cannot answer "who has payroll email on", cannot atomically toggle one row, cannot build a preference centre server-side. §19 bans JSONB for lifecycle entities | Junction table `(org_id, user_id, event_key, channel, mode)` | Med — 0 rows today, so this is free right now |
| **SCH-004** | `notifications`, `notification_deliveries`, `notification_queue`, `outbox_events`, `email_outbox` | `pg_inherits` → `parts=0` for every one | **Nothing is partitioned.** These are the five highest-growth append-only tables in the product | RANGE on `created_at`, monthly | High later, trivial now (§19: decide before partitioning — PK must carry the key) |
| **SCH-005** | `push_subscriptions` | cols: `id, user_id, org_id, endpoint, p256dh, auth, user_agent, created_at` | **No `last_seen_at`, no `updated_at`, no `deleted_at`.** Dead-subscription detection has no signal except a 410 | add `last_seen_at`, soft-delete | Low |
| **SCH-006** | `push_subscriptions_endpoint_unique` | `UNIQUE (endpoint)` — bare global | Endpoint is globally unique in principle, but the constraint is cross-tenant: two users sharing a browser collide across orgs | `UNIQUE (org_id, user_id, endpoint)` + explicit takeover | Low |
| SCH-007 | `idx_notifications_user_unread_created (user_id, is_read, created_at)` | live DDL | **Not org-led** (§19). This backs the most-executed query in the product | `(org_id, user_id, is_read, id DESC) WHERE deleted_at IS NULL` | Low |
| SCH-008 | `idx_notifications_priority (priority)` | live DDL | Single-column index on a 4-value enum — never selective, pure write cost | drop | Low |
| SCH-009 | `notification_deliveries.cost_amount` / `cost_currency` | live DB: never written | Cost model per channel/tenant/type is unreportable — the columns exist and no writer populates them | populate in each adapter | Low |
| SCH-010 | `notification_templates` | **0 rows**, and `template_key` null on all 126 events | The DB template system is entirely unused; content is built in code | decide: adopt or delete (§0.9) | Low |
| **SCH-011** | `notification_preferences_user_id_unique` | live DDL: `UNIQUE (user_id)` — **bare global**, while `uniq_notification_preferences_org_id (org_id, id)` sits beside it | **One preference row per user across all orgs.** A two-org user carries org A's quiet hours, digest mode and mutes into org B, and the second org's write overwrites the first | `UNIQUE (org_id, user_id)` | Low — 0 rows today |
| **SCH-012** | `notification_preferences.quiet_hours_timezone` | live DDL: `DEFAULT 'UTC'` and **nullable**, while `user_preferences.timezone` is `NOT NULL DEFAULT 'Asia/Kolkata'` | **Quiet hours default to a different timezone than the user.** An IST user setting 22:00–07:00 gets it applied in UTC — the quiet window lands 03:30–12:30 local, i.e. it silences the working day and lets the night through | resolve from `user_preferences.timezone`; drop the second source | Low |
| **SCH-013** | `uq_notification_events_org_key (org_id, event_key)` with `org_id` **nullable** | live DDL; **all 126 rows have `org_id IS NULL`** | `NULL <> NULL` in a btree unique, so the constraint covers **none** of the catalog. Duplicate global event definitions are insertable today, and `resolveDefinition` would pick arbitrarily | partial `UNIQUE (event_key) WHERE org_id IS NULL` | Low — additive |
| **SCH-014** | `email_outbox.organization_id` | live DDL: nullable, no FK; **34 of 34 rows are NULL** | **Every email ever sent is untenanted.** Its RLS policy escapes on `organization_id IS NULL`, so the table has no isolation in practice, and per-tenant email volume/cost is unattributable | backfill + `NOT NULL` + FK `NOT VALID` → `VALIDATE` | Med — needs a platform sentinel org for genuinely org-less mail |
| SCH-015 | `notification_queue.delivery_id` | no unique index (live DDL) | A retried `persistForUser` can enqueue two queue rows for one delivery | `UNIQUE (delivery_id)` | Low |
| SCH-016 | `notification-delivery-worker.service.ts:94-124`; `outbox-publisher.service.ts:89-119` | `SELECT ids … LIMIT n` then `UPDATE … WHERE id IN (ids)` | Two-statement claim without `FOR UPDATE SKIP LOCKED`. The status re-check in the UPDATE makes it *correct*, but two workers burn a round-trip fighting for the same rows | single CTE with `FOR UPDATE SKIP LOCKED` | Low — SQL only |
| SCH-017 | `broadcasts.audience` / `.channels` | `jsonb` holding `roleIds`/`departmentIds`/`userIds` (`shared.ts:86-87`) | Relational data in JSONB (§19). "Every broadcast targeting department X" needs a GIN containment query | junction tables | Med |
| SCH-018 | `notification_audit_logs.broadcast_id` | `integer`, no FK (`shared.ts:112`) | Orphan pointer; a deleted broadcast leaves an unjoinable id | FK `ON DELETE SET NULL` | Low |

**Not a finding:** `notifications.entity_type` + `entity_id` is a polymorphic pair, but CLAUDE.md
§19 grandfathers it as a display/dedupe pointer — and that is exactly its use here
(`idx_notifications_dedupe (org_id, event_key, entity_type, entity_id)`). It is never the sole
resolution path.

**Not a finding:** composite tenant keys are present — `uniq_notifications_org_id (org_id, id)`,
`uniq_notification_deliveries_org_id`, `uniq_notification_queue_org_id`, `uniq_push_subscriptions_org_id`.

---

## 6. Security & tenancy findings

| ID | Location | Evidence | Problem | Sev |
|---|---|---|---|---|
| ~~SEC-001~~ | `ably.service.ts:35-43` | **DISPROVEN — AC-02 is already fixed.** Chat capability is now `chat:${orgId}:${channelId}` per member channel, sourced from a DB membership query; `ably.service.spec.ts:47-57` asserts the wildcard is gone | — |
| **SEC-002** | email path | no bounce/complaint webhook exists for ZeptoMail or Resend | Hard bounces and spam complaints are never recorded, never suppressed, and resend on the next payslip run. Sender reputation degrades until nothing arrives for anyone | **P0** |
| **SEC-003** | `email-outbox.service.ts:22-101` | no suppression query | Suppression exists (`notification_suppression_rules`) and only the engine honours it | **P0** |
| SEC-004 | `hr-forms-public.controller.ts:30-38` | `check("hr-form:public-view" \| "hr-form:public-submit", ip)`; neither key is in `TIERS` | `RateLimitService.check()` returns `{allowed:true}` for unknown keys → both public endpoints are unlimited while appearing protected | High |
| SEC-005 | — | no unsubscribe endpoint, no `List-Unsubscribe`, no token | Email recipients cannot opt out without logging in | High |
| SEC-006 | — | no consent table (source / timestamp / legal basis) | SMS and WhatsApp cannot legally ship without this | High |
| SEC-007 | `email/templates/payroll.ts:18-21` | `` value: `₹${netSalary}` `` in the HTML body | Net pay in an email body, retained in `email_outbox.html` indefinitely | Med |
| SEC-008 | `email/templates/notifications-crm-hr.ts:46` | `rows.push({ label: "Value", value: dealValue })` | Deal value in an email body | Med |
| SEC-009 | `email_outbox`, `notification_deliveries`, `notification_queue` | no purge job in `cron.module.ts` | Bodies and `recipientAddress` retained forever; `email_outbox.html` holds the salary figure from SEC-007 | Med |
| SEC-010 | `POST /webhooks/payments/...` | signature-verified, no rate limit | DoS/replay flood surface | Low |

**RLS probe (run as both roles, no tenant GUC):** `streamline_app` (non-BYPASSRLS, what the app
uses in production per `env.validation`) is denied `42501` on `notification_queue`,
`notification_deliveries`, `notifications`, `push_subscriptions` and `outbox_events`.
`email_outbox` is the only one that passes, because its policy carries an explicit
`CASE WHEN organization_id IS NULL THEN true` escape. **This is correct today** — the worker
uses `forEachOrg` — but it means any future global sweep over these tables fails closed, and
any new background job must use `forEachOrg` or `runInNewTenantTransaction`.

---

## 7. Compliance findings

| ID | Channel | Requirement | Gap | Sev |
|---|---|---|---|---|
| COMP-001 | Email | Bounce/complaint handling | Absent — see SEC-002 | **P0** |
| COMP-002 | Email | One-click unauthenticated unsubscribe, correctly scoped, signed expiring token | Absent entirely | High |
| COMP-003 | All | Consent per channel with source + timestamp + legal basis | Absent. `notification_preferences` holds booleans, not consent events | High |
| COMP-004 | SMS | **India DLT registration** — entity, header and content templates registered before Indian traffic delivers | Not started. Weeks-long, not a code change. Twilio env vars already exist, so this is the blocker on enabling SMS | High |
| COMP-005 | WhatsApp | Pre-approved templates; approval state modelled; conversation-category pricing | Not modelled | High |
| COMP-006 | All | Retention + purge of message bodies | Absent — see SEC-009. `hr/governance/retention` is a policy store with no sweeper | Med |
| COMP-007 | Email | Transactional / marketing stream separation | Single domain, single stream | Med |
| COMP-008 | Email | SPF / DKIM / DMARC, per-tenant sending domain | Not modelled (`notification_provider_accounts` exists, 0 rows) | Med |

---

## 8. Existing send paths — the migration checklist

**There are three parallel systems, not one.** Counted independently by grep, cross-checked
against the registry audit.

| # | Path | Sites | Modules | Preferences? | Suppression? | Quiet hours? | Delivery record? | Dedupe? |
|---|---|---:|---|---|---|---|---|---|
| 1 | `dispatch.emit()` — the engine | **63** | accounting, api-tokens, expenses, finance, hr, invoices, leads, mfa, organization, ownership, rbac, support | yes | yes | yes | yes | yes |
| 2 | `notifications.create()` — direct row insert | many | build, billing, e-sign, hr, payroll, leads, deals, surveys, kb, automation, crm | **no** | **no** | **no** | **no** | **no** |
| 3 | `EmailService.send*()` — direct email | **75** | auth, build, calendar, chat, clients, cron, deals, e-sign, expenses, hr, leads, organization, payroll, platform, public, support, tasks, users | **no** | **no** | **no** | **no** | **no** |
| 4 | `AutomationEmailService` → `dispatchEmail()` — no outbox at all | 3 | hr automations, crm automation runner, crm sequences runner | **no** | **no** | **no** | **no** | **no** |
| 5 | Ably / `WebPushService` direct | ~20 | chat, support, notifications | n/a | **no** | **no** | **no** | **no** |
| 6 | `TwilioGateway` direct — SMS / WhatsApp | 2 | admin `email-routes.service.ts:45,55` | **no** | **no** | **no** | **no** | **no** |

**Correction — the direct-email figure is 75, not the 31 first recorded here.** The first pass
grepped `sendEmail(` / `enqueueAndTry(` / `dispatchEmail(`, which misses every *named* sender
(`sendInvitationEmail`, `sendWelcomeEmail`, `sendLeaveStatusUpdateEmail`, …). Counting
`this.email.send*(` outside `modules/email/` gives **75 call sites across 18 modules** — verified
by grep, and consistent with the 181-path inventory. The engine is the minority path by a wide
margin.

A per-path inventory of all **181** send paths (SEND-001…SEND-181) with trigger, channel,
recipient rule, template source and retry policy is the migration checklist; the structural
findings it produced are below.

### Findings from the send-path inventory

| ID | Evidence | Problem | Sev |
|---|---|---|---|
| **SEND-001** | `cron/cron-hr.service.ts:200` and `:220` | **Dual send.** `processDocumentExpiry()` fires `hrAutomation.emit("document.expiring")` **and** `this.email.sendEmail(...)` for the same event. Any automation rule configured for `document.expiring` that sends mail duplicates the direct send. §9 of the brief forbids dual-send outright | High |
| **SEND-002** | `notifications/broadcasts.service.ts:160`; `cron/cron-notifications.service.ts:96`; `cron/cron-recruitment.service.ts:221` | Three paths **INSERT into `notifications` directly**, skipping `NotificationsService.announce()`. No SSE push, no web push, no delivery row — the bell shows a stale count until the user polls. Org-wide broadcasts and every birthday notification are in this set | High |
| **SEND-003** | `email/email-routes.service.ts:45,55` | Admin SMS and WhatsApp go straight to `TwilioGateway` with **no outbox, no retry, no fallback**. A Twilio blip loses the message with no recovery path | Med |
| **SEND-004** | `crm-automation-runner.service.ts`; `crm-sequences-runner.service.ts:163`; `hr-automation-actions.service.ts:81` | `AutomationEmailService` calls `dispatchEmail()` — 3 in-process retries, **no DB durability**. Both providers down or rate-limited for ~seconds = permanent silent loss | Med |
| **SEND-005** | `expenses/expenses-write.service.ts:383`; `payroll/payout/publishing.service.ts:261` | Sends carrying an **attachment** (XLSX report, payslip PDF) are effectively non-retryable through the outbox | Med |
| **SEND-006** | `email/email-senders.base.ts` | `sendAccountLockedEmail()` has zero call sites — dead code (§0.9) | Low |

### The fire-and-forget / dead-transaction question — resolved by probe

14 `void …` send sites run after the request handler returns (`payroll/payout/publishing.service.ts:261`
has no `.catch` at all; `build/core/projects-provision.service.ts:119`,
`projects-tickets-update.service.ts:286`, `projects-tickets-transfer.service.ts:236`,
`hr/time/work-logs.service.ts:180`, `hr/helpdesk/hr-helpdesk.service.ts:175`,
`hr/interviews/hr-interview-scheduling.service.ts:223` and others swallow with
`.catch(() => undefined)`). Each chains into an `email_outbox` INSERT on an ALS handle whose
transaction has already committed — the §20 failure mode that produced zero notification rows
for the life of the product.

**Probed as `streamline_app` with no tenant GUC:**

| Insert | Result |
|---|---|
| `email_outbox` with `organization_id = NULL` | **ACCEPTED** |
| `email_outbox` with a real `organization_id` | **`42501` no tenant context** |

**So these sends work today only because `organization_id` is always NULL** — which is exactly
why 34 of 34 rows are NULL (SCH-014). The two are load-bearing for each other.

> **Hard sequencing constraint: SCH-014 must not be fixed on its own.** Making
> `email_outbox.organization_id` NOT NULL without first converting these 14 sites to
> `registerAfterCommit` + `runInNewTenantTransaction` breaks **every fire-and-forget email in the
> product simultaneously**, silently, including payslips — and each one is already wrapped in a
> `.catch` that discards the error.

Roughly 60 `.catch(() => undefined)` / `.catch(() => {})` sites sit on notification and send
paths, including all six publish methods in `ably.service.ts`. Two sites do it correctly and are
the pattern to copy: `build/core/projects-tickets-update.service.ts:279` and
`projects-tickets-transfer.service.ts:220` log the error instead of discarding it.

Path 2 is the more insidious of the two bypasses: it writes a row the feed renders, so it
*looks* like the engine ran. It has no `eventKey` on most call sites
(`hr/time/leaves-approval.service.ts:354,419`, `payroll/insights/payroll-notifications.service.ts`
×6, `hr/interviews/hr-interview-scheduling.service.ts:159`,
`deals/deals-approvals.service.ts:80`, `surveys/survey-lead-automation.service.ts:140`,
`kb/kb-pages.service.ts:449`, `automation/automation.service.ts:90`, and others), so those
notifications can never be tied to a preference, a category filter, or a rate limit.

---

## 9. Registry findings

| ID | Evidence | Problem |
|---|---|---|
| **REG-001** | see §4 | 19 `accounting.*` events undeliverable — enum rejects the category |
| **REG-002** | catalog 130 entries vs live `notification_events` **126 rows** | 4 catalog entries never reached the DB. `onModuleInit` seeding is not reconciled |
| **REG-003** | registry audit, per-key emit trace | **79 of 130 declared events are never emitted.** All of CHAT (6), PROJECTS (9), PAYROLL (6), RECRUITMENT (6), INVENTORY (6), SURVEYS (5), CALENDAR (5), SIGN (6) are aspirational |
| **REG-004** | `projects-tickets-create.service.ts:203`; `projects-activity.service.ts:305`; `e-sign/sign-integrations.service.ts:43`; `billing/core/plan-limits.service.ts:429` | **10 keys emitted but undeclared.** Build uses colon notation (`build:ticket:assigned`) while the catalog declares dot notation (`project.task.assigned`); e-sign emits `sign.envelope.*` while the catalog declares `sign.document.*`; `billing.quota.exceeded/warning` and `sign.bulk_send.completed` have no entry at all |
| **REG-005** | `notification.types.ts:32` — `eventKey: string` | Event key is a **free-form string**, not a union or enum. Nothing catches REG-004 at compile time |
| **REG-006** | `.github/workflows/backend.yml` | **No CI check** that an emitted key is declared, or that a template references only declared variables. This is what allows REG-001…004 to coexist |
| **REG-007** | `notification-dispatch.service.ts:184-186` | `renderPlaceholders` replaces an unknown `{{var}}` with `""`. The template row's `variables: string[]` is never consulted. A renamed variable silently produces a blank in a live email |
| **REG-008** | `notificationDeliveries` columns | **No rendered-content snapshot.** `metadata` holds `{title, message, link}` at write time; there is no subject/body column and no `template_version`. "What exactly did you send my employee" is unanswerable once a template changes |

---

## 10. Realtime & web push findings

| ID | Evidence | Problem | Sev |
|---|---|---|---|
| **RT-001** | `chat-messages.service.ts:213-217`; `notifications.service.ts:113-117`; `notification-web-push.provider.ts:21-25` | **Push payloads carry real content** — `body: message.content.slice(0,80)` for chat, `input.message.slice(0,140)` for everything else. Payloads transit a third-party push service and render on lock screens. Because the same `message` string carries HR decisions, approvals and amounts, this is the payload-minimisation violation | **P1** |
| RT-002 | `chat-realtime.ts:215`; `chat-notifications.ts:93` | `new Notification()` fired per tab with **no `tag`** → three open tabs produce three OS notifications for one message. The SSE path (`use-notification-events.ts:65`) does it correctly with `tag: notif-${id}` | P1 |
| RT-003 | `hooks/common/use-push-subscription.ts:10-11`; `hooks/api/chat-notifications.ts:38-43` | `Notification.requestPermission()` fires **inside `useEffect` on mount** — on page load, with no context and no demonstrated value. A denial is effectively permanent; this spends the one prompt each user ever gets | P1 |
| RT-004 | — | **Denied state has no UX.** Both call sites swallow the denial. No banner, no explanation, no path to browser settings | P2 |
| RT-005 | `ably.service.ts:91-95` | Support token grants `support:${orgId}:*` subscribe+presence — any `support:tickets:view` holder subscribes to **every** ticket channel in the org, including tickets the REST API would not show them | P2 |
| RT-006 | `ably.service.ts:6,43,95` | Ably tokens are 1-hour TTL with **no server-side revocation** (`revokeTokens` is never called). A deactivated user keeps a live realtime connection for up to an hour | P2 |
| RT-007 | `notification-event.service.ts:40` | The SSE feed pushes `{title, message, …}` — content, not an invalidation signal. The client-side handling is correct (invalidate-only), so the content is redundant payload with an authorization surface | P2 |
| RT-008 | `notifications/page.tsx:74-83`; `hooks/api/notifications.ts:69-90` | Feed uses plain `useQuery` with `limit: 50` and **no cursor** — the backend supports `cursor` (`notification.schemas.ts:14`) and the frontend ignores it. No load-more, no infinite scroll | P3 |
| RT-009 | `use-notification-events.ts:90` | SSE token passed as a **URL query parameter** (`?token=`). Mitigated: 120s TTL and single-use (`consumeToken` deletes on first read), but it lands in access logs | P3 |

**Verified good — do not re-raise:**
- **The `chat:${orgId}:*` P0 (AC-02) is FIXED.** `createChatTokenRequest` now issues
  `chat:${orgId}:${channelId}` per member channel, from a DB membership query
  (`ably.service.ts:35-43`; `chat-channels.service.ts:59-72`), and `ably.service.spec.ts:47-57`
  asserts no wildcard chat capability. `huddle-signal:${orgId}:*:${clientId}` pins the last
  segment to the caller. **`REFACTOR-STATE-ACCESS.md` AC-02 should be closed.**
- 404/410 from the push service **deletes the subscription** (`web-push.service.ts:40-61`),
  both codes, batched after `Promise.allSettled`.
- VAPID absent → `configured` false → no-op, no fail-open (`web-push.service.ts:26-27`).
- Unread badge uses a **dedicated `GET /notifications/unread-count` endpoint**, not `data.length`.
- Realtime badge update is a **pure `invalidateQueries`** — no content pushed into cache.
- Preference centre exists at `/notifications/preferences`, **grouped by concern**, not a flat list.
- Mobile: `NotificationBell` renders a `Drawer` below `md`; both pages use `PageWrapper` and
  hold at 375px.

---

## 11. File sizes

No file in `modules/notifications/` exceeds the 500-line hard cap. Three exceed the 300 target:
`notification-routing.service.ts` 394 · `notification-delivery-worker.service.ts` 339 ·
`notification-dispatch.service.ts` 328.

---

## 12. Deliberately not done in Phase 0

- **No code changed.** Phase 0 is read-only and Phase 1 is gated.
- Load measurement of the unread-count query — 3 rows in the DB proves nothing. Needs the
  seed-then-EXPLAIN approach used for the Build baseline.
- Per-key trace of the ~79 dead catalog entries beyond confirming non-emission.
- Ably connection-lifecycle and reconnect behaviour.
- `knip` dead-code pass over the notification surface (§25 requires a real build, not grep).

---
