# FD5 — quota admission atomicity and the quota-alert write

> Reference only. Execute [the single completion plan](../../completion-plan.md); historical verdicts below do not assign work or certify current release readiness.
> The earlier MEDIUM/not-release-blocker wording is not an approved waiver. FD5 owns current quota/alert repair and fault-injection acceptance; CRM/Inventory remain out of scope.

Source audit 2026-09-12 against the current working tree. **Source-level, not runtime-proved**
— no fault injection was run, because another session holds this environment. Every claim
below is anchored to code; none is a measured failure.

FD5's bar is "fault-injection checks cannot widen tenant/record access or replay money."
Nothing here widens tenant access. Two findings sit on the money/entitlement side.

## PASS — the seat invariant is genuinely serialized

`backend/CLAUDE.md` §5 requires the per-org `quota:${orgId}:members` advisory lock held
across the seat check and the membership insert. It is:

`modules/billing/core/seat-definition.ts` exports `lockMembersQuota(orgId)` →
`pg_advisory_xact_lock(hashtextextended('quota:<org>:members', 0))`, and it is imported and
taken by every writer on the path:

```
modules/organization/core/invitation-create.service.ts
modules/organization/core/invitation-acceptance.service.ts
modules/organization/core/invitation-lifecycle.service.ts
modules/organization/core/membership-admission.service.ts
modules/billing/core/seat-ledger.service.ts
```

`seatCount(orgId)` counts members plus live pending invitations in **one** SQL, so a seat
reserved by an unaccepted invitation cannot be double-sold. This is the money-critical path
and it holds.

## MEDIUM — every other plan limit is check-then-act

`assertWithinLimit` takes an optional `executor`, but it acquires no lock of its own. The
repo already states the consequence, in `seat-definition.ts`:

> `assertWithinLimit` is check-then-act on its own: N concurrent creates at the ceiling all
> read the same `used` and all succeed.

Outside the members path, only `modules/chat/chat-channels.service.ts` uses `lockQuota` and
passes `tx`. Every other call site checks with **no lock and no transaction**, then writes in
a separate transaction afterwards. The clearest instance:

```
modules/build/core/projects-provision.service.ts:35   await this.planLimits.assertWithinLimit(orgId, "projects");
modules/build/core/projects-provision.service.ts:46   const project = await this.db.transaction(async (tx) => { … });
```

The check is not in the transaction that inserts, which `backend/CLAUDE.md` §5 calls
insufficient in as many words. Same shape at `contacts.service.ts:61,103`,
`deals-crud.service.ts:80,315`, `deals-import-export.service.ts:24`,
`sign-envelopes.service.ts:69`, `sign-templates.service.ts:126`,
`projects-templates.service.ts:138`, `projects-automations.service.ts:67`,
`automation.service.ts:222`, `crm-automations.service.ts:33`,
`recruitment-jobs.service.ts:90`, `invoices-write.service.ts:48`,
`so-lifecycle.service.ts:145`.

Effect: concurrent creates at a FREE-plan ceiling can all pass and overshoot the limit. This
is entitlement overshoot, not a tenant-isolation or payment-replay defect, which is why it is
MEDIUM and not a release blocker. The repair is the established pattern, not a new one — take
`lockQuota(orgId, key)` inside the write transaction and pass that `tx` to
`assertWithinLimit`, exactly as `chat-channels.service.ts` already does.

Some call sites pass `tx` but take no lock (`careers.service.ts:91`,
`recruitment-candidate-ops.service.ts:96,123`). Passing the transaction alone does **not**
serialize — the lock is what does.

## MEDIUM — a quota alert can be marked sent without ever being written

`assertWithinLimit` ends with a fire-and-forget:

```
plan-limits.service.ts:257   void this.maybeAlertQuota(orgId, key, used + increment, limit).catch(…)
```

`maybeAlertQuota` does real database work — `findOrgOwnerForAlert(orgId)` reads, and
`this.notifications.create({…})` writes. Two problems follow.

**1. It is the documented dead-transaction shape.** `backend/CLAUDE.md` §4 records that a
`void something(...)` keeps the request's AsyncLocalStorage transaction context after the
handler returns, when the transaction has already committed and the GUC is gone, so the write
dies `42501` — the bug class that produced zero `notifications` rows platform-wide across
~50 call sites. Here the outcome is timing-dependent rather than certain, because
`assertWithinLimit` runs early in the request, so the alert often resolves while the request
transaction is still open. It is a race, not a guaranteed failure, and the `.catch()` demotes
it to a `logger.warn` — which is exactly how the previous instance of this class stayed
invisible.

**2. The dedup key is set outside the transaction that writes the notification.**

```
const alreadySent = await this.cache.get<boolean>(dedupKey);   // billing:quota-alert:<org>:<key>:<pct>
…
await this.notifications.create({ … });
await this.cache.set(dedupKey, true, QUOTA_ALERT_TTL_SECONDS);
```

If `notifications.create` participates in the request transaction and that request later
rolls back, the notification row disappears but the Redis dedup key survives — the alert is
recorded as sent and will not be retried until `QUOTA_ALERT_TTL_SECONDS` expires. That is a
cache standing in for a one-time delivery proof, which is the specific thing FD5 says not to
do. The 80% and 100% quota warnings are the ones lost.

Repair shape: emit the alert through the durable outbox (`OutboxWriter.emit(tx, …)`) or
`registerAfterCommit`, and derive "already sent" from committed state rather than from a
Redis key written independently of the commit.

## Correction to the existing audit

the superseded source audit §3.3 gives the tier cache key as
`billing:plan-tier:${orgId}`. The actual key is **`billing:tier:${orgId}`**
(`PlanLimitsService.tierCacheKey`). `bust(orgId)` invalidates that key **and**
`billing:entitlements:${orgId}` together, and it has five writers, two of which are cron
paths the audit did not list:

```
billing/core/billing-payment-activation.ts:414
billing/core/billing-payment-state.ts:149
billing/core/enterprise-quotes.service.ts:174
cron/cron-billing-suspension.ts:55
cron/cron-billing.service.ts:141
```

So downgrade and suspension do bust the admission tier. The residual is unchanged and already
recorded: a crash between commit and `bust()` leaves a stale tier for up to 30 s and stale
entitlements for up to 60 s.

## What this does not establish

- No fault was injected. Redis was not stopped, no write was rolled back under observation,
  and no concurrent-create race was executed. These are code-path findings.
- The quota-alert race is timing-dependent; it needs a runtime reproduction before anyone
  claims alerts are actually being lost in production.
- Nothing here was changed. The seat path was verified, not modified.
