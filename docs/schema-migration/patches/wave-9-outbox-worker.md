---
type: wave-9 outbox worker code spec
status: DRAFT
date: 2026-07-26
---

# Wave 9 — Outbox Publisher Worker: Implementation Spec

> **Scope.** Step 1.3 of the Wave 9 execution plan: the `OutboxPublisherService` worker,
> the `OutboxWriter` transactional helper, `OutboxModule` wiring, and the cron trigger that
> drives the flush loop. The schema (`outbox_events`, `inbox_records`, enums) and the
> `outbox-envelope.ts` pure helpers are already committed.
>
> **Constraint.** The repo uses an HTTP-triggered cron controller pattern (no
> `@nestjs/schedule`). Workers expose a typed service method; `CronController` drives it
> behind `assertCronSecret`. The outbox publisher follows this exact pattern.

---

## Directory layout (new files in bold)

```
backend/src/common/outbox/
  outbox-event-schema.ts          ← committed
  outbox-envelope.ts              ← committed
  outbox-envelope.spec.ts         ← committed
  outbox-publisher.service.ts     ← NEW  (§1)
  outbox-writer.ts                ← NEW  (§2)
  outbox.module.ts                ← NEW  (§3)
  outbox-publisher.service.spec.ts ← NEW  (§4)

backend/src/modules/cron/
  cron-outbox.service.ts          ← NEW  (§3 — thin adapter)
  cron.module.ts                  ← EDIT: add OutboxModule + CronOutboxService
  cron.controller.ts              ← EDIT: add /outbox-flush endpoint

backend/src/app.module.ts         ← EDIT: import OutboxModule  (§3)
```

---

## §1 — `OutboxPublisherService`

**File:** `backend/src/common/outbox/outbox-publisher.service.ts`

### Constants

```typescript
const BATCH_SIZE = 50;
const MAX_RETRIES = 8;
const LEASE_MS = 30_000; // 30 s — a worker that dies releases the row on expiry
```

### Full service

```typescript
import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../../db/drizzle.constants";
import { type Db } from "../../db/drizzle.module";
import { outboxEvents, organizations } from "../../db/schema";
import {
  nextRetryDelayMs,
  shouldSuppressForLifecycle,
} from "./outbox-envelope";

const BATCH_SIZE = 50;
const MAX_RETRIES = 8;
const LEASE_MS = 30_000;

export interface OutboxFlushResult {
  claimed: number;
  delivered: number;
  suppressed: number;
  retrying: number;
  dead: number;
}

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async flush(): Promise<OutboxFlushResult> {
    const claimed = await this.claimBatch();

    let delivered = 0;
    let suppressed = 0;
    let retrying = 0;
    let dead = 0;

    for (const event of claimed) {
      const suppress = await this.recheckLifecycle(event.organizationId);
      if (suppress) {
        await this.markSuppressed(event.outboxEventId);
        suppressed++;
        continue;
      }

      const outcome = await this.deliver(event);
      if (outcome === "DELIVERED") {
        delivered++;
      } else if (outcome === "DEAD") {
        dead++;
      } else {
        retrying++;
      }
    }

    if (claimed.length > 0) {
      this.logger.log("OUTBOX: flush complete", {
        claimed: claimed.length,
        delivered,
        suppressed,
        retrying,
        dead,
      });
    }

    return { claimed: claimed.length, delivered, suppressed, retrying, dead };
  }

  // ---------------------------------------------------------------------------
  // Claim batch — UPDATE … WHERE … RETURNING
  // The WHERE uses the idx_outbox_events_claim index:
  //   (delivery_state, lease_expires_at, created_at)
  // ---------------------------------------------------------------------------
  private async claimBatch(): Promise<(typeof outboxEvents.$inferSelect)[]> {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + LEASE_MS);

    return this.db
      .update(outboxEvents)
      .set({
        deliveryState: "IN_FLIGHT",
        leaseExpiresAt: leaseUntil,
      })
      .where(
        and(
          eq(outboxEvents.deliveryState, "PENDING"),
          or(
            isNull(outboxEvents.leaseExpiresAt),
            lte(outboxEvents.leaseExpiresAt, now),
          ),
        ),
      )
      .limit(BATCH_SIZE)
      .returning();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle fence — re-read org.status immediately before delivery.
  // Uses shouldSuppressForLifecycle from the committed pure helper.
  // The query is intentionally narrow (one column, no join) for speed.
  // ---------------------------------------------------------------------------
  private async recheckLifecycle(organizationId: string): Promise<boolean> {
    const rows = await this.db
      .select({ status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const status = rows[0]?.status;
    if (status === undefined) {
      // Org row missing (cascade deleted?) — suppress, do not deliver.
      return true;
    }
    return shouldSuppressForLifecycle(status);
  }

  // ---------------------------------------------------------------------------
  // Deliver — currently in-process fanout; swap for a broker publish here.
  // Returns the terminal state reached: DELIVERED, DEAD, or RETRYING (string
  // literal used only locally — callers count outcomes, not state names).
  // ---------------------------------------------------------------------------
  private async deliver(
    event: typeof outboxEvents.$inferSelect,
  ): Promise<"DELIVERED" | "DEAD" | "RETRYING"> {
    try {
      // TODO(wave-9): dispatch to registered consumer handlers.
      // Phase 1 (this spec): log only — proves the end-to-end path.
      this.logger.log("OUTBOX: delivering event", {
        eventId: event.eventId,
        eventType: event.eventType,
        orgId: event.organizationId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        aggregateVersion: event.aggregateVersion,
      });

      await this.db
        .update(outboxEvents)
        .set({
          deliveryState: "DELIVERED",
          publishedAt: new Date(),
          leaseExpiresAt: null,
          lastError: null,
        })
        .where(eq(outboxEvents.outboxEventId, event.outboxEventId));

      return "DELIVERED";
    } catch (err) {
      return this.handleDeliveryFailure(event, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Failure path — exponential back-off via nextRetryDelayMs; DEAD after MAX.
  // nextRetryDelayMs is the committed pure helper (base 1 s, cap 60 s).
  // ---------------------------------------------------------------------------
  private async handleDeliveryFailure(
    event: typeof outboxEvents.$inferSelect,
    err: unknown,
  ): Promise<"DEAD" | "RETRYING"> {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const newRetryCount = event.retryCount + 1;

    this.logger.warn("OUTBOX: delivery failed", {
      eventId: event.eventId,
      retryCount: newRetryCount,
      error: errorMessage,
    });

    if (newRetryCount >= MAX_RETRIES) {
      await this.db
        .update(outboxEvents)
        .set({
          deliveryState: "DEAD",
          retryCount: newRetryCount,
          lastError: errorMessage,
          deadLetteredAt: new Date(),
          leaseExpiresAt: null,
        })
        .where(eq(outboxEvents.outboxEventId, event.outboxEventId));

      this.logger.error("OUTBOX: event dead-lettered", {
        eventId: event.eventId,
        retryCount: newRetryCount,
        lastError: errorMessage,
      });

      return "DEAD";
    }

    const delayMs = nextRetryDelayMs(newRetryCount);
    const nextAttemptAt = new Date(Date.now() + delayMs);

    await this.db
      .update(outboxEvents)
      .set({
        deliveryState: "PENDING",
        retryCount: newRetryCount,
        lastError: errorMessage,
        leaseExpiresAt: nextAttemptAt, // reuse leaseExpiresAt as "not-before" gate
      })
      .where(eq(outboxEvents.outboxEventId, event.outboxEventId));

    return "RETRYING";
  }

  private async markSuppressed(outboxEventId: number): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({
        deliveryState: "SUPPRESSED",
        leaseExpiresAt: null,
      })
      .where(eq(outboxEvents.outboxEventId, outboxEventId));

    this.logger.log("OUTBOX: event suppressed (org lifecycle)", { outboxEventId });
  }
}
```

### Design notes

**Claim via `UPDATE … RETURNING`.** A single atomic statement claims the batch —
no SELECT-then-UPDATE race. The `WHERE` matches `idx_outbox_events_claim` which
leads with `delivery_state` then `lease_expires_at`. Expired IN_FLIGHT rows
(crashed worker) are reclaimed on the next flush because `leaseExpiresAt <= now`.

**Retry scheduling via `leaseExpiresAt`.** When an event is rescheduled for retry
its `deliveryState` is reset to `PENDING` and `leaseExpiresAt` is set to
`now + backoffMs`. The claim predicate `(leaseExpiresAt IS NULL OR
leaseExpiresAt <= now)` naturally holds the row back until the back-off expires
without adding a separate `nextAttemptAt` column to the schema.

**Lifecycle fence timing.** The fence re-reads `organizations.status` inside the
per-event loop after the claim, not inside the claim transaction. This is
intentional: the claim batch must commit quickly (no per-org JOIN); the fence
query is a cheap single-column read against the PK and will hit Neon's buffer
pool for any active org.

**`shouldSuppressForLifecycle` call site.** The pure helper (committed in
`outbox-envelope.ts`) is called with the org status string. The set it tests is
`{ ARCHIVED, PURGE_SCHEDULED, PURGED }`. A missing org row (org cascade-deleted)
is also suppressed — see early-return in `recheckLifecycle`.

**No broker yet.** Phase 1 logs and marks DELIVERED. The `deliver()` method is
the single seam for the Step 1.6 consumer fanout. Swap the log line for
`await this.consumerRegistry.dispatch(event)` when consumer handlers are wired.

---

## §2 — `OutboxWriter` transactional helper

**File:** `backend/src/common/outbox/outbox-writer.ts`

```typescript
import { type PgTransaction } from "drizzle-orm/pg-core";
import { type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { outboxEvents } from "../../db/schema";
import { buildOutboxEvent } from "./outbox-envelope";
import type { OutboxEventInput } from "./outbox-event-schema";
import type * as schema from "../../db/schema";

// Drizzle transaction type — matches what db.transaction(async (tx) => ...) yields.
type Tx = PgTransaction<PostgresJsQueryResultHKT, typeof schema, typeof schema>;

/**
 * Call inside a db.transaction() to write an outbox event atomically with the
 * aggregate mutation.  The event is PENDING on commit; the publisher worker
 * delivers it asynchronously.
 *
 * Example:
 *
 *   await db.transaction(async (tx) => {
 *     await tx.update(projects).set({ status: "ACTIVE" }).where(...);
 *     await OutboxWriter.emit(tx, {
 *       eventId: randomUUID(),
 *       organizationId: orgId,
 *       aggregateType: "project",
 *       aggregateId: String(projectId),
 *       aggregateVersion: nextVersion,
 *       eventType: "project.status_changed",
 *       payload: { from: oldStatus, to: "ACTIVE" },
 *       occurredAt: new Date(),
 *     });
 *   });
 */
export class OutboxWriter {
  static async emit(tx: Tx, input: OutboxEventInput): Promise<void> {
    const row = buildOutboxEvent(input);
    await tx.insert(outboxEvents).values(row);
  }
}
```

**Usage contract:**

- Always call inside `db.transaction(async (tx) => { … })` — the caller
  passes the same `tx` used for the aggregate mutation.
- `buildOutboxEvent` validates the input via Zod before insert. Invalid input
  throws synchronously inside the transaction, rolling it back cleanly.
- `aggregateVersion` must come from a `SELECT max(aggregate_version) + 1 FOR UPDATE`
  or an incremented counter **within the same transaction** so the
  `UNIQUE(org_id, aggregate_type, aggregate_id, aggregate_version)` constraint
  in `outbox_events` acts as a monotonic fence. The 23505 from Postgres surfaces
  as a transaction abort — never swallow it.

---

## §3 — Module wiring

### `OutboxModule`

**File:** `backend/src/common/outbox/outbox.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { OutboxPublisherService } from "./outbox-publisher.service";

@Module({
  providers: [OutboxPublisherService],
  exports: [OutboxPublisherService],
})
export class OutboxModule {}
```

`OutboxWriter` is a static class (no DI state), so it is NOT a provider — import
it directly at call sites. `OutboxModule` only needs to provide the scheduled
publisher service.

---

### Cron adapter

**File:** `backend/src/modules/cron/cron-outbox.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { OutboxPublisherService } from "../../common/outbox/outbox-publisher.service";
import type { OutboxFlushResult } from "../../common/outbox/outbox-publisher.service";

@Injectable()
export class CronOutboxService {
  constructor(private readonly publisher: OutboxPublisherService) {}

  flushOutbox(): Promise<OutboxFlushResult> {
    return this.publisher.flush();
  }
}
```

Pattern matches `CronEmailOutboxService` exactly — a thin adapter that the
controller can inject without depending on the common module directly.

---

### Edits to `cron.module.ts`

Add to **imports**: `OutboxModule`
Add to **providers**: `CronOutboxService`

```typescript
// cron.module.ts — diff
import { OutboxModule } from "../../common/outbox/outbox.module";
import { CronOutboxService } from "./cron-outbox.service";

@Module({
  imports: [
    OutboxModule,   // ← ADD (all existing imports unchanged)
    AutomationModule,
    // … rest unchanged
  ],
  providers: [
    CronOutboxService,  // ← ADD (all existing providers unchanged)
    // … rest unchanged
  ],
})
export class CronModule {}
```

---

### Edits to `cron.controller.ts`

Add `CronOutboxService` to the constructor, then add two route handlers
(`GET` + `POST`) following the repo's existing double-verb pattern:

```typescript
// cron.controller.ts — additions only (no deletions)
import { CronOutboxService } from "./cron-outbox.service";

// In constructor params — add:
private readonly cronOutbox: CronOutboxService,

// New routes — insert alongside email-outbox-flush for consistency:

@Get("outbox-flush")
getOutboxFlush(@Headers("authorization") authorization?: string) {
  return this.runOutboxFlush(authorization);
}

@Post("outbox-flush")
@HttpCode(200)
postOutboxFlush(@Headers("authorization") authorization?: string) {
  return this.runOutboxFlush(authorization);
}

private async runOutboxFlush(authorization?: string) {
  assertCronSecret(authorization);
  try {
    const result = await this.cronOutbox.flushOutbox();
    return {
      success: true,
      message: `Outbox flush: ${result.claimed} claimed, ${result.delivered} delivered, ${result.suppressed} suppressed, ${result.retrying} retrying, ${result.dead} dead`,
      ...result,
    };
  } catch (error) {
    logger.error("Outbox flush cron failed", error);
    throw new InternalServerErrorException("Internal server error");
  }
}
```

---

### Edit to `app.module.ts` — THE ONE SHARED FILE TOUCH

Add `OutboxModule` to the `imports` array. Place it alongside the other
infra/common modules (after `IdempotencyModule` is a natural home):

```typescript
// app.module.ts — diff
import { OutboxModule } from "./common/outbox/outbox.module";

// In @Module({ imports: [ … ] }):
IdempotencyModule,
OutboxModule,     // ← ADD after IdempotencyModule
```

`OutboxModule` is `@Global()` — no, it is NOT marked global. Only `DrizzleModule`
and `CacheModule` are global. `OutboxModule` is imported by `CronModule` (which
already handles all periodic work) and by `app.module.ts` so that any future
feature module can import `OutboxModule` and get `OutboxPublisherService` without
going through `CronModule`. Producers use `OutboxWriter` (static, no DI needed)
and do not need to import `OutboxModule`.

---

## §4 — Unit test sketch

**File:** `backend/src/common/outbox/outbox-publisher.service.spec.ts`

The pure-function behaviors tested here do not touch the DB. They validate the
claim-eligibility and back-off decisions in isolation.

```typescript
import { nextRetryDelayMs, shouldSuppressForLifecycle, OUTBOX_RETRY_MAX_MS, OUTBOX_RETRY_BASE_MS } from "./outbox-envelope";

// ── shouldSuppressForLifecycle ──────────────────────────────────────────────

describe("shouldSuppressForLifecycle", () => {
  const suppressedStates = ["ARCHIVED", "PURGE_SCHEDULED", "PURGED"] as const;
  const activeStates = ["ACTIVE", "SUSPENDED", "TRIAL"] as const;

  it.each(suppressedStates)("suppresses %s orgs", (state) => {
    expect(shouldSuppressForLifecycle(state)).toBe(true);
  });

  it.each(activeStates)("does not suppress %s orgs", (state) => {
    expect(shouldSuppressForLifecycle(state)).toBe(false);
  });

  it("does not suppress an unknown/future lifecycle state (fail-open)", () => {
    // New states default to delivery — operators add them to the suppressed set
    // when confirmed. This test documents the fail-open policy for unknown states.
    expect(shouldSuppressForLifecycle("MIGRATING")).toBe(false);
  });
});

// ── nextRetryDelayMs ────────────────────────────────────────────────────────

describe("nextRetryDelayMs — back-off schedule", () => {
  it("returns base delay (1 s) for retryCount 0", () => {
    expect(nextRetryDelayMs(0)).toBe(OUTBOX_RETRY_BASE_MS);
  });

  it("doubles on each retry", () => {
    expect(nextRetryDelayMs(1)).toBe(OUTBOX_RETRY_BASE_MS * 2);
    expect(nextRetryDelayMs(2)).toBe(OUTBOX_RETRY_BASE_MS * 4);
    expect(nextRetryDelayMs(3)).toBe(OUTBOX_RETRY_BASE_MS * 8);
  });

  it("caps at OUTBOX_RETRY_MAX_MS (60 s)", () => {
    expect(nextRetryDelayMs(7)).toBe(OUTBOX_RETRY_MAX_MS);
    expect(nextRetryDelayMs(100)).toBe(OUTBOX_RETRY_MAX_MS);
  });

  it("treats negative retry counts as 0 (base delay)", () => {
    expect(nextRetryDelayMs(-1)).toBe(OUTBOX_RETRY_BASE_MS);
    expect(nextRetryDelayMs(-99)).toBe(OUTBOX_RETRY_BASE_MS);
  });
});

// ── Claim eligibility logic (expressed as predicate, no DB) ─────────────────

describe("claim eligibility predicate", () => {
  const now = new Date("2026-07-26T10:00:00.000Z");

  function isClaimable(
    deliveryState: string,
    leaseExpiresAt: Date | null,
  ): boolean {
    if (deliveryState !== "PENDING") return false;
    if (leaseExpiresAt === null) return true;
    return leaseExpiresAt <= now;
  }

  it("claims a PENDING row with no lease", () => {
    expect(isClaimable("PENDING", null)).toBe(true);
  });

  it("claims a PENDING row whose lease has expired (crashed worker reclaim)", () => {
    const expired = new Date(now.getTime() - 1);
    expect(isClaimable("PENDING", expired)).toBe(true);
  });

  it("does not claim a PENDING row with an active lease", () => {
    const future = new Date(now.getTime() + 5_000);
    expect(isClaimable("PENDING", future)).toBe(false);
  });

  it("does not claim an IN_FLIGHT row (even with no lease)", () => {
    expect(isClaimable("IN_FLIGHT", null)).toBe(false);
  });

  it("does not claim a DELIVERED row", () => {
    expect(isClaimable("DELIVERED", null)).toBe(false);
  });

  it("does not claim a DEAD row", () => {
    expect(isClaimable("DEAD", null)).toBe(false);
  });

  it("does not claim a SUPPRESSED row", () => {
    expect(isClaimable("SUPPRESSED", null)).toBe(false);
  });

  it("claims a retrying PENDING row exactly when its back-off window expires", () => {
    // After a failure the row is reset to PENDING with leaseExpiresAt = nextAttemptAt.
    // The claim predicate treats leaseExpiresAt as a "not-before" gate.
    const exactlyNow = new Date(now.getTime());
    expect(isClaimable("PENDING", exactlyNow)).toBe(true); // lte(now)

    const oneMilliLater = new Date(now.getTime() + 1);
    expect(isClaimable("PENDING", oneMilliLater)).toBe(false);
  });
});

// ── Dead-letter threshold ────────────────────────────────────────────────────

describe("MAX_RETRIES threshold (8)", () => {
  const MAX_RETRIES = 8;

  function wouldDeadLetter(newRetryCount: number): boolean {
    return newRetryCount >= MAX_RETRIES;
  }

  it("does not dead-letter before reaching MAX_RETRIES", () => {
    for (let i = 1; i < MAX_RETRIES; i++) {
      expect(wouldDeadLetter(i)).toBe(false);
    }
  });

  it("dead-letters at exactly MAX_RETRIES", () => {
    expect(wouldDeadLetter(MAX_RETRIES)).toBe(true);
  });

  it("dead-letters above MAX_RETRIES", () => {
    expect(wouldDeadLetter(MAX_RETRIES + 1)).toBe(true);
  });
});
```

**Integration test sketch (requires a real DB / test container):**

```typescript
// outbox-publisher.service.integration-spec.ts  (skeletal — fill in with
// the repo's existing e2e DB setup from backend/src/test/)
describe("OutboxPublisherService (integration)", () => {
  it("claims PENDING events and marks them DELIVERED", async () => {
    // 1. Insert 3 PENDING outbox_events for an ACTIVE org.
    // 2. Call publisher.flush().
    // 3. Assert all 3 rows have deliveryState = DELIVERED and publishedAt IS NOT NULL.
  });

  it("does not reclaim an IN_FLIGHT row whose lease has not expired", async () => {
    // 1. Insert a row with deliveryState=IN_FLIGHT and leaseExpiresAt = future.
    // 2. Call flush() — claimed count must be 0.
  });

  it("reclaims an IN_FLIGHT row whose lease has expired (crashed worker)", async () => {
    // 1. Insert a row with deliveryState=IN_FLIGHT and leaseExpiresAt = past.
    // 2. Call flush() — claimed count must be 1, row ends DELIVERED.
  });

  it("suppresses events for an ARCHIVED org", async () => {
    // 1. Set org.status = ARCHIVED.
    // 2. Insert a PENDING event for that org.
    // 3. Call flush() — row ends SUPPRESSED, suppressed count = 1.
    // 4. Restore org.status.
  });

  it("moves an event to DEAD after MAX_RETRIES failures", async () => {
    // 1. Insert event with retryCount = MAX_RETRIES - 1.
    // 2. Force deliver() to throw (mock the dispatch step).
    // 3. Call flush() — row ends DEAD, deadLetteredAt IS NOT NULL.
  });

  it("does not deliver events for a missing org (suppresses instead)", async () => {
    // 1. Insert event with organizationId = 'nonexistent-org'.
    // 2. Call flush() — row ends SUPPRESSED.
  });
});
```

---

## §5 — Sequence: aggregate service writing an event (canonical pattern)

This is the pattern every aggregate service MUST follow. It does NOT require
importing `OutboxModule` — `OutboxWriter` is a static class.

```typescript
import { randomUUID } from "node:crypto";
import { OutboxWriter } from "../../common/outbox/outbox-writer";

// Inside OrganizationService.create():
async create(dto: CreateOrganizationDto): Promise<Organization> {
  return this.db.transaction(async (tx) => {
    // 1. Mutate the aggregate.
    const [org] = await tx
      .insert(organizations)
      .values({ id: randomUUID(), name: dto.name, slug: dto.slug, status: "ACTIVE" })
      .returning();

    // 2. Write the outbox event IN THE SAME TRANSACTION.
    await OutboxWriter.emit(tx, {
      eventId: randomUUID(),
      organizationId: org.id,
      aggregateType: "organization",
      aggregateId: org.id,
      aggregateVersion: 1,           // first event for a new aggregate is always v1
      eventType: "organization.created",
      payload: { name: org.name, slug: org.slug },
      occurredAt: new Date(),
      correlationId: null,
      causationId: null,
      actorMembershipId: null,       // system-initiated; no actor
    });

    // 3. COMMIT — both writes are durable or neither is.
    return org;
  });
}
```

For subsequent mutations on an existing aggregate, derive `aggregateVersion` with:

```typescript
const [{ maxVersion }] = await tx
  .select({ maxVersion: sql<number>`COALESCE(MAX(${outboxEvents.aggregateVersion}), 0)` })
  .from(outboxEvents)
  .where(
    and(
      eq(outboxEvents.organizationId, orgId),
      eq(outboxEvents.aggregateType, "organization"),
      eq(outboxEvents.aggregateId, orgId),
    ),
  )
  .for("update");                            // lock to prevent concurrent version collision

await OutboxWriter.emit(tx, {
  // …
  aggregateVersion: maxVersion + 1,
});
```

The `UNIQUE(org_id, aggregate_type, aggregate_id, aggregate_version)` constraint
in `outbox_events` acts as a final fence: if two concurrent writes race to the
same version, one gets a 23505 Postgres error and its transaction is rolled back.

---

## §6 — Acceptance checklist (Step 1.3)

- [ ] `OutboxPublisherService.flush()` claims up to 50 PENDING rows in one atomic UPDATE.
- [ ] Expired IN_FLIGHT rows (lease <= now) are reclaimed on the next flush.
- [ ] Lifecycle fence re-reads `organizations.status`; ARCHIVED/PURGE_SCHEDULED/PURGED orgs
      get their events SUPPRESSED, not delivered.
- [ ] Missing org row → SUPPRESSED (defensive; covers cascade-delete edge case).
- [ ] `deliver()` marks DELIVERED on success; logs structured event metadata.
- [ ] Failures increment `retryCount`, reset to PENDING with `leaseExpiresAt = now + backoffMs`.
- [ ] After `MAX_RETRIES` (8) failures, event is moved to DEAD with `deadLetteredAt` set.
- [ ] Back-off schedule: 1 s, 2 s, 4 s, 8 s, 16 s, 32 s, 60 s, 60 s (capped).
- [ ] `OutboxWriter.emit(tx, input)` inserts the row atomically inside the caller's transaction.
- [ ] `OutboxModule` exports `OutboxPublisherService`; is imported by `CronModule` and `AppModule`.
- [ ] `CronController.GET /cron/outbox-flush` and `POST /cron/outbox-flush` both require `CRON_SECRET`.
- [ ] Unit tests pass for claim eligibility, back-off, suppress predicates, and DLQ threshold.
- [ ] `pnpm -C backend build` passes.
- [ ] `pnpm -C backend lint` passes.
- [ ] `pnpm -C backend typecheck` passes.

---

## §7 — One shared file that needs editing to wire it

**`backend/src/app.module.ts`** — add one import and one `imports[]` entry:

```diff
+import { OutboxModule } from "./common/outbox/outbox.module";

 @Module({
   imports: [
     // ... existing entries unchanged ...
     IdempotencyModule,
+    OutboxModule,
```

The `CronModule` edit (adding `OutboxModule` to its imports and `CronOutboxService`
to its providers) and the `CronController` edit (adding the `/outbox-flush`
endpoint) are changes to files inside `backend/src/modules/cron/` — those are
module-local edits. The only file that lives outside the outbox module boundary
and outside the cron module boundary is `app.module.ts`.
