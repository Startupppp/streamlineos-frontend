# Consolidated defect register — code release 10-10, reports 20–43

Companion to `findings-register.md` (reports 00–19). Mined from the 33 reports numbered 20 and above.

| | |
|---|---|
| Register written | **2026-09-03** |
| `streamlineos-backend` HEAD at write time | **`d02479744521321b9c9d97014a1cb29588c78975`** |
| `streamlineos-frontend` HEAD at write time | **`c915ce30b2e7dc66e0ec276f108ba138eed7f9b2`** |
| Numbered findings | 258 |

## Read this before acting on any status below

**Every FIXED / OPEN / PARTIAL / BLOCKED verdict here is a claim about the moment its source report
was written, not about head.** Agents were writing to both repositories concurrently in a shared
working tree throughout the release, and several entries below were already stale when they were
mined — the register says so where it knows.

Two entries have been superseded by direct measurement since mining, and are corrected in place:

- **#250** (`src/db/schema/payroll/policies.ts` TS7022 collapsing the whole backend typecheck to
  `any`) is **FIXED**. The explicit `(): [AnyPgColumn, AnyPgColumn]` annotation landed; the
  orchestrator ran `pnpm typecheck` to completion twice: **exit 0, 0 errors** both times. It is no
  longer the unowned blocker this register ranks third.
- **#197** (a planted bite-proof defect left live in `src/common/tenant/tenant-db.ts`) is **closed**.
  It was removed, and both repositories were swept for other surviving plants by scanning every
  uncommitted diff for plant-shaped changes — small additions with zero deletions in non-spec
  source. **None found.**

**One P1 no report could have seen** was found by a live cross-tenant HTTP probe and fixed:
`POST /org/announcements/:announcementId/read` took **no orgId at all** and wrote a read receipt for
any announcement id in the system, with sequential integer ids making it an enumerable existence
oracle across every tenant. The database could not catch it either — `announcement_reads.org_id` is
nullable and was omitted, and a composite foreign key is **not enforced when one of its columns is
NULL**, so `fk_announcement_reads_announcement_id_org` never fired. Full write-up as **#9a** in
`findings-register.md`, along with the 113 missing-404 contract gaps, 2 cross-tenant 500s and 1
inconclusive route from the same probe run.

## Note on two requested items
- **Dependabot vulnerability counts**: `grep -rniE "dependabot|vulnerabilit|CVE-|npm audit"` across the entire `/code-release-10-10/` tree returns **zero hits**. The only adjacent record is `35b-gate-wiring.md:401`, which lists `check:vulnerabilities` and `check:licenses` as **skipped locally (network)** in the backend `gates` job — so no vulnerability count for either repo exists in these reports.
- **Leaked DB credential rotation**: no report records a leaked DB credential. The nearest items are `17-appsec-tests.md:21` (a misconfigured JWK `kid` — *"treat any key configured this way as compromised and rotate it"*, recommendation only, unowned) and `15d`/`08b` (support-channel inbound-secret rotation via `PATCH /support/channels/:channelId { rotateInboundSecret: true }`, which is an **operator action still owed** after the hashing migration ran).

---

# Defect-shaped findings

## A. Concurrency / admission / streams

**1. Admission slots leak on every downstream guard rejection → backend 503s everything under no load**
`src/common/admission/admission.guard.ts` + `admission.interceptor.ts`
Nest runs all guards before any interceptor. `AdmissionGuard.canActivate` takes a slot; `AdmissionInterceptor` returns it in `finalize`. Any 403 (`PermissionGuard`/`ModuleGuard`/`MfaGuard`), any 429 (`RateLimitGuard`), or a client disconnect never reaches `finalize` → slot stranded permanently (no reaper, no expiry). `@UseGuards` appears at **1,418** decorator sites; `PermissionGuard` ~1,180, `RateLimitGuard` 108 — effectively every 403/429 in the product leaked one. A live instance climbed to **2,278** shed "The service is temporarily overloaded" responses and never recovered without restart; users saw unexplained failure on every surface.
**FIXED.** `attachAdmissionSlot` binds a one-shot release to `res` `close`/`finish`. Pre-fix `jest --testPathPattern="admission.lifecycle"` → **exit 1, 5 failed / 5 passed / 10** (burst case: inFlight **16** of 16 sheddable slots stranded by 50 sequential 403s). Post-fix `jest --testPathPattern="admission"` → **exit 0, 8 suites / 129 passed**. `pnpm typecheck` exit 0.

**2. Notification SSE `__public__` bucket exhaustion — the 51st stream deployment-wide got a 503**
`GET /notifications/events` (`notifications.controller.ts:80`), `src/common/admission/admission.guard.ts:43`
The route is `@Sse()` **and** `@Public()`. `JwtAuthGuard` (2nd `APP_GUARD`) short-circuits on `@Public()` without touching `req.user`, so `AdmissionGuard` (3rd) sees `req.user?.orgId === undefined` and buckets the stream as the literal string `__public__`. Work class was `ordinary-write`, so `orgMaxConcurrent` (default **50**) applied, and the slot is held for the whole stream lifetime. Concretely: **50 open browser tabs across all tenants combined** exhausted the bucket — the 51st logged-in user's notification stream 503'd — and the same bucket serves login, webhooks, health and every other `@Public()` route, so streams and public traffic starved each other in both directions.
**FIXED**, commit **`fde182a5`**. New `admission-tenant-hint.ts` + `UseAdmissionTenantHint`; `NotificationEventService` *peeks* (does not consume) the stream token to yield `{userId, orgId}`, bucketing as `hint:<org>`; route also moved to `@UseWorkClass("non-mandatory-notification")` (shed rank 5 → 4). Pre-fix `jest --testPathPattern="admission-tenant-hint"` → **1, 3 failed / 17 passed / 20** (6 streams from 6 different orgs: **3 admitted, 3 refused**; bucket stamped `__public__` not `hint:org-a`). Hermetic bite proof with `bucketFor` reduced to `return PUBLIC_ADMISSION_BUCKET` → **exit 1, 5 failed / 32 passed / 37**. Post-fix → **exit 0, 10 suites / 169 passed**; `modules/notifications|bola-realtime-grant-time` → **48 suites / 297 passed**; `pnpm typecheck` 0; `check:spec-typecheck` 0.

**3. Residual: a global ~133-concurrent-stream ceiling — OPEN, deliberately not taken**
`src/common/admission/admission.service.ts` (config), §12 of `p1-admission-slot-leak.md`
Bucketing is fixed but the *global* limit binds first: at defaults `ADMISSION_MAX_CONCURRENT` 200 × `reservedFraction` 0.2 → 160 sheddable, and rank-4 threshold `floor(160 × 5/6)` = **133**. A process therefore admits **at most 133 concurrent SSE streams whatever the bucketing** — a deployment with more concurrent tabs than that still sheds. **OPEN / reported, not taken.** Next action (owner: capacity/product + notifications): either size `ADMISSION_MAX_CONCURRENT` to the real tab count, or stop charging long-lived streams an admission slot and give them a separate connection limiter. The author explicitly declined to invent an `ADMISSION_STREAM_ORG_MAX_CONCURRENT` knob because raising a per-org stream cap changes nothing while 133 binds.

**4. `AdmissionService.snapshot()` is read by nothing — no alerting on the counter that caught #1**
`grep -rn "AdmissionService" src --exclude-dir=admission` → **zero hits**. `inFlight` / `maxConcurrent` / `orgMapSize` exist and reach no health field, metric or log. **OPEN. Owner: health/metrics** (`src/health/health.controller.ts`). `AdmissionModule` is `@Global()` and exports the service, so no wiring is needed.

**5. Stream tokens live in a process-local `Map` — SSE is single-replica-affine**
`NotificationEventService`. A token minted on instance A cannot be peeked or consumed on instance B; behind >1 replica the hint fails closed to `__public__`. **OPEN, reported. Owner: notifications.**

**6. AI concurrency slots leaked on out-of-credit rejection — org hard-blocked until restart**
`ai-credits-reservation.service.ts:70` (`09-ai-concurrency.md:22`). `InsufficientAiCreditsException` on a short wallet leaked one slot per request; 20 rejected requests exhausted `AI_CONCURRENCY_CAP = 20`. On Redis the counter TTL is set only on 0→1 and never refreshed; on the no-Redis fallback there is **no TTL at all**, so the block is **permanent until restart**. The chat assistant also leaked the credit reservation (self-heals via the 15-minute sweeper). Reported as found/fixed in that report's scope.

---

## B. Money races

**7. AI-credit first-purchase race — the customer pays and gets nothing**
`billing/core/ai-credits.service.ts:210-256`
`SELECT … FOR UPDATE` **acquires no lock when the row does not exist**. On an organisation's first-ever purchase two concurrent payments both see no wallet, both insert, the loser dies `23505`, the catch swallows it and returns the current balance. The customer is charged and **no ledger row records the purchase**.
**First pass: written then REVERTED** — three spec files (`ai-credits.service.spec.ts`, `billing-idempotency.spec.ts`, `ai-credits-balance-after-invariant.spec.ts`, 12 assertions) pinned the numeric-`SET` shape as a deliberate invariant, and the grant path could not be exercised against a database. Routed as *"This needs the billing owner, not me."*
**Second pass: FIXED and executed.** `.t21-sql-probe.ts` §13 races two 5,000-milli first purchases on two connections against `scratch_t21b`:
```
AI credits (OLD shape): balance=5000 (both paid 5000 => 10000 expected) rejected=1
AI credits (UPSERT):    balance=10000 rejected=0
AI credits (UPSERT):    first=7000 second=10000 lifetime=10000
```
All three grant paths (`grantPlanCredits`, `purchaseCreditsDirectly`, webhook grant) now share one `INSERT … ON CONFLICT DO UPDATE … RETURNING`. Two specs that **encoded the defect** were replaced (the `SELECT_FOR_UPDATE`-ordering assertion; the JS-computed `newBalance` literal), one added: `expect(is(captured.conflictSetBalance, SQL)).toBe(true)`. Mutation proof — replacing the SQL increment with a JS literal → **Tests: 2 failed, 25 passed**, reverted. `.t21-sql-probe` **exit 0, 21/21**; `.t21c-money-probe` **exit 0, 6/6**; `modules/billing` **42 suites / 516 tests**.

**8. Vendor credit spent twice, recorded once — FIXED**
`finance/ap/vendor-credits.service.ts:264-311`. Credit read outside the transaction, checked, then written as an absolute `appliedAmount`. Two concurrent full applies both passed and both wrote. Fix: sufficiency test moved into the `WHERE` against the locked row; zero affected rows → `ConflictException`. Executed: two concurrent full applies → **exactly one lands, `applied_amount` = 1,000 of 1,000**.

**9. Invoice overpayment — `payments` rows totalled double the invoice — FIXED**
`invoices/invoices-payment.service.ts:78-89`. The guard summed payments outside the transaction, so two full payments both saw the same remaining balance. Fix: invoice row `FOR UPDATE`, sum re-asserted under the lock. Executed: two concurrent 250 payments on a 250 invoice → **one paid, one refused, `sum(payments)` = 250**.

**10. Accounts-payable double payment — FIXED**
`accounting/core/accounting-payables.service.ts:299-348`. `amount_paid` is a projection of `sum(vendor_payments.amount)`; under READ COMMITTED a concurrent insert is invisible to that sum. Fix: bill row `FOR UPDATE`. Executed: two concurrent 100 payments on a 100 bill → **one paid, one refused, `amount_paid` = 100 = `sum(vendor_payments)`**.

**11. Bank transfer: one debit vanished — FIXED**
`finance/banking/transfers.service.ts`. Both balances read before the transaction, checked, written as absolute values — two 80-unit transfers out of a 100-unit account both passed and one debit disappeared. Now `currentBalance - amount` in SQL with `gte(currentBalance, amount)` in the `WHERE`; zero rows → `ConflictException`.

**12. Vendor-payment allocations: second concurrent allocation erased the first — FIXED**
`finance/ap/vendor-payments-allocations.service.ts`. `amount_paid` read, incremented in JS, written back. Now one `UPDATE … FROM (VALUES …)`. Also: naming the same bill twice upserted the allocation row once (last amount wins) while incrementing the bill by both, so allocation and bill disagreed — allocations are now collapsed by bill before validation.

**13. Payment-run executor silently reverted concurrent commits — FIXED**
`finance/ap/payment-run-executor.service.ts`. Wrote an absolute `amount_paid` from a run-wide snapshot. Now an atomic increment with settlement read back from `RETURNING`.

**14. Affiliate: two webhooks inserted two commission rows and paid one — FIXED**
`billing/core/affiliate.service.ts`. `totalEarned`/`pendingPayout`/`signupCount` incremented in JS from a pre-transaction read.

**15. "Mark all read" could rewind the cursor and resurrect dismissed notifications — FIXED**
`notifications/notifications-lifecycle.service.ts`. The watermark was **assigned**, so two marks committing in either order let the older one rewind. Now `GREATEST(...)`.

**16. e-sign / inventory undercounts that bypass a policy budget — FIXED**
`e-sign/sign-public-form.service.ts` (`submissionCount + 1` from a pre-transaction read); `e-sign/sign-envelope-sweeps.service.ts` (`reminderSentCount + 1` — a max-reminders policy built on it is **bypassable**); `inventory/webhooks/webhook-emitter.service.ts` (`attempts + 1` — a retry budget keyed on it **never exhausts**).

**17. `assertWithinLimit` is check-then-act at 24 of its 29 call sites — OPEN**
Only `members` takes the advisory lock and passes `tx`. The other 13 limit keys (leads, contacts, deals, invoices, projects, channels, envelopes, candidates, …) read `used` on `this.db` and insert outside any lock, so **N concurrent creates at the plan limit all succeed**. The `executor` parameter that fixes it already exists — a mechanical sweep against the `invitation-create.service.ts:251` shape. **Owner: each module lane.**

**18. Four version-bump-without-CAS sites — one editor's body is silently lost — OPEN**
`notification-templates`, `hr-document-templates`, `hr-workflow-definitions`, `timesheets/core/settings`.

**19. Three `MAX(sortOrder)+1` sites with no unique on `(parent, sortOrder)` — OPEN**, collision is silent rather than loud. Cosmetic today.

**20. `POST /portal/auth/accept-invitation` token consumption is unfenced — OPEN**
`src/modules/portal/auth/portal-auth.service.ts:101`. The UPDATE carries no `status = 'PENDING'` predicate and no affected-row check, unlike its org-side twin. Concurrent redemptions both succeed. **Owner: ticket 07's territory.**

**21. `/support/inbound/*` dedupe rides a non-unique index — OPEN**
`POST /support/inbound/{email,sms,whatsapp}/{orgId}` — all three now frozen as **published** contracts, `x-exposure=public`, `idem=advisory-dedup-unfenced`. Dedupe is SELECT-then-INSERT on `support_ticket_messages.source_message_id` backed by `idx_support_ticket_messages_source_message`, which is **not unique**, so two concurrent redeliveries both insert. **Owner: schema (make the index unique) + ticket 07.**

**22. `PATCH /public/whiteboard-links/{token}` is a genuinely unauthenticated write — OPEN**, gated only by `publicAccess = 'editor'` and a rate limiter. Now a **published** contract, which raises the cost of changing it. **Owner: ticket 07.**

**23. `QuotesService.update()` raises an approval for a price change that never happens — OPEN**
`quotes.service.ts:240` gates approval on `input.discountPercent` but recomputes `discountAmount`/`netAmount` only inside `if (input.lineItems)` at `:255`, and `quotes` stores `discount_amount` with no `discount_percent` column (`db/schema/crm/invoicing.ts:179`). So `PATCH /quotes/:id { discountPercent: 25 }` with no `lineItems` sets `approvalStatus = "pending"` and **changes no money at all**; on approval the quote still carries its old `netAmount`. Deliberately **not encoded in a test**. Needs a product decision (persist `discount_percent`, or reject a discount-only update). Recorded twice (35b §4, 35c §10.9) so it is not lost — **UNOWNED**.

---

## C. Outbox / durability / wiring

**24. Orphaned outbox consumer dead-lettered every ticket status change**
`src/modules/build/core/build-ticket-status-changed-consumer.service.ts`, absent from `providers` of `src/modules/build/core/projects.module.ts`
`projects-tickets-update.service.ts:296` emits `build.ticket.status_changed` inside the ticket-update transaction on **every** status change. The consumer class declares `readonly eventType = "build.ticket.status_changed"` and registers itself in `onModuleInit` — but Nest never constructed it, so it never reached `OutboxConsumerRegistry`. `OutboxPublisherService.deliver()` then threw `no dispatch handler for event type 'build.ticket.status_changed' — register a consumer via OutboxConsumerRegistry`, so **every ticket status change wrote a row that retried on exponential backoff and was dead-lettered after `OUTBOX_MAX_RETRIES` (8)**. No assignee was ever notified. Not dead code: `notification-events-build.catalog.ts:25` registers a live template ("Task status changed") and `common/region/cross-cell-events.spec.ts:28` names it.
**FIXED** — two lines in `projects.module.ts`. Bite proof: consumer removed from `providers` → `check:outbox-consumers` **exit 1** (names the event, the emitting file and the unregistered class); re-added → **exit 0**.

**25. `check:outbox-consumers` certified a delivery it could not observe — FIXED**
The gate reported green (25 emitted / 28 consumed) by string-matching `readonly eventType = "..."` **anywhere in the tree, including inside the orphan file**. A class no module provides satisfied it perfectly. Rewritten to require: declares an event type **and** appears in some `@Module`'s `providers` **and** that module is reachable from `AppModule`. First registration-aware run reported **seven** orphans, six of which were the new parser's own false positives (`const BUILD_MODULES = [...]` + `imports: BUILD_MODULES` hoisting in build/kb/finance/hr/inventory) — hand-checked before trusting. Final: **26 emitted / 29 registered / 0 orphans, exit 0**; self-test 30 assertions.

**26. Org provisioning ran in a bare `setImmediate` — a crash left a permanently half-provisioned organisation — FIXED**
`org-setup.service.ts` did four things after commit inside `setImmediate(() => void runOutsideTenantContext(...).catch(log))`: seeded RBAC roles, provisioned module checklists, closed the onboarding session, sent the welcome email, with `Promise.allSettled` and log-only errors. A restart in the window between commit and callback — or any single step throwing — left a brand-new org with **no roles** (the owner could not open the screens they owned), no checklists, an open session, and nothing anywhere recording it. Moved onto the transactional outbox: `organization.setup.completed` emitted via `OutboxWriter.emit(tx, …)` inside the same `runInTenantTransaction`, consumed by `OrgSetupCompletedConsumerService` fenced by `InboxConsumer`, steps sequential, failures **rethrow**. Mutation-checked: reintroducing `setImmediate(() => { void … })` → **2 failed, 8 passed, exit 1**; reverting → green.

**27. Payroll paid leg lost the accounting journal on a process death — FIXED**
`payout-run-completion.ts` posted the bank-disbursement journal with `registerAfterCommit(postTask)` falling back to `void postTask().catch(log)`. `registerAfterCommit` is purely in-process: if the node died after commit and before the hook, the run was `PAID` in payroll and the `PAYROLL_PAYABLE`/`BANK_CLEARING` entry **never existed in accounting** — no retry, no dead letter, no state marker. Reachable from all four `checkRunCompletion` call sites. Now emits `payroll.run.payout-posting-intent` via `OutboxWriter.emit(tx, …)` alongside `MARKED_PAID`, with a new `payroll-payout-posting-intent.consumer.ts` that **re-throws** on failure. `check:outbox-consumers` exit 0; 6 + 6 new tests.

**28. `check:fire-and-forget` printed ~49 findings and exited 0 — FIXED**
It covered exactly two method names (`emit`, `savePosition`) inside `src/modules`, printed ~49 uncovered method names totalling 39+ call sites, and exited **0**. Rewritten into TIER 1 (banned, currently **0**) and TIER 2 (ratcheted, all of `src`, including controllers/guards/interceptors/filters). Corpus 1,839 files / 2 method names → **3,574 files**. Ratchet set at the measured **283** (200 floating promises + 83 swallowed rejections, dated 2026-09-02). Bite proof: one extra `void this.x.y(` → 284, **exit 1**; reverted → 283, **exit 0**. **283 sites remain pinned but unexamined — OPEN.**

**29. Fire-and-forget sites whose effect leaves the process — OPEN, named**
`hr/time/leaves-write.service.ts:274` (starts a workflow + dispatches notifications, swallowing every error with **no log line**); `hr/lifecycle/onboarding-views-support.ts:33` (fires automations that fan out to webhooks and email, fully swallowed); `organization/core/org-membership-access-revocation.ts:318` (an HTTP call to Ably that **duplicates** an existing `realtime.token-revocation` outbox event and is the copy that can be lost); `email/controllers/hr-send-email.controller.ts:105` (provider send with no outbox row and no idempotency key — **a retry double-sends**); `ai/core/controllers/crm-ai.controller.ts:134,149` (a floating call that opens a transaction and inserts `auditLogs` — **an audit record dropped on the floor**). Reference shape: `notifications/notification-dispatch.service.ts:111`.

**30. Three durable queues restore no trace context — OPEN**
`modules/notifications/notification-outbox-relay.service.ts`, `modules/payroll/jobs/payroll-jobs-worker.service.ts` (`payroll_jobs` already has a `correlation_id` column **and an index on it** — somebody intended this join and it was never written or read), `modules/email/email-outbox.service.ts` (no correlation column at all → a migration, so a decision). One-line fix each now that `runInRestoredContext` exists.

**31. Workflow drain filed every run under the cron tick that picked it up — FIXED**
`workflow_runs.correlation_id` existed and `startRun` wrote it, but **no projection that read a run back ever named it**: `claimDueRuns`' `RETURNING` stopped at `max_attempts` and `RunRecord` had no field. Every run, step, error report and span executed inside whatever context `/cron/workflow-tick` carried. `boundDrain()` — whose doc comment describes the requirement precisely — had **zero callers** (`grep -rn boundDrain src` → one hit, its own definition); deleted. Bite proof: removing `correlation_id` from the `RETURNING` → `trace-boundary-coverage.spec.ts` **1 failed / 28**.

**32. DNS-pinned webhook transport sent no trace context at all — FIXED**
`common/outbound/safe-webhook-transport.ts::postSafeWebhook` reimplements transport on `node:https` (to pin DNS for SSRF) and reimplemented the omission: no `traceparent`, no `x-correlation-id`, no span. Its two callers deliver **customer** webhooks. Bite proof: drop the header merge → **2 failed / 6**. Caller headers always win (case-insensitive) so a signature-covered header set is never replaced; span name is the constant `provider.webhook`, never the customer's hostname.

**33. Two `@Injectable`s registered in no module — the feature silently does not exist — FIXED**
`ingress/adapters/telephony-call-log.service.ts:83`, `ingress/adapters/whatsapp-ingress.service.ts:108`. `check:module-di` reported a clean 217 modules / 1,707 classes because its population was *classes already listed in some module's providers*. Added Check D (walks the real graph from `AppModule`); first pass reported **12** hits, hand-checking reduced the truth to **2** (the other 10 were barrel re-exports, enhancers, factories, an alias, a base class). Both registered in `ingress.module.ts` (+`IntegrationsModule` in imports, because `MailModule` imports it **without re-exporting**). Bite proof: revert the two `providers` entries → **exit 1, 2 findings**; restore → **0**. Ratchet `MAX_UNREGISTERED = 0`; self-test 23 → **54 assertions**.
**Residual OPEN:** neither adapter has a caller — `TelephonyCallLogService.sync` and `WhatsAppIngressService.accept` are invoked from nowhere (blockers in `src/modules/integrations/**`, routed to ticket 12), and both files carry now-stale docblocks saying they are "deliberately not registered".

**34. `check:tenant-isolation` uncovered service — CLOSED, verified independently**
`org-setup-completed-consumer.service.ts` had no cross-tenant negative test (reported by two agents). Closed by backend commit **`deff6b6f`**. Re-measured: `check:tenant-isolation` **exit 0, 928/928 (100%)**; `:run` **exit 0, 450 suites / 1,847 tests**. Hermetic mutation proofs: tenant guard → `if (false)` → **4 failed / 6 passed / 10**; `.strict()` removed from the payload schema → **1 failed / 9 passed / 10**.

---

## D. Route budgets and query plans

**35. `GET /calendar/events` — 1,139 buffer blocks against a 500 ceiling, and the budget measures a different service**
`contracts/route-budgets.json` → `readCostBudgetId: "dashboard-personal-calendar-events"`
The linked read-cost budget mirrors **`src/modules/dashboard/dashboard-personal.service.ts::upcomingEvents`** (`LIMIT 3`), not `GET /calendar/events`, which is `CalendarService.getEvents → CalendarEventsAggregateService → CalendarNativeEventSource → CalendarEventSourceLoader.queryVisibleEvents` and issues a completely different statement. The 1,139 blocks are the dashboard's, charged to the calendar route. The plan de-correlates the attendee `EXISTS` into a hashed SubPlan that materialises **26,077 `event_attendees` rows for 1,127 buffers** before `LIMIT 3` can stop anything (reproduced on the rebuilt seed at 1,140 blocks / 26,079 rows).
**OPEN; `check:route-budgets` exit 1 on purpose, ceiling NOT raised.** Fix is three lines in `dashboard-personal.service.ts::upcomingEvents` (~line 113): resolve the membership once, replace the attendee `exists(...)` with `LEFT JOIN LATERAL (SELECT 1 … LIMIT 1) att ON true` + `isNotNull(att.hit)`. Measured **1,140 → 23 blocks**, 26,079 → 0.67 attendee rows per candidate row, same three rows returned, **no new index**. Two suggested alternatives were measured and rejected: correlated `EXISTS` with the membership as a constant = **1,140** (unchanged, Postgres hashes it anyway); OR-to-`UNION ALL` = **1,223** (worse). A partial covering index would fix the breach (230 blocks) and was **refused** — the query fix is 10× better at 0 bytes vs 6,296 kB. **Owner: dashboard.**

**36. That same budget's number is time-dependent — re-measuring turns the gate green with nothing fixed**
`visibility = 'org' OR EXISTS(creator) OR EXISTS(attendee)` is evaluated left to right, so the hashed SubPlan is built only if the OR reaches it. The seed writes 54,558 `org` and 5,454 `private` events per majority tenant in groups of seven sharing one `start_date`. Whether `start_date >= NOW()` puts a private event in the first three rows is a function of **wall-clock time since the seed ran**: fresh seed → **6 blocks, PASS**; once the clock moves → **1,140 blocks**. So `measure-route-budgets --write` re-run tonight overwrites 1,139 with ~6 and the gate goes green. **OPEN → ticket 22.** A `maxScanRows`-style guard on `event_attendees` rows would bite regardless of branch.

**37. The real calendar loader was never measured and costs 14× the ceiling**
`CalendarEventSourceLoader.queryVisibleEvents` — measured directly, first keyset batch, one-month window:

| tenant | blocks | rows | `calendar_events` rows scanned |
|---|---|---|---|
| 89.93% | **7,063** | 500 (batch cap — it loops) | 3,610 |
| 9.00% | 199 | 500 | 876 |
| 0.90% | 70 | 96 | 97 |
| 0.18% | 2 | 0 | 0 |

**7,063 blocks is one batch of a loop that pages until exhausted, against a `maxBufferBlocks` of 500.** Driver is recurrence, not the attendee join: 8,571 of the majority tenant's 60,012 events carry an `rrule`, and the recurring branch (`start_date < end AND (recurrence_end IS NULL OR recurrence_end > start)`) has **no lower bound**, so every recurring event in the tenant's two-year history is a candidate for any window. Only **77** non-recurring events fall in the month requested. A lower bound on `start_date` for the non-recurring branch was tried and measured: **7,063 → 7,063, no change**. **OPEN, recorded not attempted → ticket 20/22 + calendar.**

**38. `GET /me/attendance/history` Seq Scanned the whole tenant — FIXED**
`AttendanceReadService.history` filters `attendance.user_membership_id`; the only owner index was `idx_attendance_org_user_date (org_id, user_id, date)`. At 89.93%: `Seq Scan on attendance (rows=17), Rows Removed by Filter: 9991, Buffers: shared hit=47 read=146` — **193 buffers to return 17 rows**, breaching `maxScanRows: 200` at two tenants. **Declaration drift, not a new index**: `src/db/schema/hr/attendance.ts` had declared `idx_attendance_org_user_membership_date` since the actor rollout and **no migration ever mentioned that name**. Shipped as migration **`1041_t22c_attendance_membership_history_index`** (journal idx 797, `when` 1803000010116, `.sql` + `.down.sql` + journal in one commit).

| tenant | head | `(org, membership, date)` | shipped `(…, date DESC, created_at DESC)` |
|---|---|---|---|
| 89.93% | **193** | 5 | **5** |
| 9.00% | 25 | 17 | **17** |
| 0.90% | 6 | 4 | **4** |
| 0.18% | 3 | 4 | **3** |

Rows read: **10,008 / 900 / 90 / 18 → 17 / 15 / 12 / 4**. `created_at DESC` is in the key because without it the tiny tenant paid **one buffer more than head** (4 vs 3) via an Incremental Sort. 464 kB index. `attendance-mine` now 5 buffers / 17 rows, PASS.

**39. `GET /notifications` issued 5 statements against a ceiling of 3; the list planned over 49 partitions — FIXED**
`NotificationsReadService.list` resolved the caller's membership, then `fetchLastReadId` **resolved it again**: `resolveMembershipId(1) + fetchLastReadId[resolveMembershipId(1) + watermark(1)] + list(1) + ticketContext(1) = 5`. Collapsed to one left join (`resolveRecipient`). Separately, `notifications` is RANGE-partitioned on `created_at` (migration `0582`, 48 monthly partitions + DEFAULT) and a read with no `created_at` predicate cannot prune, so **planning** a 49-way Merge Append cost **13,728 buffers to return 20 rows — 90× the execution cost**, paid on every uncached list. Fixed with a retention-aligned window derived from `NOTIFICATION_RETENTION_POLICY` (180 days) rather than a page cap, pinned against `expiredPartitions()` over four clocks.

| route | before | after | ceiling |
|---|---|---|---|
| `GET /notifications` | **5** | **3** | 3 |
| `GET /notifications/unread-count` | **4** | **2** | 5 |

Partitions 49 → **8**; list total buffers (large tenant, warm) **13,879 → 2,810** (4.9×). The "before" is the author's own measurement (pre-change service restored from HEAD, ratchet run, read 5, restored). Honest caveat: **on this seed the window hides 189 of 450 rows** for the fixture membership — every one in a partition `expiredPartitions()` reports as due for detach; in a deployment where retention runs the set is empty by construction.

**40. Two notification budgets measured a column the code does not use — FIXED**
Migration `0520` moved recipient authority from `user_id` to `membership_id`; **no index leads with `(org_id, user_id, …)` any more**. `notifications-list` and `notifications-unread-count` still filtered `user_id` with no `created_at` predicate. Re-pointed against the service, verified one by one:

| budget | 89.93% | 9.00% | 0.90% |
|---|---|---|---|
| `notifications-list` | **3,173 → 121** | 1,367 → 119 | 1,200 → 85 |
| `notifications-unread-count` | **10,566 → 16** | 2,577 → 16 | 551 → 16 |
| `dashboard-personal-notifications-count` | **11,377 → 16** | 1,367 → 16 | 1,292 → 16 |

Rows scanned on `notifications-list` at 89.93%: **59,561 → 98**. The `before` plan on `dashboard-personal-notifications-count` was a **Seq Scan over 266,400 rows**. `timesheets-mine` charged the route for a membership probe `listTimeEntries` does not make, and named `idx_timesheets_org_user_date`, which **does not exist**. A mechanical cross-check of every `idx_*` name in `read-cost-budgets.mjs` against `pg_indexes` found that one.

**41. `mail-inbox-cached` named an index migration 1022 had dropped — FIXED**
`1022_t29_mail_metadata_search_and_keyset` dropped `idx_mail_metadata_list` and created `idx_mail_metadata_list_keyset (org_id, user_membership_id, folder, date DESC, id DESC)`. The budget's comment still named the dropped index on `user_id`; its SQL ordered by `date DESC` alone while `MailMetadataService.listCached` orders `(date DESC, id DESC)`; `LIMIT` 50 → 51 (`pageSizeField(25,50)`). Also: **`scratch_t22b` still carried `idx_mail_metadata_list` even though 1022 was applied** — recreated after the fact by something outside the migration; anything measured on `scratch_t22b` for mail must be re-taken.

**42. `dashboard-my-issues` declared no `maxScanRows` — an index loss could not be seen — FIXED**
It walked the identical 1,801 rows as `dashboard-personal-my-tasks` and reported PASS, because 1,844 buffers sits inside its 2,000-block ceiling. Now declares `maxScanRows: 200`, and `my-tasks`' 1,000 — **45× above the post-`ef3c1960` scan, a guard that had stopped guarding** — was **tightened** to 200. Bite-proved by dropping migration 1027's index: both **FAIL at 1,801 > 200**; restored, both PASS.

**43. Six read-cost budgets passed over an empty result set — FIXED (fixtures)**
`dashboard-personal-my-tasks` (18,500 tenant rows → 0 returned), `leads-assigned-to-me`, `chat-saved-messages`, `kb-page-visits-mine`, `kb-page-id-probe-sdf`, `module-access-roster`. A budget over an empty set satisfies every ceiling trivially and no plan assertion it declares can fire. All six were seed defects; **none was waived** (`allowEmptyResult` used **zero** times). After: `70/70 measured (100%)`, `0 vacuous`. Fixing them **exposed one real plan defect the vacuous budget was hiding**: `dashboard-personal-my-tasks` scanned **1,801 rows against `maxScanRows: 1000`** (`Rows Removed by Filter: 1791`) because the planner takes `(org_id, updated_at)` for the `ORDER BY` and declines `idx_tickets_org_assignee_status`, which cannot order. Landed by `ef3c1960` (migration 1027) as `(org_id, assignee_membership_id, updated_at DESC) WHERE deleted_at IS NULL` → **4 buffers, 19 rows, PASS**.

**44. Seed wrote title-case ticket statuses while the application writes UPPER_SNAKE — FIXED in the seed, commit `3d157c15`**
`DEFAULT_PROJECT_STATUSES` (`build/core/lib/default-statuses.ts:1`) and `ACTIVE_TICKET_STATUSES` (`dashboard/dashboard-personal.service.ts:28`) both write `TODO / IN_PROGRESS / IN_REVIEW / DONE`; both seed scripts wrote `Todo / In Progress / In Review / Done` (`seed-perf-scratch.mjs:483`, `seed-scratch-e2e.mjs:411`). `t.status IN ('TODO','IN_PROGRESS','IN_REVIEW')` matched **0 of 20,572** rows. The **seed** was corrected (the budget was not — retuning it would have measured a query the application never runs). The composite FK `build.tickets(org_id, project_id, status) → build.project_statuses(...)` is `ON UPDATE CASCADE`, so `LEGACY_STATUS_NAMES` converges an existing database in one statement. This mis-routed one full round of analysis: `scratch_perf_seed` predated the fix and read the budget as vacuous.

**45. A seed section had started failing silently against a live CHECK constraint — FIXED**
`seed-perf-scratch.mjs` inserted chat channels as `type = 'GROUP'` without `is_private`, violating `chk_chat_channels_privacy_matches_type` (`CHECK (is_private = (type <> 'PUBLIC'))`). On a fresh head the mid, small and tiny tenants got **no chat channels and no messages at all** and the script exited non-zero with three recorded failures; `scratch_perf_seed` hid it because it predated the constraint and top-ups found the tables full. `chat_messages` back to 12,000 / 1,200 / 120 / 24.

**46. `seed-scratch-e2e.mjs` reported "All sections completed without errors" while printing warnings — OPEN**
It emitted 18 `WARN payroll_line_item: null value in column "calc_explain" … violates not-null` and still claimed a clean run; `payroll_line_items` is 0 rows. Some `warn()` calls do not push into the `errors` array.

**47. The Party seam was never seeded — 20 services read an empty join — FIXED**
Ticket 02 made Party canonical and left `leads`/`contacts` derived mirrors, so `LeadsReadService.list` and `queryContacts` select from `lead_party_map ⋈ business_parties` via `PARTY_OF_LEAD`/`PARTY_OF_CONTACT` — **20 services import those**. On the old seed every one of those reads matched nothing: `lead_party_map` **0**, `contact_party_map` **0**, `business_parties.owner_user_id` NULL on all **22,240** rows, while `leads`/`contacts` held **8,896** each. After `seedPartySeam`: 8,896 / 8,896 / 17,792 owned; canonical-side "active leads" **0 → 6,400 rows**. `seed-perf-scratch --self-test` **exit 0, 13/13** (was 11/11).
**Residual OPEN:** `leads-assigned-to-me` would now measure **16 rows** at the majority tenant (8,000 leads over 500 members) — a fixture choice, → tickets 20/22.

**48. `GET /kb/pages/:id` returned the generated `fts` tsvector to the browser — FIXED**
`kb-pages.service.ts:123` spread the whole `PageRow`, which includes `fts` and `content_text`. Verified the frontend reads it nowhere (`grep -rn "fts"` across the frontend → three hits: a lockfile hash and the word *drifts* twice). Measured: **2,340 of 3,644 bytes (64.2%)** on one `GET /kb/pages/:id`; a 50-row `kb_pages` read 135,456 → 51,440 B (62.0%). Mean `pg_column_size(fts)` **1,241 bytes** on a mean row of 2,060 — **the search vector is larger than every other column of the page put together**. Fixed by type, not by site: `kb-page-columns.ts` / `kb-article-columns.ts` export the `fts`-free column set, adopted by 17 `.returning()` calls and three unprojected reads, so a future read cannot reintroduce it without a type error. This is a **response-contract change** on `GET/PATCH/POST /kb/pages`, status/visibility/restore/duplicate/move and every `kb_articles` mutation. `kb_articles` holds **zero rows** in the seed so the article-side saving is stated **unmeasured**.

**49. `GET` ticket-detail threw on every call — P0, FIXED**
`build/core/projects-tickets-detail.service.ts` asked Drizzle for `assignee: { with: { user: { with: { user: …` and `comments: { with: { user: { with: { user: …`. `tickets.assignee` → `organization_members`, `.user` → global `users`, and `usersRelations` declares only `organizations` and `accounts` — **there is no `users.user`**. Built against the real schema barrel both forms raise `TypeError: Cannot read properties of undefined (reading 'referencedTable')` at query-build time, so `getTicket` and `getTicketByKey` could never return. Four expressions, two call sites. **The two specs covering this file pass either way** — they mock `db`, so they never resolve a relation. Proof by build+execute against `scratch_boot_d`: before → `FAIL … referencedTable`, after → `BUILD OK … EXECUTED OK rows: 1`.

**50. The unified inbox reads notifications on a column with no index — 263× — OPEN**
`unified-inbox.service.ts:379` and `:232` key on `notifications.user_id`; every index leads `(org_id, membership_id, …)`. Same question, same answer (451), large org:

| query | buffers | rows read → returned |
|---|---|---|
| `unified-inbox-unread-count-by-user` (as shipped) | **10,240** | 23,401 → 1 |
| `membership-unread-count-equivalent` | **39** | 451 → 1 |

`unified-inbox-list-by-user` reads **42,602 rows to return 20** (2,066 buffers). Deliberately **not re-keyed**: `notifications.membership_id` is **nullable**, so re-keying silently drops every unbackfilled row — needs a backfill + `NOT NULL` migration first. **OPEN → ticket 08.** Two divergent unread counts exist in production as a result (`notifications-read.service.ts:322-338` counts by `membershipId`).

**51. `app.search_kb_chunk_ids` cannot use the HNSW index at all — OPEN**
The body is `WITH org_chunks AS MATERIALIZED (…) SELECT id FROM org_chunks ORDER BY embedding <=> p_vec LIMIT n`. `AS MATERIALIZED` forbids pushing the ordering into `idx_kb_chunks_embedding_hnsw`, so **every call materialises the org's entire corpus of 1536-dimension vectors and sorts it**: **36,882 buffers** (12k chunks) / 4,043 (1.2k) / 758 (120) — ~3.0 buffers per chunk, linear, no index. An org with 500k chunks would move ~1.5M buffers per search. Dropping `AS MATERIALIZED` is a **strict** improvement (27× on the majority tenant, no worse on either smaller one, both measured). Exact replacement SQL is given. **OPEN — migration/function territory.**

**52. The recurring reminder sweep silently dropped 97% of its work — FIXED by another hand, confirmed**
`calendar-reminder-sweep.service.ts:61` selected recurring events with `start_date <= dueBy` (the org's whole history), then `LIMIT 200` **with no `ORDER BY`**. The large org holds 8,569 recurring events, so **8,369 were never considered for a reminder**, and *which* 200 survived was whatever the plan emitted. Ticket 21 verified against current source that it now drains through `drainByKeyset`.

**53. The free/busy conflict scan pulls the whole matching set into Node memory — OPEN**
`calendar-conflict.service.ts:56`. The keyset loop has no overall budget: a 7-day window in the large org matches **8,653 rows** (~87 pages at 712 buffers each) landing in one array before `expandToOccurrences`. The uncapped count of the same predicate seq-scans: **1,730 buffers, 66,613 rows read to return one number**. The constitution forbids a cap; the honest fix (an explicit conflict budget with `hasMore`) changes an API contract. **OPEN — product decision.**

**54. Two CSV exports stream from inside the request transaction — OPEN**
`audit-log.service.ts:87`, `contacts.service.ts:157` are async generators, so the pooled connection is pinned for the whole download. `common/tenant/README.md` says this needs `@NoTenantTransaction()`; neither route has it.

**55. AV scan runs 90 s inside a transaction with a 60 s idle timeout — OPEN**
`storage.controller.ts:151` awaits the AV scan inline and the VirusTotal path polls `6 × 15 s`. The upload does not merely hold a connection — it **fails with a connection-terminated error that looks nothing like a scan failure**. `runOutsidePoolBorrow` exists and has **two** call sites in the repo. Systemic: counted awaits inside an open transaction — Upstash Redis **337**, S3/R2 **72**, email **43**, AI gateway 5, raw `fetch` 7 (incl. `chat-link-preview.controller.ts:38` on a **user-supplied URL**), long CPU ~14. Needs an architectural decision about `TenantContextInterceptor`, not a sweep.

**56. `inv_packages` has no index on `shipmentId`** (`db/schema/inventory/shipping.ts`) — the package-count probe at `shipments.service.ts:143` walks every CLOSED package in the org. **OPEN → migration.**

**57. `storage_pending_purge`'s unique index is mis-declared** — `src/db/schema/common/storage-pending-purge.ts:26` declares `index(...)` where migration `0741` creates `CREATE UNIQUE INDEX` (confirmed in `pg_indexes`). `onConflictDoUpdate` works at runtime by column-list match; the schema is lying. **OPEN → schema.**

**58. Six index drops in ticket 08 are measured regressions — OPEN**
All six are a narrow `(org_id)` index dropped as a "leading prefix" of a wider one. On the 89.9% tenant `contacts` goes to a **full Seq Scan (645 buffers against 30)** and `inv_stock_levels` costs **609 against 39**, while every minority tenant is flat. The `inv_stock_levels` probe is the literal query at `inventory/settings/settings.service.ts:137`.

**59. Overlapping FK pairs grew 5 → 172 at head** (25 on non-empty tables), measured at **2,000 redundant FK trigger invocations per 1,000 inserts** on `inv_stock_transactions`. **OPEN.**

**60. Declaration drift: `idx_calendar_events_org_creator_membership`** exists live on `(org_id, created_by_membership_id, start_date)` while `calendar-events.ts` declares `idx_calendar_events_org_created_by_membership` on `(org_id, created_by_membership_id)`. **OPEN → 07b.**

**61. `run-read-cost-budgets.mjs`'s tally line mixes units** — `--- Tally: N PASS / M FAIL ---` counts budgets on the left and *breaches* on the right, so a budget tripping two guards makes them sum past the declared total (`67 PASS / 4 FAIL` over 70 budgets = three failing budgets, one twice). Reads as an arithmetic error in a gate whose job is to be believed. **OPEN, reported in 22c §4 and again in perf §6.**

---

## E. Cache correctness

**62. `hr:headcount` read and invalidated two different Redis counters on two different instances — FIXED**
Read: `OrgStructureService.getHeadcount` → `cachedVersioned(CACHE_KEYS.hrHeadcountNamespace(orgId), …)` → `cache:namespace:hr:headcount:<org>:version` on the **default** Redis. Bump: `OrgHierarchyCacheService.invalidateAfterMutation` → `invalidateNamespaceForOrg(orgId, "hr:headcount")` → `cache:namespace:<org>:hr:headcount:version` on the **region-resolved** Redis. **Headcount was stale after every hierarchy mutation until TTL, forever.** Fixed at `org-structure.service.ts:123`. The two guarding specs asserted `toHaveBeenCalledWith(...)` — satisfied by a read whose counter no writer touches, which is precisely what shipped. Rewritten to drive the real `CacheService` over `InMemoryRedis` and assert the value a second caller gets. Bite proof: pre-fix wiring → `- Expected 1 "count": 13, + Received 1 "count": 12` at `zz-temp-bite-proof.spec.ts:32` (temp file deleted).

**63. "Invalidation via parent prefix" does not exist — 4 no-op deletes — FIXED**
`CacheService.invalidate` is `redis.del(exactKey)`; there is no prefix mechanism anywhere (`invalidatePattern`: 0 hits, no `redis.scan`, no `KEYS`). `hr:celebrations:<org>` was deleted while `hr:celebrations:<org>:<actor>:<scope>:<day>` was written — **it never matched anything at all**. `hr:analytics:<org>` matched the overview key and silently missed `hr:analytics:attendance:<org>:<y>:<m>` and `hr:analytics:attrition:<org>:<y>`. Sites: `employee-onboarding.service.ts:429,432`, `termination-lifecycle.service.ts:104,107`. Audit over 3,500 `.ts` files: 218 write sites / 188 shapes, 499 invalidate sites, 75 namespaces → post-fix `falsePrefix = 0`.

**64. `ownership:transfers` bumped a different counter from three module-access sites — FIXED**
Read via `cachedVersionedForOrg(orgId,"ownership:transfers", …)`; three sites in `modules/module-access/**` bumped `invalidateNamespace(\`ownership:transfers:${orgId}\`)` — a different counter on a different Redis. **An ownership change made through the module-access surface left the transfers list stale.**

**65. `hr:directory` had no invalidation of any kind — FIXED.** A per-actor per-scope key cached 5 min with no matrix entry. Now a versioned namespace bumped by `invalidateAfterMutation`.

**66. `check:cache-invalidation` is vacuous — passed green while all four defects above existed — OPEN**
Four proven sub-defects: (a) `TABLE_TO_CACHE_FAMILIES` (10 entries, the bulk of the gate) tests **snake_case Postgres table names** against camelCase Drizzle objects — measured, `org_modules → 0 files / orgModules → 2`, `role_assignments → 0 / roleAssignments → 9`, `organization_members → 0 / organizationMembers → 21`, **all 10 entries match zero of 1,068 files, so not a single family check has ever executed**; the `org_hierarchy → hr:headcount` row that was supposed to guard defect 62 has never run. (b) `KEY_MISMATCH_CHECKS = []` — the section is named for this exact defect class, its comment describes the exact bug shape, and it registers **zero** checks. (c) what actually blocks is four hand-written file-specific checks covering **4 named files out of 1,068**. (d) `fileHasPattern` is a substring test — `"hr:headcount"` and `"invalidateAfterMutation"` were both present in the broken code, and **a substring test can never detect that the read key and the delete key are different strings**; `check-namespace-coverage.mjs` has the mirror blind spot, normalising `hr:headcount:${orgId}` and `invalidateNamespaceForOrg(orgId,"hr:headcount")` to the same thing and thereby **erasing the very org-prefix asymmetry that was the bug**. **OPEN → ticket 35**, with the exact replacement algorithm written out (resolve key shapes; fail on wildcard-aware segment prefixes; fail on namespace bumps matching no versioned read; do **not** normalise `<ORG>:` away; assert `TABLE_TO_CACHE_FAMILIES` matches ≥1 file per entry).

**67. Six Inventory report cache families are unreachable by their invalidation — OPEN (module excluded)**
`inv:reorder:paged:<org>:<page>:<limit>` invalidated via `CACHE_KEYS.invReorderReport(orgId)` — a different key (matrix claims "implicitly via inv:reorder parent", `cache-invalidation-inventory.ts:150`); `inv:stock:summary-report`, `inv:valuation:report`, `inv:slow-moving`, `inv:expiry:report` — **never invalidated**; `inv:dashboard:<org>:<scopeKey>` invalidated ×2 on a base key never written.

**68. `chat:unread` — 2 bumps, zero readers anywhere.** Both guarded by specs asserting only that the mock fired (`chat-bola-proof.spec.ts:126`, `chat-read-cursor-monotonic.spec.ts:82`). Dead code presented as working invalidation.

**69. 127 invalidations of keys nothing ever writes.** `org:roles:<org>` invalidated at **13 sites**, read at none; also `fin:payment-runs:<org>`, `hr:policies:list:<org>` (10 sites), `hr:salary-bands:<org>`, `hr:dashboard:payroll-summary:<org>`, `inv:stock:summary:<org>` (4 sites). Harmless at runtime, but 127 places where a reader believes a cache is being invalidated.

**70. `CACHE_TTL.VERY_LONG` = 1800s is shorter than `CACHE_TTL.HOUR` = 3600s** (`common/cache/cache-keys.ts:250`), used 6× including 2 in excluded `modules/rbac/**`.

**71. No negative caching — a legitimately-null read hits the database every request.** `loadOrFetch` treats `null` as a miss (`common/cache/cache.service.ts:120`). Correctness-safe; recorded as the actual policy.

**72. The KB accessible-space cache had no ACL dimension at all — FIXED**
`KbAccessService.getAccessibleSpaceIds` cached under `(kb:acc-spaces:<orgId>, userId)`. The value depends on `kb:spaces:manage`, the caller's role slugs and the principal's accountable membership — **none of which are in the key** — and the namespace is bumped only by space/member mutations, **never by `bumpPermissionsVersion`**. A user who lost `kb:spaces:manage`, or the role that granted them space membership, **kept the admin-wide space list for the full 60-second TTL**, and that list is the tenant filter for `kb-article-query`, `kb-search`, `kb-ask` (RAG), `kb-verification` and `support-ai-triage-data` — content the ACL forbids, served from cache, **into a model context**. Fixed: `kb-acl-cache-key.ts` makes `{ permissionsVersion, membershipId }` required and throws on an unresolved version. `jest kb-acl-cache-key.spec.ts` → **6 pass**; reverting the key to `user.userId` turns **2 red**, including the concrete leak.

**73. Cache single-flight is in-process only — no distributed fill lease — OPEN**
N instances produce up to N concurrent fills of one hot key; `backend/CLAUDE.md` §6 calls for a lease. Worse, `cache-multi-instance.spec.ts` passes all 16 cases including one titled *"concurrent reads across two instances run the fetcher exactly once"* — **two `CacheService` instances hold two separate `inFlight` maps, so that title claims more than the code can deliver.**

---

## F. Storage / uploads / R2

**74. Cross-tenant read through `/storage/download` and `/storage/image` — P0, FIXED**
Keys are `<orgId>/<folder>/…` and **neither endpoint checked the org segment**. `resolveFileOwner` consulted only 7 tables; a key in none of them and not under a "sensitive" prefix passed straight to `getFileStream(callerOrg, key)`, which reads **any** key in the bucket. Any authenticated user could read another tenant's uploads by key.

**75. The sensitive-key gate had been dead for as long as keys have been org-scoped — P0, FIXED**
`isSensitiveKey` matched prefixes like `payroll/` against the **whole** key, which now starts with the org id, so it returned **false for every real key**. Same for `orgFromNamespacedKey` (`kb-media/<org>` never matches `<org>/kb-media/<org>`). Both replaced by `parseStorageKey`.

**76. `/storage/image` never consulted the quarantine — P0, FIXED.** An infected or unscanned object was unreachable via `/storage/download` and **served happily** by `/storage/image`.

**77. HR retention orphaned every object it retired — P0, FIXED.** `CronHrRetentionService.sweepDocuments` deleted or redacted `documents`/`onboarding_documents` rows without deleting the object, and redaction **overwrote the only copy of the key** — the blob became unreachable *and* undeletable.

**78. Permanent public URLs persisted in four places — P1, FIXED.** `kb_sources.file_url`, `feedbucket_attachments.file_url`, `feedbucket_submissions.screenshot_url`/`recording_url`, and `payslip_publications.pdf_url` (**payslips**).

**79. Multipart had no size or type verification at all — P1, FIXED.** `initiate` took no declared size; `complete` wrote a quarantine row with `fileSizeBytes: 0` and `application/octet-stream`, so multipart uploads were **invisible to the quota and never sniffed**.

**80. Region `keyPrefix` inconsistency — P1, FIXED.** `compressAndPreGenerateKey` returned an unprefixed key while `uploadToKey` prefixed it on write, so in any region deployment with a `keyPrefix` the object was **stored where no read path looks**.

**81. Every image upload minted a permanent orphan that survives GDPR erasure — P1, FIXED.** `deriveThumbnail` wrote `${key}-thumb.webp` on every image upload; grepped both repos — **nothing reads it**, and it is named in **no database column**, so `gdpr-storage-purge.service.ts` (which deletes keys in its manifest) and HR retention could never delete it. Only a whole-org prefix purge would. Deleted along with `generateThumbnail`. Box 6's "no orphan" claim was untrue while it existed.

**82. Unauthenticated CPU amplification via ffmpeg — P1, FIXED.** `MediaCompressionService.transcodeVideo` shells out to ffmpeg/libx264 and is reached from `feedbucket-public.controller.ts` for widget screen recordings up to **100 MB** on a `@Public()`, unauthenticated endpoint. It was not bounded as believed: `withDeadline` races a promise against a timer, and when the timer wins **the promise is abandoned and ffmpeg keeps encoding at full tilt with nobody left to notice**. Now `SIGKILL` on a 60 s deadline, `-threads 2`, inputs over 64 MB refused, `sharp(buffer, { limitInputPixels: 50_000_000 })`, and off the request thread via `MediaTransformRunner` (concurrency 2, queue depth 32 with submission refused past it, 60 s per-job deadline, `compensate` hook, `drain()` on shutdown).

**83. The public-URL backfill script did the opposite of what its own docstring claimed — FIXED**
The docstring said it "refuses to apply as a role that RLS would filter". **The code did not do that**: it counted first (`countMatches`) then checked RLS, so under a non-`BYPASSRLS` role an RLS table's count came back 0, `matches === 0` dropped the finding before the warning printed, and the run exited **0**.

| role | `public.chat_attachments.file_url` | exit |
|---|---|---|
| owner (bypasses RLS) | `2 row(s) hold a public URL` | 0 |
| app role (RLS active) | **line absent entirely** | 0 |

An operator running as the app role would have concluded those two leaked rows did not exist. Fixed: `row_security_active()` decides per table, such a column is listed **UNVERIFIABLE** and never counted, and the process exits **2**. Two more corrections: schemas now discovered from `pg_namespace` (a `reporting` schema in the fixture was found only after this — the hard-coded `public/build/build_events` list would have missed it silently), and a table with no single-column PK is now rewritten by `ctid` with the old value re-asserted in the `WHERE` (previously reported `SKIPPED` and **left leaked**).
Proof on `scratch_t33_backfill` (12 rows / 4 schemas / 9 leaked URLs): owner dry run `9 across 7 column(s); UNVERIFIABLE COLUMNS: 0` exit 0 · app-role dry run `7 across 6 column(s); UNVERIFIABLE COLUMNS: 3` **exit 2** · owner `--apply` `ROWS REWRITTEN: 9` · confirming dry run `0` exit 0.

**84. R2 bucket privacy — the operator action that keeps the box open — BLOCKED**
`33-uploads.md` §Box 2, restated as a runbook in `43-last-open-boxes.md` §3. Two operator actions, neither takeable from code:
1. **Database backfill.** As the **database owner**: `node scripts/backfill-public-object-urls.mjs --url <owner DSN>` (dry run) → `--apply` → confirming dry run. **Read the exit code**: 0 = the scan was complete; **2** = a column sat behind an RLS policy this role does not bypass and its rows were **not** counted, so that output can never be read as "nothing found". Not doable locally — the only database with production rows is the shared remote `DATABASE_URL`.
2. **Cloudflare R2 console — this is what keeps the box open.** Remove public access from the bucket named by **`R2_BUCKET_NAME`** and from the KB bucket **`R2_KB_BUCKET_NAME`** (disable the `r2.dev` public development URL / remove the public bucket policy). **Rewriting a database column does not invalidate a URL somebody already copied — every object already at a public address stays fetchable until that policy changes. No code change substitutes for this.**
Closing evidence specified: the confirming dry run's `ROWS HOLDING A PUBLIC URL: 0 … UNVERIFIABLE COLUMNS: 0` at exit 0; the `--apply` run's `ROWS REWRITTEN: n`; and an unauthenticated `curl -I` of one previously-public object returning **401/403**.
Code half is closed and gated: `pnpm check:public-object-urls` **exit 0**, 3,567 files, 9 declared references, 0 upload-result `url` fields; self-test 14/14. Gate bite-proved with a planted mint (`${base}/${key}` + `ThingUploadResult { url }`) → exit 1 naming both findings.

**85. `/storage/image` cannot be loaded by a browser at all — P0, FIXED on the frontend seam**
`resolveImageUrl` emitted `${NEXT_PUBLIC_API_URL}/storage/image?key=…`, which is (1) **Bearer-only** — `StorageController` is `@UseGuards(JwtAuthGuard)`, `image()` has no `@Public()`, and an `<img src>`/`<Image src>`/`<AvatarImage src>` cannot send that header; and (2) **CSP-blocked** — `img-src` in both `next.config.ts` and `proxy.ts` is `'self' data: blob: api.dicebear.com *.r2.dev *.r2.cloudflarestorage.com images.unsplash.com lh3.googleusercontent.com streamlineos.app`; the API origin is only in `connect-src`. Before ticket 33 these were public `*.r2.dev` URLs, which satisfied both. So **every avatar, org logo, chat image, KB image and expense receipt in the app rendered broken**, across ~110 render sites. Resolved by routing through the same-origin `app/api/media/image/route.ts` (attaches the session JWT server-side, re-checks authorization per request, downgrades non-image types to an opaque download).
**Residual OPEN:** `FE/features/wiki/components/public-page-content.tsx:249,255,261` renders KB media on a **public** page — `/storage/image` is Bearer-only, so public KB media is unreachable regardless. **Ticket 29's territory**, allowlisted with that reason.

**86. Every generic file download 400'd — P0, FIXED.** `downloadQuerySchema.url` is `z.string().url()` and `hooks/common/use-file-url.ts` sent the stored value (now a bare key) as `?url=`, so `getSignedFileUrl` and `downloadFile` returned a Zod **400** surfacing as a generic failure toast — hit build ticket attachments, expense receipts, the tiptap image context menu. Compounding it, `isLocalUrl` returned `true` for anything containing `/uploads/`, so the default-folder key `<orgId>/uploads/<file>` was treated as a local path and never resolved at all.

**87. Keys rendered as a bare `src` at 31+ sites — P0/P1, FIXED.** `receipt-manager.tsx:105`, `message-input.tsx:90`, `org-branding-section.tsx` ×5, `plate-media-elements.tsx` ×4, `feedbucket-submission-detail.tsx` ×2, `project-submissions-inbox.tsx:74`, `attachment-image.tsx:31`, plus **18 more avatar renders** found by sweeping (`role-assignment-items.tsx` ×2, `role-assignments-sheet.tsx`, `use-members-columns.tsx`, `project-member-roles-section.tsx`, `person-profile-tab.tsx`, `review-table.tsx`, `skills-matrix-page.tsx`, `ticket-detail-sheet.tsx`, `today-card.tsx`, `recruiters-page.tsx`, `member-assignment-sheet.tsx`, `module-members-tab.tsx`, `group-detail-sheet.tsx` ×2, `roles-audit-page.tsx`, `simulate-page.tsx` ×2, `user-detail-sheet.tsx`, `user-table-columns.tsx`). Guard: `lib/storage-key-render-contract.test.ts` — reverting `features/users/user-table-columns.tsx` turns it red with `+ "features/users/user-table-columns.tsx:46 src={user.image ?? undefined}"`.

**88. `resolveImageUrl` returned a leading-slash key unchanged — P1, FIXED.** Rewritten to mirror `parseStorageKey`; `data:`/`blob:` passthrough added (previously missing — it would have double-wrapped an object URL).

**89. The tiptap editor baked the key into stored rich text — P1, FIXED.** `uploadImageFile` returned the key straight into the document `src`; storing a *resolved* URL instead would bake `NEXT_PUBLIC_API_URL` into tenant content. Resolved with a `StorageImage` extension (document keeps the key, `renderHTML` emits the resolved src, `parseHTML`/`keyifyStoredHtml` normalise back on load and on change). Round trip proven idempotent.

**90. `feedbucket-public.controller.ts:465` interpolates the raw screenshot KEY into an `<img src="…">`** in generated ticket HTML — **the image is broken**. Needs a decision about which read path generated ticket content should use; there is no public one. **OPEN.**

**91. `chat.schemas.ts:53-54` still requires both `fileUrl` and `fileKey`** on a message attachment and they now carry the same value. **OPEN — chat's territory.**

**92. `/onboarding/documents` returns `{ url }` holding a key.** The new gate does not catch it because the return type is inline rather than a named `*UploadResult`. **OPEN.**

**93. `BE/openapi.json` still advertises `x-authorized-in-service: resolveFileOwner`** for `/storage/download` and `/storage/image` while the controller declares `assertKeyReadable`. Regenerating needs a Nest boot against the shared remote database. **OPEN.**

**94. Tenant filenames interpolated into log messages where the redactor cannot reach — FIXED, twice**
Eight sites first (`av-scan.ts:61`, `virustotal-av-scanner.ts:43,98`, `clamd-av-scanner.ts:37,75,80`, `media-compression.service.ts:151,183`), then six more interpolating **object keys** (which embed the org id and sanitized filename): `storage-multipart.service.ts` ×2, `storage.controller.ts` ×1, `cron-storage-sweep.service.ts` ×3. A re-audit found the first pass had **missed one**: `media-compression.service.ts` still logged `` Video transcode for "${fileName}" produced no size saving ``. `pnpm check:log-secrets` passes at 3,526 files **because it reads structured fields and cannot see inside an interpolated message**. Pinned by a nine-file source scan with a bite test and a false-positive test.

**95. `sharp.concurrency(2)` at module load broke an unrelated spec at import time — self-caused, FIXED.** It broke `kb-media.service.spec.ts` because that spec stubs `jest.mock("sharp", …)` with no `concurrency`, and `kb-media.service.ts` reaches the file through `StorageService`. Removed rather than guarded — a top-level call into a native binding makes every importer depend on that binding being real.

---

## G. Frontend seam / TanStack

**96. `makeRequestSignal` silently discarded the caller's signal — P1, FIXED**
`lib/api-client.ts`. It fell back to `return timeout;` when `AbortSignal.any` was absent. `AbortSignal.any` is Chrome 116 / Safari 17.4 / Firefox 124, so **on anything older every Stop button in the product did nothing**: the request ran to completion, and **on an AI surface it kept spending credits**. Nothing threw and nothing logged. Second defect in the same call: `authedFetch` spread `init` and *then* wrote `signal:`, so a caller passing `init.signal` had it **overwritten** — which is what made `useAskAI`'s `stop()` and its unmount teardown no-ops. Fixed by `linkAbortSignals` (forwarding `reason` so the `TimeoutError` branch still fires) and by destructuring `init.signal` out: `makeRequestSignal(signal ?? initSignal)`. `lib/api-client-cancellation.test.ts` (10 tests) mocks **`fetch` itself** and hangs until the handed signal aborts. **Verified to bite:** restoring both defects turns **3 of the 10 red, each as a 5-second timeout** — the request outliving Stop.

**97. Frontend idempotency: `lib/api-client.ts` minted a fresh UUID per HTTP call — P1, FIXED**
The `Idempotency-Key` was minted **inside the transport**, once per HTTP call. A key that changes on retry is a request id, not an idempotency key. So compose's **Retry after a timeout issued a genuinely new send and the recipient got two real emails** — the backend's `@Idempotent("mail.send")` machinery was working, it was simply never handed the same key twice. Reported three separate times before it was fixed (29 S7 §5 *"`lib/api-client.ts:150-153` mints a fresh UUID per HTTP call"*, 29 S8, 29 S9 §3 — *"the one place where the retry affordance this box ships is weaker than it looks"*).
**FIXED:** the key now belongs to the operation. `lib/idempotency-key.ts` holds the minting; `hooks/common/use-idempotent-operation.ts` keeps one key alive for as long as the same input is being retried and releases it on `settle()`; `useSendMail`/`useReplyMail` adopt it; the transport keeps a last-resort mint so an `@Idempotent` route never 400s on a missing header. `hooks/api/mail-send-idempotency.test.tsx` (6 tests) proves both directions: same key across a timeout retry and across three consecutive failures, **new** key once a send completes or the draft differs. Verified stale-note-cleared at `lib/api-client.ts:172-178` in the 29 S11 re-audit.

**98. 291 invalidations were matching nothing — FIXED**
`queryKeys.<domain>.<list>()` — the no-argument call used at **291 sites** to mean "the whole list" — appended a literal `undefined`, because 82 factories were written `(params?: T) => [...base, "x", "list", params] as const`. Verified against `partialMatchKey` in `@tanstack/query-core@5.90.12`. Concretely: `queryKeys.inventory.stockLevels()` is invalidated from **25** mutation sites (adjustments, cycle counts, goods receipts, quality holds, recalls, sales orders, shipments, transfers, reservations, purchase orders) while `useStockLevels(filters)` reads `stockLevels(filters)` — **not one of those 25 could ever refresh a stock list**. Also `timesheets.entries` 11, `timesheets.approvals` 10, `inventory.salesOrders` 9, `inventory.purchaseOrders` 8, `users.invitations` 6, `hr.headcountRequests` 6. **The trap was already frozen into a passing test**: `hooks/api/mail.test.ts` had `it("messages() with no args finds ZERO — proves the trailing-undefined trap")`, asserting the broken behaviour as correct. Codemod fixed 211 factories across 14 files + 12 by hand (`?? "all"` / `?? null` sentinels that made `f()` a *sibling*, interior-optional ids). **291 → 0.** New `key-factory-contract.test.ts` parses the registry with the TS compiler API and found four classes the author had not.

**99. 20 mutations could have their invalidation deleted by a caller — FIXED.** `hooks/api/build/{advanced,projects,sprints,ticket-related-links,time-entries}.ts` and `hr/attendance.ts` spread `...options` **after** their own `onSuccess`, which carries the invalidation. AST scan 20 → 0.

**100. An id-only cursor derived from page order — FIXED.** `useInfiniteNotifications` used `page[page.length-1].id`, correct only if rows arrive in sort order. Backend is `orderBy(desc(id))` + `lt(id, cursor)`, so the safe continuation is the page **minimum**. Proved with disagreeing ids `[90,12,41]` and a falsy `id: 0` round trip; reverting turns 2 of 6 red.

**101. Two hooks whose page size drove the request but not the key — FIXED.** `useKbResearchBriefs`, `useTimesheetPayrollExports`: two mounts with different limits shared one cache entry.

**102. `useSuccessionPlans` had no `enabled` gate at all — it fired for anyone — FIXED.** Now gated on `hr:succession:view` + `useModuleEnabled("hr")`.

**103. Four runtime type lies the compiler could never catch — FIXED**
`AiCreditTransaction.costUsd` typed `number | null` is a Postgres `numeric(12,6)` projected raw, so Drizzle hands back a **string** — while the same field on `/billing/ai-credits/usage` really is a number (that endpoint casts `::text` then `Number()`). **One name, two runtime types.** `Entitlements.limits` was missing `hrCandidates` and `hrJobPostings` (backend sends 14, client union listed 12). `AccessResponse` declared `enabledModules?` and `tier?` — **`/me/access` has never sent either**. `OrganizationPerson.accountAccess` was optional but is attached unconditionally and is what decides whether a person shows as member / open invitation / no account.

**104. The general ledger was wrong at runtime — FIXED**
Client declared `date` / `id` / `totalDebit` / `totalCredit` / `{ items: GlAccount[] }` / decimal strings; server sends `entryDate` / `accountId` / `periodDebit` / `periodCredit` / a bare array / JSON **numbers** (`emitAmount()` at `general-ledger.service.ts:21`). Real consequences: **the Date column rendered blank**, **the account picker was permanently empty so the ledger could never be filtered to an account**, and `getRowKey` was `row.entryId` — a *line* list keyed by its *entry*, so **every multi-line journal collided on one React key**.

**105. `MembersResponse` is fiction — the "add user" picker could only ever see the first 20 org members — FIXED**
`hooks/api/organization.ts` declared `pagination: { page, limit, total, totalPages }`; `/organization/members` is built by `buildCursorPage` (`src/common/pagination/cursor.ts:79`) returning `{ limit, hasMore, nextCursor }`. `totalPages` was `undefined`, `?? 1` made it 1, `orgMembersTotalPages > 1` was never true — **34 lines of dead pager, with nothing telling the user the list was capped**. Also `joinedAt` typed `Date` but arrives as an ISO **string** (`member.joinedAt.getTime()` would have thrown). Fixed in both places: dead pager removed with a truthful notice in `role-assignments-sheet.tsx`; contract corrected in `organization-schema.ts`. `role` deliberately kept `z.string()` — `organization_members.role` is plain `text` and the RBAC catalog grows roles at runtime, so the drafted `z.enum(["OWNER","ORG_ADMIN","MEMBER"])` **would have rejected a legitimate role and locked the settings page out of its own member list**. Note the request also sent `page=`, and `listMembersSchema` is `.strict()`, so that was an `unrecognized_keys` **400**, not a silent strip.

**106. A contract violation was retried once for nothing — FIXED.** `ApiContractError extends ApiError` carries the response's own status (200), so a well-formed 200 with a malformed body fell through `shouldRetryQuery`'s 4xx check to `return true`. The same endpoint returns the same malformed body; the retry only doubles the latency before the error state appears. One line: `if (isContractViolation(error)) return false;`, with three tests pinning it against a still-retried 500 and a still-refused 403.

**107. `parseApiResponse<T>` validated nothing at 2,490 call sites — PARTIAL.** Coverage after the work: **17 of 2,490** seam call sites carry a contract (15 of 1,006 GETs) across 15 routes, plus `lib/rbac/get-server-access.ts`. **The other ~2,473 are still unchecked casts.** Prioritised by blast radius (permissions, tenancy, money, PII). Gate: `lib/api-contract-coverage.test.ts` — removing the `/billing/entitlements` contract turns 2 of 7 red; deleting `switchOrgResultContract` reds it with `missing: ["/organization/switch"]`.

**108. `POST /organization/switch` was outside the coverage gate — FIXED.** It lives in `hooks/common/auth-hooks.ts`, not `hooks/api/`, and its response is what `update({ orgId: data.orgId })` sets the session's active org from — **a drifted `orgId` there is a wrong-tenant write**. Scanner now walks all of `hooks/`.

**109. `lib/api-client.ts` calls `signOut()` on any 401, including a transient one — OPEN.** Owner: ticket 28.

**110. `drainChannelPages` was an unbounded `for(;;)` — PARTIAL.** It fixed the earlier dropped-`nextCursor` bug (`useChatChannels` threw the cursor away and the chat sidebar silently truncated to one server page) but then pulled the member's **entire** channel set on mount. Now capped at `MAX_CHANNEL_PAGES` (20) **and reports hitting the ceiling** with path and row count. **Not done, chat owner:** the screen affordance ("showing the first N — search for more") and lazy fetching as the windowed list scrolls; returning `{ channels, truncated }` breaks `chat-channel-combobox.tsx` and `features/chat/**`.

**111. `useNotifications` is a `useQuery` against a cursor route — OPEN.** Any caller passing a `limit` silently truncates with no way past it. The Build inbox was one instance; the hook itself invites the mistake.

**112. `useHrEvents` sends no `limit`** (`hooks/api/hr/enterprise-ops-event-stream.ts:51`), so its page size is the backend default; `features/hr/enterprise/ops/event-stream/` feeds that page into a `DataTable` beside a `CursorPageControls` — **if the server default is above 50 that surface has two pagers today.** Not checkable from the frontend. **OPEN.**

**113. `useMailAction` invalidated the wrong prefix — FIXED.** It invalidated `[...inbox.all, "unified"]`, which excludes `inbox.count()`. Fixed to `inbox.all`. The routed "no mail hook invalidates the unread count" defect was **verified not to exist**: `/notifications/unread-count` counts `notifications` rows for one membership and mail writes no notification row, so invalidating it could not change its answer.

**114. The unified unread badge is unbuilt — mail unread is never displayed anywhere.** `/me/inbox/unified/count` (`unified-inbox.service.ts:352`, `mail: mailCount.unread`) has **no frontend hook**; every badge in the product (sidebar, bell, inbox page, document title) reads the notifications-only count. **OPEN — product decision for the inbox/notifications owner.**

**115. Ably is eagerly reachable from 27 routes — P1 bundle leak — OPEN.** `lib/ably.ts` and `features/chat/use-ably-connection.ts`, including from `/build/[projectId]/backlog` and `/support`, which have nothing to do with realtime. Chain: `hooks/api/index.ts → chat.ts → chat-entities.ts → { lib/ably.ts, hooks/common/use-realtime-poll-interval.ts → features/chat/use-ably-connection.ts }`. **Ably weighs 9.2 MB on disk across its builds.** `chat-entities.ts` imports `reauthorizeAblyClients` at module scope and eight `chat-*.ts` files import `useRealtimePollInterval`, which imports `ably/react` — also a `hooks/ → features/` import, which the repo's layering bans. **Owner: ticket 28.**

**116. `features/inventory/components/tools/barcode-client.tsx:26` redefines `useOnlineStatus`**, duplicating `hooks/common/use-online-status.ts`. **OPEN.**

---

## H. Mail / calendar / KB

**117. The calendar provider-webhook receiver was dead *and* would have been unauthenticated — three live defects, FIXED**
A previous session committed the controller, the secret helper, the schemas and the spec **5 red**. (1) `CalendarProviderWebhookController` was imported at the top of `calendar.module.ts` but **never added to `controllers: []`**, so `POST /webhooks/calendar/provider` was unroutable and 110 lines of provider drift detection with ~32 tests never ran. (2) `handle()` **imported `assertCalendarWebhookSecret` and never called it**, and declared the `x-calendar-webhook-secret` parameter without checking it — the controller is `@Public()`, so **the moment (1) was fixed the endpoint would have accepted any unauthenticated POST naming any `connectionId`**, an unauthenticated trigger for arbitrary provider-sync re-queues. (3) The body schema was not `.strict()`, so a caller-supplied `orgId` was silently stripped rather than rejected. `jest calendar-provider-webhook` → **3 suites / 32 pass**.

**118. A re-claimed CREATE minted a duplicate provider event, orphaning the first in the user's real calendar forever — FIXED.** `ExternalCalendarSyncService.pushCreate` carries no idempotency key and `processRow` pushed unconditionally: worker pushes successfully → dies before `mark(PROCESSED)` → 90-second lease expires → row re-claimed → **a second external event is created**, with the local row's `externalEventId` overwritten to point at the new one.

**119. A failed DELETE was invisible and unretryable — the provider's copy of a deleted meeting lived forever — FIXED.** `deleteEvent` hard-deletes the local row and enqueues a delete intent (the tombstone) but wrote `eventId: null`; both `getSyncStatus` and `retrySync` key on `eventId` **and** resolve visibility by reading the event row, which no longer exists. A delete that exhausted its 5 attempts sat in `FAILED` with **no status surface and no retry path**. Tombstone now keeps the deleted event's id (`calendar_provider_sync_queue.event_id` has no FK — verified against `0934_ar05_…`); status/retry fall back to the tombstone's author; a bystander still gets 404. Bite proofs: reverting the tombstone id → 1 red, the idempotent-create guard → 1 red, the tombstone-aware status/retry → 3 red.

**120. The calendar reminder sweep used three bare `.limit()` reads — FIXED.** `EVENT_BATCH_LIMIT = 200` on both event queries and ×10 on exceptions, no keyset loop — an org with more than 200 qualifying events in a 20-minute window **silently lost the rest, and the sweep runs once per window so they are never picked up**. Now keyset-drained; proof spec uses 205 candidates across two pages.

**121. `CALENDAR_PER_SOURCE_CAP = 400` cut each source with no signal — FIXED.** The aggregate already had a `truncated` flag the UI banners; the per-source cap did not feed it.

**122. `KbPageCommentsService.list` was completely unpaginated** — no limit, no cursor, every comment on every open — **FIXED** (keyset-paged at 50, matching its article sibling so the FE array contract is unchanged).

**123. `KbCommentsService.list` paged on `(createdAt, id)` while ordering by `createdAt` alone — FIXED.** Rows sharing a timestamp could be **skipped at a page boundary** — the exact defect `common/pagination/keyset.ts`'s own header warns about.

**124. Nothing in the mail UI ever marked a message read — P1, FIXED.** `useMailAction` already patched `markRead` optimistically with a full `onError` restore, and **no caller existed**. Opening a message did not mark it read, so **every message stayed unread forever, the unread badge was permanently inflated, and "Mark unread" was the only read-state control in the app.**

**125. The revoked-account banner read only `pages[0]`** — a revocation surfacing mid-scroll was invisible. **FIXED** (unioned across pages, deduped by account id).

**126. Ticket 14's isolation gap was declared but did not bite — FIXED.** The spec existed and passed, but its harness applied an org filter only when the predicate bound one — so **removing the org clause narrowed the result to nothing instead of exposing the other tenant**, and the primary cross-tenant case passed either way. Rewritten so a predicate binding no org applies no org filter, which is what a real database does. **9 pass; stripping all three `org_id` predicates turns 4 red**, including the case that previously passed.

**127. The cached mail page was a dead end — "load more" did nothing, forever — FIXED.** `mail.service.ts:65-88` served page one from `mail_message_metadata` and returned `nextCursor: null` **unconditionally**. On the ordinary single-account path with a fresh mirror the inbox showed `limit` messages and could not be scrolled. Fixed with a separate keyset cursor namespace (`md1` vs `m1`) so the regime is chosen once at page one and held — **mixing them mid-scroll is what repeats and skips rows** — and an exhausted metadata cursor **ends the scroll** rather than falling through to the provider where it would decode as "no position" and replay page one. The null-date branch is real: `date` is nullable, Postgres sorts DESC NULLS FIRST, and a bare `(date, id) < (NULL, i)` evaluates to NULL and would **drop every dated row** — pinned by a BITE case.

**128. Mail search had no usable index, and adding one would not have helped — FIXED.** `mail-metadata.service.ts:125-134` was three leading-wildcard `ILIKE`s. A GIN trigram index alone does not fix it because the table has RLS (`org_id = app.current_org_id()`) and `texticlike` is `proleakproof = false`, so the planner must evaluate the security qual first and **refuses the index** — the "before" plans never touch the trigram index even when it exists. Migration `1022` adds `app.search_mail_message_ids` (SECURITY DEFINER, org from `app.current_org_id()` and never a parameter, ids only, EXECUTE revoked from PUBLIC, cap 500 with fallback), over one GIN trigram on `coalesce(subject,'') || chr(1) || coalesce(sender_name,'') || chr(1) || coalesce(sender_email,'')`. Equivalence to the OR of three column ILIKEs verified over eight terms including two deliberate boundary-spanning probes (`e Sender` 0=0, `team sender` 0=0), plus `strpos(p_q, chr(1)) = 0` asserted in the function so the equivalence holds unconditionally.

| term | matches | before | after |
|---|---|---|---|
| `Zephyrine` | 27 | **13,595** (majority) · 13,814–13,820 (minorities) | **693–697** |
| `Invoice` | 15 | **13,595** · 13,814–13,817 | **573–575** |

Measured on `scratch_t29` (257,850 mail rows; the seed's own 4,448 rows made every plan degenerate and the first benchmark run read 47–98 buffers for everything).

**129. The compose draft was saved on Escape and could never be restored — FIXED (second attempt)**
The S8 pass shipped `mail-draft-storage.ts` with unit tests and believed the data-loss path closed. `MailComposeSheet` had **never been mounted in a test**; mounting it showed the storage layer was fine and the component was not. The restore branch was `} else if (mode.type === "compose" && (prev.type === "reply" || !open)) {` — **`!open` is unreachable** (the effect returns three lines above on `if (!open) return;`), and `prev` on every ordinary reopen is `{type: "compose"}`. So the **only** path that ever restored a compose draft was a reply→compose transition: Escape saved the body to `localStorage` and the next open showed an empty editor. Now keyed on a closed→open transition or a change of `mailDraftKey(mode)`. Restoring the original effect verbatim turns **2 red**; a narrower mutation (`wasOpen ||` for `wasOpen &&`) also turns **2 red**. File restored from backup and re-verified by `shasum -a 256` after each bite run.

**130. `handleClose` unconditionally `reset()` the form — FIXED.** Escape or outside-click silently destroyed an unsent body with no confirmation and nothing persisted anywhere — no localStorage, no backend draft. Combined with the **total absence of offline handling** (confirmed: zero `onlineManager` / `navigator.onLine` / `refetchOnReconnect` in `features/mail` and `features/inbox`), composing on a flaky connection could lose a message with one keypress.

**131. `useOnlineStatus` optimistically returned `true` on first render — FIXED.** Rewritten onto `useSyncExternalStore`, which also removed a `react-hooks/set-state-in-effect` warning. `features/mail/use-mail-connectivity.ts` **deleted** rather than duplicated.

**132. An offline `fetchNextPage` left "Load more" clickable and inert — FIXED.** With TanStack's default `networkMode: "online"` the fetch is *paused*, so `isFetchingNextPage` stays false. Now disabled and labelled.

**133. A circular import introduced by the previous pass — FIXED.** `mail-draft-storage.ts` imported `MailComposeMode` back from `mail-compose-sheet.tsx`, which imports the storage functions. `madge --circular` reported **1** cycle against a repo the constitution says stands at zero. Type moved to the neutral `mail-compose-schema.ts` → **0**.

**134. `mail_sync_checkpoints` is a write-only table — OPEN.** `mail.service.ts:284` upserts on every provider page fetch; `MailSyncCheckpointService.loadPosition` has **zero production callers** and `clearPositions` has none anywhere. Worse, what it stores is the token of the *last page scrolled to*, **not a delta position**, so even wiring `loadPosition` up would resume mid-scroll rather than sync forward. Not removed because it is 4 of `check:tenant-isolation`'s 924 declarations.

**135. Exact mail unread cannot be built on the current mirror — OPEN.** `mail_message_metadata.is_read` exists and the keyset index covers the predicate, but the mirror holds only what has already been listed, so on a fresh account it would report "3 unread" for a mailbox with 400 **and present it as authoritative**. `unified-inbox.service.ts:395-413` sidesteps it by fanning out to the provider for 100 messages and counting in JS, self-declared inexact. Prerequisite is incremental sync (see 134).

**136. An article's chunk ACL went stale and the article vanished from RAG entirely — FIXED**
`kb-indexing.service.ts:202` — `indexArticle` read the stored content hash and on a match **returned unconditionally**. So an article whose ACL moved without its text (a restriction added or removed) kept the **old `acl_revision`** on every chunk. The candidate gate joins `acl_revision` with `=` (`kb-candidate.service.ts:95,161`), so those chunks matched **nothing**: **the article dropped out of RAG retrieval entirely, not partially, until somebody happened to edit its body.** `syncAclRevisionForSpace` only repairs space-level changes, never an article-level restriction change. `indexPage` had the correct branch all along (`:288-324`). Fails *closed*, so this lost recall rather than disclosing anything — but silently. New `kb-article-acl-only-reindex.spec.ts` → **5 pass**; reverting the branch to `return;` turns **3 red**. Costs no AI credit (updates the two columns in place, re-embeds nothing).

**137. An unchecked `pageId` was a real hole — FIXED.** `KbMediaController.upload` took `pageId` from the multipart body and passed it straight through; nothing checked it belonged to the caller's org. Invisible today (the indexer re-checks and silently returns 0 chunks), but with the new composite FK it would have become a `23503` **after the bytes were already in the bucket**. `assertPageInOrg` now resolves against the caller's org with `deleted_at IS NULL` **before** the upload and throws `NotFoundException` — 404, never 403, because a 403 on another org's id confirms the page exists. Constraint behaviour probed on a real catalog: org A → org B's page **rejected `23503`**; duplicate `(org_id, file_key)` **rejected `23505`**; org B reusing org A's `file_key` **value** inserts (no cross-tenant DoS). Commits **07757b42** (attachment row) and **204b152f** (article ACL reindex).

**138. `KbMediaService.upload` performed zero database writes — FIXED.** The only tenancy the object carried was the `kb-media/<org_id>/` **prefix inside its own key — a naming convention, not a constraint**. Migration `1042_t29_kb_page_attachments` (renumbered from 1041 mid-pass, because another agent appended `1041_t22c_…` and discipline rule 8 forbids two files sharing a numeric prefix).

**139. `kb_page_links` record links had no uniqueness — FIXED.** `uniq_kb_page_links_source_target` is `(source_page_id, target_page_id)`, and for a record link `target_page_id` is **NULL** — NULLs are distinct in a btree, so that index constrained the record grain **not at all**, and `kb-page-record-links.service.ts:34-44` was a read-then-insert with nothing behind it. Migration `1021` adds a partial `UNIQUE (org_id, source_page_id, target_type, target_id) WHERE target_id IS NOT NULL`.

**140. `KbMembersService.add` had no unique behind either grain — FIXED.** It checked `(org_id, space_id, membership_id)` and `(org_id, space_id, role)` with nothing enforcing them. **On a space ACL a duplicated grant is worse than noise: the second row is invisible to whoever revokes the first.** Migration `1040`. The de-duplicating DELETEs remove only rows identical on *every* meaningful column — a pair that disagrees (same member, two different `space_role`s) **deliberately fails the CREATE UNIQUE INDEX**, because silently keeping one of two conflicting grants is a permission change made by a migration. Live BITE on `scratch_t29`: second identical member → `ERROR 23505 uniq_kb_space_members_org_space_membership`.

**141. `KbPageTemplatesService.create` had no check at all and `list()` was unbounded — FIXED.** Two templates sharing a name were **indistinguishable to the person picking one** (`list()` orders by name and shows nothing else). `(org_id, name)` unique added; `list()` capped at 200.

**142. `kb.content.delete` is dead code — OPEN.** `KbIngestionDeleteConsumer` implements a full durable four-way purge and **nothing emits the event**, so purging depends entirely on in-request `tx.delete` calls that are not outbox-backed — a crash mid-delete leaves orphan chunks.

**143. KB space soft-delete purges nothing — OPEN.** `kb-spaces.service.ts::remove` sets `deletedAt` and busts the access cache; it neither de-indexes nor purges the space's pages and articles.

**144. KB search is split-brain — OPEN.** `kb-search.service.ts` correctly goes through `app.search_kb_article_ids` over `idx_kb_articles_fts`, while `kb-article-query.service.ts:67-71` is a **leading-wildcard `ilike`** on title+excerpt only (the pattern `BE/CLAUDE.md` §3 bans). `GET /kb/articles?search=` and the search endpoint **return different results for the same term**.

**145. `kb-page-tree.service.ts::emptyTrash` / `::purgeExpired` cascade the new attachment rows away without deleting the R2 objects — OPEN → ticket 33.**

**146. A second full calendar surface exists — OPEN, still**
`frontend/features/hr/recruitment/interviews-page.tsx:249` renders `BigCalendarWrapper` (month/week toggle, prev/next, `eventPropGetter`) at `/hr/recruitment/interviews`. Violates root CLAUDE.md §8 ("Never module-specific calendar pages") and §9 (feature→feature import), and is **redundant** — `hr-interviews` is already a registered aggregate source, so `/calendar` already shows these events. Last touched by `e33873d6c` (route-thinning), which did not address it. **The S11 kickoff brief assumed it was resolved; it is not.** Fix = list + a link to `/calendar`. **Owner: HR / ticket 25.**

**147. Event times were labelled with the wrong timezone — FIXED.** `calendar_events.timezone` drove occurrence expansion but stopped at the source: `calendar-native-event-source.ts` selected it and did not put it in `meta`, so `projectionToItem` had nothing to project. `event-detail-content.tsx` formatted the instant in the browser's zone and then labelled it with the browser's zone — **right about the moment and silent about the intent**: a 09:00 Asia/Kolkata standup read as 03:30 Europe/London with nothing saying it was not scheduled at 03:30. Backend (`calendar-item-timezone`), then client (`hooks/api/calendar.ts:103`, `lib/date-utils.ts:126-139`). An IANA zone the browser does not know makes `Intl.DateTimeFormat` throw a `RangeError` that would take the whole detail panel down, so an unknown zone degrades to the reader's — **a test, not a hope**.

**148. Calendar source toggles were absent from the query key — FIXED.** `/calendar/events` is filtered server-side by the caller's per-source preferences, so the enabled set is a correctness dimension of the response body. Two different aggregations shared one cache entry with only a blanket `queryKeys.calendar.all` invalidation between them. Now the optional tail of the factory (so the short call stays a prefix of the long one).

**149. "This and following" does not exist anywhere in either repo — BLOCKED on a product decision.** Only `occurrence | series` (`event-series-scope-dialog.tsx:15`). Two questions must be answered before anything can be built (series split semantics; reminder double-fire for an occurrence that moved to the new half).

**150. The `kb_space_grants.space_id` FK was correct in SQL and absent in Drizzle — FIXED (declaration only).** `0965_ar02_canonical_tenant_fks_3.sql:392-401` already added the composite and `0972` already dropped the single-column one. The Drizzle table declared **no FK at all**, so the next `db:generate` would have proposed **dropping a live tenant constraint**. A duplicate constraint was created during this work and then withdrawn (file, rollback and journal entry removed, and the duplicate dropped from both databases after another agent's bootstrap had already applied it).

**151. `mail_message_metadata`'s unique omits `org_id`** (`db/schema/mail/mail-metadata.ts:37`), and `crm/inbound-events.ts:59-63` uniques on `(org, provider, external_id)` where `provider` is a toolkit label — **two Gmail accounts in one org collide.** **OPEN — schema.**

---

## I. Web vitals / UX / accessibility

**152. `GET /me/access` at p50 503 ms, once per authenticated server render — OPEN**
`lib/rbac/get-server-access.ts` issues `GET /me/access` on **every** authenticated server render. React's `cache()` dedupes within a single render, **never across renders**, so every navigation pays it. Decomposed on the same server, same machine, same session:

| Leg | Measured |
|---|---|
| `/` (public landing) | **9–13 ms** |
| backend `GET /health` (no DB) | 0.6–1.4 ms |
| backend `GET /auth/session-data/:userId` | p50 **100 ms**, max 948 |
| backend `POST /auth/session-exchange` | p50 **563 ms**, min 463, max 1,122 |
| backend **`GET /me/access`** | **p50 503 ms**, min 378, max 1,004 (6 runs, direct, real JWT) |
| frontend `/dashboard` server render | p50 517 / p75 659 / p95 835 ms |
| frontend worst route (`/inbox`) | p50 597 / p75 835 / p95 1,218 ms |

**At p50 503 ms that one call *is* the TTFB** — the same server, process and build returns the public landing in 9 ms. This is **both remaining TTFB budget breaches**: desktop **1,669 ms p95 vs 400** and mobile **932 ms p95 vs 600**; `check-web-vitals-budget.mjs` → **exit 1, 2 violations**. An earlier attribution ("`GET /auth/session-data` at 588–757 ms, issued twice on a non-2xx") was measured on the **failing** path — authenticated it is 100 ms and is not the problem; **the correction moves the owner from the retry logic to `/me/access`.** **Owner: `streamlineos-backend` for the endpoint cost; ticket 28 for whether `get-server-access.ts` may cache across renders.**

**153. A failed org sync leaves the app on "Syncing organization…" forever — OPEN**
`/auth/session-exchange` returns **503 unconditionally** when `NEXTAUTH_SECRET` / `AUTH_SIGNING_KEYS` are absent, and the frontend renders **no error state, no message, no retry, no way out** — a branded spinner, permanently. The web-vitals driver detects exactly this (`brandedLoader` in `findUnusableSamples`), which is how a previous pass's honest zero happened, but the app has no terminal state. **Owner: `components/layout/dashboard-shell.tsx` / the org-sync boundary.**

**154. `AUTH_SIGNING_KEYS` and `NEXTAUTH_SECRET` are absent from the backend `.env` — P1, environment.** Nobody can authenticate a local frontend without supplying them by hand; any future browser or e2e work hits this first. Separately, `frontend/.env` carries a **36-character** `NEXTAUTH_SECRET` while `lib/env.ts:40` requires 44 in production, so `next build` dies **in the root layout** (`app/layout.tsx:120`), not at `/billing/ai-credits` as previously reported — **that route does not exist**.

**155. `Type Check` and `Build` have never executed in frontend CI — FIXED**
`.github/workflows/frontend.yml` ordered Install → **Lint** (48) → **Type Check** (51) → **Build** (54) in one job, and Lint is red. Both are now their own jobs with no `needs:`. `Build` also **could not have passed even unmasked**: `next build` runs `NODE_ENV=production` and `lib/env.ts` throws on failure — measured under a scrubbed environment, no env → fails on `NEXTAUTH_SECRET` **and** `NEXT_PUBLIC_API_URL`; `NEXTAUTH_SECRET` only → still fails on `NEXT_PUBLIC_API_URL`; both → passes.

**156. No gate in either repository had executed in CI since lint went red — FIXED**
Measured from GitHub's own run history, not from reading YAML. (i) **Two of the five workflow files have never executed a step**: `frontend/.github/workflows/backend.yml` and `seeded-e2e.yml` set `working-directory: backend`, and the frontend repo has no `backend/` directory (`git ls-files | grep -c '^backend/'` → **0**). Every run dies at step 3 — `FE run 33601538287 "Backend CI" 52s ##[error]Error: No pnpm version is specified`; `gh run view` shows `X Setup pnpm` then `-` for all 40 following steps. **Eleven backend gates were named only there** — `check:unbounded-reads`, `check:tenant-relationships`, `check:migration-discipline`, `check:openapi-coverage`, `check:bodyless-conflicts`, `check:hr-table-freeze`, `check:placement-bypass`, `check:owner-authority`, `check:migration-ledger`, `check:operation-ids`, `check:bulk-id-limits` — so they counted as "wired" in a text scan and had **never run**. (ii) In **both** live workflows every gate is sequenced after `Lint`, and Lint is red: `BE run 33622305895 ✓Typecheck X Lint → 26 gate steps all '-'`; `FE run 33622293615 X Lint → Type Check and 10 gate steps all '-'`. So the honest count is **not "44 of 89 gates do not run" — it is that no gate in either repository has executed in CI since lint went red.** Both workflows now have a `gates` job carrying no `needs:`. The two inert workflow files were deleted (also unrunnable: no `working-directory`, so they'd execute against a root package.json declaring none of those scripts).

**157. Two shared screens had no `main` landmark — found in the browser, not in jsdom — FIXED**
`app/access-denied/page.tsx` (outside the `(authenticated)` group, so it never inherits the shell's `<main>`) and `RouteErrorBoundary` with `layout="fullscreen"`, which is what `app/error.tsx` renders. **When a read in the authenticated *layout* fails (`/me/access`, say), the error propagates past the segment boundary and replaces the entire shell — leaving a page with no `main` landmark, no `h1` and a dead skip-link target, at precisely the moment the user most needs to navigate.** Browser run reported `no-main-landmark` on **all 57 steps**; after the fix, `mainName` set on **57 of 57** and exactly one `h1` on 57 of 57. jsdom could not have found it — it needs the real routing layer to decide which boundary catches the throw.

**158. A paused read was an eternal skeleton on every screen — PARTIAL**
**No surface anywhere reads `fetchStatus === "paused"`.** TanStack pauses a query when the browser goes offline: it neither resolves nor rejects, so every screen renders its skeleton forever — the shell's offline banner says the browser is offline while the surface still claims to be loading. Fixed once in `components/shared/loading-state.tsx` (drops `aria-busy`, renames the region to "Paused — waiting for a connection", prints "You are offline. This will load as soon as the connection returns"), with a bite proof that the online skeleton must not carry the offline copy.
**Not covered, and it is the bigger half:** `components/ui/data-table.tsx` renders its own loading branch and is the loading state for most list pages. It was being edited by another agent (uncommitted changes + a new `data-table-header.tsx`), so touching it would have swept their work in. **Handoff, not done.**

**159. `DataTable` lost rows — 380 of 476 call sites — FIXED**
The previous report said "`DataTable` windows neither branch — when a caller omits `pagination`, every row mounts." **That is not what the code did, and the truth was worse.** `getPaginationRowModel()` was attached unconditionally with `pageSize = clientPag?.pageSize ?? 50`, so the row model *was* sliced to 50 — but the footer was gated on `pagination !== undefined && totalItems > 0 && (totalPages > 1 || …)`. **So a caller who omitted `pagination` got 50 rows and no way to reach row 51. Silently.** Across **380 of 476** `<DataTable` call sites repo-wide, and **79 of the 97** inside the six audited trees — 34 fed by a genuinely unbounded array. Clearest case: `features/hr/employees/employees-list-page.tsx` has a "Load more employees" button appending server pages **into a table that could never show past row 50**. Test written first and watched fail (4 of 5), then the gate fixed to `totalItems > 0 && (totalPages > 1 || hasPageSizeControl)` — tables that fit one window are unchanged. Also: `aria-rowcount`/`aria-rowindex` (a windowed table otherwise tells a screen reader "row 3 of 50" when it is row 3 of 4,000); `role="navigation" aria-label="Pagination"`; and `clientPage = Math.min(internalPage, clientPageCount - 1)` for a filter that shrank the data and left the reader on a dead page with the footer hidden — **an empty table and no way back** (negative control: reverting just that line fails exactly one test).

**160. `features/build/inbox/inbox-list.tsx` — notification 101 did not exist — FIXED.** `useNotifications(..., limit: 100)` is a plain `useQuery` against a cursor route with no pager, and the Mentions tab filtered that same fixed page client-side — **a mention older than the newest 100 notifications was unreachable, and the surface said "No mentions" rather than "there are more pages".**

**161. `features/hr/expenses/import-validation-preview.tsx` — an invalid line 51 could never be shown — FIXED.** Sliced to 50 *before* the table.

**162. The three grouped Build list-view paths mounted every autoloaded ticket — FIXED.** `ListView` capped its **flat** path at `LIST_RENDER_PAGE_SIZE` (100) but the DnD, flat-grouped and nested-grouped paths did not, so switching on `groupBy` silently mounted up to `BOARD_AUTOLOAD_LIMIT` (500).

**163. `ticket-activity-log.tsx` and `activity-feed.tsx` had no pagination at all — FIXED.** The endpoint returns the ticket's entire audit trail with no cursor; comments and every nested reply rode the ticket payload. The correctness trap in capping the second was **a deep-linked comment (or its parent thread) must never be hidden** — the page count now expands to cover it.

**164. `chat/new-dm-dialog.tsx` and `add-channel-members-dialog.tsx` rendered the whole organisation — FIXED.** `GET /chat/users` returns the whole org **with no cursor**, and both rendered every row into a fixed 280–340px box. 2,000 users → **0** row buttons mounted after virtualization.

**165. The sidebar prefetched 354 links on viewport entry — FIXED.** One `<Link>` per authorized nav route (**354** across products, **57** for finance alone) at App Router's default, so **each speculative RSC request re-ran the `(authenticated)` layout's session and permission reads** — one page load fanned out into dozens of backend round-trips for routes nobody opened. Invisible: no explicit `prefetch` prop anywhere and no `router.prefetch`. Now `prefetch={false}` + `router.prefetch(href)` on hover/focus/touch, deduped per href. Test: **0** prefetches at rest, **1** for the hovered route, **1** after three hovers.

**166. A nav tap produced no DOM change for up to 1,739 ms — FIXED.** The prefetch fix's cost was that a nav click started a cold navigation against a route answering in 400–1,000 ms, so the interface looked frozen. `nav-pending-indicator.tsx` (Next 16 `useLinkStatus`), absolutely positioned and present in **both** expanded and collapsed states so appearing costs no layout shift, `aria-hidden` because the route change is the announcement. Measured click → first DOM mutation: desktop p75 **1 ms** (max 3), mobile p75 **5 ms** (max 52), target 100 ms. The target was in the manifest with nothing reading it; `checkPerceivedResponsiveness` now gates p75 per profile and **fails a profile that was never measured** rather than passing it by absence.

**167. A heap read without a forced GC would have shipped a leak report — corrected before shipping.** `usedJSHeapSize` p75 climbed monotonically across 12 routes — `/dashboard` 59 MB → `/mail` 97 → `/inbox` 150 → `/notifications` 194 → `/settings` 246 → `/calendar` 290 → `/chat` 347 → … → plateau ~350 MB. **That reading is an artifact.** With `HeapProfiler.collectGarbage` before every read: **13–17 MB, flat, on every route and both profiles** (profile p75 15.5 MB desktop / 15.7 mobile) against 345–362 MB uncollected. The app retains nothing across navigation.

**168. A CDP request had no deadline — the previous agent sat on `/build/inbox` for 2 h 31 m at 0% CPU — FIXED.** `Runtime.evaluate` with `awaitPromise` resolves only when the page's promise does, so a renderer that never settles parks the driver forever; it had produced 10 of 24 route/profile pairs and the only evidence was a log that stopped. Sends now carry a 60 s deadline; a wedged route is recorded in `routeFailures` and skipped. This capture: **`routeFailures: 0`**, all 24 pairs completed.

**169. 17 fabricated WCAG failures — probe defect, FIXED.** An earlier run reported **17 failures of `#ffffff` on `#ffffff`, ratio 1.0**. No shipped page renders invisible text: `getComputedStyle` cannot see a background painted by a pseudo-element or an overlapping sibling, and the probe did not parse `color(srgb …)`, which is what the sidebar's ink is. Samples whose ink equals their ground are now **unresolved and excluded**, with a bite proof that a genuinely low-contrast pair is still counted. **17 fabricated failures became 17 honest "could not measure".**

**170. Contrast: `-ink` handed to text at 2,234 call sites — OPEN**
The token layer is correct (`-ink-strong` clears 4.5:1 on every light surface; `-ink` clears the 3:1 non-text floor, and the comment on `--status-warning-ink` says so). **The defect is that call sites hand `-ink` to text**: `text-status-*-ink` appears **2,234 times** across `components/`, `features/` and `lib/`, much of it badge and label copy at `text-[9px]`–`text-xs`. Predicted from tokens, then **confirmed in the browser**: 4,251 painted text nodes sampled, 17 unresolved, **90 genuine AA failures**, every one of three pairs — `#cb7006` on `#f8fafc` **3.43**, `#cb7006` on `#ffffff` **3.58**, `#64748b` on `#f1f5f9` **4.34** — seen on `/dashboard`, `/inbox`, `/hr/attendance` and `/accounting/coa`, four unrelated modules, so it is the shared token layer. **Not fixable unilaterally at 2,234 sites across three territories.**

**171. The `check:empty-states` failure was a checker bug hiding behind its own exception list — FIXED.** `EMPTY_INDICATOR = /… |nothing\s+(here|yet)|empty|no-data/i` matched `empty` **as a substring**, and the string it matched at `workflow-builder-canvas.tsx:118` was **`Empty`** — from the `<EmptyState>` on line 127, the canonical component the gate exists to promote. **Using the correct primitive created the violation.** Tightened to `\bempty\b`. **The exception list then collapsed 9 → 2** — seven existed only because of this bug (one whose own reason said so: *"detected because `EmptyUploadIllustration` contains the word 'empty'"*) — **restoring gate coverage on seven permanently-unscanned files**: `ask-os-chat-utils.tsx`, `ai-chat-panel.tsx`, `kb-chat-parts.tsx`, `empty-chat-state.tsx`, `work-log-state-cards.tsx`, `sla-compliance-chart.tsx`, `import-expense-sheet.tsx`.

**172. The state ratchet had gone slack and would have accepted 73 error-state regressions in silence — FIXED.** S7's baselines were measured against a tree since repaired by other tickets. Re-measured at head: no-loading-state 2 → **0**; no-empty-state 56 → **10**; no-read-error-branch 78 → **5**; no-permission-gate 1 → **0**; filter-empty conflated with data-empty 101 → **56**. Pinned to the measured numbers; loading and permission gates now at zero.

**173. Four routes throw to their error boundary and lose their `h1` — OPEN.** Eleven of 57 browser-journey steps rendered the segment error boundary rather than the page: `/crm/leads` fails on a `PostgresError` inside `select … "business_parties"."lifecycle_stage" … from "lead_party_map"` **even at journal head**, and `/build`, `/build/all`, `/calendar` fail alongside it. Those four are also the entire `h1` miss list — **when a page's read throws to the boundary, the page loses its `h1` altogether**, because the boundary replaces `PageWrapper`. Boards and dense tables — where horizontal overflow actually lives — are among the routes that did not render, so the clean overflow result (**0 on every one of 57 steps at 375/768/1280**) covers list/empty/denied/detail surfaces **but not a kanban board**.

**174. `features/crm/leads/leads-funnel-view.tsx:73` calls `useReducedMotion` conditionally — OPEN.** A rules-of-hooks violation and **a genuine React correctness bug, not a style finding**. CRM is excluded from this release's scope, so it is recorded, not fixed. Reported independently by both 36 and frontend-lint-scope.

**175. `app/(authenticated)/inventory/purchase-orders/page.tsx` links twice to `/inventory/vendors/new`, which does not exist** (lines 398 and 430) — vendor creation is a sheet on `/inventory/vendors`. **OPEN.**

**176. `components/feedbucket/feedbucket-embed.tsx` loads a 196,937-byte local widget at `strategy="afterInteractive"` on every authenticated page — inside the window INP measures.** It did **not** load in this capture (it returns `null` when `NEXT_PUBLIC_FEEDBUCKET_*` is unset), so it is in no number above. In a production deployment that sets those keys it is **197 kB inside the interaction window**, and `lazyOnload` is a one-word change. **OPEN.**

**177. Route JavaScript budget: 13 of 13 routes breach — OPEN.** 610,108–850,044 B `measuredScriptBytes` vs a 524,288 ceiling; 17 breaches, all JavaScript. Every other dimension is inside ceiling (CSS 58,244–60,192 vs 65,536; fonts 55,206 vs 131,072; images 2,907–14,480 vs 524,288; third-party **0 B**; server payload 19,466–25,682 vs 40,960). **The JS budget used to pass on a number that is not what users download**: `/dashboard` governs 440,065 B (`measuredFirstLoadJsBytes`, gzip over the route's client-reference manifest) while the browser downloads **641,789 B before the load event and a further 319,347 B after it**. The driver now splits on `Page.loadEventFired`. No single owner-chunk: `/dashboard`'s 25 largest first-load scripts run 74,672 · 58,371 · 54,829 · 43,894 · 32,187 B then a long tail of ~14 kB chunks — it is the shared authenticated shell. Largest identifiable library: **framer-motion (224 kB raw / 71 kB gzip, 278 importers)**, pinned there by the public landing's animations — a **product decision about the landing**, escalated rather than worked around.

**178. Mobile long tasks: p75 275–309 ms per navigation on a 4× CPU — recorded.** Desktop p75 **0 ms** (genuinely clean); mobile best route 198 ms (`/settings`), worst **408 ms (`/dashboard`)**. That is what a mid-range phone experiences and is why mobile INP (96 ms) is twice desktop's (48 ms) while still inside a 200 ms budget. Hydration: **0 mismatches of 192**, then 0 of 72 on the re-measure.

**179. Home cannot render sections as they arrive — OPEN.** `dashboard-personal.service.ts` uses one `Promise.all`, so the single aggregate response **waits for the slowest arm by construction**. The other three clauses hold (concurrent; independently — each arm wrapped in `settle()` that catches, logs, records into `degraded[]` and returns a fallback; never an unbounded fanout — a fixed literal arm list gated by module entitlement resolved once). **Product decision → dashboard owner.**

**180. Five separate frontend gates go red on `.next-buildmart/` — P2, FIXED at the eslint layer.** `check:file-sizes`, `check:query-scope` (6 hash-fn + 9 key-prefix + 15 inline-key findings, **all** in `.next-buildmart/dev/static/chunks/*.js`), `check:formatters` (18 local `Intl.NumberFormat`s), `check:dead-code` (3 unused files). Either the directory is added to every scanner's ignore list or deleted before a sweep, **otherwise a real violation will be invisible in the noise.** eslint was the **only** frontend scanner still walking it — every other check already excludes it via `isExcludedScanDir`, asserted by name in `runScanDirSelfTest`.

---

## J. Contracts / gates that certified nothing

**181. Retained tombstones failed OPEN — a published contract removal could be hidden by a typo — FIXED**
`findUnclassifiedOperations` walks `openapi.json`, so it can only see entries with a live operation; a **retained** tombstone — the very thing `check-contract-breaking-change` reads to detect a removal — has no live operation and **nothing validated it**. `findBreakingRemovals` then exempted anything whose classification was not literally `"published"`. So: take a published tombstone, change `"published"` to `"internl"`, and the removal finding disappears with every gate green. Proved against the real registry:
```
tombstone flipped to published              : removals=1   (want 1)
same tombstone with a typo'd classification : removals=1 invalidEntries=1   (want 1/1)
   (before this ticket both of those were 0)
```
New `findInvalidEntries` validates **every** entry including tombstones; `isExemptFromBackwardCompatibility` now exempts only the exact string `"internal"` — a typo, a null, a missing field and `"published "` all read as published.

**182. The parameter-narrowing gate had never been able to fire — FIXED**
`findBreakingNarrowings` reads `entry.knownParameters`; **the generator never wrote that field — 0 of 3,625 entries had it** — so `registryParams.size === 0` short-circuited on every operation. **Half of `check:contract-breaking-change` was dead code against real data since it was written.** Its self-test passed only because the fixtures hand-built a field the generator never produced. Now 101/101 published entries carry a frozen baseline (frozen on first classification and preserved thereafter, because re-deriving it every run would let `registry:generate` — the command the gate's own failure message recommends — **erase the evidence**). Proved live: `add required 'orgId' to GET /public/kb/{slug}` → 1 breaking; `drop every parameter` → 2 breaking.

**183. Customer webhook event names were an unprotected published contract — FIXED**
The 24 registry events are **not** the customer webhook names — they are `OutboxWriter.emit()` events, all internal, all consumed by `outbox-relay`. `registry.webhooks` was `{}`, an object the generator never wrote to. **The customer webhook catalogue was a third list that no gate read, so renaming `deal.won` passed everything.** 23 names now catalogued: six org-scoped (`deal.won`, `deal.lost`, `employee.hired`, `lead.created`, `lead.updated`, `leave.approved`), eight project-scoped (`ticket.created/updated/assigned/deleted`, `comment.created`, `member.added/removed/role_updated`) and nine subscribable survey triggers. Proved: `rename deal.won -> deal.closed_won` → 1 breaking **and** 1 unclassified (fail-closed); a new `invoice.paid` emitted but unregistered → 1 unclassified. **The author's first version of this check was itself wrong** — it exempted an entry whose `emittedFrom` was non-empty, which exempts every scanned name and is no check at all; the probe caught it (0 instead of 1).

**184. `check:contract-vendor` had never compared the two files.** It resolved the backend only at `<frontend-root>/backend/openapi.json`; on this sibling layout it exited **1** with "missing" — loud, but it had never compared anything. Fixed to resolve `STREAMLINEOS_BACKEND_ROOT`, the monorepo path and the sibling path, and a green result now **names the artifact it actually read**. Now passes having genuinely compared them (sha256 `ae149514fa2887b8…`, identical).

**185. `check:db-call-count` could not see the N+1 it was standing on — P0, FIXED**
Validated against a confirmed defect (`payroll/runs/inputs.service.ts:187`, ~4,000 serial round-trips) that the gate reported as `ACTIONABLE: 0`. Two blind spots, isolated with fixtures before changing anything:
```
A  multi-line chained  await this.db \n .select(...)          -> []   MISSED
B  indirect handle     await pullAttendanceInputs(this.db,..) -> []   MISSED
C  single-line direct  await this.db.select(...)              -> 1    caught
```
Detected files **41 → 147**. The regression check then fired: **eight files recorded `N+1-FIXED` in the baseline still contained loop DB calls** — `projects-webhooks-dispatch`, `cron-leave`, `workspace-onboarding`, `payroll/runs/inputs`, `kb-import-export`, `kb-page-duplicate`, `support-kb`, `survey-builder`. **The 101 newly-visible files were left UNCLASSIFIED and NOT added to the baseline** — that is the forbidden move — so the gate was honestly red at exit 1.

**186. Five of the seven `N+1-FIXED` claims were false — FIXED; two were the new detector's own bug**
Real: `projects-webhooks-dispatch.service.ts` (`for (const delivery of deliveries) await OutboxWriter.emit(tx, …)` at 177/178 — its own baseline note already admitted it); `kb-import-export.service.ts` (`select max(sortOrder)` per parent at 127/129 — the note only covered `importPages`); `kb-page-duplicate.service.ts` (`await tx.insert(kbPages)` at 78 inside a subtree loop at 61); `workspace-onboarding.service.ts` (nested `for` at 245/247 issuing `tx.update(orgUnits)` per team at 251 — **"bounded is not fixed"**); `survey-builder.service.ts` (`reorder()` — one update per section at 165/167 and one per question at 171/173; the note only covered `duplicateQuestion`/`replaceChoices`).
**Detector bug, quantified:** `LOOP_OPENERS` includes `.map(`/`.filter(`/`.flatMap(`/`.reduce(`/`.forEach(`. A single-line callback whose body contains an object literal — `.map((name) => ({ name, slug: slugify(name) }))` — satisfies `loopBodyOpenedOnLine` (it has a `{`), so the balanced-single-line skip at line 182 is not taken; its braces net to zero so `enteredBody` never becomes true; the scanner then walks up to 30 lines forward and **adopts the next multi-line block as the loop body** (18 lines later in `support-kb.service.ts`). Measured: **8 files of 153 have hits only from array-callback openers, and 18 of 224 hit sites are one** — ~5% noise. **OPEN, one-line fix in `check-db-call-count.mjs` → ticket 35.**

**187. `check:db-call-count`'s `BATCHED` verdict is unusable as specified — OPEN.** The gate classifies a file `N+1-FIXED` or `BATCHED` and then **fails if that file is still detected** — but a correctly batched loop *is* still detected: a chunk stepper, a keyset drain and a group loop all contain a database call inside a loop, which is the only thing the detector looks for. Five genuinely batched files were assigned `BATCHED` and the gate immediately reported all five as regressions. Resolved by using `FALSE-POSITIVE` with a per-file note; **the real fix is in the gate → ticket 35.**

**188. `check:hardcoded-secrets` reported a credential that was a header name — P1, FIXED.** The only match was `calendar-webhook-secret.ts:4` — `export const CALENDAR_WEBHOOK_SECRET_HEADER = "x-calendar-webhook-secret";`. The identifier matched `SECRET` and the entropy heuristic **counted hyphens as a character class**, so any lowercase kebab slug of 12+ characters cleared the bar. **A false positive in a security gate is how a security gate gets allowlisted.** Two suffix-anchored rules added (so `SECRET_HEADER_VALUE` still bites), each asserted in both directions and re-proven with probes planted as real files. Later the same gate **caught the author**: a draft `db-gates.yml` used `postgres://user:password@localhost:5432/streamlineos` → flagged `[url-credential]`.

**189. `FE check:query-scope`'s self-test discarded its own failures — P1, FIXED.**
**190. `check:module-lifecycle` exited 0 having verified nothing — P1, FIXED.** Gates 1–4 require a non-owner connection to query `pg_catalog` as the app role.
**191. Four gates reported OK over an empty corpus — P1, FIXED.**

**192. `check:type-assertions` could not see three of the four things it banned — FIXED**
It counted all four escapes with `countOutsideComments`, which strips comments before matching — and `@ts-ignore`, `@ts-expect-error` and `@ts-nocheck` **only ever exist inside a comment**. Rule 1 was structurally incapable of firing. Proven against the shipped module:
```
"// @ts-ignore"        -> 0
"// @ts-expect-error"  -> 0
"/* @ts-nocheck */"    -> 0
"const x = y as any;"  -> 1
```
The gate reported "0 suppressions" **because it could not see, not because the tree was clean**. Fixed in both repos (directives matched in raw source, anchored to the comment start, so `// we ship zero @ts-ignore` stays prose). The fixed detector immediately bit: **`frontend/instrumentation.ts:4` carried a real `@ts-expect-error`** — converted to one narrow `as unknown as` with a written invariant rather than ledgered, because `@ts-expect-error` blankets every error on the statement.

**193. The backend had no dead-code gate at all — FIXED.** It shipped `knip.json` and a `knip` devDependency and **nothing that read the output**, so a dead export could be added and nothing objected. New fail-closed `check-dead-code.mjs` (every finding needs a `KEEP`/`WIRE`/`REMOVE` verdict; a verdict knip no longer reports is STALE and also exits 1). Knip findings 54 → **36**. **Live, unscripted bite proof:** declaring `express` made knip stop reporting `dep:express`, the WIRE verdict went STALE and the gate failed at exit 1 naming it — removing the entry returned it to green.

**194. `express` is imported by a backend spec and declared nowhere — FIXED, with the reported mechanism corrected.** `src/health/shutdown-drain.spec.ts:1` value-imports express; only `@types/express` was declared. It was **not broken**: `node_modules/express` does not exist and `require.resolve("express")` fails from the repo root, but the spec passes because it resolves through **pnpm's hidden hoisted store** at `node_modules/.pnpm/node_modules/express`, where express sits as a transitive dependency of the Nest platform adapter. That is a local layout artifact, and a clean `--frozen-lockfile` install has no obligation to reproduce it.

**195. A suppression pointing at a renamed rule silenced nothing and hid that it silenced nothing — FIXED.** `ai-call-metrics.spec.ts:261` disabled `no-var-requires` — a rule typescript-eslint **renamed** — while the two errors below it were `no-require-imports`, which the directive did not name. Both `require()` calls became static imports. `eslint --report-unused-disable-directives` over the four AI spec files: **7 errors → 0 errors, 0 warnings**.

**196. Nine VOID `db.transaction` doubles made every assertion inside them vacuous — FIXED, 9 → 2.** A VOID double never runs its callback, so the spec passes whether the source is right or wrong. Seven in scope; each repaired to match what the spec **claims**: five refusal tests now assert `expect(db.transaction).not.toHaveBeenCalled()` (DECLARED-UNREACHED), two same-tenant controls now invoke the callback (INVOKES). **`reconciliation`'s same-tenant control was worse than inert**: `checkApprovalPolicy` awaits `.where(...)` with no `.limit()`; a chain answering only `.limit()` returned the builder object, `policies.find` was not a function, and the method **died on a TypeError before ever reaching the transaction** — indistinguishable to the old assertion, which only said the error was not a `NotFoundException`. Mutation proof — deleting the `MANUAL_JOURNAL` "no linked ledger account" branch (inside the transaction):

| Source | Spec version | Result |
|---|---|---|
| mutated | repaired (INVOKES) | **1 failed / 1 passed** |
| mutated | pre-repair at HEAD (VOID) | **2 passed** |
| restored | repaired | 2 passed |

**That is the box in one measurement: the old spec could not fail.** `payroll-new-services-tenant-isolation.spec.ts` was a **detector false positive and was NOT edited** — reading it needed two scanner fixes (a Prettier-wrapped `jest\n.fn()\n.mockImplementation(...)` chain read as `jest` alone and vanishing from the scan entirely — **18 files carry that shape**; and an assignment over the object literal never looked for at all), **both made before the ratchet moved**. Self-test 21 → 27.

**197. A planted mutation was live in the shared tree — FOUND AND REMOVED.** `src/common/tenant/tenant-db.ts` carried an uncommitted `if (!context) void target.transaction(async (tx) => tx);` inside the proxy `get` trap — planted for a bite proof by a previous session that was killed before restoring. **It fires a floating transaction on every property access whenever no tenant context is active.** It typechecks, and no gate looks for it; it was caught only because the seven specs were actually run.

**198. `check:authz-deny` — nothing asserted a deny TEST exists per gated handler — NEW GATE**
`check:route-classification` proves every handler *declares* an exposure and the source-side gates check the source side, but **a gate whose deny branch is never exercised is an assertion about the decorator, not about the guard**: the decorator can name a key nobody holds, an earlier `@Public()` can bypass it, a `@RequireModule` can name the wrong module — all three ship green because the only test written is the allow path. Measured on a hermetic HEAD tree: 546 controllers, 1,969 spec files (435 with a deny), **3,219 gated handlers, 766 covered, 2,453 uncovered**. Bite proof both directions: plant a `@RequirePermission` handler with no deny test → **2,454, rc=1**, naming `GET /access/delegations/zzz-planted-defect-probe`; plant a deny spec → 2,452, covered 766 → 767. Self-test 40 passed. The rule deliberately **under-counts** (a hard-coded id segment does not route-link, because `/x/given` is as often a real sibling route). Three vacuity floors exit 2 if the walk, the parser or the matcher measures nothing.
**Residual OPEN:** the ratchet is **owed a LOWERING** — the working tree reads **covered 781, uncovered 2,443, ten BELOW the committed ratchet of 2,453** because another agent added deny specs for `git-connections.controller.ts` and `settings-deprecated-routes.controller.ts` that are still uncommitted. Whoever commits them must lower `uncoveredRatchet` **in that same change**. The gate nags on every run and never banks it silently. Also: **`@AuthorizedInService` is 57 handlers whose deny is unobservable from a route test** — if that class matters it needs a service-level deny convention.

**199. `check:lifecycle-predicates` +1 regression — pinned and FIXED at source**
The gate keeps a **count** baseline, not a list, and twelve candidate files had been touched that day, so S9b could prove it was a genuine committed regression but not pin it. Pinned by running the **HEAD copy of the detector** over both trees (`git archive <rev> src` + `--list`), so the only variable is the source: baseline `626a9f20` → **75**, HEAD → **76**, diff is one added line (`modules/kb/core/kb-tags.service.ts:88 kbArticles`) plus a rename that nets to zero.
**The defect:** `42b3ed70` (ticket 15) added the article-ownership assertion that `setArticleTags` "never had" — tenant-correct, **lifecycle-blind**: an **archived** article still accepted a retag. *A security fix that opened a lifecycle hole.* Fixed with `ne(kbArticles.status, "archived")` — **not** `isNull(archivedAt)`, because `archive()` sets both `status='archived'` and `archived_at` while `publish()` sets `status='published'` and **never clears `archived_at`, and nothing in the repository clears it** — a one-way stamp, so `isNull(archivedAt)` would permanently hide any article that was ever archived and later republished. `check:lifecycle-predicates` rc=1 (76 vs 75) → **rc=0 (75 vs 75)**; self-test 21/1 failed → **22 passed**. `PRIMARY_CANDIDATE_BASELINE` was **not** raised.

**200. `check:cache-invalidation` and `check-namespace-coverage.mjs` carry stale `hrHeadcountNamespace` lookup entries** after the dead factory was removed (`check-cache-invalidation.mjs:303`, `check-namespace-coverage.mjs:61`). **OPEN → ticket 35.**

**201. Dangling exemptions survive a file split and cover whatever is added next — FIXED ×2.** Splitting four over-500 files broke three path-keyed gates. Both `check:unbounded-reads` and `check:lifecycle-predicates` treat an entry as stale **only when the *file* disappears**, so an exemption written for code that has since moved keeps covering the old file. `check:unbounded-reads`' `/gdpr/gdpr-subject-erasure.service.ts` FALSE-POSITIVE became a dangling exemption on a file that no longer has the read; three `ACCEPTED` lifecycle entries went stale the same way. Removing the `check:db-call-count` entry for `cron-hr-retention.service.ts` **exposed a previously-covered N+1 candidate** (the per-policy loop). All re-pointed.

**202. `frontend/scripts/check-over-300.mjs` excludes `*.spec.ts(x)` but not `*.test.ts(x)`, while `check-file-sizes.mjs` excludes both — OPEN, deliberately.** Live consequence: `hooks/api/notifications-inbox.test.ts` at **663 lines** is the single largest entry in the frontend over-300 inventory **and is simultaneously exempt from the hard-500 gate**. Aligning the lists would drop the count and **could turn a red ratchet green**, which is the move the ticket forbids — recorded for a deliberate decision.

**203. `check:file-sizes` red on three frontend files, none owned by the reporter — OPEN.** `hooks/api/notifications-inbox.ts` (534), `hooks/api/accounting/banking.ts` (501, crossed 500 *during* the session), `features/hr/cases/cases-page-content.tsx` (501, uncommitted). **Two of the three are a single line over.** Related: a registry whose line counts must match exactly is fragile under concurrent editing — `seed-enterprise-workspace.ts` moved 550 → 551 between two measurements and `banking.ts` moved 501 → 504 → 501.

**204. `check:over-300` backend is 6 above baseline (400 vs 394) — UNOWNED.** None of the crossings came from ticket 37; they are HR (`work-logs`, `labor.service`, `hr-workflow-engine`, `payroll-compliance`), payroll (`reports-read`, `locking`, `run-batch-loader`), build, workflows, notifications, AI, plus `common/cache/*`, `db/schema/*`, `auth.controller`, `email-outbox`, `platform-operator-access`, `file-quarantine`, `timesheets/core/timer`. **Ticket 37 finished without them, so the 6 splits are unowned — routed.**

**205. `check:dead-code` unclassified findings block the gate in both repos — OPEN.** BE: `src/common/admission/admission-tenant-hint.ts:UseAdmissionTenantHint` (another agent's territory, needs a `FINDING_VERDICTS` entry). FE: `lib/keyboard-activation.ts:nestedActivationProps` (needs an `EXPORT_VERDICTS` entry). Also **32 dead backend exports remain ledgered as `REMOVE`** with their owning workstream named — when an owner removes one, the ledger entry must go in the same change or the gate reddens on staleness (by design, as the express fix demonstrated live).

**206. `check:command-catalog` red on a stale contract snapshot, not a wrong gate.** `hooks/api/git-integration.ts` declares `integrations:git:manage` and the backend controller (`git-connections.controller.ts:54`, uncommitted, another lane) requires exactly that; `contracts/openapi.json` was generated at 16:25, before the move, and still says `settings:manage`. **The fix is to regenerate the snapshot, not to touch either side.**

**207. `check:import-direction` — a genuine new violation and a mirror-image gate bug.** `shared-imports-feature` 20 vs baseline 19: `components/layout/header/org-switcher.tsx` statically imports `@/features/settings/organization/leave-organization-control` (`398359abe`), and the file **already had a `dynamic()` import of the same module, so it counts twice** — merging them would lower the number without fixing anything (the dynamic import exists to code-split the dialog). The real fix is relocating the control out of `features/`. Separately, `cross-feature-import` 222 vs 210: **28 of the 222 are `features/__tests__/*-a11y.test.tsx`** module-sweep harnesses that import one skeleton per feature by design; the walker excludes `*.spec.ts(x)` but not `*.test.ts(x)`, and the sibling query-scope gate already carries exactly this exemption for exactly these files (`1698b2bff` is literally titled "exempt the test harness from the query-scope gate"). Excluding them gives **194 vs baseline 210 — below baseline, and the step becomes blocking.** Neither baseline was raised (both constants live inside the gate script). **OPEN → ticket 35's file.**

**208. `verify-server-data-seam.mjs` asserts a pre-Prettier literal** — the seam is intact, the needle is not. One line. **OPEN.**

**209. `db-gates.yml` has never run anywhere — OPEN.** Its three jobs are dispatch-only for that reason. Someone with dispatch rights should run it once and promote the jobs that pass into `ci.yml`.

**210. Coverage suppressed on a money path — FIXED.** `quotes.service.spec.ts:339` held an **empty-bodied** `it.skip("create: sets approvalStatus=pending when discount exceeds maxDiscountPercent setting")` while the logic is live at `quotes.service.ts:141` and `:245`. Replaced with 8 real tests covering both call sites and both directions. Bite proof: neutering both assignments → `unmutated 23 passed / mutated 2 failed, 21 passed`; service restored byte-for-byte (`git diff --stat` empty).

**211. The FE unit suite is red and had never run in CI — OPEN.** 5 suites / 7 tests: `features/payroll/runs/runs-page-content.test.tsx`, `features/settings/roles/roles-page.test.tsx`, `features/directory/workers/workers-page.test.tsx`, `hooks/api/accounting/__tests__/cursor-pagination.test.ts`, `hooks/api/__tests__/billing-hook-gates.test.tsx`. **Invisible until now because the suite had never run in CI.** A frontend `coverageThreshold` is recommended (statements 51 · branches 45 · functions 36 · lines 53) and **unowned**.

**212. `alert-workflow-stranded.mjs` and `alert-retention-dead-man.mjs` are not among the 14 scripts `check:alert-system` verifies** — both DB/Redis-backed rather than log-string-backed, so no inert-predicate risk, but **their self-tests are never run by the meta-gate**. **OPEN.**

**213. Cross-repo spec paths resolve the frontend by `join(BACKEND_ROOT, "..")`** and fail on this machine's layout: `common/slo/slo-catalogue.spec.ts`, `common/rbac/module-registry-fields.spec.ts`. Not a defect in either spec's subject; they need the `backendPath`-style helper the other cross-repo specs use. **OPEN.**

---

## K. Observability / logging / health

**214. Bind values were being logged — P0, FIXED.** Drizzle raises `DrizzleQueryError` with the message `Failed query: <sql>\nparams: <bind values>`, so **the values a failing statement was about to write live *in the message*, where no key-based redactor can reach them.** Five generic handlers re-emitted it verbatim, and `OutboxPublisherService.handleFailure` also **stored** it in `outbox_events.last_error`, which `alert-dead-outbox.mjs` **prints to an operator's terminal.** Fixed once in `truncateForLog`.
**Two residual gaps, neither exploitable today — OPEN:** the scrub regex is `[^\n]`, so **a bind value containing a newline leaves its later lines unscrubbed**; and `SENSITIVE_EXACT` has `"params"` but not postgres.js's `"parameters"`.

**215. The log-secrets gate and the runtime redactor disagreed — P1, FIXED.** The gate treated `accessKey`, `bearer` and `jwt` as dangerous; `redact.ts` withheld **none** of the three. CHECK 3 (redactor parity) added, parsing both lists and comparing them.

**216. Every outbox event committed with `correlation_id = null` — P1, FIXED.** Not one of the **38** `OutboxWriter.emit` call sites ever set it.

**217. A deliberately raised 5xx produced total silence — P1, FIXED.** `AllExceptionsFilter` returned from the `HttpException` branch with **no log line and no error report at any status**. Split at 500.

**218. `/health/workflows` was a dead stall detector — P1, FIXED.** `drainBacklog(db)` ran a cross-tenant `count(*)` on `workflow_runs`, which carries `tenant_isolation` RLS (`migrations/0591_…:1045`, `organization_id = app.current_org_id()`), and `createTenantAwareDb` falls through to the pool when there is no tenant context — so the predicate is NULL and **the count is always 0**. `due: 0`, `oldestDueSeconds: null`, and the "nothing is calling /cron/workflow-tick" hint **could never fire**. Replaced by `workflow-backlog.ts` aggregating inside `forEachOrg`.

**219. `/health/ready` ran `select 1` on every probe with no cache and no timeout — FIXED.** `ReadinessService` now evaluates once per `READINESS_CACHE_TTL_MS` (5000) with single-flight, each check bounded by `READINESS_CHECK_TIMEOUT_MS` (2000). Probe amplification proof: 50 sequential + 50 concurrent probes → dependency checked **once**; 25 `ready()` calls → `execute` called **1×**. Negative control: replacing the cache hit with `if (false)` → **5 failed**. Nothing refused new requests during shutdown and nothing waited for in-flight ones; `shutdownState`/`shutdownGate` added, proven over real HTTP (express + supertest, 4/4). Negative control: `enter()` never refuses → **6 failed**. The `providers` check reads `sharedProviderBreaker` **without half-opening it**, so a probe never spends a provider's recovery attempt.

**220. `ProviderCircuitBreaker.check()` guards with `if (!entry?.openedAt)`, so a breaker opened at epoch 0 reads as closed.** Latent, inert in production. **OPEN.**

**221. `drainBacklog` / `DrainBacklog` is newly orphaned** (`src/common/workflow/workflow-store.ts`) — only its own spec calls it, and it is not in the `common/workflow` barrel. Not deleted (needs knip plus a real build, and the file is in ticket 31's working area). **OPEN.**

---

## L. Payroll

**222. Published payslips could be silently overwritten — a distributed payslip replaced under the same identity — FIXED**
`payslip-bulk-publisher.service.ts` upserted with `onConflictDoUpdate` on `runEmployeeId` and **no predicate**. If any payee's PDF failed, the run stayed `PAID` (the flip to `PAYSLIPS_PUBLISHED` only fires when *all* published), so a second unfiltered `POST .../payslips/publish` **re-rendered and overwrote already-`PUBLISHED` rows' `pdfUrl`, `snapshotHash`, `publishedAt` and `publishedBy`**. Now `setWhere: ne(payslipPublications.status, "PUBLISHED")`.

**223. Acknowledged tax filings could be re-acknowledged — FIXED.** `filings.service.ts attachAcknowledgement` overwrote `challanRef`/`acknowledgementRef`/`submittedAt` with no status check.

**224. A paid bank item could be flipped to FAILED — FIXED.** `batch-status.service.ts markItemFailed` had no terminal-state guard (its sibling `markItemPaid` did). A bank-return re-import could mark a settled payment failed and **desynchronise the run from the money that actually moved**.

**225. Three payroll writes ran without an `orgId` predicate, relying on RLS alone — FIXED.** A defence-in-depth hole that becomes a **cross-tenant write** the moment a code path runs as a role that bypasses RLS: `payslip-bulk-publisher.service.ts` (the run flip to `PAYSLIPS_PUBLISHED`), `batch-status.service.ts markBatchPaid` (three predicates), `run-result-persister.service.ts` (the line-item delete).

**226. `manager-inbox.service.ts` read every published payslip in history for up to 500 direct reports — FIXED.** No `limit`, no `selectDistinctOn` — then discarded all but the newest per user in JS. **At 24 months that is ~12k joined rows per manager-inbox load, growing without bound with tenure.** The guarding spec asserted `source.match(/\.selectDistinctOn\(/g)` had length **1**, which the *sibling* query satisfied on its own — **it passed while the payslip read was unbounded.** Rewritten to assert both targets and the limit by name.

**227. `tax-admin.service.ts exportCsv` silently truncated the CSV — FIXED.** A bare `.limit(100)` with no `+1` probe on an export route: an org with more than 100 declarations **received a silently truncated CSV**. Now `.limit(PAYROLL_READ_CAP + 1)` + `requirePayrollReadWithinCap`, so it 409s.

**228. `runs/inputs.service.ts` N+1 plus a silent 1,000-row truncation — FIXED.** `reimportInputs` ran `pullAttendanceInputs` per row over a 1,000-row set at 2–4 queries each, then a **second** per-row loop issuing one `INSERT … ON CONFLICT DO UPDATE` per payee inside the transaction — roughly **4,000 reads plus 1,000 writes, all serial, in one HTTP request**. Adjacent in the same method: the `toReset` read was a bare `.limit(1000)`, so an org with more than 1,000 non-override inputs **silently reimported only 1,000 of them**; and the delete inside the transaction had **no `orgId` predicate**. Measured proof (`reimport-inputs-call-count.spec.ts`, 6 tests spying on the real `db` handle): select calls at 50 payees **5**; at 1,000 payees **14** (the entire delta is four extra chunks); `tx.insert(payrollInputs)` calls **1**, carrying **1,000** rows; 1,001 rows → `ConflictException`, not a truncated reimport. Round-trips `1 + ceil(users/200)*3`, `PAYROLL_INPUT_PULL_CHUNK = 200`.

**229. `POST /payroll/filings/export` built the CSV on the request thread — FIXED, and a live bug found on the way in.** Moved onto the pre-existing-but-unused `FILING_EXPORT` job type (202 + a durable handle, new `GET /payroll/filings/export/jobs/:jobId`). **The worker's `FILING_EXPORT` branch never passed `runId` or `month` to `prepareExport`**, so a job enqueued through `POST /payroll/jobs` resolved no run and **produced an empty artifact** — unreachable in practice only because nothing enqueued it.

**230. Payroll cache invalidation missed four surfaces — FIXED.** Before this pass: **lock did not invalidate inputs or exceptions**, so the Inputs tab kept showing editable-era data after the snapshot was frozen; reopen left the same four tabs stale while the run became editable again; **publish never invalidated the employee-facing payslip list, so an employee with `/me/pay` open kept the pre-publish list**; journal reversal left `period-reconciliation` — live on screen in `report-journal.tsx` — showing pre-reversal balances. Also `payout-batches.ts`: `queryKeys.payroll.run(runId ?? 0)` was a **silent no-op whenever `runId` was undefined**.

**231. A 409 left the operator staring at the stale state that caused it — FIXED.** Conflicts on lock/reopen/close/publish/generate/recalculate/resolve-exception/override-exception funnelled into a generic *"This action conflicts with existing data."* with **no refetch and no invalidation** (invalidation only ran in `onSuccess`) — and the obvious next move was to click again against the same stale data. `useRunConflictHandler(runId)` now detects a 409, invalidates the run's seven surfaces and says the screen has been refreshed.

**232. Two false all-clears on blocking safety surfaces — FIXED.** `exceptions-tab.tsx` had **no error state**: a failed exceptions fetch left `isLoading` false and the data undefined, rendering the green *"No exceptions — clean run"* empty state — **a blocking safety surface reporting all-clear when it had failed to load.** `variance-tab.tsx` had the same shape. Also, publish returned `{published, total}` and **reported a partial as a green `toast.success`** — a run where half the payslips failed read as a success.

**233. `writeTdsYtdLedger` replaces where it should accumulate — PARTIAL / routed**
`locking.service.ts:244/:279` upserts on `(org, subject, fiscal_year, period_key)` and **sets** `taxable_income_paise`/`tds_paise` to the current run's figures. **Two runs in one month is a supported product shape, so the second run's lock erases the first's monthly tax record.** Migration `1030` now refuses that write once the first run is paid — which **stops the corruption but surfaces as a raw `23514` rather than a 409**. The correct fix is `run_id` in the ledger's natural key (one row per run, YTD by `SUM`), because a plain `+=` breaks the moment either run is reopened and re-locked. Needs `src/db/schema/payroll/entities-periods.ts` + a unique-index migration, **held by the schema-declaration sweep — routed.** `payroll_tds_ytd_ledger.run_id` also still carries **no foreign key**, which is why a deleted run leaves the row unfrozen.

**234. Payroll DB-level immutability — FIXED for the last table, PARTIAL before.** Immutability was enforced at the DB layer for exactly two tables (`payroll_run_employees`, `payroll_line_items`, via `0445`). Migration `1030_t24_payroll_tds_ytd_immutability.sql` (journal idx 790, `when` 1803000010109) adds the last one, frozen on `payroll_runs.status IN (…paid-out…)`, with the reachability walk over `PAYROLL_RUN_TRANSITIONS` proving no paid-out status can reach a lockable one (`REOPENED` is reachable only from `LOCKED`). **45 assertions, exit 0.** The guard is proved non-vacuous by removing it. Still without a DB-level trigger: `payroll_journal_batches`/`_lines`, `payroll_bank_batches`/`_items`, `payroll_filings`. Two FKs unenforced (`payroll_run_allocations.run_id`, `payroll_tds_ytd_ledger.run_id`), and `payroll_bank_batch_items` has **no natural key on `(batchId, runEmployeeId)`, so one run employee can appear in two batches.**

**235. A run with FAILED bank items is still marked `PAID` — OPEN, unpinned.** `checkRunCompletion` treats `FAILED`/`HELD` as settled. It looks deliberate (`evaluatePeriodReconciliation` surfaces the `run_net_vs_payout_paid` delta as a blocker) but **nothing pins the behaviour**, and no test spans "bank return fails 1 of N → batch `PARTIALLY_PAID` → reconciliation reports the delta".

**236. `writeTdsYtdLedger` and `BatchStatusService.importBankReturn` are untested, and no single test spans generate → reconcile.** Also untested: `refreshBatchPaidStatus`'s `PAID`/`PARTIALLY_PAID`/`FAILED` derivation.

**237. Payroll permission-key drift — FIXED.** CSV buttons gated on `payroll:reports:export` while `useExportPayrollReport`/`useExportJournal` guarded on `payroll:reports:view`. Server truth is **both** — the route decorator is `:view` and the `format=csv` branch additionally calls `authorize(..., "payroll:reports:export")` in-service — and both hooks always send `format: "csv"`, so `:export` **narrows** the client guard rather than widening it. Closed via the gate's sanctioned `STRICTER_KEYS` map.

**238. Payroll index gaps — routed to ticket 08.** No `(orgId, runId, status)` on `payroll_run_employees` (the status filter on the run-items list is unindexed, and the `users.name` sort is on the joined table so **every page sorts the whole run partition**); no `(orgId, entityId, month, id)` on `payroll_runs`; no `(orgId, userId, status)` on `payslip_publications`.

**239. HEAD named six migrations whose files are not in the repository — resolved by landing, recorded as a hazard.** At exactly `c046faf1`, `migrations/meta/_journal.json` carried six other agents' uncommitted entries (ticket 29's `1020`–`1022`, ticket 07b's `1023`–`1025`) whose `.sql` files were still **untracked**. `check:migration-discipline` reads the working tree so it stayed green, but **a clean clone pinned to that one commit would not build.** The mirror-image happened too: another agent's commit `f4c7bdf5` **swallowed `_journal.json`** with ticket 29's two new entries in it while its `.sql` files were untracked.

---

## M. Authorization / permission drift

**240. Four pages were reachable by any active member — P1, FIXED.** Their only gates were advisory client checks and no layout enforced anything: `/ai/executive-brief` (**no gate at all, no `ai/layout.tsx`**) and `/surveys/new`, `/surveys/[surveyId]/participants`, `/surveys/live/[sessionId]/host` (`<DashboardGate>` + `<RequireModule>` only). Now `enforceRouteAccess("/surveys")` and `enforceRouteAccess("/ai/executive-brief")`. Keys taken from the contract's own `x-permission` and confirmed verbatim in **both** catalogs. The brief's leaf placement is deliberate: `/ai` itself resolves to `unknown`.

**241. `email.send` gates on a chat permission — anyone holding `chat:messages:write` can send outbound email — OPEN**
Surfaced by collapsing nine `denyReason` call sites into one table, which made the whole mapping visible on one screen:
```
"email.send":  "chat:messages:write"      <-- sends an outbound EMAIL
"mail.send":   "mail:messages:send"
```
`case "email.send"` reaches `EmailOutboxService.enqueueAndTry` — a real outbound send. **Deliberately not changed**: ticket 38 is a refactor, and changing an authorization key is a security and product decision with real blast radius — tightening it could lock out callers who use the path today. The table preserves every key exactly as it was. **Needs an owner's decision. UNOWNED.**

**242. Three `@Public()` auth routes are gated by a plain `!==` compare against `INTERNAL_API_SECRET` — OPEN.** `auth.controller.ts` — `POST auth/google`, `POST auth/session-exchange`, `GET auth/session-data/:userId`. Two problems: the exposure declaration reads "public" to `check:route-classification` and to the `x-exposure` OpenAPI stamp, **understating the real gate** (`@AuthorizedInService("INTERNAL_API_SECRET header")` is the honest declaration); and unlike every other `@Public()` route on this controller **these three call no `enforceRateLimit`, so a leaked shared secret mints sessions without a limiter**. The compare is also **not constant-time**.

**243. A misconfigured JWK `kid` leaked private key members — FIXED, with a rotation recommendation.** `src/common/auth/jwt-keyring.service.ts` spread the JWK; now projects onto an explicit public-member allowlist with a loud `logger.error` naming the misconfigured `kid`. The author deliberately did **not** throw at boot (stripping fully closes the leak with zero deployment risk) and **recommends the orchestrator consider hard-failing instead, and treat any key configured this way as compromised and rotate it. UNOWNED.**

**244. Support inbound secrets are now hashed and unlookupable — an operator action is owed.** After the hashing migration ran, **a channel whose secret was never written down must be rotated** through `PATCH /support/channels/:channelId { rotateInboundSecret: true }`, which 15d built for exactly this. **Operator action, OPEN.**

**245. Test assertions that encode a vulnerability — FIXED by inversion, not deletion.** Several specs asserted the defective state as correct: `bola-scope-gate-integrity.spec.ts` asserted `gatesOnAll === false` and `source.includes('!== "none"')` on `tasks.service.ts`; `bola-bulk-mixed-tenant.spec.ts` asserted `verifiesCandidates === false` for `enrollSequence`; and a set asserting the owner holds *every* key. Each was **inverted** rather than deleted, because a green test over a repaired defect is dishonest either way.

**246. `GET /tasks/analytics` leaked an org-wide per-assignee leaderboard — P1, FIXED.**

**247. Contacts had no scope helper at all — FIXED.** `own` was unimplemented across the whole module, so scoping only the export would have been theatre — **the list leaked the same rows**. Added `contacts-scope.ts` + `contactPartyViewScope` on `businessParties.ownerUserId` and applied it to list, search and export; the cached list hash now carries the scope and the actor.

**248. `check:unbounded-reads` unclassified paths keep appearing from concurrent work — OPEN, rotating.** Observed at various points on `gdpr-rectification.service.ts:281` (fixed by removing the drain: two queries collapsed into one join, `754 unbounded / 0 actionable`), then `hr/recruitment/recruitment-automation.service.ts:321` (an unbounded `select({id: candidates.id})` inside a new **cross-tenant ownership check** — a BOLA fix, not cache work — needing a classification entry or an `inArray`-sized bound from its author), then `cron/cron-hr-retention-documents.ts:130`, then `gdpr/gdpr-subject-erasure-derived-sinks.ts:137`, then `hr/time/leave-approver.service.ts:65`.

**249. `check:tenant-relationships`' default target is misleading — OPEN (documentation defect with a real consequence).** It reports **627** actionable single-column tenant FKs, including `fk_kb_space_grants_space`, **because it defaults to `scratch_boot_a`, whose ledger is only partly replayed** (the script's own TARGET CAVEAT). Against a database at head it is **0**: `TENANT_RELATIONSHIP_DB_URL=…/scratch_perf_seed check:tenant-relationships --db-only` → *Ledger rows on target 659 of 662 · Total single-col FKs 214 · Actionable 0 · exit 0*. **Anyone reading 627 as a release number is reading `scratch_boot_a`.**

---

## N. Cross-cutting: the shared working tree

**250. A schema edit collapsed the entire backend typecheck to `any` — 195 / 205 / 208 / 223 errors across reports, all one root cause — OPEN**
`src/db/schema/payroll/policies.ts` — `AnyPgColumn` was removed from the import while `payrollPolicies` and `payrollPolicyVersions` still reference each other, so `payrollPolicies` is `TS7022: implicitly has type 'any' because it is referenced directly or indirectly in its own initializer`. **That collapses the schema barrel to `any`**, producing 89 × `TS2339` (`Property 'orgId' does not exist on type '{ orgId: any } | { orgId: any }[]'`) and 69 × `TS7006`/`TS7031` across hr, chat, inventory, e-sign, dashboard, build, tasks and quotes, plus `run-data-loader.service.ts:87,88,101` reporting `Property 'payroll_policy_versions' does not exist on type '{}'`. Attribution was exact, not asserted: `tsconfig.build.json` excludes `**/*spec.ts`, so one report's input set was byte-identical with and without its own pass. Reported by 38b (§Cross-territory 1, *"the highest-severity thing I found and cannot fix"*), 24 and module-di-blindspot. **`src/db/schema/**` is held by the schema-declaration sweep. UNOWNED at the time of writing.**

**251. `scratch_boot_d` was rebuilt underneath a running measurement.** At 17:49 it held the seed; minutes later it was back to **0 organizations, 0 users, 0 rows in every seeded table, 645 ledger rows** (it was 637 at start), and `streamline_app` had lost SELECT on `organization_members` and `calendar_events` — a fresh cold bootstrap with no `db:bootstrap-role` after it. Nothing measured was lost (numbers were captured first and plan trees checked in), but **the plans cannot be re-run without re-seeding**, and re-seeding was deliberately declined to avoid breaking a concurrent bootstrap.

**252. `scratch_perf_seed` was stale and has been rebuilt — FIXED.** It predated `3d157c15` and held title-case ticket statuses, which made `dashboard-personal-my-tasks` read as vacuous and **cost one round of mis-routing**. Rebuilt at journal head **665/665**, 1,720 MB, 90 non-empty tables, four tenants at 89.93/9.00/0.90/0.18, `streamline_app` `rolbypassrls=f rolsuper=f`, 899 RLS relations in `public`. Read-cost gate on the rebuild: **70 PASS / 0 FAIL / 0 UNMEASURED / 0 EXCL / 0 SKIP** at the reference tenant. Swapped by rename (`scratch_perf_seed` → `scratch_perf_seed_stale_20260902`), **not dropped**, because reports 22c and perf cite it. The swap script polls until every connection is idle for 90 s, terminates idle backends (postgres.js reconnects), and **refuses to swap at all if a query is in flight**. **If `swap.log` ends with `SWAP NOT PERFORMED`, the replacement is still at `scratch_perf_seed_new` and the two `ALTER DATABASE` lines are all that remains.**

**253. `scratch_t07c` is a copy of the stale seed** (title-case statuses, 1,703 MB) — **anything status-dependent measured on it reads vacuous.** Not rebuilt (another ticket's evidence). **OPEN → whoever owns ticket 07's evidence.**

**254. `scratch_perf_seed` is one migration behind for the benchmark manifest.** `ef3c1960` added `1027_t07b_dashboard_my_tasks_assignee_updated_index` and `pg_indexes` returns nothing for it, so the `my-work` and `dashboard-personal-my-tasks` numbers in that manifest describe the plan **without** the index.

**255. `noUncheckedIndexedAccess` — constitution says on, both configs say off — OPEN, orchestrator decision.** Measured with tsc, not estimated: backend `tsconfig.build.json` **574 errors / 190 files**; frontend **184 / 84**. Also measured for the related flags: `noUnusedLocals`+`noUnusedParameters` on `tsconfig.build.json` **288 / 193**, on `tsconfig.json` (incl. specs) **472 / 315 (122 spec)**. **Both are floors** — each build config excludes tests and scripts, so the flag would report ON while `test/`, `evals/` and all 1,930 specs stayed invisible; **the 288-vs-472 gap is that blind spot measured**. Deliberately left off: turning `pnpm typecheck` red across ~193 files, many dirty with in-flight work, removes every agent's only proof. **One of the two must move.**

**256. Box 2 unused-symbol enforcement is off in both repos — BLOCKED.** `noUnusedLocals`/`noUnusedParameters` absent in both tsconfigs; `@typescript-eslint/no-unused-vars` at `warn` with `^_` ignore patterns — **which box 2 explicitly forbids**. As shipped: 234 backend / 763 frontend = **997**. As box 2 requires: 403 / 1,891 = **2,294**. **The gap of 1,297 symbols is precisely the population hidden behind a leading underscore or a trailing-parameter exemption.** Needs a clean tree.

**257. Frontend lint scope — the 2,375 number was a scanning artifact.** Pristine baseline measured against `git show HEAD:frontend/eslint.config.mjs`: **2,365 errors / 17,183 warnings / 5,628 files**, of which **`.next-buildmart/` is 2,328 errors and 16,226 warnings — 98.4% and 94.4%**. After adding `.next-buildmart/**` and `coverage/**` to `globalIgnores` (commit `2be4fee90`) and 23 real source fixes (commit `877e797a8`): **exit 1, 14 errors / 957 warnings**. **No CI gate was ever inflated** — both directories are gitignored so CI never checks them out, and Lint runs before Build in all four workflows. `feedbucket-widget/dist/**` **does not exist and nothing produces it** — the ignore was deliberately not added rather than cargo-culted.

**258. 11 remaining lint errors share one shape — OPEN.** A test helper named `captureXOptions` calls a `useX` hook outside a component, which the React Compiler lint rule rejects, across six `hooks/api/**` cursor-pagination test files. **A single mechanical rename-and-wrap for that territory's owner, not 11 separate problems.**

---

## Highest-leverage items still needing an owner or a deadline

1. **R2 bucket privacy (`R2_BUCKET_NAME`, `R2_KB_BUCKET_NAME`) + the owner-role backfill run** — #84. Every already-copied public URL still resolves. Operator-only.
2. **`email.send` gated on `chat:messages:write`** — #241. UNOWNED authorization decision.
3. **`src/db/schema/payroll/policies.ts` TS7022 collapsing the whole backend typecheck** — #250. UNOWNED.
4. **`GET /me/access` p50 503 ms on every authenticated server render** — #152. Two owners named, neither has taken it.
5. **`GET /calendar/events` 1,139 > 500, plus the never-measured 7,063-blocks/batch real loader** — #35–37. The 3-line fix is measured (1,140 → 23) and sits in the dashboard owner's file; re-measuring the manifest turns the gate green with nothing fixed.
6. **Residual global ~133 concurrent-stream ceiling** — #3. Capacity/product decision.
7. **`assertWithinLimit` check-then-act at 24 of 29 sites** — #17. Plan limits are bypassable under concurrency.
8. **`QuotesService.update()` discount-only PATCH** — #23. Recorded twice, UNOWNED.
9. **`check:cache-invalidation` is vacuous** — #66. The algorithm to replace it is written out; ticket 35 owns the file.
10. **`check:authz-deny` ratchet owed a lowering to 2,443** — #198, and **2,453 gated handlers still have no deny test**.
11. **`unified-inbox.service.ts` 263× read on an unindexed column** — #50, blocked on a `membership_id` backfill + `NOT NULL` migration (ticket 08).
12. **`app.search_kb_chunk_ids` `AS MATERIALIZED`** — #51. 27× measured, strictly better, one-line function change, unowned.
13. **The FE unit suite has never run in CI and is red** — #211, plus an unowned coverage threshold.
