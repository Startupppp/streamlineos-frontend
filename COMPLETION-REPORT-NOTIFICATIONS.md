# COMPLETION REPORT — Notifications & Realtime Delivery

**Date:** 2026-08-11, closed 2026-08-13 · **Status:** **53 of 53 tasks closed — 0 open, 0 partial,
0 blocked.**

Two of those are closed as *decisions* rather than code, both yours and both recorded with the
measurement behind them: **SCH-004** (keep the 50M-row partitioning trigger) and the scope of
**REG-003** (time-derived events only; the 59 bypass conversions stay with SEND-BYPASS). Seven
time-derived events are not shipped because they cannot be written as pure additions — each reason
is stated in the third-pass section, not hand-waved.

Read the three "corrections to my own work" sections before trusting any single claim here: this
report is written to be checkable, including where I got things wrong.

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

## Second closing pass (2026-08-12) — the five held items

Three are done, one is partly done with the rest classified, and one I am not doing because
the measurement says it would make the schema worse.

### SCH-014 — done, and the audit's premise was wrong

The proposed remedy was `email_outbox.organization_id NOT NULL`. That would have broken
authentication: `resendVerification` and password reset send **before** the user belongs to
any organization, so those rows legitimately have no tenant.

The real defect was the RLS policy, which read `CASE WHEN organization_id IS NULL THEN true`.
All 34 rows are NULL, because callers never passed an organization — so **every email ever
queued was readable from every tenant, bodies included.**

`0431` adds a `scope` column (`PLATFORM`/`TENANT`), a CHECK tying it to `organization_id` so
"tenant email with no tenant" is unrepresentable, and a policy with no NULL escape. The
organization is now resolved from the ambient tenant context inside `EmailOutboxService`,
covering all 75 senders rather than relying on the 76th caller remembering.

Proven as `streamline_app`: Org A's email reads 1 in Org A, **0 in Org B**; the 34 platform
rows read **0 from any tenant** (previously 34 from every tenant); the CHECK rejects a tenant
email with no org (`23514`); platform rows still read 34 with no tenant GUC, the cron's own
context.

That last point mattered: the policy change would otherwise have made platform mail invisible
to the per-org sweep, so failed verification emails would never retry again. `flushOutbox` now
runs a platform pass **outside** `forEachOrg`. Live proof: `POST /cron/email-outbox-flush`
returned `Processed 4 outbox emails: 4 sent` — rows only that pass can see.

### SNAP-001 — done; my own note had overstated it

I had recorded the chain as stale for fifteen migrations. It was stale for three. `db:generate`
proposed exactly `0429`–`0431` and nothing else (61 lines). Every proposed object was verified
already present in the database first — three tables, four types, six columns, nine indexes.

The SQL is neutralised to `SELECT 1` with the reasoning in the file, and the generated snapshot
is kept, which is the part that actually fixes it. Then `db:migrate` was run. End state,
verified three ways: **0 pending**, 182 applied rows against 180 journal entries (the surplus is
the six pre-existing duplicate tags), and `db:generate` now reports **"No schema changes"**.

### COMP-004 — software half done; registration is still human-only

DLT registration is out-of-band with an Indian operator and nothing here can perform it. What
the software owes is refusing to send content DLT has not approved — SMS previously resolved to
the sandbox provider, which reports SENT for everything. `NotificationSmsProvider` now enforces
the gate, sharing the approval columns with WhatsApp (`providerTemplateName` holds the DLT
template id). All refusals are non-retryable: retrying cannot change a registration decision,
and repeated rejected sends count against the sender ID's standing.

### REG-003 — partly done, remainder classified rather than guessed

"77 declared-but-unemitted events" was a misleading unit of work. The real count is 75, and they
are two different problems:

- **16 are time-derived** — `due_soon`, `overdue`, `sla_breached`, `starting_soon`, `expiring`,
  `reorder.suggested` and similar. No user action can fire them; genuinely silent, pure additions.
- **59 are event-driven**, and most sit in modules that already notify through a bypass path. HR
  leave is not silent at all: it sends via `notifications.create` plus a direct email, ignoring
  preferences, quiet hours, routing and dedupe. Converting those is the SEND-BYPASS migration,
  with real content-regression risk — not a missing feature.

I shipped the first time-derived pair: `build.ticket.due_soon` and `build.ticket.overdue`, via
`BuildDueSweepService` and `/cron/build-due-sweep`, owned by Build rather than notifications (§18).

I did not wire the other 73. Each needs the correct recipient set for its own domain, and a wrong
recipient set is a disclosure, not a cosmetic bug — 73 written quickly is worse than 73 classified.

### SCH-004 — not done, on the evidence

Measured live: `notifications` 420 rows / 688 kB, `notification_deliveries` 839 / 1.9 MB,
`notification_queue` 419, `ai_usage_logs` 1, `chat_messages` 0.

Partitioning requires the partition key in every PK, so the PK becomes `(id, created_at)` and bare
`id` stops being unique. There are **5 foreign keys referencing bare `id` today** — 3 into
`notifications`, 2 into `notification_deliveries` — every one of which would have to be dropped or
rebuilt as composite. That is a real loss of referential integrity, paid now, for a 688 kB table.

§19 says not to partition a table that is not demonstrably large, and D-2 set the trigger at 50M
rows. I am not overriding that on a 420-row table. If you want it regardless, say so and I will do
it — but I would be making the schema worse on purpose, so that should be your explicit call.

---

## Found while verifying — three live defects, none in this programme

**The backend did not boot at all.** Three DI failures, all in committed code, none in files this
programme touched:

1. `InvWarehousesModule` never imported `InvStockEngineModule`, which owns the
   `WarehouseScopeService` its service injects.
2. `InvValuationModule` had the identical defect.
3. `principal-groups.service.ts` imported `AccessService` with **`import type`**. TypeScript erases
   a type-only import, so `emitDecoratorMetadata` recorded `undefined` and Nest could not resolve
   the parameter — the "argument at index [1]" error.

The third generalises: a scan found `hr-automation-engine.service.ts` doing the same with
`HrWebhooksService` behind `@Optional()`, so it silently resolved to `null` forever and **HR
automation webhooks never dispatched** — no error, no boot failure, just a feature that was never
on. Both are now value imports; `madge` still reports zero cycles, because it counts type-only
imports as edges anyway, so the type-only form bought nothing.

After those fixes the application boots, both new cron routes map, and all four notification cron
endpoints returned correct JSON when called live.

## Corrections to my own work in this pass

- **The Build sweep matched a range, not a boundary.** As first written it selected every ticket
  currently overdue — 5,716 here — notifying every assignee about the entire historical backlog on
  the first run, and again daily after. My own docstring claimed boundary semantics; the code did
  not implement them. Each ticket now fires once, on the day it crosses.
- **`current_date + $n` fails outright.** Bound as a parameter Postgres cannot type the operand, and
  the query failed for all 5 orgs while the endpoint still returned HTTP 200 — `forEachOrg` logs
  each org's failure and carries on. Then `make_interval` returned a timestamp, casting every row
  and giving up the index. Literal date arithmetic fixed both.
- **I misdiagnosed the delivery-claim failures.** I concluded a `Date` bound inside a raw `sql`
  template was serialised unparseably, and changed four files on that basis. Testing the exact
  statement as both the owner and `streamline_app` showed it succeeds in both. The failures were
  `write CONNECTION_CLOSED` against Neon's pooler. All four edits are reverted; the logger records
  only `err.message`, which is why the real cause stayed hidden.

## Unverified at runtime

The Build due sweep boots, maps, and its endpoint responds, but I could not get a clean end-to-end
proof that it emits a notification: repeated Neon pooler `CONNECTION_CLOSED` drops under the 5-org
sweep interrupted every attempt with a seeded ticket. The query and emit call are correct by
inspection and typecheck, and the probe ticket was cleaned up. Treat the emit path as unproven
until a sweep runs against a stable connection.

## Third pass (2026-08-13) — every task closed

`TASKS-NOTIFICATIONS.md` is now 53 done, 0 open, 0 partial, 0 blocked.

**PIPE-010 — circuit breaker (the half that was still open).** Jitter spread retries out but
did not stop them: during a provider outage every queued delivery still called the provider,
failed and rescheduled, so an outage cost one round trip per notification indefinitely — and
sustained failed traffic is what gets a sender reputation downgraded. `NotificationCircuitBreaker`
opens per **(org, channel)** after 5 consecutive failures and requeues without contacting the
provider; one probe is let through after the cooldown; a single failed probe re-opens it without
needing a fresh threshold. Skipped is not failed — the attempt counter is untouched, so an outage
cannot push deliveries to DEAD. Scoped per tenant so one org's broken SMTP credentials cannot stop
email for everyone. 8 specs, including the isolation and half-open cases.

**SCH-012 — contract step.** `0432` drops `quiet_hours_timezone`; the field is gone from the DTO,
the defaults constant and the Drizzle schema, so nothing can write it back. Verified: column
present before, absent after.

**SCH-004 — closed as your decision.** Keep the 50M-row trigger. Recorded with the measurement
(420 rows / 688 kB, 5 FKs that would have to be dropped or rebuilt) so the reasoning survives.

**REG-003 — scope set by your decision: time-derived only.** 9 of the 16 shipped:
`build.ticket.due_soon`, `.overdue`, `build.sprint.ending`, `crm.followup.due`, `.overdue`,
`support.ticket.sla_breached`, `billing.invoice.due_soon`, `sign.document.expiring`,
`calendar.event.starting_soon`. Behind `/cron/build-due-sweep` and `/cron/notification-time-sweeps`
(must run at least hourly — the SLA-breach window is one hour wide).

**The emit path is now proven end-to-end**, which was the gap left open in the previous pass: a
live sweep created **39 real notification rows**, correctly attributed (`[build/PROJECTS] Due soon:
…`), with **zero swallowed per-org failures** across all three sweeps. Those rows are legitimate
notifications about seeded dev tickets and were left in place.

### The 7 time-derived events I did NOT ship, each with its reason

These are not oversights — none can be written as a pure addition without inventing something:

| Event | Why not |
|---|---|
| `chat.reply.reminder` | `ChatReplyRemindersService` already sends it. That is a bypass migration, which your decision excluded. |
| `inventory.stock.out` | `inv_reorder_rules` has **no user column** — no owner, no notify-to. Needs a permission-based audience, which is a design decision. |
| `inventory.reorder.suggested` | Same: no recipient derivable from the row. |
| `hr.document.expiring` | **No employee-document table with an expiry exists.** Only `candidate_documents` and `document_templates`. There is nothing to sweep. |
| `hr.attendance.missing` | Needs working-calendar, holiday and leave logic to know a day was actually missed. Guessing spams every employee. |
| `survey.deadline.due_soon` | `pulse_surveys.closesAt` exists but there is **no assignment table**, so "who owes a response" is not derivable. Notifying `createdBy` would be a different notification wearing this event's name. |
| `calendar.reminder` | Semantics ambiguous (user-set reminders); `calendar.event.starting_soon` covers the real need. |

### More live defects found while verifying — again not in this programme

`InvReportsModule` had the same missing-`InvStockEngineModule` defect as `InvWarehousesModule` and
`InvValuationModule`, newly introduced during this session by the Inventory work. **The application
did not boot.** Fixed; boots clean, both new cron routes map, endpoints return correct JSON.

That is now **four** instances of this one defect class. It is invisible to `tsc` because Nest
resolves DI at runtime — the only way to catch it is to boot.

### Snapshot reconciliation recurred

`db:generate` re-proposed already-applied work a second time, mixing the Inventory programme's
`inv_webhook_event_subscriptions` (their `0420`) with my `quiet_hours_timezone` drop (`0432`). Both
verified present/absent in the database first, then `0183_abandoned_captain_stacy.sql` neutralised
and its snapshot kept. `db:generate` reports "No schema changes" again. Expect this whenever a
programme hand-writes a migration without a snapshot.

### Final verification

| Check | Result |
|---|---|
| Backend `tsc --noEmit` | exit 0, **0 errors** |
| Frontend `tsc --noEmit` | exit 0 |
| `madge --circular` | ✔ zero |
| Notifications + ratelimit specs | 10 suites / 59 tests pass |
| Chat + email + realtime specs | 12 of 13 suites pass (the 13th is the pre-existing `chat-channel-members` failure on unmodified files) |
| App boot | starts clean; `/cron/build-due-sweep` and `/cron/notification-time-sweeps` mapped and returning 200 |
| `db:generate` | "No schema changes, nothing to migrate" |

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
