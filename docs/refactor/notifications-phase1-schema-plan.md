# Notifications — Phase 1 Core Model & Schema Plan (proposal, gated)

**Date:** 2026-08-11 · **Closes:** REG-001..008 · PIPE-001/003/006/013 · SCH-001/003/005/006/009/011/012/013/014/015 · SEC-002/003/005/006 · SEND-001..004 · SEQ-001
**Standing context:** no production tenants (5 orgs / 7 users) · `notification_templates` 0 rows · `notification_preferences` 0 rows · `outbox_events` 0 rows

Zero rows is the whole reason to do this now. Every structural change below is a direct additive
migration with no expand-contract, no backfill and no cutover. The same work against live
notification history would be a multi-week programme.

**Migration numbering (updated 2026-08-11 after two collisions).** Inventory took `0409`
(`0409_inv_transfer_cost_carry`) while this work was in flight. Shipped so far:

| # | Status |
|---|---|
| `0408_notification_category_accounting` | **shipped** (REG-001) |
| `0409_inv_transfer_cost_carry` | Inventory — not ours |
| `0410_notification_visibility_resource_kind` | **shipped** (PIPE-003) |
| `0411_suppression_reason_no_access` | **shipped** (PIPE-003) |

Remaining Phase 1 work therefore starts at **`0412`**, and `notification_outbox` — listed below as
`0409` — moves there. Check `ls migrations/04*.sql` immediately before writing a new one: this repo
already carries six duplicate migration numbers from exactly this race (`0300`, `0370`–`0375`).

---

## Decisions — D-1…D-4 answered

These were the Phase 0 gate. No answer arrived, so each is decided here under a stated assumption
and flagged. Reversing any of them is a document edit at this stage, not a migration.

| # | Decision | Rationale | If the assumption is wrong |
|---|---|---|---|
| **D-1** | **Do not migrate the 75 direct-email sites. Enforce at the choke point instead.** `EmailService` overrides the base seam — `override sendEmail(o) { return this.outbox.enqueueAndTry(o) }` (`email.service.ts:46`) — so **every one of the 75 named senders already funnels through `EmailOutboxService.enqueueAndTry()`**. Suppression, consent and tenant stamping go there. The engine additionally gains a `TRANSACTIONAL` class for events that must ignore preferences but honour suppression | 75 call sites across 18 modules is the largest single change in the programme and buys almost nothing that one method does not. One method gets us suppression on 100% of email in one edit | Only the 3 `AutomationEmailService` sites need real migration — they call `dispatchEmail()` directly and skip the outbox entirely |
| **D-2** | **Widen the PKs now. Defer partitioning.** `notifications.id` and `notification_deliveries.id` go `serial` → `bigint GENERATED ALWAYS AS IDENTITY` at 3 and 5 rows. Partitioning is **not** done | §19 forbids partitioning a table that is not demonstrably large and requires the triggering row count in the migration. Partitioning also forces `created_at` into every unique, so the `(org_id, id)` tenant keys and the `notification_deliveries.notification_id` FK could not be declared. This is the same call the Inventory programme made for `inv_stock_transactions`, for the same two reasons | Revisit at a measured row count. Recorded trigger: **50M rows in `notifications`** or 30 days of retention exceeding 100 GB, whichever first |
| **D-3** | **Keep `notification_templates`, invest nothing in it in Phase 1.** It is an unused *feature*, not dead code — `notification-templates.service.ts` and the dispatch render path both read it | Deleting it now means rebuilding it in Phase 3: WhatsApp requires per-template approval state and per-locale bodies, and this table is already keyed `(org_id, template_key, channel, locale, version)`. §0.9 targets unreachable code, which this is not | If WhatsApp is dropped from scope entirely, delete the table and the service in Phase 3 |
| **D-4** | **Keep Ably.** Deployment is a long-lived container, so the transport is a free choice, not a forced one — and Ably is already paid for and already carries chat | The client already treats the realtime message as an invalidation trigger (`use-notification-events.ts:93-107` invalidates rather than writing content into cache). Replacing the transport buys nothing and costs a migration | Fix the two real defects instead: the `support:${orgId}:*` wildcard and the absent `revokeTokens` on deactivation |

---

## Corrections to Phase 0

**SCH-004 (partitioning) is downgraded from High to Deferred**, per D-2 above. I listed it as a
High finding on the strength of the source brief's "partitioned from day one". §29 puts
`CLAUDE.md` above the brief, and §19 is explicit in the other direction for a table this size.
Recording the reversal rather than quietly dropping it.

**SEND-BYPASS was scoped as a 75-site migration. It is a 1-site fix plus 3 real migrations.**
Discovering the `EmailService.sendEmail` override changes the cost of D-1 by more than an order of
magnitude. This is the single most consequential thing found while planning.

**The enum vocabulary is richer than reported.** `notification_delivery_status` already carries
`BOUNCED` and `CANCELLED`; `notification_suppression_reason` already carries `UNSUBSCRIBE`,
`CONSENT_MISSING` and `INVALID_RECIPIENT`. The words exist; nothing writes them. Every mechanism
below therefore reuses existing enum members rather than adding new ones.

---

## The separation that governs everything

Domain modules emit an intent. They do not resolve recipients, choose channels, or render words.

```
domain mutation ──(SAME tx)──> notification_outbox          durable intent
notification_outbox ──> relay ──> recipients ──> visibility ──> preferences
                    ──> notifications + notification_deliveries + notification_queue
notification_queue  ──> delivery worker ──> adapter ──> provider ──> delivery record
```

Two rules make it hold, and both are enforced by a constraint or a test rather than a comment:

1. **`dispatch.emit(tx, input)` writes a row. It does not send.** The only code that talks to a
   provider is an adapter under `notifications/providers/`.
2. **An event key that is not in the catalog does not compile** (§6 below).

---

## 1. REG-001 — the accounting blackout (P0)

19 events, the product's largest emitter, have never delivered a notification. The catalog sets
`category: "ACCOUNTING"`; the enum has 18 values and that is not one.

```sql
-- 0408_notification_category_accounting.sql   ── this statement and nothing else
ALTER TYPE "notification_category" ADD VALUE IF NOT EXISTS 'ACCOUNTING';
```

**The migration must contain no other statement.** PostgreSQL 12+ permits `ADD VALUE` inside a
transaction block, but the new label cannot be *used* until that transaction commits — and Drizzle
wraps each migration file in one. Anything referencing `'ACCOUNTING'` ships in `0409` or later.

Code, same slice:

- Delete the `as NotificationCategoryValue` cast at `notification-dispatch.service.ts:244`. It is
  the §7 "never force types" violation that hid this for the life of the product.
- Add `"ACCOUNTING"` to `NotificationCategoryValue` (`notifications.types.ts:16-34`).
- **Spec `notification-catalog-integrity.spec.ts`** (this is the finding that matters — REG-006):
  every catalog `category` is a member of the pgEnum · every `defaultChannels ⊆ allowedChannels` ·
  no duplicate `eventKey` · every non-null `templateKey` resolves · every entry declaring
  `visibilityResourceKind` has a registered resolver. Without this spec the class of bug returns.

---

## 2. PIPE-001 — durable intent

`registerAfterCommit` (`tenant-context.ts:39`) is an in-memory array on an ALS store. A crash
between COMMIT and the hook draining loses the notification with no record that it was owed.

`outbox_events` is deliberately *not* reused: it carries `aggregate_version` with
`uniq_outbox_events_org_agg_version`, which a notification intent has no meaningful value for, and
its publisher is a broker seam that should stay free for real domain events.

```sql
-- 0409_notification_outbox.sql
CREATE TABLE "notification_outbox" (
  "id"              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "org_id"          text NOT NULL REFERENCES "organizations"("id"),
  "event_key"       text NOT NULL,
  "dedupe_key"      text NOT NULL,
  "actor_user_id"   text,
  "target_user_ids" jsonb NOT NULL,          -- opaque input payload, not relational state
  "entity_type"     text,
  "entity_id"       text,
  "variables"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "state"           text NOT NULL DEFAULT 'PENDING',   -- PENDING|IN_FLIGHT|PROCESSED|DEAD
  "attempt_count"   integer NOT NULL DEFAULT 0,
  "lease_expires_at" timestamptz,
  "last_error"      text,
  "occurred_at"     timestamptz NOT NULL DEFAULT now(),
  "processed_at"    timestamptz,
  "created_at"      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "uniq_notification_outbox_org_id" ON "notification_outbox" ("org_id","id");
CREATE UNIQUE INDEX "uniq_notification_outbox_dedupe" ON "notification_outbox" ("org_id","dedupe_key");
CREATE INDEX "idx_notification_outbox_claim" ON "notification_outbox" ("state","lease_expires_at","id")
  WHERE "state" IN ('PENDING','IN_FLIGHT');
```

`target_user_ids` and `variables` are JSONB deliberately and this is **not** a §19 violation: they
are an immutable copy of the call's arguments, never queried, joined, or updated. The relational
state is `notification_deliveries`, one row per recipient per channel, written by the relay.

**API.** `emit()` gains an optional first parameter:

```ts
emit(input: DispatchEventInput): Promise<DispatchResult>              // legacy, unchanged
emit(tx: DbOrTx, input: DispatchEventInput): Promise<DispatchResult>  // durable
```

The `tx` overload inserts one outbox row and returns. The relay drains it per org via `forEachOrg`
with a lease, exactly as `NotificationDeliveryWorker.processQueue()` already does
(`notification-delivery-worker.service.ts:90`), and calls the **existing** `emitNow()`. Routing,
preference resolution and persistence are untouched — only the trigger becomes durable.

**Migration is per-call-site and reversible.** The legacy overload keeps working and logs a
counter, so "how many call sites are still non-durable" is a number rather than an opinion. This
is the strangler seam for the whole programme.

**Claim uses `FOR UPDATE SKIP LOCKED`** in one statement, closing SCH-016 for the new table and
setting the pattern to backport to `notification_queue`.

---

## 3. PIPE-003 — permission re-check before render

Today: zero `AccessService` references in the entire notification path. The only gate is
`filterOrgMemberIds` (ACTIVE membership) at enqueue.

Object-level visibility cannot be answered generically — only the owning module knows whether a
user can still see ticket 41. So the registry declares the resource kind and each module registers
a resolver:

```ts
// notification-visibility.registry.ts
type VisibilityResolver = (orgId: string, userId: string, entityId: string) => Promise<boolean>;
register(resourceKind: string, resolver: VisibilityResolver): void;
```

Registry entry gains one nullable column:

```sql
-- 0410_notification_visibility.sql
ALTER TABLE "notification_events" ADD COLUMN "visibility_resource_kind" text;
```

Resolution rule, applied per recipient immediately before render in the relay:

| `visibility_resource_kind` | Behaviour |
|---|---|
| `NULL` | No object-level check. Correct for self-scoped events — "your payslip is ready", "your role changed", "your 2FA was disabled" — where membership *is* the authorization |
| set, resolver registered | Call it. `false` → skip this recipient, write `notification_deliveries.status = 'SUPPRESSED'`, `suppression_reason = 'MUTE'` **(see below)** |
| set, resolver missing | **Deny and log.** Fail closed per §0.5 |

`notification_suppression_reason` has no member for "lost access". Add one — it is the only new
enum value in the plan, and an audit trail that cannot distinguish "user muted this" from "user
was not allowed to see this" is not an audit trail:

```sql
-- 0411_suppression_reason_no_access.sql   ── alone, same ADD VALUE constraint as 0408
ALTER TYPE "notification_suppression_reason" ADD VALUE IF NOT EXISTS 'NO_ACCESS';
```

Phase 1 registers resolvers for the four kinds that carry real content today: `build.ticket`,
`kb.page`, `support.ticket`, `crm.deal`. Every other event stays `NULL` and is unaffected — this
is additive, not a rewrite of 126 entries.

---

## 4. Suppression and consent at the choke point

**SEC-002 — bounce and complaint webhooks.** Neither ZeptoMail nor Resend has a receiver today, so
a hard bounce resends forever and sender reputation decays until nothing arrives for anyone.

```
POST /webhooks/email/:provider     @Public()
```

Signature-verified per provider against a dedicated secret, raw-body — mirroring the Razorpay
receiver at `payment-webhook-health.service.ts:189-193`, which is the correct pattern already in
the repo. **`@UseRateLimit("email-webhook")` plus a matching `TIERS` entry** — the decorator alone
silently fails open (`RateLimitService.check()` returns `{allowed:true}` for unknown keys), which
is exactly how `hr-form:public-view` and `hr-form:public-submit` ended up unprotected.

```sql
-- 0412_email_suppressions_and_consent.sql
CREATE TABLE "email_suppressions" (
  "id"             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "email"          text NOT NULL,                       -- canonical lowercase; NOT a user FK
  "org_id"         text REFERENCES "organizations"("id"),  -- NULL = platform-wide
  "channel"        "notification_channel" NOT NULL,
  "reason"         "notification_suppression_reason" NOT NULL,
  "source"         text NOT NULL,                       -- PROVIDER_WEBHOOK|USER|ADMIN|IMPORT
  "evidence"       jsonb,
  "suppressed_at"  timestamptz NOT NULL DEFAULT now(),
  "expires_at"     timestamptz
);
CREATE UNIQUE INDEX "uniq_email_suppressions_global"
  ON "email_suppressions" ("email","channel") WHERE "org_id" IS NULL;
CREATE UNIQUE INDEX "uniq_email_suppressions_org"
  ON "email_suppressions" ("org_id","email","channel") WHERE "org_id" IS NOT NULL;
```

Keyed on **email, not `user_id`** — deliberately. The existing `notification_suppression_rules`
cascades on user delete, so purging a user resurrects their bounced address. A suppression must
outlive the account. Two partial uniques rather than one nullable composite, because
`NULL <> NULL` in a btree unique is precisely the bug found in SCH-013.

```sql
CREATE TABLE "notification_consents" (
  "id"           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "org_id"       text NOT NULL REFERENCES "organizations"("id"),
  "user_id"      text NOT NULL,
  "channel"      "notification_channel" NOT NULL,
  "destination"  text NOT NULL,                -- email address / E.164 number
  "state"        text NOT NULL,                -- GRANTED | WITHDRAWN
  "source"       text NOT NULL,
  "legal_basis"  text NOT NULL,                -- CONSENT | CONTRACT | LEGITIMATE_INTEREST
  "ip"           text,
  "user_agent"   text,
  "granted_at"   timestamptz,
  "withdrawn_at" timestamptz,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "uniq_notification_consents_current"
  ON "notification_consents" ("org_id","user_id","channel","destination");
CREATE UNIQUE INDEX "uniq_notification_consents_org_id" ON "notification_consents" ("org_id","id");
```

Plus an append-only `notification_consent_events` mirroring every transition — §20 requires consent
grants and withdrawals to be immutably logged, and a table with a mutable `state` cannot do that
alone.

**Enforcement is one method.** `EmailOutboxService.enqueueAndTry()` checks `email_suppressions`
before insert and returns `SUPPRESSED` rather than enqueueing. That covers all 75 direct sends and
the engine's own email adapter, because both pass through it. **SMS and WhatsApp additionally
require `state = 'GRANTED'`** before send — Phase 3 cannot ship without it.

**SEC-005 — unsubscribe.** `GET|POST /notifications/unsubscribe/:token`, `@Public()`, rate-limited
with a registered tier. Token is an HMAC over `(userId, orgId, scope, expiresAt)` using a
dedicated `UNSUBSCRIBE_TOKEN_SECRET` — never the session JWT secret, so a leaked link cannot be
replayed against anything else. `scope ∈ TYPE | CATEGORY | ALL_NON_MANDATORY`. Single-purpose,
30-day expiry, and honoured by writing an `email_suppressions` row so the same choke point
enforces it. `List-Unsubscribe` and `List-Unsubscribe-Post` headers on every non-mandatory email.

---

## 5. Preferences — normalise, and fix the two live bugs

Four JSONB blobs (`categories`, `channel_categories`, `event_preferences`, `module_preferences`)
cannot be indexed, queried, or atomically toggled. At 0 rows this is free to fix.

```sql
-- 0413_notification_preference_rules.sql
CREATE TABLE "notification_preference_rules" (
  "id"         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "org_id"     text NOT NULL REFERENCES "organizations"("id"),
  "user_id"    text NOT NULL,
  "scope_type" text NOT NULL,                       -- EVENT | MODULE | CATEGORY
  "scope_key"  text NOT NULL,
  "channel"    "notification_channel" NOT NULL,
  "mode"       text NOT NULL,                       -- ON | OFF | DIGEST
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "uniq_notification_pref_rule"
  ON "notification_preference_rules" ("org_id","user_id","scope_type","scope_key","channel");
CREATE INDEX "idx_notification_pref_rule_lookup"
  ON "notification_preference_rules" ("org_id","user_id","scope_type","scope_key");
CREATE UNIQUE INDEX "uniq_notification_preference_rules_org_id"
  ON "notification_preference_rules" ("org_id","id");
```

`channel` is `NOT NULL` with one row per channel rather than a nullable "all channels" row —
again because a NULL in a unique index enforces nothing. Absence of a rule means "fall through to
the header defaults", which is what makes conservative defaults expressible.

**SCH-011 — the multi-org preference bug.** `notification_preferences` has a bare
`UNIQUE (user_id)`, so a two-org user shares one row and the second org's write overwrites the
first.

```sql
DROP INDEX "notification_preferences_user_id_unique";
CREATE UNIQUE INDEX "uniq_notification_preferences_org_user"
  ON "notification_preferences" ("org_id","user_id");
```

**SCH-012 — quiet hours in the wrong timezone.** `quiet_hours_timezone` defaults `'UTC'` while
`user_preferences.timezone` defaults `'Asia/Kolkata'`. An IST user setting 22:00–07:00 silences
03:30–12:30 local — it mutes the working day and lets the night through. Drop the column; resolve
from `user_preferences.timezone`, which is `NOT NULL`. One source of truth, and the resolver in
`quiet-hours.util.ts` already takes an IANA string.

**Defaults become conservative.** Today `IN_APP`, `EMAIL` and `PUSH` are all on for everything.
Phase 1 sets `EMAIL` to `DIGEST` for `defaultPriority IN ('LOW','NORMAL')` and leaves it immediate
for `HIGH`/`CRITICAL` and every `mandatory` event. Everything-on is how a product teaches users to
filter it into the archive.

`computeRouting()` is **not moved or rewritten** — it is already correct and lives in one place
(`notification-routing.service.ts:66-95`). Only its input loader changes. That containment is the
point.

---

## 6. Registry hardening

**REG-005 — the key stops being a free string.** Mark the catalog `as const` and derive:

```ts
export type NotificationEventKey = (typeof NOTIFICATION_EVENT_CATALOG)[number]["eventKey"];
// DispatchEventInput.eventKey: NotificationEventKey
```

`build:ticket:assigned` and `sign.envelope.sent` then fail to compile against a catalog declaring
`project.task.assigned` and `sign.document.*` — REG-004 becomes a build error rather than a
silently dead notification. **Fix the catalog to match the emitted keys, not the reverse**: the
emitted names are what the product actually does, and §9 names the module `build`.

**REG-002 — 130 in code, 126 in the DB.** `onModuleInit` seeding is not reconciled. Make it a real
upsert over the full catalog on boot, and have the integrity spec assert
`catalog.length === count(notification_events WHERE org_id IS NULL)`.

**SCH-013 — the catalog's uniqueness enforces nothing.** `uq_notification_events_org_key` is
`(org_id, event_key)` with `org_id` nullable, and all 126 rows are global.

```sql
-- 0414_notification_events_global_unique.sql
CREATE UNIQUE INDEX "uniq_notification_events_global_key"
  ON "notification_events" ("event_key") WHERE "org_id" IS NULL;
```

**REG-007 — a missing variable renders as `""`.** `renderPlaceholders` swallows unknown keys
(`notification-dispatch.service.ts:184-186`). Validate the supplied `variables` against the
template row's declared `variables` array at render; a mismatch is a logged error and a fallback
to the catalog's static title/message, never a blank sent to a customer.

**REG-003 — 79 declared, never emitted.** Not deleted in Phase 1. They are the specification for
Phase 2, and the catalog is where a per-type migration plan lives. Any still unemitted at the end
of Phase 2 gets deleted then, per §0.9.

---

## 7. Delivery records — snapshot and cost

```sql
-- 0415_delivery_snapshot_and_cost.sql
ALTER TABLE "notification_deliveries"
  ADD COLUMN "rendered_subject"  text,
  ADD COLUMN "rendered_body"     text,
  ADD COLUMN "template_version"  integer,
  ADD COLUMN "expires_at"        timestamptz;
```

REG-008: "what exactly did you send my employee" is currently unanswerable once a template
changes. PIPE-012: `expires_at` gives a per-type TTL, so a stale notification is dropped at claim
time with `status = 'CANCELLED'` — a member already in the enum — instead of delivering something
worthless hours late.

`cost_amount` / `cost_currency` already exist and no adapter writes them (SCH-009). Each adapter
populates them on send; without that, cost per channel per tenant per type stays unreportable and
the Phase 6 cost model cannot be built.

---

## 8. Feed — PK width, broadcast path, unread count

**SCH-001.** `serial` int4 on the highest-fan-out table in the product, against a 100M-row target.

**The FK graph is denser than a first pass suggests.** Introspected from `pg_catalog`, five
constraints depend on these two columns — including the Wave-4 **composite tenant FKs**, which
reference `(org_id, id)` rather than `id`, and a third table nobody would think to check:

| Constraint | Shape |
|---|---|
| `notification_deliveries_notification_id_notifications_id_fk` | `notification_id → notifications.id` |
| `fk_notification_deliveries_notification_id_org` | **`(notification_id, org_id) → (id, org_id)`** |
| `notification_queue_delivery_id_notification_deliveries_id_fk` | `delivery_id → notification_deliveries.id` |
| `fk_notification_queue_delivery_id_org` | **`(delivery_id, org_id) → (id, org_id)`** |
| `fk_notification_audit_logs_notification` | **`notification_audit_logs.notification_id → notifications.id`** |

A referenced column's type cannot change while a composite FK depends on it. Drop, widen, re-add
`NOT VALID`, then `VALIDATE` — the §19 two-step, which also keeps the ACCESS EXCLUSIVE window
short:

```sql
-- 0416_notification_pk_widening.sql
SET lock_timeout = '5s';

ALTER TABLE "notification_audit_logs"  DROP CONSTRAINT "fk_notification_audit_logs_notification";
ALTER TABLE "notification_queue"       DROP CONSTRAINT "fk_notification_queue_delivery_id_org";
ALTER TABLE "notification_queue"       DROP CONSTRAINT "notification_queue_delivery_id_notification_deliveries_id_fk";
ALTER TABLE "notification_deliveries"  DROP CONSTRAINT "fk_notification_deliveries_notification_id_org";
ALTER TABLE "notification_deliveries"  DROP CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk";

ALTER TABLE "notifications"            ALTER COLUMN "id" TYPE bigint;
ALTER TABLE "notification_deliveries"  ALTER COLUMN "id" TYPE bigint,
                                       ALTER COLUMN "notification_id" TYPE bigint;
ALTER TABLE "notification_queue"       ALTER COLUMN "id" TYPE bigint,
                                       ALTER COLUMN "delivery_id" TYPE bigint;
ALTER TABLE "notification_audit_logs"  ALTER COLUMN "notification_id" TYPE bigint;

-- serial → identity: drop the default, drop the now-orphaned sequence, attach identity
ALTER TABLE "notifications"           ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "notifications_id_seq";
ALTER TABLE "notifications"           ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
-- (repeat for notification_deliveries, notification_queue)

ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") NOT VALID;
ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "fk_notification_deliveries_notification_id_org"
  FOREIGN KEY ("notification_id","org_id") REFERENCES "notifications"("id","org_id") NOT VALID;
-- (same pattern for the two notification_queue constraints and the audit-log one)

ALTER TABLE "notification_deliveries" VALIDATE CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk";
ALTER TABLE "notification_deliveries" VALIDATE CONSTRAINT "fk_notification_deliveries_notification_id_org";
-- (…)
```

Re-adding the composite FK requires `uniq_notifications_org_id (org_id, id)` to still exist — it
does, and it must not be dropped. **This is also the concrete reason partitioning is deferred**
(D-2): the partition key would have to join every unique, so `(org_id, id)` becomes
`(org_id, id, created_at)` and these composite tenant FKs could no longer be declared at all.

Preconditions verified against the live DB: `max(notifications.id) = 10`,
`max(notification_deliveries.id) = 5`, `max(notification_queue.id) = 2` — nowhere near the int4
ceiling, so the rewrite is instantaneous and the rollback is safe. At 100M rows this is an
outage. This is the cheapest it will ever be.

**PIPE-006 — fan-out.** `dispatch()` loops recipients with **one transaction per user**
(`notification-dispatch.service.ts:103-112`). 50,000 recipients is 50,000 transactions. Batch the
`notifications` and `notification_deliveries` inserts in chunks of 500 inside one transaction per
chunk — `broadcasts.service.ts:174-177` already does exactly this at 100 and is the working
reference. Idempotency is unaffected: `onConflictDoNothing` on `idempotency_key` works identically
for a multi-row insert.

**Broadcast threshold.** Above **5,000 recipients** an event is a broadcast: one `broadcasts` row
plus per-user read state, resolved at read. Below it, fan-out on write. The number is a constant
in one place, not scattered — and it is a genuine product decision, so it is recorded here rather
than buried.

**SEND-002.** `broadcasts.service.ts:160`, `cron-notifications.service.ts:96` and
`cron-recruitment.service.ts:221` INSERT into `notifications` directly, skipping
`NotificationsService.announce()` — so no SSE, no web push, and a stale bell until the user polls.
All three route through `announce()`.

**Unread count.** `COUNT(*)` behind a Redis `cachedVersioned` at `notifications-read.service.ts:263-276`.
Kept for Phase 1 — the partial index `idx_notifications_org_user_active` already serves it and the
cache absorbs the load. Replace with a maintained counter when the recorded trigger is hit, not
before. **SCH-007** is done now regardless, because it is one statement:

```sql
DROP INDEX "idx_notifications_user_unread_created";                   -- not org-led, §19
CREATE INDEX "idx_notifications_org_user_unread"
  ON "notifications" ("org_id","user_id","is_read","created_at" DESC)
  WHERE "deleted_at" IS NULL AND "archived_at" IS NULL;
DROP INDEX "idx_notifications_priority";                              -- SCH-008, 4-value enum
```

---

## 9. Push subscriptions and payload minimisation

```sql
-- 0417_push_subscription_hygiene.sql
ALTER TABLE "push_subscriptions"
  ADD COLUMN "last_seen_at" timestamptz,
  ADD COLUMN "updated_at"   timestamptz NOT NULL DEFAULT now();
DROP INDEX "push_subscriptions_endpoint_unique";
CREATE UNIQUE INDEX "uniq_push_subscriptions_org_user_endpoint"
  ON "push_subscriptions" ("org_id","user_id","endpoint");
DROP INDEX "idx_push_subs_user";
CREATE INDEX "idx_push_subs_org_user" ON "push_subscriptions" ("org_id","user_id");
```

The bare global `UNIQUE (endpoint)` means two users on one browser collide across orgs (SCH-006).
The 410-delete handler (`web-push.service.ts:40-61`) is already correct and stays.

**RT-001 is a code change, not a schema one, and it is the compliance item.** Push bodies carry
`message.slice(0,140)` (`notifications.service.ts:113-117`) and chat carries
`content.slice(0,80)` — through a third-party push service, onto lock screens. Payloads become
`{ notificationId, title: <category label>, url }` with no body. The client fetches detail through
the authenticated API, which is where authorization already lives.

---

## 10. SEQ-001 — the ordering that is not negotiable

`email_outbox.organization_id` is nullable and all 34 rows are NULL. Probed as `streamline_app`
with no tenant GUC: an insert with `organization_id = NULL` **succeeds**; with a real org it dies
`42501`. Roughly 14 `void this.email.send…` sites fire after their request transaction commits,
so they work **because** of the nullable column.

**Therefore SCH-014 is not in this phase.** Converting the fire-and-forget sites to
`registerAfterCommit` + `runInNewTenantTransaction` is Phase 2 work and must complete *first*.
Making the column NOT NULL before then breaks every transactional email in the product
simultaneously, silently, payslips included — and each site already discards its error.

`payroll/payout/publishing.service.ts:261` is the sharpest: `void` with no `.catch` at all.

---

## Migration sequence

| # | File | Change | Lock | Risk |
|---|---|---|---|---|
| 0408 | `notification_category_accounting` | `ADD VALUE 'ACCOUNTING'` — alone | none | none |
| 0409 | `notification_outbox` | new table | none | none |
| 0410 | `notification_visibility` | `+ visibility_resource_kind` | brief ACCESS EXCLUSIVE | none |
| 0411 | `suppression_reason_no_access` | `ADD VALUE 'NO_ACCESS'` — alone | none | none |
| 0412 | `email_suppressions_and_consent` | 3 new tables | none | none |
| 0413 | `notification_preference_rules` | new table + swap `notification_preferences` unique | brief | **0 rows** |
| 0414 | `notification_events_global_unique` | partial unique | brief | fails if dupes exist — assert first |
| 0415 | `delivery_snapshot_and_cost` | 4 nullable columns | brief | none |
| 0416 | `notification_pk_widening` | drop 5 FKs (2 composite tenant) → int4→bigint ×6 incl. `notification_audit_logs` → serial→identity → re-add `NOT VALID` → `VALIDATE` | ACCESS EXCLUSIVE, rewrite | **17 rows total**; must re-verify `max(id)` before rollback |
| 0417 | `push_subscription_hygiene` | 2 columns, 2 index swaps | brief | 2 rows |

Every file sets `SET lock_timeout = '5s'` so it fails fast rather than queueing behind a long read
and blocking the table (§19). Rollback: `docs/refactor/notifications-phase1-rollback.sql`.

---

## Explicitly not in Phase 1

| Item | Why |
|---|---|
| Partitioning (SCH-004) | D-2 — deferred with a recorded trigger |
| `email_outbox` NOT NULL (SCH-014) | SEQ-001 — blocked on the fire-and-forget conversion |
| Migrating the 75 direct-email sites | D-1 — the choke point does the work |
| Digest scheduling (PIPE-008) | Storage lands here (`mode = 'DIGEST'`); the scheduler is Phase 2 and needs a `/cron/*` endpoint, since `@nestjs/schedule` is not installed |
| Coalescing/aggregation (PIPE-004) | Dedupe is first-write-wins today. Real aggregation needs the digest queue |
| Deleting the 79 dead catalog entries (REG-003) | They are the Phase 2 specification |
| SMS / WhatsApp adapters | Phase 3. **India DLT registration is the gating item and is not a code change** — weeks of registration before any Indian traffic delivers |
| Circuit breaker, jitter (PIPE-010) | Phase 2, with the queue work |
| Ably support wildcard, token revocation (RT-005/006) | Phase 2 — behavioural, no schema |

---

## What proves this worked

- A spec that fails when a catalog category is not an enum member (REG-001 cannot recur)
- A spec that fails when an emitted key is not declared (REG-004/005 cannot recur)
- An accounting notification appearing in `notifications` for the first time
- `notification_deliveries` rows with `suppression_reason = 'NO_ACCESS'` under a revoked-access test
- A hard-bounce webhook writing `email_suppressions`, and the next send to that address returning
  `SUPPRESSED` from `enqueueAndTry` without touching a provider
- A concurrent-replay test showing one delivery per `(notification, recipient, channel)`
