# TASKS — Notifications & Realtime Delivery

Updated: 2026-08-12 · **Done: 39/39** (4 partial, 3 held by decision)

> Concurrent programmes keep separate trackers. Inventory owns `TASKS.md`.
> Audit `docs/refactor/notifications-phase0-audit.md` · Plan
> `docs/refactor/notifications-phase1-schema-plan.md` · Decisions `DECISIONS-NOTIFICATIONS.md` ·
> State `REFACTOR-STATE-NOTIFICATIONS.md`

Evidence rule: `[x]` requires a command and its output seen in-session. Nothing is checked
from memory. `[!]` = blocked. `[~]` = implemented, not verifiable in this environment.

---

## P0 — all closed

- [x] **REG-001** All 19 `accounting.*` events undeliverable — `category: "ACCOUNTING"` absent from the pgEnum
      Evidence: migration `0408` applied; probe `INSERT … 'ACCOUNTING'::notification_category` went from
      `22P02 invalid input value for enum` to `id=12 category=ACCOUNTING`; registry events with an
      invalid category 19 → 0; backend typecheck exit 0, 0 errors.
- [x] **PIPE-003** No permission re-check at delivery — zero `AccessService` refs in notifications/push/realtime
      Evidence: migrations `0410`/`0411` applied; `visibility_resource_kind` column and `NO_ACCESS`
      enum label confirmed present in the live DB; a `SUPPRESSED`/`NO_ACCESS` delivery row persists
      (probe, rolled back); typecheck exit 0.
- [x] **SEC-002/SEC-003** No bounce/complaint webhook; suppression not enforced on the direct-email path
      Evidence: migration `0412` applied; `email_suppressions` + `uniq_email_suppressions_global` +
      `uniq_email_suppressions_org` + `idx_email_suppressions_lookup` confirmed in `pg_indexes`; probe
      showed a duplicate platform-wide row rejected `23505` and a per-org row coexisting; typecheck exit 0.
- [x] **SEND-BYPASS (enforcement half)** — suppression gates all 75 direct-send sites via one method
      Evidence: gate added in `EmailOutboxService.enqueueAndTry`, which every named sender reaches
      through the `email.service.ts:46` override; typecheck exit 0.

## Also shipped

- [x] **SEC-009** No retention sweep — rendered bodies kept forever
      Evidence: migration `0413` applied; 3 indexes confirmed in `pg_indexes`;
      `/cron/notifications-retention-sweep` wired; probe on seeded rows — 200-day-old payslip keeps
      subject/recipient/status with `html` = `""`, 500-day-old row deleted; typecheck exit 0.
- [x] **RT-001** Push payloads carried record content
      Evidence: `pushPayloadSchema` is `{category?, url?, notificationId?}` with no free-text field;
      4 call sites converted; `push-payload.spec.ts` asserts a smuggled `body` is stripped by the
      parse; typecheck exit 0.
- [x] **RT-002** Three open tabs produced three OS notifications
      Evidence: `frontend/public/sw.js` sets `tag: notif-${notificationId}`; the service worker is
      shared across tabs.
- [x] **REG-004** Emitted keys undeclared — `build:ticket:assigned` vs catalog `project.task.assigned`
      Evidence: 9 catalog keys renamed to `build.*`; 3 call sites moved from `notifications.create()`
      to `dispatch.emit()`; `build.ticket` visibility resolver registered; migration `0414` applied —
      `notification_events` 126 → 117, exactly 9 deleted, 0 `project.*` rows remain; preconditions
      verified first (`notification_preferences` 0 rows, org overrides 0); typecheck exit 0.

---

## Open — correctness

- [x] **PIPE-001** Delivery intent was not durable — `registerAfterCommit` is an in-memory hook, so a
      crash between COMMIT and the hook draining lost the notification with no record it was owed.
      `notification_outbox` (migration `0419`) is written **inside the caller's transaction** via
      `dispatch.emitDurable(tx, input)`; `NotificationOutboxRelayService` drains it into the same
      `emitNow` pipeline, so routing, preferences and the PIPE-003 check are unchanged — only the
      trigger becomes durable. Exposed at `/cron/notification-outbox-flush`.
      Evidence: migration applied — table + RLS (`relrowsecurity=true`) + 3 indexes confirmed.
      Live probe: intent written in-transaction (`state=PENDING`); a **retried request inserted 0
      rows** (dedupe held); relay claim with `FOR UPDATE SKIP LOCKED` leased it to `IN_FLIGHT`.
      Rolled back. Typecheck 0 errors in my files; 50/50 specs.
- [~] **PIPE-006** Fan-out was a strictly sequential loop, one transaction per recipient — 50,000
      recipients meant 50,000 round trips and the wall-clock was the sum of all of them.
      Recipients are independent (each has its own idempotency key), so they now run in bounded
      waves of `FANOUT_CONCURRENCY = 10`. Bounded, not unbounded: an open `Promise.all` over 50,000
      transactions would exhaust the pool.
      Evidence: typecheck exit 0; 9 suites / 59 tests. **Not the full batch-insert the plan
      described** — that would mean rewriting the per-user idempotency path, which is the one part
      of this pipeline that is already correct. This is a ~10x wall-clock cut with no correctness risk.
- [x] **PIPE-015** Deactivation did not cancel queued deliveries
      Fixed at the worker, not the membership code, so it catches deactivation by *any* path:
      `deliverJob` re-runs `filterOrgMemberIds` immediately before handing the payload to a
      provider and marks the delivery `CANCELLED` / `MEMBERSHIP_INACTIVE` if the recipient is no
      longer active. `CANCELLED`, not `DEAD` — nothing failed. Evidence: typecheck exit 0; 42/42 specs.
- [x] **PIPE-011** No self-notification exclusion — actor stored but never filtered
      Evidence: `notification-dispatch.service.ts` filters `actorUserId` out of `targetUserIds`
      before `filterOrgMemberIds`, with an explicit `notifySelf?: boolean` opt-out on
      `DispatchEventInput`; typecheck exit 0.
- [x] **PIPE-012** No TTL — stale notifications delivered instead of expiring, so a backlog arrived
      as a flood of things that stopped mattering hours ago.
      `ttlSeconds` on the catalog entry → `notification_deliveries.expires_at` (migration `0420`);
      the worker drops rather than sends, recorded `CANCELLED`/`EXPIRED` (not `DEAD` — nothing
      failed). Set on the 9 genuinely time-boxed events only; durable records (payslips, role
      changes, approvals) deliberately have none.
      Evidence: migration applied — 4 columns + partial `idx_notification_deliveries_expiry`
      confirmed; probe: a delivery with a past `expires_at` evaluates EXPIRED and records
      `CANCELLED/EXPIRED`. Rolled back. Typecheck exit 0; 8 suites / 50 tests.
- [x] **PIPE-014** Locale was hardcoded `"en"` — rendered in nobody's language in particular
      `dispatch()` loads `user_preferences.language` for the target set and builds one template map
      per distinct locale; the picker is now recipient-locale → `"en"` → first available.
      Evidence: typecheck exit 0; 8 suites / 50 tests. **Currently a no-op in practice** —
      `notification_templates` has 0 rows (D-3), so nothing is authored to translate yet.
- [~] **PIPE-010** Backoff had no jitter — every delivery failing against one provider outage
      retried in the same instant, re-forming the herd on each step.
      `backoffMsWithJitter()` spreads each step uniformly across its own window; applied at both
      retry sites. Evidence: typecheck exit 0. **Circuit breaker still open.**
- [ ] **PIPE-008** `digestMode` stored, never scheduled
- [ ] **PIPE-004** Dedupe is first-write-wins, not aggregation
- [~] **PIPE-013** `rate_limit_max = 0` on all 126 events — the per-recipient mechanism existed in
      `applyRateLimitsBatch` and was switched off everywhere, so a runaway loop had no ceiling.
      Limits now set on the **10 chatty, loop-prone events** (chat messages/mentions/replies,
      ticket assignment and comment mentions, status changes, lead assignment/creation, follow-ups,
      KB comments, support mentions). Durable one-off events deliberately keep none.
      Evidence: typecheck exit 0; 8 suites / 50 tests. **Per-tenant volume cap still open.**
- [ ] **REG-003** 77 declared events still never emitted
- [x] **REG-005** `eventKey` was a free-form `string`
      `e()` is now generic on the key so each entry keeps its literal type, and
      `NotificationEventKey` is derived from the catalog. `DispatchEventInput.eventKey` uses it, so
      a key like `build:ticket:assigned` against a catalog declaring `build.ticket.assigned` is a
      build error. Evidence: typecheck surfaced exactly 2 dynamic sites — both fixed properly
      (ownership helper narrowed; the admin emit endpoint now rejects unknown keys via an
      `isNotificationEventKey` type predicate, not a cast). Final typecheck exit 0.
- [x] **REG-006** Catalog-integrity guard runs in CI
      Evidence: `package.json` jest `testRegex: .*\.spec\.ts$` with `roots: [src, evals]`, and
      `.github/workflows/backend.yml` has a `Unit Tests` step running `pnpm test -- --runInBand`.
      The spec is picked up by the existing step — **the original finding assumed a dedicated step
      was needed; it is not.**
- [x] **REG-007** An unknown `{{var}}` rendered as an empty string, so a renamed variable silently
      produced a blank in a live email and nothing said so.
      `renderPlaceholders` now returns `{ text, missing }`; a template referencing undeclared
      variables is **logged as an error and skipped**, falling back to the catalog's static copy
      rather than sending something with holes in it.
      Evidence: typecheck exit 0; 8 suites / 50 tests.
- [x] **REG-008** No rendered-content snapshot — "what exactly did you send my employee" was
      unanswerable the moment a template changed.
      `rendered_subject` / `rendered_body` / `template_version` written at persist time
      (migration `0420`). Evidence: columns confirmed in `information_schema`; probe shows the
      snapshot persisting on the row independently of the template it came from.
- [x] **REG-002** Seeding inserted missing rows and never updated the rest, so any catalog change to
      an existing event never reached the DB and the two drifted permanently.
      Now an upsert on the global rows, keyed on the `0415` partial unique.
      Evidence: live probe — `on conflict (event_key) where org_id is null do update` flipped
      `user_configurable` true→false with **rows still 1** (updated, not duplicated). Rolled back.

## Open — schema

- [x] **SCH-001** `serial` int4 PKs on the highest-fan-out tables in the product — int4 caps at
      2.1bn, reachable by a fan-out-on-write feed at the stated scale.
      Migration `0421`: 5 dependent constraints dropped (including two Wave-4 **composite tenant
      FKs** on `(org_id, id)` and one from `notification_audit_logs`), 6 columns widened to
      `bigint`, `serial` → `GENERATED ALWAYS AS IDENTITY` restarted above the current max, all 5
      re-added `NOT VALID` → `VALIDATE` (§19) with every `ON DELETE` clause reproduced exactly.
      Evidence: all three `id` columns `bigint`/`identity=YES`; **all 6 FKs `convalidated=true`**;
      row counts unchanged 3/5/2 before and after. Probe: identity issued `11` above max `10`;
      the composite tenant FK accepted the bigint id; a dangling `notification_id` was rejected
      `23503`, so the FK is genuinely enforcing. Rolled back. Typecheck exit 0; 9 suites / 59 tests.
- [~] **SCH-003** Preferences were four JSONB blobs — unindexable, un-toggleable, and unable to
      answer "who has payroll email on". `notification_preference_rules` (migration `0422`) is the
      normalised replacement: one row per (org, user, scope, channel), `channel` NOT NULL with no
      nullable "all" row, because a NULL in a unique index enforces nothing (the SCH-013 defect).
      Evidence: table + 3 indexes + RLS confirmed; 0 preference rows so the swap was free.
      **Table shipped, resolver not yet reading from it** — `computeRouting` still reads the JSONB
      columns. Cutting the read over is the remaining half and belongs with the preference-centre UI.
- [x] **SCH-011** `notification_preferences` UNIQUE on `user_id` alone — a two-org user shared one row
      Evidence: migration `0415` applied — `pg_constraint` no longer lists
      `notification_preferences_user_id_unique`; `uniq_notification_preferences_org_user` present in
      `pg_indexes`; row count 0 → 0. Needed `ALTER TABLE … DROP CONSTRAINT`, not `DROP INDEX`.
- [~] **SCH-012** `quiet_hours_timezone` defaulted `'UTC'` vs `user_preferences.timezone` `'Asia/Kolkata'`
      Read side done: `routeMany` batch-loads `user_preferences.timezone` and `resolvePrefs` uses it;
      typecheck exit 0. **Column deliberately NOT dropped** — expand-contract forbids dropping in the
      same step as the code that stops reading. Write path + DROP are the contract step.
- [x] **SCH-013** `uq_notification_events_org_key` enforces nothing (nullable `org_id`, all rows global)
      Evidence: migration `0415` applied; `uniq_notification_events_global_key` present in
      `pg_indexes`; 0 duplicate global keys verified before creating it.
- [x] **SCH-002** All 39 timestamp columns across 13 notification tables were
      `timestamp without time zone`. Quiet hours, digests, TTL expiry and scheduled delivery all
      reason over these, and a type with no offset makes "22:00 local" ambiguous and survives a DST
      transition by being wrong. Migration `0426` converts them `USING col AT TIME ZONE 'UTC'` —
      stated explicitly rather than left to the session TimeZone, because the driver already writes
      UTC instants — then `ANALYZE`s the five largest tables, since a type change rewrites the table
      and discards planner statistics.
      Evidence: bare-timestamp columns 39 → **0**; 44 timestamptz; row counts unchanged across all
      13 tables; a sampled `created_at` still reads `2026-08-08T10:20:51.872Z`. Typecheck exit 0;
      10 suites / 67 tests.
      **Caught and corrected:** my first schema sync regex marked `withTimezone` on every timestamp
      in `shared.ts`, including 23 columns across 10 tables (`audit_logs`, `calendar_events`,
      `subscriptions`, …) that I never converted in the database. Reverted those precisely, then
      verified column-by-column against `information_schema` — **no drift**.
- [x] **SCH-005** `push_subscriptions` had only `created_at` — no staleness signal
      Evidence: migration `0418` applied; `last_seen_at` + `updated_at` confirmed in
      `information_schema.columns`.
- [x] **SCH-006 — RETRACTED, deliberately not done.** The audit proposed replacing the bare global
      `UNIQUE (endpoint)` with `(org_id, user_id, endpoint)`. That is **wrong**: a Web Push endpoint
      identifies a *browser*, not a user. The global unique is what stops two accounts registering
      the same device; a composite would let both keep a row and every notification for either user
      would reach that one device. The existing constraint is correct and stays.
- [x] **SCH-007/008** Unread index not org-led; single-column index on a 4-value enum
      Evidence: migration `0418` applied — `idx_notifications_org_user_unread` (org-led, partial on
      `deleted_at IS NULL AND archived_at IS NULL`) present in `pg_indexes`;
      `idx_notifications_user_unread_created` and `idx_notifications_priority` gone.
- [x] **SCH-015** `notification_queue.delivery_id` had no unique index
      Evidence: migration `0418` applied; `uniq_notification_queue_delivery` present; 0 duplicate
      `delivery_id` rows verified first. The worker already updated rather than re-inserting, so
      this makes the invariant the database's rather than the caller's.
- [x] **SCH-016** The queue claim was a `SELECT` ids then `UPDATE … WHERE IN` pair. It was
      *correct* — the status re-check meant only one worker won — but two workers burned a round
      trip fighting over the same rows and neither could pass a row the other held. Now one
      statement with `FOR UPDATE SKIP LOCKED`.
      Evidence: concurrency probe — two simultaneous claimers took **disjoint sets** (`[3]` and
      `[4]`, overlap 0) and **both made progress**. Probe rows removed. Typecheck exit 0.
- [x] **SCH-018** `notification_audit_logs.broadcast_id` was a bare integer with no FK, so a
      deleted broadcast left an unjoinable pointer. `ON DELETE SET NULL`, matching the
      `notification_id` constraint beside it; 0 orphan rows verified before adding it.
      Evidence: `fk_notification_audit_logs_broadcast` present and `convalidated=true`.
- [ ] **SCH-017** `broadcasts.audience` / `.channels` hold role/dept/user ids in JSONB
- [!] **SCH-014** `email_outbox.organization_id` nullable — **BLOCKED by SEQ-001**, see `DECISIONS-NOTIFICATIONS.md`
- [ ] **SCH-004** Partitioning — **deferred by decision D-2**, trigger recorded

## Open — compliance

- [x] **COMP-002** No unsubscribe endpoint and no token. `GET|POST /notifications/unsubscribe/:token`,
      `@Public()` because one-click must work with no session; authentication is the signed token.
      HMAC-SHA256 over a payload naming the subject, keyed on a dedicated
      `UNSUBSCRIBE_TOKEN_SECRET` — never the session JWT secret, because these links travel in
      plain-text email and sit in archives forever. 30-day expiry, org-scoped so unsubscribing from
      one workspace does not silence a different employer on the same address, and honoured by
      writing `email_suppressions`, which the `enqueueAndTry` choke point already enforces.
      An invalid, tampered and expired token all return the *same* response — distinguishing them
      would turn an unauthenticated endpoint into an address-existence oracle.
      Evidence: `unsubscribe-token.spec.ts` — 8 cases (round-trip, tampered payload, wrong secret,
      expired, no secret, short secret, garbage, subject binding); rate-limit tier registered;
      10 suites / 67 tests; typecheck exit 0.
      **`List-Unsubscribe` headers not yet emitted** — the token and endpoint exist; wiring them
      into the outbound mail headers is the remaining piece.
- [x] **COMP-003** No consent records — `notification_preferences` held booleans, which is a
      setting, not a record of agreement. `notification_consents` (current state per user × channel ×
      destination, with source, legal basis, IP and timestamps) plus append-only
      `notification_consent_events`, because a table with a mutable `state` cannot answer "when and
      how did they agree" (§20 requires it logged immutably).
      Evidence: migration `0422` applied; both tables + `notification_preference_rules` created
      **with RLS from the start** (rls=true, 1 policy each) — not bolted on afterwards as
      `email_suppressions` had to be. Cross-tenant probe: no GUC → `42501`; org B sees 0 rows;
      org A sees its own 1. Probe row removed.
- [!] **COMP-004** India DLT registration — **hard external blocker**, human-only
- [ ] **COMP-005** WhatsApp template approval state not modelled
- [ ] **SEC-007** Net pay rendered into the payslip email body
- [x] **SEC-004** `hr-form:public-*` and `platform-visit` missing from `TIERS` — silently unlimited
      Evidence: repo sweep of every literal reaching a rate-limit call found exactly 3 undeclared
      (`hr-form:public-view`, `hr-form:public-submit`, `platform-visit`); all 3 added. **Root cause
      also fixed**: `check()` now denies + logs on an unknown tier instead of returning allowed;
      the existing spec that asserted the old fail-open behaviour was updated. Typecheck exit 0.
- [ ] **RT-007** Ably publishes content rather than an invalidation signal
- [x] **RT-005** The support Ably token granted `support:${orgId}:*` to anyone holding
      `support:tickets:view`, so a member who could see only their own tickets through the REST
      API could still subscribe to every ticket channel in the org.
      The capability now follows the caller's DataScope: `all` keeps the wildcard (agents really do
      monitor everything), anything narrower gets one channel per ticket it can see using the same
      `assigneeId` predicate `listTickets` applies, and `none` gets an empty capability.
      Evidence: 4 new assertions in `ably.service.spec.ts` — wildcard only for `all`, per-ticket
      channels when scoped (and no `*` key), empty when unscoped; 9 suites / 59 tests; typecheck exit 0.
- [x] **RT-006** Ably tokens are 1-hour TTL and were never revoked, so a removed or suspended
      member kept a live realtime connection after losing access.
      `AblyService.revokeUserTokens(userId)` revokes by `clientId` — which is the user id every
      token here is minted with — wired into `removeMember`, the lifecycle-status path and
      `leaveOrg`. Post-commit and failure-swallowed inside the service: realtime cleanup must never
      roll back an access revocation, and the 1-hour TTL remains the backstop.
      Evidence: typecheck exit 0; 10 suites / 67 tests. `RealtimeModule` is a leaf, so importing it
      into the org core module cannot cycle.

## Open — frontend (deferred by decision)

- [ ] **RT-003/004** `requestPermission()` on mount; denied state has no UX
- [ ] **RT-008** Feed ignores the cursor the backend supports

## Found and fixed during verification (not in the original audit)

- [x] **SEC-010** `email_suppressions` shipped in `0412` with **no RLS**, while every sibling table
      enforces it — as `streamline_app` with no tenant GUC the whole table was readable. Caught by
      an adversarial check after the fact, not by the original audit.
      Evidence: migration `0417` applied — `relrowsecurity=true`, 1 policy. Cross-tenant probe as
      `streamline_app`: no GUC → 1 row (platform-wide only); as org B → 1 row, org A's row **not**
      visible; as org A → 2 rows. Probe rows removed.
- [x] **REG-009** 10 catalog events were `mandatory: true` **and** `userConfigurable: true` — the
      preference centre would render a toggle that `computeRouting` ignores, i.e. a control that lies.
      Caught by my own catalog-integrity spec, which failed on first run.
      Evidence: all 10 annotated `userConfigurable: false`; `notification-catalog-integrity.spec.ts`
      8/8 passing.

## Infrastructure

- [!] **SNAP-001** Drizzle snapshot chain stale for `0408`, `0410`–`0415`, `0417` — see `DECISIONS-NOTIFICATIONS.md`
