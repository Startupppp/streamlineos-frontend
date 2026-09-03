# Ticket 15 — Notifications, Email and Push (PRD-C132) — audit at head

**Head measured:** backend `66f09164f`, frontend `26df21488`, both on `release/code-10-10-v2`.
**Prior audit:** `reports/15-notifications-email-push.md`, taken at backend `70fbf9e9` / frontend `778f7d467`.
**Drift since:** backend 16 commits, frontend 9 commits. Of those, **exactly one** touched this
ticket's territory — `notifications-counter-watermark.spec.ts` (+66 lines, the prior audit's own
partition-window pin). **Zero** frontend notification / inbox / push files changed
(`git diff --stat 778f7d467..HEAD` over `features/notifications`, `features/inbox`,
`hooks/common/use-push-subscription.ts`, `public/sw.js` → empty).

**Bottom line.** All five of the prior audit's gaps still hold at head, unchanged. I re-verified each
against the live catalog and the current source, then measured two of them that the prior audit could
only argue from code shape. I then found **eleven further defects it did not reach**, two of which I
rate P0. The prior audit also contains one factual error I correct below (the outbox relay does *not*
share the delivery worker's backpressure shape — it has no cap at all, and is the worse of the two).

---

## 1. What I read, with numbers

### Backend corpus — 191 files

| Area | Files | Non-spec | Specs |
|---|---:|---:|---:|
| `src/modules/notifications/**` | 119 | 76 | 43 |
| `src/modules/email/**` | 66 | 54 | 12 |
| `src/modules/push/**` | 6 | 4 | 2 |
| **Total** | **191** | **134** | **58** |

Plus, read in full or in the relevant part: `src/common/tenant/for-each-org.ts`,
`src/common/tenant/org-membership.ts`, `src/common/tenant/tenant-db.ts`,
`src/common/tenant/run-in-tenant-transaction.ts`, `src/modules/realtime/web-push.service.ts`,
`src/modules/cron/cron-notifications.controller.ts`,
`src/modules/cron/cron-notification-retention.service.ts`,
`src/modules/cron/cron-notification-outbox-retention.service.ts`,
`src/scripts/alert-dead-delivery.mjs`, and the postgres.js 3.4.9 / drizzle-orm 0.45.2 savepoint
implementations in `node_modules`.

### Routes — 64 across 13 controllers

| Controller | Base | Routes |
|---|---|---:|
| `notifications.controller.ts` | `notifications` | 18 |
| `notification-preferences.controller.ts` | `notification-preferences` | 10 |
| `broadcasts.controller.ts` | `broadcasts` | 9 |
| `notification-templates.controller.ts` | `notification-templates` | 7 |
| `notification-providers.controller.ts` | `notifications/admin/providers` | 5 |
| `notification-events.controller.ts` | `notifications/admin/events` | 3 |
| `push.controller.ts` | `push` | 3 |
| `notification-policy.controller.ts` | `notifications/admin/policy` | 2 |
| `email-templates.controller.ts` | `settings/email-templates` | 2 |
| `unsubscribe.controller.ts` | `notifications/unsubscribe` | 2 |
| `email-webhook.controller.ts` | `webhooks/email` | 1 |
| `notifications-dispatch.controller.ts` | `notifications` | 1 |
| `hr-send-email.controller.ts` | `hr/integrations/send-email` | 1 |

I read the guard/permission decorator set on all 64. Six cron routes in
`cron-notifications.controller.ts` also drive this module.

### Tables — 24 logical (73 physical), all read out of the live catalog

Measured against `scratch_head_1010` (journal head, 677/677, 944 tables):

`broadcasts`, `broadcast_audience_targets`, `broadcast_read_receipts`, `email_otp_codes`,
`email_outbox`, `email_suppressions`, `notification_audit_logs`, `notification_consents`,
`notification_consent_events`, `notification_deliveries`, `notification_digest_items`,
`notification_digest_runs`, `notification_events`, `notification_outbox`,
`notification_policy_defaults`, `notification_preference_rules`, `notification_preferences`,
`notification_provider_accounts`, `notification_queue`, `notification_read_watermarks`,
`notification_suppression_rules`, `notification_templates`, `notifications` (partitioned:
**48 monthly partitions + `notifications_default`**), `push_subscriptions`.

`crm_suppression_hashes` and the four `email_sequence*` tables are CRM — out of scope per the brief.

**RLS:** 24 of 24 have `relrowsecurity = t`, one policy each, zero with FORCE. I dumped every
`qual` / `with_check` expression. 21 are plain `org_id = app.current_org_id()`. Three are
NULL-permissive (`email_outbox`, `email_suppressions`, `notification_events`) — see F-24.

### Event catalog and dispatch surface

- **86 notification events** across 8 catalog files (`e("…")` / `notificationEvent("…")` form;
  the ownership catalog uses another shape, so 86 is a floor).
- **17 events set `dedupeWindowSeconds: 0`, 1 sets `86400`, the remaining 68 inherit the default
  `60`** (`notification-event-factory.ts:31`).
- **16 events are `mandatory: true`.**
- **111 `dispatch.emit(` call sites** repo-wide; **27** pass an explicit `dedupeKey`.
- **5 channel providers** (`email`, `sms`, `whatsapp`, `web-push`, `sandbox`) + registry + interface.

### Frontend corpus — 81 files

`features/notifications/**` 46, `features/inbox/**` 10, `hooks/**` matching notification/push/inbox 25.
Read in full: `use-push-subscription.ts`, `use-notification-events.ts`, `use-notification-inbox.ts`,
`use-inbox-actions.ts`, `preferences-page.tsx` (relevant regions), `notification-bell.tsx` (render
branches), `public/sw.js`, `lib/query-keys/platform-core.ts`, `lib/query-scope-isolation.test.tsx`.

### Commands actually run

| Command | Exit | Result |
|---|---:|---|
| `pnpm alert:dead-delivery` (backend) | 0 | `{"fired":false,"count":0,"destination":"CONFIGURE_ME …","rows":[]}` |
| `pnpm check:conflict-targets` | 0 | 13 partial-index targets, 1 unresolved (a chat test fixture); 0 ratcheted |
| `pnpm check:namespace-coverage` | 0 | 75 reads / 76 bumps, 0 stale namespaces, 4 unresolved factories |
| `psql` catalog dumps × 9 | 0 | columns, indexes, FKs, RLS policies, row counts for all 24 tables |
| `psql` RLS probe on `push_subscriptions` (2 scenarios, both `ROLLBACK`) | — | **see F-1** |
| `psql` tenant-fairness simulation in TEMP tables | — | **see F-3, F-4** |
| `EXPLAIN` on both claim queries as `streamline_app` with the tenant GUC set | — | see F-20 |

**Not run, deliberately:** `npm run build`, `typecheck`, bare `jest` — the brief forbids them under
the laptop budget. No E2E suite was run (see §5).

---

## 2. Per-criterion assessment

### PRD-C132 — "Re-verify provider-response schemas, tenant-fair delivery/backpressure, consent and suppression enforcement, durable retry/DLQ behavior, offline/revocation UI and cross-tenant notification delivery E2E at the release commit."

**Verdict: NOT MET.** The re-verification is done, dimension by dimension, below. Two of the six
dimensions hold; four do not.

#### (a) Provider-response schemas — **HOLDS**

`notification-delivery-worker.service.ts:347-358` `safeParse`s every provider return through
`providerSendResultSchema` (`dto/provider-result.schemas.ts:3-12`) and, on a shape failure, substitutes
`{status:"FAILED", retryable:true, failureCode:"INVALID_RESPONSE"}` rather than trusting the value. The
provider call at `:334` sits **outside** every transaction (between two `inTenant` blocks at `:194` and
`:368`) — the "provider call inside a DB transaction" shape the brief names is **absent here**.
`notification-delivery-worker-provider-validation.spec.ts` drives it. Confirmed unchanged at head.

One latent defect inside an otherwise-correct schema: `costAmount: z.number()` is not `.int()` while
`notification_deliveries.cost_amount` is `integer` (F-23).

#### (b) Tenant-fair delivery / backpressure — **FAILS. Measured, both loops.**

I simulated both claim loops exactly — 8 tenants, 200 pending rows each, all busy simultaneously,
5 ticks — in session-local TEMP tables on `scratch_head_1010` (nothing shared was written):

| Model | Tenants that advanced | Distribution over 5 ticks |
|---|---:|---|
| `NotificationOutboxRelayService.flush()` — `limit ${remaining}`, **no per-org cap** | **2 of 8** | org-01: **200**, org-02: 50, orgs 03-08: **0** |
| `NotificationDeliveryWorker.processQueue()` — `ORG_BATCH_CAP = 10` | **5 of 8** | 50 each for orgs 01-05, orgs 06-08: **0** |

- The **relay** (F-3) is the worse of the two and the prior audit mis-stated it: it wrote "The same
  shape is used by `notification-outbox-relay.service.ts:52`." It is **not** the same shape. The
  delivery worker computes `orgLimit = Math.min(remaining, ORG_BATCH_CAP)` (`:118`); the relay passes
  `limit ${remaining}` (`:71`) with no cap at all. The lowest-id tenant drains its *entire* backlog
  before any other tenant receives a single row.
- The **delivery worker** (F-4) confirms the prior audit's Gap 1 and quantifies it: the cap bounds any
  one tenant to 10 of 50, so exactly `floor(50/10) = 5` organisations can be served per tick, and
  `forEachOrg`'s fixed `.orderBy(asc(organizations.id))` (`for-each-org.ts:161`) means it is always the
  *same* five. There is no rotation, no cursor, no randomised start.

Additional backpressure findings: the declared per-provider throttles
`notification_provider_accounts.daily_send_limit` and `monthly_cost_limit` are accepted, validated,
persisted — and **read by nothing** (F-9). And `forEachOrg` enumerates every ACTIVE organisation with
no `LIMIT`, opening a tenant transaction per org even after the batch is full (F-21).

#### (c) Consent and suppression enforcement — **FAILS**

**Consent is not implemented at all.** `notification_consents` and `notification_consent_events` are
declared (`db/schema/common/notifications-delivery.ts:304-356`), migrated (`0422`), RLS-protected,
composite-FK'd to `organization_members` (`0901`), `VALIDATE`d (`0909`) and index-tuned (`0999`). The
schema comment says *"SMS and WhatsApp cannot legally ship without it"* and *"§20 requires consent
grants and withdrawals to be logged immutably."* Repo-wide, the **only** application reference is
`gdpr-export-adapters.ts:55,126,166`. No writer, no reader. `computeRouting`
(`notification-routing-computation.ts:44-110`) contains no consent lookup — SMS and WhatsApp are routed
on preferences, org policy and suppression rules alone. **F-5.**

**Suppression is enforced, but at the wrong granularity, and the enforcement point is
tenant-catastrophic.** `EmailOutboxService.enqueueAndTry` (`:118-126`) is a genuine single choke point
and it deliberately applies to mandatory mail too (`:121-123`). But the one-click unsubscribe
(`unsubscribe.controller.ts:56-64`) writes a scope-blind, org-wide, permanent `email_suppressions` row
— `email_suppressions` has **no scope column** (verified in the catalog: `id, email, org_id, channel,
reason, source, evidence, suppressed_at, expires_at`) and `findSuppressed` matches on
`email + channel + org` only. The token's `scope` / `scopeKey` survive only in the `evidence` jsonb,
which nothing reads. **F-2 — rated P0.**

The provider bounce webhook is correct: signature-verified, replay-windowed, and its platform-wide
scope is a deliberate, documented property of a hard-bounced address. Notification-level suppression
rules (`notification_suppression_rules`) have tenant-isolation specs and a working admin surface.

#### (d) Durable retry / DLQ behaviour — **PARTIALLY MET**

Correct: `MAX_ATTEMPTS = 5` with a `DEAD` transition in the relay (`:108-119`); full-jitter backoff
(`notification-delivery-worker.service.ts:31-34`); a per-(org,channel) circuit breaker that requeues
without incrementing the attempt counter (`:314-332`); TTL expiry as `CANCELLED` not `DEAD` (`:213-223`);
a membership re-check immediately before the provider call (`:225-264`); `FOR UPDATE SKIP LOCKED` on
both claim statements; `retryDelivery` for admin re-arm (`:452-478`).
`uq_notification_deliveries_idempotency` is a **full** unique index (re-verified in the catalog), so
the `onConflictDoNothing` arbiter is inferable and 42P10 is impossible.
`fk_notification_queue_delivery_id_org` is `ON DELETE CASCADE`, so the delivery retention sweep does
purge orphan queue rows — the FK hazard I went looking for is not present.

Not met:
- **The relay's own DLQ is unwatched and then erased.** `alert-dead-delivery.mjs` watches
  `notification_deliveries.status='DEAD'`. `alert-dead-outbox.mjs` watches `outbox_events` — a
  different table. **Nothing watches `notification_outbox.state='DEAD'`.** A notification that fails
  *before* it becomes a delivery (unknown event key, dispatch throw, RLS denial) dies there silently,
  and `cron-notification-outbox-retention.service.ts:62` deletes `state IN ('PROCESSED','DEAD')` rows
  on a schedule. **F-13.**
- **`alert:dead-delivery` still cannot fire.** Re-ran at head: exit 0, `count: 0`,
  `destination: "CONFIGURE_ME …"`. `notification_deliveries` and `notification_queue` both hold **0
  rows** in the local head DB. Prior Gap 4 unchanged. **F-14.**
- **No per-recipient error isolation in the fanout.** `perRecipient`
  (`notification-dispatch.service.ts:222-278`) has no `try`/`catch`, and the ten concurrent
  `Promise.all` calls each open a nested `this.db.transaction(...)`. I read the drizzle 0.45.2 and
  postgres.js 3.4.9 sources: `PostgresJsTransaction.transaction()` → `client.savepoint()` →
  `scope(c, fn, 's'+savepoints++)`. Savepoint names are unique per outer transaction (no collision),
  but they all live on **one** connection, and a failure issues `rollback to s<n>` which discards every
  savepoint established after it. One recipient's failure therefore aborts the whole 500-recipient
  outbox chunk and burns one of its five attempts. **F-16.**
- **The event-level dedupe window is inert.** `buildNotifOutboxDedupeKey`
  (`notification-dispatch-keys.ts:6`) uses `input.dedupeKey ?? randomUUID()`; that key is stored on the
  outbox row and passed back down as `input.dedupeKey`, which `buildNotifIdempotencyKey:19` **prefers
  over the time bucket**. Two identical emits five seconds apart therefore produce two distinct
  idempotency keys and two notifications, for all **68 of 86** events that rely on the default 60 s
  window. The one spec in this area is titled "idempotent materialization **under relay replay**", uses
  a `FIXED_DEDUPE_KEY` and sets `dedupeWindowSeconds: 0` — the window path is entirely unpinned. **F-6.**

#### (e) Offline / revocation UI — **FAILS**

- **Push revocation is never observed.** Re-verified at head: repo-wide zero hits for
  `navigator.permissions.query`, zero for `pushsubscriptionchange` (in `public/sw.js` or anywhere),
  zero for `pushManager.unsubscribe`, and `DELETE /push/subscribe` has **zero frontend callers** —
  the only three `pushManager`/`push/subscribe` references in the whole `frontend/` source tree are
  `use-push-subscription.ts:56,62,69`. Permission is read once per `userId`
  (`use-push-subscription.ts:22-25`) and `subscribe()` early-returns at `:57` on any locally-held
  subscription, so a server-side prune (which `web-push.service.ts:127-135` really does perform on
  404/410) can never be repaired from the client. Prior Gap 2 unchanged. **F-10.**
- **The SSE stream does not survive an outage.** `MAX_RETRIES = 5` with no `online` listener
  (prior Gap 5, unchanged) — and worse than reported: `connect()` returns at `:73` when
  `fetchStreamToken()` yields null **without scheduling a retry**, so a *single* transient failure of
  `/api/auth/session` or `POST /notifications/events/token` kills the stream permanently until the
  component remounts. **F-12.**
- **The two inbox surfaces still have inverted offline coverage.**
  `features/inbox/use-inbox-actions.ts` routes all 8 of its mutations through `runWhenOnline`;
  `features/notifications/use-notification-inbox.ts` has **14 unguarded `.mutate()` calls**
  (lines 60, 81, 88, 95, 101, 126, 133, 134, 141, 152, 157, 162, 168, 175) and zero offline guards,
  while its page renders the offline banner. Prior Gap 5b, recounted. **F-15.**
- **`quietHoursTimezone` is still a dead control.** Re-verified end to end at head: the column is
  **absent** from the live `notification_preferences` catalog; `updatePreferenceSchema` is `.strict()`
  and has no such key (`dto/preference.schemas.ts:11-27`), so `PATCH` 400s; the frontend still declares
  it required (`types/notifications.ts:221`), writes it (`preferences-page.tsx:109`) and reads it
  (`:244`). Prior Gap 3 unchanged. **F-8.**

**What is right here, and worth recording:** notification cache keys carry the tenant dimension
correctly — `lib/query-keys/platform-core.ts:21-40` has no org in the key, but `QueryProvider` mints a
**new QueryClient per org** and installs `scopedQueryKeyHashFn(authenticatedScope(org, user))`, proven
by `lib/query-scope-isolation.test.tsx:76-131` including an explicit "proves the guard bites" negative
control. And the "500 rendered as an empty state" shape is **absent** on both surfaces:
`notification-bell.tsx:195-205` renders "Couldn't load notifications" *before* the empty branch at
`:206`, and `notifications-inbox-page.tsx:238` renders `ErrorState` before `EmptyState` at `:245`.
(This partially corrects the prior audit, which framed `notification-bell.tsx:207` as a
`check:empty-states` miss — it is a component-consistency nit, not error masking.)

#### (f) Cross-tenant notification delivery E2E — **FAILS at the code level; E2E NOT MEASURED**

I did not run an E2E suite (see §5). What I *can* report from the catalog and from direct RLS probes:

- **`push_subscriptions` cannot represent the model the delivery side assumes.**
  `web-push.service.ts:53-57` documents the invariant: *"a person in two organizations has a
  subscription row per organization, so matching on user alone pushes one tenant's notification to the
  other's device registration."* The write side cannot produce that. The unique index is
  `push_subscriptions_endpoint_unique ON (endpoint)` — **global, no org** — and
  `push.service.ts:21-24` upserts `target: endpoint` with `set: {p256dh, auth}` only, never re-owning
  `user_id` or `org_id`. **Measured, two probes, both rolled back, run as the non-owner
  `streamline_app` role with the tenant GUC set:**

  | Probe | Result |
  |---|---|
  | Same endpoint, **different org** | `ERROR: new row violates row-level security policy (USING expression) for table "push_subscriptions"` — the conflicting row is invisible under the second org's policy, so `ON CONFLICT DO UPDATE` raises 42501. `PushService.subscribe` has no catch → **`POST /push/subscribe` 500s**. |
  | Same endpoint, **same org, different user** | Row keeps `user_id = <first user>` and `org_id`, but `p256dh`/`auth` are replaced with the **second** user's keys. `unsubscribe(endpoint, userId)` then deletes **0 rows** for the second user. |

  The second row of that table is a live cross-user delivery misdirection: the server sends the first
  user's notifications to an endpoint that is now the second user's browser, encrypted with the second
  user's keys. **F-1 — rated P0.** The payload is metadata-only by design: the worker path sends only
  `{url}` (`notification-web-push.provider.ts:23-25`), the announce path sends
  `{notificationId, category, url}` (`notifications.service.ts:121-126`), and `public/sw.js:43-49`
  renders a category-derived title plus a fixed body. So what leaks is *that* user A received a
  category-X notification at time T, plus the link URL and its entity id — not the title or message.
  State that plainly when re-rating.

- **The live SSE stream is structurally single-instance.** `notification-event.service.ts:46-47` holds
  `events$` as an in-process `rxjs.Subject` and `streamTokens` as an in-process `Map`. There is no
  Redis pub/sub or microservice bridge. With N app instances behind a load balancer, a token minted by
  `POST /notifications/events/token` on instance A and redeemed by `GET /notifications/events` on
  instance B yields `consumeToken → null → 401`; and a notification announced on A never reaches an SSE
  client held open on B. **F-11.**

---

## 3. Findings

Ordered by severity, then by blast radius.

| # | Sev | File:line | Summary |
|---|---|---|---|
| F-1 | **P0** | `streamlineos-backend/src/modules/push/push.service.ts:21` | Push upsert arbitrates on `endpoint` alone and never re-owns `user_id`/`org_id` |
| F-2 | **P0** | `streamlineos-backend/src/modules/email/unsubscribe.controller.ts:56` | One-click unsubscribe writes a blanket, permanent, org-wide email block that also silences mandatory mail |
| F-3 | P1 | `streamlineos-backend/src/modules/notifications/notification-outbox-relay.service.ts:71` | Outbox relay has no per-tenant claim cap — 2 of 8 tenants served (measured) |
| F-4 | P1 | `streamlineos-backend/src/modules/notifications/notification-delivery-worker.service.ts:116` | Fixed ascending org order caps the tick at 5 tenants; the same 5 every tick (measured) |
| F-5 | P1 | `streamlineos-backend/src/modules/notifications/notification-routing-computation.ts:44` | `notification_consents` is never written or read — consent is unimplemented |
| F-6 | P1 | `streamlineos-backend/src/modules/notifications/notification-dispatch-keys.ts:6` | Random UUID discriminator defeats the per-event dedupe window for 68 of 86 events |
| F-7 | P1 | `streamlineos-backend/src/modules/notifications/notifications-read.service.ts:104` | `sourceModule` filter is missing from the versioned cache key |
| F-8 | P1 | `streamlineos-frontend/frontend/features/notifications/preferences-page.tsx:109` | `quietHoursTimezone` writes a dropped column; strict Zod 400s every save |
| F-9 | P1 | `streamlineos-backend/src/modules/notifications/notification-providers.service.ts:74` | `dailySendLimit` / `monthlyCostLimit` stored and never enforced |
| F-10 | P1 | `streamlineos-frontend/frontend/hooks/common/use-push-subscription.ts:57` | Push revocation and server-side pruning are both unobservable; no disable control |
| F-11 | P1 | `streamlineos-backend/src/modules/notifications/notification-event.service.ts:47` | SSE tokens and the event bus are process-local — multi-instance breaks the stream |
| F-12 | P1 | `streamlineos-frontend/frontend/features/notifications/use-notification-events.ts:73` | A single token-fetch failure kills the stream with no retry scheduled |
| F-13 | P1 | `streamlineos-backend/src/scripts/alert-dead-delivery.mjs:81` | `notification_outbox.state='DEAD'` has no alert and is purged on a schedule |
| F-14 | P1 | `streamlineos-backend/src/scripts/alert-dead-delivery.mjs:93` | `alert:dead-delivery` is unwired (`CONFIGURE_ME`) over an empty table |
| F-15 | P1 | `streamlineos-frontend/frontend/features/notifications/use-notification-inbox.ts:60` | 14 unguarded `.mutate()` calls behind an offline banner |
| F-16 | P1 | `streamlineos-backend/src/modules/notifications/notification-dispatch.service.ts:222` | No per-recipient error isolation; one failure aborts the whole 500-recipient chunk |
| F-17 | P2 | `streamlineos-backend/src/modules/email/controllers/hr-send-email.controller.ts:52` | Authenticated arbitrary-recipient email relay with no rate limit |
| F-18 | P2 | `streamlineos-backend/src/modules/realtime/web-push.service.ts:160` | Channel push fanout is an N+1 (one subscription SELECT per member); the membership join drops `org_id` |
| F-19 | P2 | `streamlineos-backend/src/modules/notifications/notification-dispatch-persistence.service.ts:114` | Dead `notificationCreatedAt` var; N redundant correlated subqueries per dispatch |
| F-20 | P2 | `streamlineos-backend/src/modules/notifications/notification-delivery-worker.service.ts:142` | No `(org_id, status, run_at)` index — the claim sorts the tenant's whole queue |
| F-21 | P2 | `streamlineos-backend/src/modules/notifications/notification-dispatch.service.ts:73` | `emit()` chunks at 500 only on the outbox path; the direct path is unchunked |
| F-22 | P2 | `streamlineos-backend/src/modules/notifications/notification-event.service.ts:48` | `closeSignals` grows unbounded; two tabs of one user share one close signal |
| F-23 | P2 | `streamlineos-backend/src/modules/notifications/dto/provider-result.schemas.ts:7` | `costAmount: z.number()` against an `integer` column; INR/USD mixed with no currency on the limit |
| F-24 | P2 | live catalog — `email_suppressions` / `notification_events` policies | RLS `WITH CHECK` admits `org_id = NULL` global rows from any tenant session |
| F-25 | P2 | `streamlineos-backend/src/modules/notifications/notification-delivery-worker.service.ts:311` | `getBaseDefinition` ignores an org override that *added* `mandatory` |

### F-1 — P0 — push upsert re-keys another principal's subscription

`streamlineos-backend/src/modules/push/push.service.ts:17-26`

```ts
await this.db.insert(pushSubscriptions)
  .values({ userId, orgId, ...input })
  .onConflictDoUpdate({
    target: pushSubscriptions.endpoint,          // globally unique, no org
    set: { p256dh: input.p256dh, auth: input.auth },   // never re-owns user_id / org_id
  });
```

**Failure scenario (measured).** A push endpoint is issued per browser profile + origin +
`applicationServerKey`, not per application user.

1. *Shared browser profile, same tenant* (a shop-floor terminal, a hot desk, a shared laptop — normal
   deployments for an HR/ops product). User U1 enables push; row is `(E, orgA, U1, keysU1)`. U1 signs
   out, U2 signs in and enables push; the browser returns the **same** endpoint `E`. The upsert leaves
   `user_id = U1` and replaces the keys with U2's. The server now sends **U1's** notifications to `E`,
   which is U2's browser, encrypted with U2's keys — U2's OS notification centre shows them and the
   click navigates to U1's link URL. `PushService.unsubscribe(E, U2)` deletes **0 rows**, so U2 cannot
   stop it and U1 has no disable control (F-10). Probe output:
   `same-org second user | kbprobe-user | kbprobe-a | P256-U2 | AUTH-U2` then
   `after U2 unsubscribe attempt | 1`.
2. *Same user, second org.* The org-A row is invisible under org-B's RLS `USING`, so the
   `ON CONFLICT DO UPDATE` raises
   `ERROR: new row violates row-level security policy (USING expression) for table "push_subscriptions"`
   (42501). Nothing catches it → **`POST /push/subscribe` 500s**, deterministically.

The payload is metadata-only by design (`public/sw.js:43-49`), so the leak is the *fact* and
*category* of U1's notification plus the link URL, not its body. Rate accordingly, but the
authorization boundary is crossed either way, and variant 2 is a hard 500.

**Proposed fix.** The endpoint is the natural key of a browser, not of a tenant. Either (a) drop the
org scoping from the row identity and resolve the org from the session at send time, or (b) keep the
per-org row but make the write a two-step under a privileged path: delete **any** row carrying that
endpoint (SECURITY DEFINER, since RLS hides other tenants' rows), then insert. At minimum, the `set`
must re-own the row: `set: { userId, orgId, membershipId, p256dh, auth, updatedAt }`. Add a spec
driving both probe scenarios.

### F-2 — P0 — one-click unsubscribe is a blanket, unrecoverable, mandatory-inclusive email block

`streamlineos-backend/src/modules/email/unsubscribe.controller.ts:56-64`,
`streamlineos-backend/src/modules/email/email-suppression.service.ts:37-57`

The signed token carries `scope` (`TYPE` | `CATEGORY` | `ALL_NON_MANDATORY`) and `scopeKey`
(`unsubscribe-token.ts:5-14`). The handler passes **neither** to `suppress()`; they survive only in the
`evidence` jsonb (`:63`), which nothing reads. `email_suppressions` has **no scope column** (live
catalog: `id, email, org_id, channel, reason, source, evidence, suppressed_at, expires_at`), and
`findSuppressed` matches on `email + channel + org` alone.

**Failure scenario.** An employee clicks `List-Unsubscribe` in a chat-mention notification from Acme.
`unsubscribeHeaders` only attaches the header to non-mandatory events
(`notification-email.provider.ts:18-19`), so the user believes they are opting out of chatter. The
resulting row blocks **every** Acme email to that address, forever, because
`EmailOutboxService.enqueueAndTry:121-123` applies suppression to mandatory mail on purpose:
payslips, invoices, e-sign requests, org security alerts. The withheld send is recorded with
`html: ""` (`email-outbox.service.ts:70`), so the body is not even retained. Platform-scope mail
(password reset, verification) survives, because those resolve `organizationId = null` — that is the
only mitigation. **There is no un-suppress path anywhere in the repo**: `emailSuppressions` is
referenced only by `email-suppression.service.ts`, there is no controller, no `DELETE`, and the
`onConflictDoNothing` means a later, narrower write cannot correct it. Recovery requires a DBA.

Aggravating: `@Get(":token")` performs the mutation (`:31-35`). Corporate link scanners (Outlook Safe
Links, mail-gateway URL rewriting, prefetchers) follow GET links automatically — merely *receiving*
the email in such an environment unsubscribes the user. The comment at `:20-21` argues both verbs are
idempotent, which is true and beside the point: idempotent is not safe.

**Proposed fix.** Two changes. (1) Honour the scope: for `TYPE`/`CATEGORY`, write a
`notification_suppression_rules` row for that scope instead of an `email_suppressions` row; reserve
`email_suppressions` for `ALL_NON_MANDATORY` and hard bounces, and add a `mandatory` bypass so
`findSuppressed` never withholds a mandatory send suppressed by reason `UNSUBSCRIBE` (a hard bounce
must still win). (2) Make `GET` render a confirmation page and move the mutation to `POST` only.
Then add a resubscribe path (a `DELETE` on the preferences surface, permissioned to the subject).

### F-3 — P1 — outbox relay has no per-tenant claim cap

`streamlineos-backend/src/modules/notifications/notification-outbox-relay.service.ts:52-77`

```ts
const remaining = BATCH_SIZE - claimed.length;   // :53
…  order by id limit ${remaining} for update skip locked   // :71
```

No `ORG_BATCH_CAP`. Combined with `forEachOrg`'s ascending org order, the lowest-id organisation with
backlog takes the entire batch of 50 every tick.

**Failure scenario (measured).** 8 tenants × 200 pending outbox rows, 5 ticks: org-01 drained **200**,
org-02 got **50**, orgs 03-08 got **nothing**. Every notification for those six tenants — including
mandatory security alerts — sits `PENDING` indefinitely while a single busy tenant is backlogged.

**Proposed fix.** Mirror the delivery worker: `const orgLimit = Math.min(remaining, ORG_BATCH_CAP)`.
That alone lifts coverage from 2 tenants to 5. Combine with F-4's rotation for full fairness. Pin it
with a multi-tenant spec that asserts the *set* of orgs served, not just the total claimed.

### F-4 — P1 — the served window never rotates

`streamlineos-backend/src/modules/notifications/notification-delivery-worker.service.ts:115-118`,
`streamlineos-backend/src/common/tenant/for-each-org.ts:161`

`forEachOrg` orders by `asc(organizations.id)` with no rotation, and the worker fills a
`BATCH_SIZE = 50` budget at `ORG_BATCH_CAP = 10` per org. `floor(50/10) = 5` organisations can be
served per tick and it is deterministically the same five.

**Failure scenario (measured).** Same fixture: orgs 01-05 each drained 50 over 5 ticks; orgs 06-08
drained **0**. This is caused by *position*, not by skew — a small tenant sorting late starves behind
five busy tenants sorting early.

**Proposed fix.** A rotating start offset. Either an opt-in `rotate: true` on `forEachOrg` that seeds
the iteration at `hash(runId) mod orgCount`, or a cursor local to the delivery worker persisted across
ticks. The prior audit routed the `forEachOrg` half to the orchestrator because that file is shared;
the worker-local cursor is the change that does not affect other sweeps.

### F-5 — P1 — consent is declared, migrated and never used

`streamlineos-backend/src/modules/notifications/notification-routing-computation.ts:44-110`,
`streamlineos-backend/src/db/schema/common/notifications-delivery.ts:299-356`

`notification_consents` (`GRANTED`/`WITHDRAWN`, source, legal basis, IP, user agent, granted/withdrawn
timestamps) and the append-only `notification_consent_events` exist in the live catalog with RLS and a
validated composite FK. Repo-wide the only application reference is the GDPR export adapter.

**Failure scenario.** An org enables the SMS or WhatsApp provider. `computeRouting` routes an SMS
purely on preferences and org policy; nothing consults consent, because no consent row was ever
written by anything. A GDPR subject-access request exports `notification_consents` and returns zero
rows — the product cannot evidence that any recipient ever agreed to SMS or WhatsApp contact, which is
precisely what the schema comment says is legally required. Additionally, `computeRouting:76`
(`if (ruleReason && !mandatory)`) means a mandatory event ignores suppression rules entirely and may
fall back onto SMS/WhatsApp via `FALLBACK_CHAIN` at `:86-90`.

**Proposed fix.** Either implement it — a consent write on the preferences/onboarding path, a
`consentByUser` batch load in `NotificationRoutingService.routeMany` alongside the existing
`prefRows`/`ruleRows`/`tzRows` fetch, and a `CONSENT_MISSING` suppression reason for SMS/WHATSAPP with
no `GRANTED` row — or drop the tables and the COMP-003 claim. Shipping the schema without the
enforcement is the worst of the three, because it reads as implemented.

### F-6 — P1 — the per-event dedupe window is inert

`streamlineos-backend/src/modules/notifications/notification-dispatch-keys.ts:4-21`

```ts
const discriminator = input.dedupeKey ?? randomUUID();          // :6
…
const bucket = input.dedupeKey ?? windowBucket;                 // :19  — dedupeKey WINS
```

`emit()` with no explicit `dedupeKey` mints a fresh UUID into the outbox row's `dedupe_key`
(`notification-dispatch.service.ts:78-79`), then passes that same string down as `input.dedupeKey`
(`:112`). `buildNotifIdempotencyKey` prefers it over `windowBucket`, so the delivery idempotency key is
unique per `emit()` call.

**Failure scenario.** `hr.leave.approved` (default window 60 s) is emitted twice within a minute by a
double-submitted approval or a workflow that emits on each save. Two outbox rows with different random
`dedupe_key`s → two distinct idempotency keys → two `notification_deliveries` rows → **two emails and
two in-app notifications**, despite the declared 60 s window. **68 of 86** catalog events rely on that
default; 27 of 111 emit sites pass an explicit key and are safe. The only spec in this area,
`notification-idempotent-materialization.spec.ts`, is scoped to relay replay with a `FIXED_DEDUPE_KEY`
and `dedupeWindowSeconds: 0`, so nothing catches it.

**Proposed fix.** Make the outbox dedupe key deterministic: replace `randomUUID()` with the time
bucket that `buildNotifIdempotencyKey` would compute — `input.dedupeKey ?? windowBucketFor(eventKey)` —
so replay-safety and window-dedupe use one discriminator. Keep the `dedupeWindowSeconds: 0` events on
a random discriminator (that is the documented intent for DMs and mentions). Add a spec that emits the
same event twice inside the window and asserts one delivery row.

### F-7 — P1 — `sourceModule` filter missing from the cache key

`streamlineos-backend/src/modules/notifications/notifications-read.service.ts:104` vs `:221-222`

```ts
const key = `list:${section}:${filters.category ?? ""}:${filters.priority ?? ""}:${limit}:${filters.cursor ?? ""}:${filters.search ?? ""}`;
…
if (filters.sourceModule) conditions.push(eq(notifications.sourceModule, filters.sourceModule));
```

`sourceModule` is an accepted query parameter (`dto/notification.schemas.ts:12`) and a real SQL
predicate, and it is absent from the versioned cache key.

**Failure scenario.** A client calls `GET /notifications?sourceModule=hr` and then
`GET /notifications?sourceModule=chat` within `CACHE_TTL.SHORT` (30 s, `cache-keys.ts:262`). Both hash
to `list:ALL::::20::` under namespace `notifications:<user>:<org>`, so the second call is served the
HR-filtered page. Scoped to one user+org, so not a tenant leak — but it is silently wrong data for
30 s. The current web client does not send the parameter, so today the trigger is API-only (mobile,
integrations, or the next filter added to the UI).

This is squarely in `check:namespace-coverage`'s blind spot: that gate (exit 0, 75 reads / 76 bumps)
verifies every cache *namespace* read is bumped somewhere. It says nothing about whether the inner key
enumerates every filter dimension.

**Proposed fix.** Append `${filters.sourceModule ?? ""}` to the key. Better: derive the key from a
canonical serialisation of the whole validated filter object so a new filter cannot be added without
appearing in the key, and add a gate assertion that every field of `listSchema` appears in the key
expression.

### F-8 — P1 — `quietHoursTimezone` drives a column that no longer exists

`streamlineos-frontend/frontend/features/notifications/preferences-page.tsx:109` and `:244`,
`streamlineos-frontend/frontend/types/notifications.ts:221,238`

Verified at head on all four sides: the column is absent from the live `notification_preferences`
catalog (22 columns dumped, no `quiet_hours_timezone`); `updatePreferenceSchema` is `.strict()` with no
such key; the backend service never emits it; the frontend declares it **required** and both reads and
writes it.

**Failure scenario.** The user opens `/notifications/preferences`, changes the quiet-hours timezone
Select. `PATCH /notification-preferences` sends `{quietHoursTimezone: "Asia/Kolkata"}`, strict Zod
rejects it 400, and `preferences-page.tsx:110` shows the generic `toast.error("Failed to save")`. The
Select is bound to `prefs?.quietHoursTimezone ?? "UTC"` and the field is never returned, so it always
reads "UTC" regardless of the real setting. Meanwhile the routing service resolves quiet hours from
`user_preferences.timezone` (`notification-routing.service.ts:395-406`) — a different settings page —
so the control is both broken and pointing at the wrong store. Both repos typecheck clean because
`apiClient.get<T>()` is a cast.

Secondary, latent: `NotificationPreferences` also declares `id`, `createdAt`, `updatedAt` required,
but a user with no preferences row gets `{...DEFAULT_PREFERENCES, userId, orgId}` carrying none of
them (`notification-preferences.service.ts:54`). Nothing dereferences them today.

**Proposed fix.** Delete `quietHoursTimezone` from `types/notifications.ts` (both interfaces), delete
`handleTimezone`, and replace the Select with a read-only line pointing at the user-settings timezone,
or move the control onto the settings page that owns `user_preferences.timezone`.

### F-9 — P1 — provider send/cost limits are inert

`streamlineos-backend/src/modules/notifications/notification-providers.service.ts:74-75,100-101`

`daily_send_limit` and `monthly_cost_limit` are validated (`dto/provider.schemas.ts:29-30`), persisted,
and surfaced in the admin provider editor. Repo-wide grep for `dailySendLimit` / `monthlyCostLimit`
returns four sites: the schema declaration, the DTO, and the two writes. **Zero readers.**

**Failure scenario.** An operator sets a 10,000/day SMS cap after a runaway loop. The next runaway
loop sends 400,000 messages; nothing consults the cap, `cost_amount` is 0 on every row anyway (F-23),
and the first signal is the provider invoice. The admin UI reports a control that does not exist.

**Proposed fix.** Enforce both in `NotificationDeliveryWorker.deliverJob`, at the same point the
sandbox flag is read (`:273-284`) — a count of today's `SENT` rows for `(org_id, channel)` and a sum of
`cost_amount` for the month, both against the provider account row, short-circuiting to a
`PENDING` requeue with `lastError: "provider cap reached"` (not `DEAD` — the cap is a throttle, not a
failure). Or remove the columns and the UI.

### F-10 — P1 — push permission revocation and server-side pruning are both invisible

`streamlineos-frontend/frontend/hooks/common/use-push-subscription.ts:22-25, 54-57`

Permission is read once per `userId` into state. Repo-wide (frontend source only, excluding `.next`):
zero `navigator.permissions.query`, zero `pushsubscriptionchange`, zero `pushManager.unsubscribe`,
zero callers of `DELETE /push/subscribe`. The only three push references in the whole tree are lines
56, 62 and 69 of this file.

**Failure scenario, two halves.** (a) The user grants push,
`push-permission-card.tsx` renders "Push notifications are on", the user revokes in browser site
settings — the tab is never told, and the well-written `denied` branch can never be entered after
mount. (b) `web-push.service.ts:127-135` really does delete rows on a 404/410 from the push service.
Afterwards the browser still holds a `PushSubscription`, so `subscribe()` returns at line 57 and
`POST /push/subscribe` is never re-issued. The subscription is dead server-side with no client path
back, and the UI still says it is on.

**Proposed fix.** Three additions: a `navigator.permissions.query({name:"notifications"})` `onchange`
listener (plus a `visibilitychange` re-read as a fallback) feeding `setPermission`; a
`pushsubscriptionchange` handler in `public/sw.js` that re-POSTs the new subscription; and an
idempotent server re-registration — replace `if (existing) return` with a re-POST of the existing
subscription so the server row is restored (which also needs F-1 fixed, or that POST 500s for a
dual-org user). Expose an `unsubscribe()` from the hook and a disable control on the card.

### F-11 — P1 — SSE tokens and the event bus are process-local

`streamlineos-backend/src/modules/notifications/notification-event.service.ts:46-47`

```ts
private readonly events$ = new Subject<NotifEvent>();
private readonly streamTokens = new Map<string, StreamToken>();
```

No Redis pub/sub, no microservice transport, no shared token store.

**Failure scenario.** Two or more app instances behind a load balancer — which this codebase plainly
targets (`CELL_ID`, placement resolution, transaction-pooler pool config). `POST
/notifications/events/token` lands on instance A and mints the token into A's `Map`. `GET
/notifications/events` is routed to instance B; `consumeToken` returns `null`; the controller throws
`UnauthorizedException` (`notifications.controller.ts:93`). With N instances the connect succeeds with
probability ~1/N, and the client (F-12) gives up after five tries. Even when the connect lands on the
right instance, a notification announced on a *different* instance never reaches that subscriber,
because `events$.next()` is process-local. The result is a live notification stream that silently
works in single-instance dev and fails in production.

**Proposed fix.** Move both to shared state: mint the stream token as a short-lived signed JWT (no
server store needed — it is already a 120 s single-use credential; add a Redis `SETNX` for the
single-use property), and bridge `events$` over Redis pub/sub keyed by `${orgId}:${userId}` so any
instance can deliver. Add a two-process integration test that mints on one and streams on the other.

### F-12 — P1 — one token failure kills the stream permanently

`streamlineos-frontend/frontend/features/notifications/use-notification-events.ts:70-84`

```ts
const token = await fetchStreamToken();
if (!token || controller.signal.aborted) return;   // :73 — no scheduleRetry()
```

`fetchStreamToken` swallows every error into `null` (`:30-32`).

**Failure scenario.** A single 502 from `/api/auth/session`, a transient network blip, or one
rate-limited `POST /notifications/events/token` (the route is behind `RateLimitGuard`,
`notifications.controller.ts:73-74`) returns `null`, `connect()` returns without scheduling a retry,
and the live stream is dead until the component remounts. This is strictly worse than the
`MAX_RETRIES = 5` exhaustion the prior audit reported, because it needs **one** failure, not five. And
`retryCount` is only reset on receiving a notification (`:76`), never on a successful connection, so a
long quiet connection carries its earlier failures forward.

**Proposed fix.** `if (!token) { scheduleRetry(); return; }`; reset `retryCount = 0` when
`consumeNotificationStream` connects, not when it first yields; add
`window.addEventListener("online", …)` to reset the counter and reconnect; and treat `MAX_RETRIES` as
a backoff ceiling rather than a give-up point.

### F-13 — P1 — the relay DLQ is unwatched, then deleted

`streamlineos-backend/src/scripts/alert-dead-delivery.mjs:74-91`,
`streamlineos-backend/src/modules/cron/cron-notification-outbox-retention.service.ts:62`

I enumerated all 14 `alert-*.mjs` scripts and the table each queries.
`alert-dead-delivery` → `notification_deliveries`. `alert-dead-outbox` → `outbox_events` (the generic
domain outbox, a different table). **No script queries `notification_outbox`.**

**Failure scenario.** A deploy renames an event key, or the visibility registry throws, or a dispatch
hits an RLS denial. `NotificationOutboxRelayService` catches per row, logs, and after
`MAX_ATTEMPTS = 5` sets `state = 'DEAD'` (`:108-119`). Those notifications never reach
`notification_deliveries`, so `alert:dead-delivery` cannot see them; no other alert queries that table;
and the retention sweep then deletes `state IN ('PROCESSED','DEAD')` rows on a schedule. A systematic
notification outage is invisible and the evidence is erased.

**Proposed fix.** Add `alert-dead-notification-outbox.mjs` on the same shape as
`alert-dead-delivery.mjs` — `WHERE state = 'DEAD' AND processed_at > NOW() - interval` — register it in
`slo-queues.ts` next to the existing `notification-outbox-relay` entry, and exclude `DEAD` from the
retention purge (or lengthen its window well past the alert window).

### F-14 — P1 — `alert:dead-delivery` cannot fire

`streamlineos-backend/src/scripts/alert-dead-delivery.mjs:93`

Re-ran at head: exit 0,
`{"fired":false,"count":0,"threshold":{"maxDeadRowsInWindow":0,"windowHours":24},"destination":"CONFIGURE_ME — wire exit-code 1 to your oncall system (PagerDuty, Slack webhook, etc.)","rows":[]}`.
`notification_deliveries` holds **0 rows** and `notification_queue` holds **0 rows** in the local head
database. That zero is the absence of data, not the absence of failures. The script's own header
documents a second gap: it cannot filter on `mandatory`, because that flag lives in the TypeScript
catalog and is never persisted onto the delivery row.

**Failure scenario.** Every mandatory delivery in the product goes `DEAD` for 24 hours. The alert
prints `count: 0` and exits 0, because it is pointed at a database where nothing has ever been
delivered and its exit code is wired to nothing.

**Proposed fix.** Operator action for the destination. Engineering action for the rest: persist
`mandatory` onto `notification_deliveries` at dispatch (the schema comment names this as the smallest
closing change), and add an anti-vacuity floor — the gate should exit 2, not 0, when
`notification_deliveries` has zero rows in the window, per the release's own exit-code contract.

### F-15 — P1 — `/notifications` fires 14 mutations offline behind an offline banner

`streamlineos-frontend/frontend/features/notifications/use-notification-inbox.ts:60,81,88,95,101,126,133,134,141,152,157,162,168,175`

`features/inbox/use-inbox-actions.ts` defines `runWhenOnline` at `:55` and routes all eight of its
mutations through it. `use-notification-inbox.ts` has zero offline guards across 14 `.mutate()` sites,
while `notifications-inbox-page.tsx` renders the offline banner.

**Failure scenario.** Offline, `/notifications` tells the user their data may be stale, and every
button — mark read, archive, pin, snooze, delete, bulk delete, approve, reject — still fires a request
that fails. The optimistic cache patch applies and then rolls back, so state visibly flickers.
`/inbox`, which does guard, renders no banner. The two surfaces have exactly inverted coverage.

**Proposed fix.** Lift `runWhenOnline` out of `use-inbox-actions.ts` into a shared hook and apply it in
`use-notification-inbox.ts`; render the banner on both surfaces.

### F-16 — P1 — no per-recipient error isolation in the fanout

`streamlineos-backend/src/modules/notifications/notification-dispatch.service.ts:222-282`

`perRecipient` has no `try`/`catch`. Ten run concurrently under `Promise.all` (`:280-281`), each
opening `this.db.transaction(...)` inside `persistForUser` (`:88`). `createTenantAwareDb`
(`common/tenant/tenant-db.ts:15-24`) resolves `this.db` to the ambient transaction, so those are ten
concurrent nested savepoints on one connection. In postgres.js 3.4.9 (`cjs/src/index.js:251-297`) a
failure issues `rollback to s<n>`, which in Postgres discards every savepoint established after it,
and every sibling statement issued between the error and that rollback fails `25P02`.

**Failure scenario.** One recipient in a 500-person chunk hits a constraint or a transient error. The
comment at `:216-221` asserts "recipients are independent (each has its own idempotency key)", but they
are not isolated at the transaction level: `Promise.all` rejects, `dispatch` throws, the outer tenant
transaction rolls back entirely, and the relay marks the outbox row failed and increments
`attempt_count`. A deterministically bad recipient burns all five attempts and DEADs the whole chunk —
499 people never get the notification because of the 500th.

**Proposed fix.** Wrap `perRecipient`'s body in `try`/`catch`, count the failure into the result, and
let the wave continue. If per-recipient atomicity is required, give each recipient its own top-level
tenant transaction (`runInNewTenantTransaction`) instead of a savepoint on the shared connection, and
reduce `FANOUT_CONCURRENCY` to match the pool.

### F-17 — P2 — unrate-limited authenticated email relay

`streamlineos-backend/src/modules/email/controllers/hr-send-email.controller.ts:52-58`

`POST /hr/integrations/send-email` accepts `to: z.string().email()` (no domain restriction) and
`body: z.string().max(10000)` rendered as raw HTML. It is permissioned (`hr:communications:send`) and
audited nowhere, and — unlike its sibling `settings/email-templates/test`, which carries
`@UseGuards(RateLimitGuard) @UseRateLimit("settings:email-template-test")` — it has **no rate limit**.

**Failure scenario.** One compromised or malicious account with that permission sends unlimited
platform-branded HTML to arbitrary external addresses. The sending domain and provider reputation are
shared across every tenant, so the blast radius is the whole platform's deliverability.

**Proposed fix.** Add `@UseRateLimit` with a tier sized for legitimate recruiter volume, and an audit
log entry matching the sibling route's.

### F-18 — P2 — channel push fanout is an N+1, and its membership join drops `org_id`

`streamlineos-backend/src/modules/realtime/web-push.service.ts:160` and `:201-208`

**Correction to my own first pass:** the concurrency half of this is **already fixed at head**.
`sendToChannelMembers` uses `boundedMap(recipients, PUSH_FANOUT_CONCURRENCY /* = 16 */, …)` at `:201`,
with a comment at `:192-200` that names the exact 5,000-member failure the old
`Promise.allSettled(members.map(…))` caused. It also correctly filters `mutedUntil` and
`notificationPreference` at `:184-188`. Two smaller problems remain.

1. **N+1.** Each of the 16-at-a-time `sendToUser` calls issues its own
   `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE …` (`:85-92`). A 5,000-member channel
   therefore runs 5,000 subscription lookups where one `inArray(membershipId, …)` would do.
2. **`org_id` dropped from a join.** `:160` joins
   `eq(organizationMembers.id, chatChannelMembers.membershipId)` on `id` alone. `org_id` is present on
   the `chatChannelMembers` side of the `and()` (`:163`) and RLS scopes both tables, so this is not a
   live leak — but `organization_members` carries the composite unique `(org_id, id)` precisely so
   joins can be org-qualified, and this is the exact shape that has leaked in this codebase before.

**Failure scenario.** A message in a busy 5,000-member channel costs 5,000 round trips to
`push_subscriptions` on top of the 5,000 outbound pushes; under `boundedMap`'s 16-wide window that is
~313 sequential waves, each paying a query round-trip it does not need. The pool is not exhausted (the
2026 fix prevents that) but the wall clock is dominated by avoidable lookups.

**Proposed fix.** Hoist the subscription lookup out of `sendToUser`: one
`inArray(pushSubscriptions.membershipId, recipientMembershipIds)` query before the `boundedMap`, then
pass the pre-resolved subscription list into a new `sendToSubscriptions` used by the fanout, keeping
`sendToUser` for the single-recipient case. Add `eq(organizationMembers.orgId, chatChannelMembers.orgId)`
to the join condition.

### F-19 — P2 — dead variable and N redundant subqueries per dispatch

`streamlineos-backend/src/modules/notifications/notification-dispatch-persistence.service.ts:114,139,145-147,167-169`

`notificationCreatedAt` is declared at `:114`, assigned from the `RETURNING` clause at `:139`, and
**never read** — because both write sites use a correlated subquery instead:
`sql\`(select created_at from notifications where id = ${notificationId})\``.

**Failure scenario.** An event fanning out to 500 recipients across 3 channels issues 500 (the UPDATE
at `:145`) + 1,500 (the per-channel INSERT at `:167`) = 2,000 extra correlated subqueries per dispatch,
all re-reading a value the INSERT at `:137` already returned in the same transaction.

**Proposed fix.** Bind `notificationCreatedAt` directly in both places and delete the subqueries.

### F-20 — P2 — the queue claim has no covering index

`streamlineos-backend/src/modules/notifications/notification-delivery-worker.service.ts:135-145`

`notification_queue` carries `idx_notification_queue_due (status, run_at)` — no `org_id` — plus the
composite uniques `(delivery_id)` and `(org_id, id)`. `EXPLAIN` on the exact claim statement, run as
`streamline_app` with `app.organization_id` set:

```
Limit → LockRows → Sort  (Sort Key: run_at)
  → Index Scan using uniq_notification_queue_org_id on notification_queue
      Index Cond: (org_id = 'kbprobe-a')
      Filter: ((status='PENDING' AND run_at<=now()) OR (status='LOCKED' AND locked_at<…))
```

**Failure scenario.** The planner has to choose between an org-scoped index that gives no ordering
(and therefore sorts the tenant's entire queue every 15 s) and a status-ordered index that scans every
tenant's rows. Neither is right. On a tenant with 100k queue rows this sorts 100k rows to return 10,
four times a minute. The tables are empty here, so this is a **plan-shape** observation — the timing is
NOT MEASURED.

**Proposed fix.** Add `CREATE INDEX idx_notification_queue_claim ON notification_queue (org_id, status, run_at)`.
Keep the existing narrow index — per this project's own "index prefix is not redundancy" lesson, do not
drop it under the wider one.

### F-21 — P2 — recipient chunking applies only on the outbox path

`streamlineos-backend/src/modules/notifications/notification-dispatch.service.ts:73`

`emit()` splits recipients into `OUTBOX_CHUNK = 500` groups (`:75-81`) — but only when there is a
matching ambient tenant transaction. `if (!ambient || ambient.orgId !== input.orgId) return this.emitNow(input);`
passes the **unchunked** target list straight through.

**Failure scenario.** A background sweep (no ambient transaction) emits to 50,000 recipients. `dispatch`
issues `inArray(users.id, [50,000 ids])` (`:190`), `inArray(userPreferences.userId, …)` (`:198`) and
`inArray(notificationPreferences.userId, …)` (`:203`) with 50,000 bind parameters each — close to the
wire-protocol limit of 65,535 — and `routeMany` fans out over all of them in one transaction.

**Proposed fix.** Move the chunking above the branch so both paths chunk.

### F-22 — P2 — `closeSignals` leaks and is shared across tabs

`streamlineos-backend/src/modules/notifications/notification-event.service.ts:48,54-60,78-86`

Entries are keyed `${orgId}:${userId}` and only removed by `closeStream`. A client disconnect leaves
the entry behind, so the map grows with the number of distinct users ever seen by the process. And two
tabs for one user share one `close$` — an org-switch teardown in tab 1 terminates tab 2's stream too.

**Proposed fix.** Key by a per-connection id and clean up in the observable's finalizer.

### F-23 — P2 — cost unit and currency are unconstrained

`streamlineos-backend/src/modules/notifications/dto/provider-result.schemas.ts:7-8`

`costAmount: z.number().optional()` validates a fractional value into an `integer` column
(`notification_deliveries.cost_amount`), where Postgres truncates it. And the three providers that
return a cost disagree on currency: `notification-sms.provider.ts:121` returns `"INR"`,
`notification-whatsapp.provider.ts:124` and `sandbox.provider.ts:23` return `"USD"`, while
`notification_provider_accounts.monthly_cost_limit` is a bare `integer` with **no currency column**.

**Failure scenario (latent).** Today every provider hardcodes `costAmount: 0`, so no money is currently
wrong. The moment a live provider returns a real per-message price — Twilio quotes `0.0079` — it is
truncated to 0, and the moment F-9's cap is implemented it will add INR and USD into one integer.

**Proposed fix.** `costAmount: z.number().int().nonnegative()` and store minor units explicitly;
`costCurrency: z.string().length(3)`; add `monthly_cost_currency` to `notification_provider_accounts`
and enforce the cap per currency.

### F-24 — P2 — RLS `WITH CHECK` admits global rows from any tenant

Live catalog, policies on `email_suppressions`, `notification_events` and `email_outbox`:

```
WITH CHECK: CASE WHEN org_id IS NULL THEN true ELSE org_id = app.current_org_id() END
```

Inserting `org_id = NULL` passes unconditionally from any tenant session. For `email_suppressions` that
is a platform-wide email block; for `notification_events` it is a change to the global event catalog
seen by every tenant.

**Failure scenario.** Not reachable through the current API — `EmailSuppressionService.suppress` only
passes `null` from the signature-verified webhook, and `updateOrgEventPolicy:199` always sets `orgId`.
This is defence-in-depth: the database does not enforce what the service layer happens to.

**Proposed fix.** Restrict the `WITH CHECK` `NULL` branch to a privileged role
(`current_user = <owner>` or a dedicated `app_platform` role), leaving the `USING` branch permissive so
tenants can still *read* global rows.

### F-25 — P2 — the delivery worker resolves `mandatory` from the static catalog

`streamlineos-backend/src/modules/notifications/notification-delivery-worker.service.ts:310-312`

`this.events.getBaseDefinition(delivery.eventKey)` reads `NOTIFICATION_EVENT_MAP`, not the org
override. `updateOrgEventPolicy:209` computes `mandatory: base.mandatory || patch.mandatory`, so an org
can *add* mandatory-ness — and the worker will not see it.

**Failure scenario.** An org marks `hr.policy.updated` mandatory. The worker still passes
`mandatory: false`, so `unsubscribeHeaders` attaches an RFC 8058 `List-Unsubscribe` header to a message
the org has declared un-opt-out-able. Combined with F-2, one click then blocks all of that org's mail
to the recipient. The comment at `notification-email.provider.ts:14-16` explicitly reasons that
mandatory mail must not advertise an opt-out — this path defeats it.

**Proposed fix.** Use `resolveDefinition(delivery.orgId, delivery.eventKey)` in the worker, as the
dispatch path already does.

---

## 4. What head already gets right

Recorded so the repair wave does not undo it.

- **Provider-response validation is genuine and fails closed.** Invalid shapes become retryable
  failures rather than being trusted (`notification-delivery-worker.service.ts:347-358`), pinned by
  `notification-delivery-worker-provider-validation.spec.ts`.
- **No provider call is held inside a database transaction on the delivery path.** `provider.send()`
  at `:334` sits between two `inTenant` closures. This is the correct shape and the brief's named
  anti-pattern is absent here.
- **Dedupe arbiters are inferable.** `uq_notification_deliveries_idempotency` is a **full** unique
  index (re-verified in the live catalog), so every
  `onConflictDoNothing({target: notificationDeliveries.idempotencyKey})` resolves. `check:conflict-targets`
  exits 0 with 0 ratcheted defects in this module.
- **Tenant isolation is complete at the storage layer.** All 24 tables have RLS with an org policy; the
  three NULL-permissive ones are deliberate (global catalog / platform mail / hard bounces).
  `filterOrgMemberIds` is used at both the enqueue and the pre-send re-check.
- **Frontend cache keys carry the tenant dimension** via a per-org `QueryClient` and
  `scopedQueryKeyHashFn`, with a negative control proving the guard bites
  (`lib/query-scope-isolation.test.tsx:114-131`).
- **Errors are not rendered as empty states** on either notification surface
  (`notification-bell.tsx:195` before `:206`; `notifications-inbox-page.tsx:238` before `:245`).
- **`notification_queue` is purged transitively.** `fk_notification_queue_delivery_id_org` is
  `ON DELETE CASCADE`, so the delivery retention sweep at `cron-notification-retention.service.ts:109`
  removes queue rows with it. I went looking for an FK-blocked retention sweep; it is not there.
- **The read path is well formed.** `queryNotifications` carries `org_id`, `membership_id`, both
  retention-window bounds (partition pruning), `deletedAt IS NULL`, a limit clamped to 100, and
  keyset cursor pagination; `attachTicketContext` batches with `inArray` rather than looping.
- **`user_preferences` is a genuinely global table** (PK on `user_id` alone), so the timezone read at
  `notification-routing.service.ts:399-406` is correctly unscoped and its `limit(userIds.length)` is
  exact — not a dropped tenant predicate.
- **Push channel fanout is already bounded.** `web-push.service.ts:201` uses
  `boundedMap(recipients, PUSH_FANOUT_CONCURRENCY = 16, …)` with a comment naming the exact
  5,000-concurrent-call failure it replaced, and `:184-188` honours `mutedUntil` and
  `notificationPreference`. Do not undo either while fixing F-18's N+1.
- **Broadcast audience resolution is cursor-paged at 500** with no unbounded materialisation
  (`broadcasts-audience.queries.ts`), and broadcast IN_APP is fan-out-on-read.
- **Admin routes are properly gated.** All 26 admin/template/provider/policy/broadcast-manage routes
  carry `PermissionGuard` + `@RequirePermission`; `@Universal()` is used only on self-service routes;
  the three most dangerous mutations (`broadcast publish`, `notification approve/reject`,
  `notifications.dispatch`, `template test-send`) carry `@Idempotent`.
- **The unsubscribe token itself is well built** — dedicated secret, ≥32 chars, HMAC-SHA256,
  constant-time compare, 30-day expiry, subject named in the payload, nonce. The defect in F-2 is
  entirely on the consuming side.
- **The email webhook fails closed** — signature required, Svix HMAC with rotation support, a 5-minute
  replay window, and a documented refusal to guess ZeptoMail's scheme.

---

## 5. Blocked on infrastructure — what I did NOT measure

- **Cross-tenant notification delivery E2E: NOT MEASURED.** No E2E run was performed; the brief forbids
  the heavy suites under the shared laptop budget. What would measure it: the seeded e2e suite against
  a local Postgres (per the project's `local-seeded-e2e` procedure — pgvector, a non-owner
  `APP_DATABASE_URL`, 12 GB), driving `notifications.controller.e2e-spec.ts`,
  `push.controller.e2e-spec.ts` and `email.controller.e2e-spec.ts` with two seeded orgs and one user
  who is a member of both.
- **Delivery has never been exercised against data in this release.** `notification_deliveries`,
  `notification_queue`, `notification_outbox`, `email_suppressions` and `push_subscriptions` all hold
  **0 rows** at journal head. Every claim in §2(d) about retry, DLQ and circuit-breaking is a claim
  about code shape, verified by reading and by unit tests. Only F-3 and F-4 were converted into
  measurements, and those used a synthetic TEMP-table replica of the two claim loops, not the real
  services.
- **F-20's timing is NOT MEASURED** — the plan shape was captured with `EXPLAIN` (no `ANALYZE`) against
  empty tables. What would measure it: seed ~100k `notification_queue` rows across 8 tenants and run
  `EXPLAIN (ANALYZE, BUFFERS)` on the claim statement with and without the proposed
  `(org_id, status, run_at)` index. Per the project's own "buffers alone mismeasure" lesson, pair
  buffers with rows, plan time and bytes.
- **F-11's multi-instance failure is NOT MEASURED.** It follows from the data structures being
  process-local. What would measure it: boot two backend processes on different ports behind a trivial
  round-robin proxy, mint a stream token, and connect the SSE stream through the proxy.
- **F-16's savepoint interleaving is NOT MEASURED at runtime.** I established it by reading the
  postgres.js 3.4.9 `scope`/`savepoint` implementation and drizzle 0.45.2's
  `PostgresJsTransaction.transaction`. What would measure it: a spec that dispatches to 10 recipients
  where the 4th throws, and asserts the other 9 rows are present.
- **`alert:dead-delivery`'s destination is operator action** — `CONFIGURE_ME` cannot be closed from the
  repository.
- **Whether push subscriptions are being pruned in production** (the second half of F-10) is a deployed
  fact not readable from code.
- **`pnpm typecheck` / `next build` NOT RUN** per the budget. Note that F-8 typechecks clean in both
  repos anyway, because `apiClient.get<T>()` is a cast — a green typecheck would not have caught it.

---

## 6. Correction to the prior audit

Two items, both material.

1. **"The same shape is used by `notification-outbox-relay.service.ts:52`."** It is not. The delivery
   worker caps each org at `ORG_BATCH_CAP` (`:118`); the relay passes the whole `remaining` budget
   (`:71`) with no cap. The relay is the more severe of the two and was scored as safe by association.
   Measured: 2 tenants served versus 5. (F-3.)
2. **`check:empty-states` "misses a real violation" at `notification-bell.tsx:207`.** That branch is the
   *empty* branch; the *error* branch is distinct and correct at `:195-205`. It is a component-reuse
   inconsistency (hand-rolled markup where the sibling page uses `<EmptyState>`), not an error masked as
   "no data". The gate's noun-alternation gap is real; the consequence attributed to it is not.

Everything else in the prior audit — Gaps 1 through 5, the conflict-target analysis, the dead
`err.code === "23505"` inventory, the partition-window measurement and its mutation-proven pin, and the
gate-reach table — re-verified as still accurate at head.
