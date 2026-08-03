---
wave: 9
type: infra + retirement execution plan
status: DRAFT
date: 2026-07-26
owner: platform-engineering
prereqs: Wave 0 RLS matrix approved; Wave 4 composite-FK matrix validated; Wave 8 UX shipped
---

# Wave 9 — Infrastructure Hardening + Contract Retirement: Execution Plan

> **Scope.** Six independent but sequentially-constrained workstreams:
> 1. Domain-event outbox/inbox (greenfield)
> 2. `email_outbox` org-scoping (additive migration)
> 3. Idempotency coverage expansion (opt-in decorator rollout)
> 4. Portal auth runtime (guard + JWT flow, schema already landed)
> 5. RLS rollout to completion (shadow → ENABLE → FORCE)
> 6. Retirement telemetry and contract gates
>
> **Dependency order:** Steps 4.x (portal auth) and 5.x (RLS) may proceed in parallel.
> Steps 1.x (outbox/inbox) are fully independent and may proceed first.
> Steps 3.x (idempotency expansion) depend on nothing and may be threaded through any release.
> Step 6 (retirement telemetry) is a long-running parallel overlay, not a blocker for 1–5.
>
> **Rollback philosophy:** every step is additive-first. Recovery = forward repair; destructive
> down-migrations are not the primary rollback. Every step has an explicit rollback action.

---

## Verified Current State (as of 2026-07-26)

| Item | Actual state |
|------|-------------|
| `command_fences` table | EXISTS — schema at `backend/src/db/schema/idempotency.ts`; keyed `(org_id, audience, idempotency_key)`; has UNIQUE + expiry index; SQL migration at `docs/schema-migration/wave-hardening-idempotency.sql` |
| `IdempotencyInterceptor` | EXISTS — `backend/src/common/idempotency/idempotency.interceptor.ts`; full claim/replay/fail/reclaim logic |
| `@Idempotent` usages | **4 only** — `organization.create`, `organization.transferOwnership`, `portal.createMembership`, `portal.createGrant` |
| Expiry sweep cron | MISSING — no scheduled job deletes `WHERE expires_at < now()` |
| `email_outbox` table | EXISTS — `backend/src/db/schema/email.ts`; has `status`, retry backoff, `nextAttemptAt`; **NO `org_id` column** |
| `EmailOutboxService` | EXISTS — full retry loop with exponential backoff and DLQ; no lifecycle fence for archived orgs |
| General-purpose outbox | MISSING — only email delivery queue + payroll journal outbox exist; no `outbox_events` table |
| `portal_memberships` | EXISTS — `backend/src/db/schema/portal-access/portal-memberships.ts`; has `audience` enum, `sessionEpoch`, composite FK to `party_contacts` |
| `portal_invitations` | EXISTS — composite FK to `party_contacts`, hashed `tokenHash`, partial unique on pending |
| `project_client_grants` | EXISTS — field-level allowlist booleans, composite FK through portal membership |
| Portal controller | EXISTS — `backend/src/modules/portal-access/portal-access.controller.ts`; uses **internal `JwtAuthGuard`** — no `PortalJwtAuthGuard`; no audience claim |
| Portal JWT audience | MISSING — `BackendClaims` has no `aud` field; no `PortalJwtAuthGuard`; no `InternalJwtAuthGuard` audience check |
| Portal session namespace | MISSING — portal sessions share the same Redis namespace as internal sessions |
| Portal frontend shell | MISSING — portal routes live inside `(authenticated)/projects/portal/` under `DashboardShell` |
| RLS helper functions | DOCUMENTED in `wave-0-rls-matrix.md` / `wave-10-rls-matrix.md`; not yet deployed to Neon |
| RLS policies | MISSING on all tenant tables — no `ENABLE ROW LEVEL SECURITY` confirmed |
| Neon pooler test | MISSING — required Wave 0 exit gate; transaction-locality of GUCs under actual pooler not yet proven |
| Feature-flag table | EXISTS — `backend/src/db/schema/feature-flags.ts`; `org_overrides` JSONB; uses global `users.id` FK (no `org_id` scoping on the table) |
| Deprecation headers | MISSING — no `Sunset` / `Deprecation` response headers on legacy endpoints |

---

## Step 1 — Domain-Event Outbox / Inbox

**Goal:** a tenant-scoped transactional outbox so every aggregate mutation that requires an
asynchronous consequence (integration sync, webhook delivery, PM provisioning, access
invalidation, audit fanout) writes its domain event atomically in the same DB transaction.
The email delivery queue remains a specialized consumer of this outbox — not a replacement.

### 1.1 — Schema: `outbox_events`

**Migration sketch** (generate via Drizzle, apply to Neon branch first):

```typescript
// backend/src/db/schema/outbox-events.ts
export const outboxEvents = pgTable(
  "outbox_events",
  {
    outboxEventId: bigint("outbox_event_id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    // Immutable stable identifier for this event (UUID, client-generated before INSERT)
    eventId: text("event_id").notNull(),
    organizationId: text("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    // Bounded-context aggregate identity
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    // Monotonic version within (org, aggregate_type, aggregate_id)
    aggregateVersion: bigint("aggregate_version", { mode: "number" }).notNull(),
    // Schema version for consumer evolution
    schemaVersion: integer("schema_version").notNull().default(1),
    // Causation chain
    causationId: text("causation_id"),   // event_id of the causing event
    correlationId: text("correlation_id"), // root causal event_id for a saga
    // Actor metadata
    actorMembershipId: text("actor_membership_id"),
    audience: text("audience").notNull().default("INTERNAL"),
    // Lifecycle fence — SUSPEND/ARCHIVE blocks delivery before send
    lifecycleState: text("lifecycle_state").notNull().default("ACTIVE"),
    // Delivery tracking
    deliveryState: outboxDeliveryStateEnum("delivery_state").notNull().default("PENDING"),
    payload: jsonb("payload").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    publishedAt: timestamp("published_at"),
    leaseExpiresAt: timestamp("lease_expires_at"),
    retryCount: integer("retry_count").notNull().default(0),
    lastError: text("last_error"),
    deadLetteredAt: timestamp("dead_lettered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // CRITICAL: event dedup — exactly once semantics
    uniqueIndex("uniq_outbox_events_event_id").on(t.eventId),
    // CRITICAL: monotonic per-aggregate — prevents publishing stale older version after newer committed
    uniqueIndex("uniq_outbox_events_org_agg_version")
      .on(t.organizationId, t.aggregateType, t.aggregateId, t.aggregateVersion),
    // Publisher claim index
    index("idx_outbox_events_claim")
      .on(t.deliveryState, t.leaseExpiresAt, t.createdAt),
    // Per-org queries (DLQ UI, replay)
    index("idx_outbox_events_org_state")
      .on(t.organizationId, t.deliveryState, t.occurredAt),
  ],
);

export const outboxDeliveryStateEnum = pgEnum("outbox_delivery_state", [
  "PENDING",      // waiting to be claimed by publisher
  "IN_FLIGHT",    // claimed by a publisher worker (lease active)
  "DELIVERED",    // published to broker or handled by all consumers
  "DEAD",         // exceeded retry limit; in DLQ
  "SUPPRESSED",   // org archived/suspended — not delivered, retained
]);
```

**Gate:** apply on a Neon branch; `pnpm -C backend db:generate && db:migrate`; verify counts on branch mirror.

**Rollback:** `DROP TABLE IF EXISTS outbox_events; DROP TYPE IF EXISTS outbox_delivery_state;`

### 1.2 — Schema: `inbox_records` (consumer dedup)

```typescript
// backend/src/db/schema/inbox-records.ts
export const inboxRecords = pgTable(
  "inbox_records",
  {
    inboxRecordId: bigint("inbox_record_id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    // Producer-originated event ID (from outbox_events.event_id)
    producerEventId: text("producer_event_id").notNull(),
    consumerName: text("consumer_name").notNull(), // e.g. "email.welcome", "webhook.org.created"
    organizationId: text("organization_id").notNull(),
    // Version at time of application (for monotonic enforcement)
    aggregateVersion: bigint("aggregate_version", { mode: "number" }).notNull(),
    // Outcome tracking
    status: text("status").notNull().default("PENDING"), // PENDING | COMPLETED | FAILED | SKIPPED
    processedAt: timestamp("processed_at"),
    lastError: text("last_error"),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // CRITICAL: one completion record per (event, consumer) — idempotency fence for consumers
    uniqueIndex("uniq_inbox_consumer_event")
      .on(t.producerEventId, t.consumerName),
    index("idx_inbox_org_status").on(t.organizationId, t.status),
  ],
);
```

**Rollback:** `DROP TABLE IF EXISTS inbox_records;`

### 1.3 — Publisher Worker

**File:** `backend/src/common/outbox/outbox-publisher.service.ts`

```typescript
// Pseudocode — implement as a NestJS @Injectable() scheduled with @nestjs/schedule
async claimAndPublish(): Promise<void> {
  const now = new Date();
  const batchSize = 50;

  // Claim available rows — optimistic lease via UPDATE ... WHERE ... RETURNING
  const claimed = await this.db.transaction(async (tx) => {
    return tx
      .update(outboxEvents)
      .set({
        deliveryState: "IN_FLIGHT",
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      })
      .where(
        and(
          eq(outboxEvents.deliveryState, "PENDING"),
          or(
            isNull(outboxEvents.leaseExpiresAt),
            lte(outboxEvents.leaseExpiresAt, now), // expired lease reclaim
          ),
        ),
      )
      .limit(batchSize)
      .returning();
  });

  for (const event of claimed) {
    // Lifecycle fence: recheck org state immediately before delivery
    const org = await this.orgService.getLifecycleState(event.organizationId);
    if (org.status === "ARCHIVED" || org.status === "PURGED") {
      await this.suppress(event.outboxEventId);
      continue;
    }
    await this.deliverWithRetry(event);
  }
}

// deliverWithRetry: exponential backoff with jitter; move to DEAD after MAX_RETRIES
// suppress: set deliveryState = "SUPPRESSED", no delivery attempted
// Replay: admin endpoint sets deliveryState = "PENDING", clears leaseExpiresAt + deadLetteredAt
```

**Scheduling:** `@Cron("*/5 * * * * *")` (every 5 seconds); per-org concurrency cap via Redis distributed lock `outbox:lock:<orgId>`.

**Gate:** publisher emits structured logs per event (event_id, org_id, aggregate_type, latency). Alert on DLQ depth > 100 per org.

**Rollback:** disable `@Cron` via feature flag; rows remain in `PENDING`.

### 1.4 — Sequence events correctly from aggregate services

Pattern every aggregate service MUST follow for async consequences:

```typescript
// Inside db.transaction(async (tx) => { ... })
// 1. Mutate the aggregate
await tx.update(projects).set({ status: "ACTIVE" }).where(...);
// 2. Write outbox event IN THE SAME TRANSACTION
const eventId = randomUUID();
await tx.insert(outboxEvents).values({
  eventId,
  organizationId: orgId,
  aggregateType: "project",
  aggregateId: String(projectId),
  aggregateVersion: nextVersion, // atomically incremented in the same txn
  eventType: "project.status_changed",
  audience: "INTERNAL",
  actorMembershipId: actorMembershipId,
  correlationId: correlationId ?? eventId,
  payload: { from: oldStatus, to: "ACTIVE" },
  occurredAt: new Date(),
});
// 3. COMMIT — both writes are durable or neither is
```

**Monotonic version enforcement:** `aggregateVersion` must come from a sequence or `SELECT max(aggregate_version) + 1 FOR UPDATE` within the transaction. The `UNIQUE(org_id, aggregate_type, aggregate_id, aggregate_version)` constraint prevents a duplicate version from committing.

### 1.5 — Consumer inbox pattern

```typescript
// Every async consumer handler wraps its work like this:
async handleEvent(event: OutboxEvent): Promise<void> {
  await this.db.transaction(async (tx) => {
    // Inbox dedup: INSERT OR IGNORE
    const inserted = await tx
      .insert(inboxRecords)
      .values({
        producerEventId: event.eventId,
        consumerName: this.consumerName,
        organizationId: event.organizationId,
        aggregateVersion: event.aggregateVersion,
        status: "PENDING",
      })
      .onConflictDoNothing()
      .returning();

    // Already processed — idempotent skip
    if (!inserted.length) return;

    // Monotonic version check: reject stale events
    const latest = await tx
      .select({ version: inboxRecords.aggregateVersion })
      .from(inboxRecords)
      .where(
        and(
          eq(inboxRecords.consumerName, this.consumerName),
          eq(inboxRecords.producerEventId, event.eventId), // already the latest row
        ),
      )
      .limit(1);
    // (version check logic per domain)

    // Perform the side effect
    await this.performSideEffect(tx, event);

    // Mark completed
    await tx
      .update(inboxRecords)
      .set({ status: "COMPLETED", processedAt: new Date() })
      .where(eq(inboxRecords.producerEventId, event.eventId));
  });
}
```

**Gate:** inbox record `COMPLETED` count matches publisher `DELIVERED` count within reconciliation window. Alert on `FAILED` inbox records.

### 1.6 — Wave 1 outbox rollout: first consumer (org lifecycle events)

Ship the outbox infrastructure with one real consumer: organization lifecycle events (`org.created`, `org.archived`, `org.restored`). This proves the end-to-end path with low risk. Email delivery remains separate until Step 2.

**Acceptance criteria for Step 1:**
- [ ] `outbox_events` and `inbox_records` tables exist in Neon; migration idempotent
- [ ] Publisher worker runs every 5s; emits structured logs; respects lifecycle fence
- [ ] `org.created` event written in the same transaction as org creation
- [ ] Consumer inbox record created atomically with side effect; duplicate event idempotently skipped
- [ ] `UNIQUE(event_id)` and `UNIQUE(org, aggregate_type, aggregate_id, aggregate_version)` constraints verified by tests
- [ ] DLQ (deliveryState = DEAD) visible via `GET /admin/outbox/dead-letter` (platform-admin only)
- [ ] Replay endpoint: `POST /admin/outbox/:eventId/replay` resets to PENDING (idempotent)
- [ ] No general outbox event can escape an ARCHIVED or PURGED org

---

## Step 2 — Email Outbox Org-Scoping

**Problem:** `email_outbox` has no `org_id` column. A queued email for an archived org's user will be delivered anyway because `EmailOutboxService.processRetries` has no lifecycle fence. This is a security/compliance defect (OWASP A09 / lifecycle contract).

### 2.1 — Additive migration: add `org_id` (nullable first)

```sql
-- Migration: add nullable org_id to email_outbox
ALTER TABLE email_outbox
  ADD COLUMN IF NOT EXISTS organization_id text
    REFERENCES organizations(id) ON DELETE CASCADE;

-- Index for lifecycle queries and cleanup
CREATE INDEX IF NOT EXISTS idx_email_outbox_org
  ON email_outbox (organization_id, status, next_attempt_at)
  WHERE organization_id IS NOT NULL;
```

**Gate:** migration applies; existing rows have `organization_id IS NULL`; new rows populated.

**Rollback:** `ALTER TABLE email_outbox DROP COLUMN IF EXISTS organization_id;`

### 2.2 — Dual-write: populate `org_id` on every new enqueue

Update `EmailOutboxService.enqueueAndTry(options, orgId?: string)` — callers that know their org pass it; unknown/system emails pass `null`. Phase this in: track `NULL` count via a metric.

```typescript
// EmailOutboxService
async enqueueAndTry(options: EmailOptions, organizationId?: string): Promise<void> {
  await this.db.insert(emailOutbox).values({
    ...existingFields,
    organizationId: organizationId ?? null,
  });
  // ...rest unchanged
}
```

**Backfill:** for PENDING rows where `organization_id IS NULL` and the recipient email can be resolved to an org (via `organization_members.email`), run a one-off backfill script during a maintenance window. Rows that cannot be resolved retain `NULL` and are treated as system-level email.

### 2.3 — Lifecycle fence in retry processor

```typescript
// EmailOutboxService.processRetries — add org lifecycle check
for (const row of rows) {
  // NEW: lifecycle fence
  if (row.organizationId) {
    const orgStatus = await this.orgService.getLifecycleState(row.organizationId);
    if (orgStatus === "ARCHIVED" || orgStatus === "PURGED" || orgStatus === "SUSPENDED") {
      await this.db
        .update(emailOutbox)
        .set({ status: "DEAD", lastError: `org_lifecycle:${orgStatus}` })
        .where(eq(emailOutbox.id, row.id));
      dead++;
      continue;
    }
  }
  // existing retry logic unchanged...
}
```

**Gate:** test that a queued email for an archived org is moved to DEAD without sending.

### 2.4 — Make `org_id` NOT NULL for new rows (after backfill stabilizes)

After 2 releases with zero unexplained NULLs on new enqueues, add a migration to make the column NOT NULL for new insert statements (Drizzle `.notNull()` + a `DEFAULT` for legacy callers). System emails that genuinely have no org use a sentinel value or a dedicated system-email pathway outside `email_outbox`.

**Gate:** zero `organization_id IS NULL` rows in PENDING state for 7 days before making NOT NULL.

**Acceptance criteria for Step 2:**
- [ ] `email_outbox.organization_id` column exists, FK to organizations, nullable initially
- [ ] All new enqueues populate org_id where known
- [ ] Retry processor skips (DEAD) emails for ARCHIVED/PURGED orgs before send
- [ ] Backfill reconciliation: `SELECT COUNT(*) FROM email_outbox WHERE status='PENDING' AND organization_id IS NULL` reaches near-zero
- [ ] Two releases with zero NULL on new rows → add NOT NULL migration

---

## Step 3 — Idempotency Coverage Expansion

**Current state:** `@Idempotent` decorator + `IdempotencyInterceptor` fully implemented; only 4 commands use it. A cron to sweep expired fences is missing.

### 3.1 — Expiry sweep cron (no schema change needed)

```typescript
// backend/src/cron/command-fence-sweep.service.ts
@Injectable()
export class CommandFenceSweepService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  @Cron("0 */15 * * * *") // every 15 minutes
  async sweepExpiredFences(): Promise<void> {
    const deleted = await this.db
      .delete(commandFences)
      .where(lte(commandFences.expiresAt, new Date()))
      .returning({ id: commandFences.commandFenceId });
    if (deleted.length > 0) {
      this.logger.log(`Swept ${deleted.length} expired command fences`);
    }
  }
}
```

**Gate:** confirm fence table does not grow unbounded after 1 week of operation.
**Rollback:** disable `@Cron` via feature flag; rows expire naturally but are not deleted.

### 3.2 — Add `@Idempotent` to `setModuleEnabled`

Module enablement is a sensitive state change that, if retried concurrently, could create duplicate PM Workspace provisioning or double-billing events.

```typescript
// backend/src/modules/org/org.controller.ts (or organization module)
@Patch("modules/:moduleKey/enabled")
@RequirePermission("settings:modules:manage")
@UseGuards(JwtAuthGuard, PermissionGuard)
@Idempotent("org.setModuleEnabled")   // ADD
async setModuleEnabled(...) { ... }
```

**Fence key:** caller supplies `Idempotency-Key`; `commandName = "org.setModuleEnabled"`.
**Gate:** e2e test: concurrent enable requests with the same key; second returns 409 while first is in-flight; retry after completion replays the same response.

### 3.3 — Add `@Idempotent` to member invite

```typescript
// backend/src/modules/organization/organization.controller.ts
@Post("members/invite")
@RequirePermission("settings:members:invite")
@Idempotent("organization.inviteMember")   // ADD
inviteMember(...) { ... }
```

**Gate:** test double-invite with same Idempotency-Key sends exactly one email.

### 3.4 — Add `@Idempotent` to RBAC role/grant writes

```typescript
// backend/src/modules/rbac/rbac.controller.ts
@Post("roles")
@Idempotent("rbac.createRole")

@Post("roles/:roleId/permissions")
@Idempotent("rbac.grantPermission")

@Post("roles/:roleId/assign")
@Idempotent("rbac.assignRole")
```

**Gate:** concurrent role-creation with same Idempotency-Key does not create duplicate role rows (the DB unique constraint is the backstop; the fence is the fast-path).

### 3.5 — Add `@Idempotent` to billing plan changes and subscription creates

```typescript
// backend/src/modules/billing/billing.controller.ts
@Post("subscriptions")
@Idempotent("billing.createSubscription")

@Patch("subscriptions/:subscriptionId/plan")
@Idempotent("billing.changePlan")
```

**Gate:** test that a Stripe webhook retry does not create a duplicate subscription record.

### 3.6 — Commands NOT decorated with `@Idempotent` (rationale)

| Command | Why excluded |
|---------|-------------|
| GET endpoints | Safe/idempotent by HTTP semantics |
| `DELETE` with natural uniqueness | DB constraint is the fence |
| Soft-delete / status transitions (PATCH) | Service checks current state; retry is safe by design |
| Auth token refresh | Has its own TTL/rotation semantics |

**Acceptance criteria for Step 3:**
- [ ] Expiry sweep cron removes expired fences on schedule; fence table stays bounded
- [ ] `setModuleEnabled`, `inviteMember`, `rbac.createRole/grantPermission/assignRole`, `billing.createSubscription/changePlan` all decorated with `@Idempotent`
- [ ] e2e tests: in-flight duplicate → 409; completed replay → same response body + status; wrong payload → 422; expired fence → re-executes cleanly
- [ ] No regression on existing 4 fenced commands

---

## Step 4 — Portal Auth Runtime

**Problem:** portal schema exists and is complete (`portal_memberships`, `portal_invitations`, `project_client_grants` all present with correct composite FKs and audience enum). However:
- No `PortalJwtAuthGuard` exists
- `InternalJwtAuthGuard` does not reject `aud=CLIENT_PORTAL` tokens
- No portal JWT is issued (no `PortalAuthController`)
- Portal routes use the same `JwtAuthGuard` as internal staff
- Portal frontend shell is inside `(authenticated)/DashboardShell`

This is a **security defect**: a portal token (once issued) could potentially reach internal endpoints, and vice versa.

### 4.1 — Add `aud` claim to `BackendClaims`

```typescript
// backend/src/common/auth/backend-claims.ts
export interface BackendClaims {
  sub: string;           // users.id
  orgId: string;
  sessionId: string;
  aud?: "INTERNAL" | "CLIENT_PORTAL"; // ADD — absent = INTERNAL for backward compat
  // portal-only fields (absent on internal tokens)
  portalMembershipId?: string;
  sessionEpoch?: number;
  // ...existing fields
}
```

**Gate:** existing internal JWTs have no `aud` field; they parse as INTERNAL. No existing behavior changes.

### 4.2 — Update `InternalJwtAuthGuard` to reject portal tokens

```typescript
// backend/src/common/auth/jwt-auth.guard.ts (rename export → InternalJwtAuthGuard)
// Add as the FIRST check after token decode, BEFORE any other processing:
const aud = claims.aud;
if (aud === "CLIENT_PORTAL") {
  throw new ForbiddenException("Portal tokens are not accepted on internal endpoints");
}
```

**Gate:** e2e test — a token with `aud=CLIENT_PORTAL` receives 403 on any `JwtAuthGuard`-protected endpoint.
**Rollback:** remove the audience check; all tokens behave as before.

### 4.3 — `PortalJwtAuthGuard`

```typescript
// backend/src/common/auth/portal-jwt-auth.guard.ts
@Injectable()
export class PortalJwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = extractBearerToken(req);
    const claims = await this.jwtService.verifyAsync<BackendClaims>(token, {
      secret: this.configService.get("PORTAL_JWT_SECRET"),
    });

    // FIRST: audience must be CLIENT_PORTAL
    if (claims.aud !== "CLIENT_PORTAL") {
      throw new UnauthorizedException("Audience mismatch — internal tokens not accepted on portal endpoints");
    }

    // Load portal membership + check epoch
    const membership = await this.db
      .select()
      .from(portalMemberships)
      .where(
        and(
          eq(portalMemberships.portalMembershipId, claims.portalMembershipId),
          eq(portalMemberships.organizationId, claims.orgId),
        ),
      )
      .limit(1);

    if (!membership.length || membership[0].status !== "ACTIVE") {
      throw new UnauthorizedException("Portal membership inactive");
    }

    // Check Redis epoch (fast-path revocation)
    const storedEpoch = await this.redis.get(`portal:epoch:${claims.portalMembershipId}`);
    if (storedEpoch !== null && Number(storedEpoch) > (claims.sessionEpoch ?? 0)) {
      throw new UnauthorizedException("Portal session invalidated");
    }

    req.portalUser = {
      userId: claims.sub,
      orgId: claims.orgId,
      portalMembershipId: claims.portalMembershipId,
      audience: "CLIENT_PORTAL",
    };
    return true;
  }
}
```

**Redis namespace:** all portal epoch keys under `portal:epoch:<portalMembershipId>`. All portal session revocation keys under `portal:revoked:<sessionId>`. Never overlap with `revoked:session:<sessionId>` (internal).

### 4.4 — `PortalAuthController` (portal JWT issuance)

```typescript
// backend/src/modules/portal-auth/portal-auth.controller.ts
@Controller("portal/auth")
export class PortalAuthController {

  // Rate-limited public endpoint — no auth guard
  @Post("invitations/accept")
  @HttpCode(200)
  async acceptInvitation(@Body() body: AcceptInvitationInput) {
    return this.portalAuthService.acceptInvitation(body.token);
    // Acceptance transaction (from wave-9-portal-audience-design.md §4.2):
    // 1. SHA-256(token) → look up invitation FOR UPDATE
    // 2. Validate: PENDING, not expired, org ACTIVE
    // 3. Find or create users row for invitation.email
    // 4. INSERT portal_memberships (status=ACTIVE, sessionEpoch=0)
    // 5. UPDATE portal_invitations status=ACCEPTED
    // 6. Insert inbox_record if outbox event emitted
    // 7. Issue portal JWT (aud=CLIENT_PORTAL, PORTAL_JWT_SECRET)
    // COMMIT
  }

  // Rate-limited — magic link or password
  @Post("magic-link")
  async requestMagicLink(@Body() body: MagicLinkInput) { ... }

  @Post("magic-link/verify")
  async verifyMagicLink(@Body() body: VerifyMagicLinkInput) {
    // Verify + issue portal JWT (aud=CLIENT_PORTAL, PORTAL_JWT_SECRET, sessionEpoch from DB)
  }
}
```

**New env var:** `PORTAL_JWT_SECRET` (separate from `JWT_SECRET`). Required in `.env.example`. Validated in config schema on startup.

**Gate:** `PORTAL_JWT_SECRET` must not equal `JWT_SECRET`.

### 4.5 — Portal data endpoints (behind `PortalJwtAuthGuard`)

```typescript
// backend/src/modules/portal/portal.controller.ts
@UseGuards(PortalJwtAuthGuard)   // NOT JwtAuthGuard, NOT PermissionGuard
@Controller("portal")
export class PortalController {

  @Get("projects")
  async listGrantedProjects(@Req() req: PortalRequest) {
    // Reads from project_client_grants WHERE portal_membership_id = req.portalUser.portalMembershipId
    // AND status = ACTIVE AND (expires_at IS NULL OR expires_at > now())
    // JOIN portal_memberships WHERE status = ACTIVE
    // BOLA re-asserted in service; 404 on any missing/revoked grant
    return this.portalService.listGrantedProjects(
      req.portalUser.orgId,
      req.portalUser.portalMembershipId,
    );
  }

  @Get("projects/:projectId")
  async getGrantedProject(
    @Param("projectId") projectId: string,
    @Req() req: PortalRequest,
  ) {
    // grant lookup first; 404 if no ACTIVE grant (BOLA-safe — no "access denied" signal)
  }
}
```

**No `PermissionGuard`** on portal routes — portal principals have no RBAC permissions. Access is entirely via `project_client_grants` field allowlist.

### 4.6 — Session invalidation events

Every suspension/revocation/contact-unlink/org-archive must atomically:

```typescript
// In the same DB transaction as the status change:
await tx.update(portalMemberships)
  .set({ sessionEpoch: sql`session_epoch + 1`, status: "SUSPENDED" })
  .where(eq(portalMemberships.portalMembershipId, membershipId));

// After commit, set Redis epoch (best-effort, short TTL):
await redis.set(
  `portal:epoch:${membershipId}`,
  newEpoch,
  "EX",
  PORTAL_TOKEN_TTL_SECONDS + 60,
);
```

### 4.7 — Frontend portal shell

Move existing `frontend/app/(authenticated)/projects/portal/**` to `frontend/app/(portal)/**`:

```
frontend/app/(portal)/
  layout.tsx           — NO DashboardShell; minimal org-brand chrome only; validates portal NextAuth session
  login/page.tsx       — magic link / portal password sign-in
  projects/page.tsx    — list of granted projects
  projects/[projectId]/page.tsx — project progress view (respects field-level allowlist)
```

**Two-phase migration:**
- Phase A (additive): create `(portal)/` tree; new contacts invited via portal invitation flow land here; old `(authenticated)/projects/portal/` continues to serve existing `projects.client_id` users.
- Phase B (cutover): send portal invitation emails to all existing `projects.client_id` users; after 30-day grace, redirect `(authenticated)/projects/portal/` → `(portal)/` with a session migration prompt.

**Gate:** `(portal)/layout.tsx` must not import `DashboardShell`, `AppSidebar`, `MobileModuleBottomNav`, or `MobileShellFab`.

**Acceptance criteria for Step 4:**
- [ ] `BackendClaims.aud` field added; existing tokens parse without error (backward compatible)
- [ ] `InternalJwtAuthGuard` rejects `aud=CLIENT_PORTAL` tokens with 403 on first check
- [ ] `PortalJwtAuthGuard` rejects missing/wrong-audience tokens with 401 before any DB access
- [ ] `PORTAL_JWT_SECRET` env var required; startup fails if absent or equals `JWT_SECRET`
- [ ] Portal invitation acceptance is atomic and non-replayable (token hash consumed)
- [ ] Portal JWT is issued with `aud=CLIENT_PORTAL`, `portalMembershipId`, `sessionEpoch`
- [ ] `GET /portal/projects` returns only ACTIVE grants for the calling membership; 404 for unlisted project
- [ ] Suspending a membership increments `sessionEpoch` in DB and Redis; next portal request returns 401
- [ ] Internal JWT → portal endpoint → 403; portal JWT → internal endpoint → 403
- [ ] Portal frontend layout renders no internal sidebar, header, admin chrome, or module switcher
- [ ] e2e specs: accept invite → portal session → data access; wrong audience → 403; cross-tenant project → 404; suspended → 401; revoked invite → 410

---

## Step 5 — RLS Rollout

**Context:** `wave-0-rls-matrix.md` documents the policy templates and per-table inventory. `wave-10-rls-matrix.md` documents the ADR invariants and phase plan. Neither has been applied to Neon. Wave 9 completes the rollout with `ENABLE + FORCE` on all designated tables.

### 5.1 — Phase 0: Helper functions (pre-existing gate from Wave 0)

Deploy fail-closed helper functions to Neon (if not yet done — verify `pg_proc` before applying):

```sql
CREATE OR REPLACE FUNCTION rls_org_id() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT NULLIF(TRIM(current_setting('app.organization_id', true)), '')
  $$;

CREATE OR REPLACE FUNCTION rls_membership_id() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT NULLIF(TRIM(current_setting('app.organization_membership_id', true)), '')
  $$;

CREATE OR REPLACE FUNCTION rls_audience() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT NULLIF(TRIM(current_setting('app.audience', true)), '')
  $$;
```

**Gate:** verify each function returns NULL when GUC is not set (not an error; not an empty string):

```sql
SELECT rls_org_id();   -- must return NULL in a fresh transaction
```

**This is the hard Wave 0 exit blocker.** Do not proceed to 5.2 until this passes.

### 5.2 — Neon pooler transaction-locality test (hard exit gate)

This is the most critical gate in the entire RLS rollout. Neon uses PgBouncer in transaction mode. A session-level GUC would leak across pooled connections. Transaction-local GUCs (`set_config(..., true)`) reset on commit — but this MUST be proven against the actual Neon pooler, not assumed.

**Test procedure:**

```typescript
// Execute this as a controlled test against the Neon branch (NOT prod):
async function testPoolerGucIsolation(db: Db): Promise<void> {
  // Connection A: set GUC, commit
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.organization_id', 'org-A', true)`);
    const result = await tx.execute(sql`SELECT current_setting('app.organization_id', true) AS val`);
    assert(result.rows[0].val === 'org-A', "GUC must be set within txn");
  }); // commit here; connection returned to pool

  // Connection B: reuse the same pooled connection if possible; GUC must be NULL
  await db.transaction(async (tx) => {
    const result = await tx.execute(sql`SELECT current_setting('app.organization_id', true) AS val`);
    const val = result.rows[0].val;
    assert(val === null || val === '', `GUC leaked: got '${val}'`);
  });
}
```

**Expected result:** the GUC value from connection A is NOT visible in connection B after pool reuse.

**If the test fails:** Neon's pooler mode must be changed to session mode or all tenant queries must set GUCs inside explicit transactions (which the current `TenantTransaction` wrapper already does — confirm the wrapper is actually used everywhere, including background jobs).

**Gate:** written test result + screenshot/log recorded as a release artifact. No `FORCE RLS` on any table until this test passes.

### 5.3 — Pilot group: core tenancy tables (Wave 4 target, completing in Wave 9)

Apply `ENABLE RLS` + shadow-observe policies on the Wave 4 pilot group:

```sql
-- Apply for each table in the pilot group (organizations, organization_members, org_modules):

-- 1. Create the policy (Template A or C per table per wave-0-rls-matrix.md):
CREATE POLICY rls_tenant ON organization_members
  AS RESTRICTIVE
  USING (org_id = rls_org_id() AND rls_audience() = 'INTERNAL')
  WITH CHECK (org_id = rls_org_id() AND rls_audience() = 'INTERNAL');

-- 2. ENABLE (not FORCE yet — shadow observe):
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
```

**Shadow-observe:** deploy with `ENABLE` only; run for ≥7 consecutive days including peak traffic. Monitor for:
- Any request that returns unexpected empty results (should now be filtered by RLS)
- Any cross-tenant data leak visible in logs (should be blocked by RLS)
- P95 latency regression > 10%

**Gate:** zero unexplained access denials or data gaps over 7-day period.

### 5.4 — FORCE on pilot group after shadow-observe passes

```sql
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE org_modules FORCE ROW LEVEL SECURITY;
```

**Gate:** run mandatory negative tests (from `wave-0-rls-matrix.md` Part 5):
- [ ] Session from org A cannot read org B's `organization_members` rows
- [ ] Missing GUC returns 0 rows (fail-closed)
- [ ] `WITH CHECK` blocks a cross-tenant INSERT (attempt to insert a row with a different `org_id`)
- [ ] Pooled connection reuse cannot leak GUC after commit/rollback
- [ ] Portal audience cannot read INTERNAL-only tables
- [ ] Worker with wrong org in payload cannot read another org's data

### 5.5 — Expand to portal-access and access tables

After pilot group completes `FORCE`, apply to the next group in the rollout order from `wave-0-rls-matrix.md`:

```sql
-- portal_memberships: BOTH audiences (Template C)
CREATE POLICY rls_tenant ON portal_memberships
  AS RESTRICTIVE
  USING (
    organization_id = rls_org_id()
    AND rls_audience() IN ('INTERNAL', 'CLIENT_PORTAL')
  )
  WITH CHECK (
    organization_id = rls_org_id()
    AND rls_audience() IN ('INTERNAL', 'CLIENT_PORTAL')
  );
ALTER TABLE portal_memberships ENABLE ROW LEVEL SECURITY;
-- Shadow-observe ≥7 days → FORCE

-- project_client_grants: PORTAL audience (Template B)
CREATE POLICY rls_tenant ON project_client_grants
  AS RESTRICTIVE
  USING (
    organization_id = rls_org_id()
    AND rls_audience() = 'CLIENT_PORTAL'
  )
  WITH CHECK (false); -- portal principals never write grants; internal staff use internal audience
ALTER TABLE project_client_grants ENABLE ROW LEVEL SECURITY;
```

### 5.6 — Expand to RBAC, billing, and module tables

Following the wave-0-rls-matrix rollout order. Tables with the integer `org_id` billing mismatch (Wave 4 deferred) remain marked `DEFERRED-CAST` until the integer→text migration completes. For those:

```sql
-- Interim for billing_profiles et al (DEFERRED until Wave 4 integer migration completes):
-- Use try-cast wrapper:
CREATE OR REPLACE FUNCTION rls_org_id_int() RETURNS integer
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT (NULLIF(TRIM(current_setting('app.organization_id', true)), ''))::integer
  $$;
-- Apply only after verifying NULL cast behavior (NULL::integer = NULL, fail-closed)
```

### 5.7 — Module tables (HR, CRM, Inventory, PM, Support, KB etc.)

Apply Template A to all module tables in bounded batches (one domain per release). Each batch:
1. `ENABLE` → shadow-observe ≥3 days (lower bar than core tenancy; module traffic is lighter)
2. Run negative tests
3. `FORCE`

**Gate:** each domain has a reconciliation query proving all rows have a non-null `org_id` that matches the GUC after the policy is applied.

### 5.8 — Billing integer tables (deferred until Wave 4 integer migration)

Mark these with `SKIP-UNTIL-WAVE-4-INT-MIGRATION` in the matrix:
- `billing_profiles`, `app_installations`, `affiliates`, `revenue_events`

After Wave 4 converts `org_id` to text: apply Template A like all other tables.

### 5.9 — Global tables (excluded from RLS by design)

Tables with no `org_id` that serve global identity remain excluded:
- `users`, `sessions`, `mfa_*`, `feature_flags` (no org_id), `command_fences` (has org_id — apply Template A)

Document exclusion with compensating controls in the matrix.

**Acceptance criteria for Step 5:**
- [ ] `rls_org_id()`, `rls_membership_id()`, `rls_audience()` helper functions deployed and tested (fail-closed on NULL)
- [ ] Neon pooler GUC isolation test PASSES (written artifact)
- [ ] Pilot group (organizations, organization_members, org_modules) has `ENABLE + FORCE` with 7-day clean shadow
- [ ] Portal tables (portal_memberships, project_client_grants) have `ENABLE + FORCE`
- [ ] RBAC tables have `ENABLE + FORCE`
- [ ] All module tables have `ENABLE + FORCE` (or explicit DEFERRED with owner/expiry)
- [ ] Runtime role `streamline_app` confirmed `rolbypassrls=false` in `pg_roles`
- [ ] Migration role `streamline_migrator` confirmed as table owner
- [ ] Emergency rollback tested: `NO FORCE ROW LEVEL SECURITY; DROP POLICY IF EXISTS rls_tenant` restores access immediately
- [ ] Backup restore test passes under active RLS policies

---

## Step 6 — Retirement Telemetry and Contract Gates

**Goal:** make it measurable when a legacy API path or schema alias reaches zero traffic, then remove it with confidence after the 30-day/2-release gate.

### 6.1 — Sunset and Deprecation response headers

Add a NestJS interceptor that attaches `Sunset` and `Deprecation` headers to any endpoint marked for retirement:

```typescript
// backend/src/common/deprecation/deprecated.decorator.ts
export const DEPRECATED_METADATA = "DEPRECATED_METADATA";
export interface DeprecationMeta {
  sunset: string;    // ISO-8601 date
  link?: string;     // Link to canonical replacement
  message?: string;  // human-readable migration note
}
export const Deprecated = (meta: DeprecationMeta) =>
  SetMetadata(DEPRECATED_METADATA, meta);

// backend/src/common/deprecation/deprecation.interceptor.ts
@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<DeprecationMeta | undefined>(
      DEPRECATED_METADATA,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!meta) return next.handle();

    const res = ctx.switchToHttp().getResponse<ServerResponse>();
    res.setHeader("Sunset", meta.sunset);
    res.setHeader("Deprecation", "true");
    if (meta.link) res.setHeader("Link", `<${meta.link}>; rel="successor-version"`);

    return next.handle();
  }
}
```

**Apply to:**
- `GET /projects/**` (compatibility alias; canonical: `/product-management/**`) — sunset: 2026-10-01
- `POST /settings/subscription` (retired; canonical: `/billing`) — sunset: 2026-09-01
- `ClientPortalController` endpoints (retiring after portal audience isolation) — sunset: 2026-11-01

### 6.2 — Legacy-path usage counters

Add a metric increment in the deprecation interceptor (or a separate middleware):

```typescript
// In DeprecationInterceptor.intercept, after setting headers:
this.metrics.increment("legacy_endpoint_call", {
  endpoint: `${method}:${path}`,
  sunset: meta.sunset,
  orgId: req.user?.orgId ?? "unknown",
});
```

**Dashboard:** Grafana counter `legacy_endpoint_call` grouped by `endpoint`. Alert policy: if count drops to zero for 7 consecutive days AND sunset date has passed → trigger contract removal ticket.

### 6.3 — Contract removal gate checklist

Before removing any deprecated contract:

- [ ] `Sunset` date reached
- [ ] ≥2 releases have shipped since the sunset date
- [ ] `legacy_endpoint_call` counter shows zero calls for ≥30 consecutive days
- [ ] Reconciliation query confirms zero writes to any deprecated column or table
- [ ] Deprecation notice was published in changelog and API changelog at least 30 days before sunset
- [ ] Backup restore verified without the retired contract
- [ ] Owner explicitly approves removal (not just automated gate)
- [ ] Rollback/forward-repair runbook for the retired path is documented and tested

### 6.4 — Specific retirement targets for Wave 9

| Legacy path | Canonical replacement | Sunset date | Status |
|-------------|----------------------|-------------|--------|
| `/projects/**` routes | `/product-management/**` | 2026-10-01 | PENDING sunset |
| `projects:portal:view` permission on internal ClientPortalController | `PortalJwtAuthGuard` + `/portal/**` | 2026-11-01 | PENDING portal auth (Step 4) |
| `projects.client_id` FK | `project_client_grants` | 2026-12-01 | PENDING backfill (Step 4) |
| `organization_members.is_owner` as authority source | `organizations.owner_membership_id` | 2026-09-01 | PENDING Wave 1 |
| `users.role` global role column | Membership-based `user_roles` table | 2026-09-01 | PENDING Wave 5 |
| `organizations.enabled_modules` JSON array | `org_modules` table | Already done (Wave 2) | Verify zero reads then drop |
| `settings/subscription` redirect | `/billing` | immediate | Add 301 redirect + Sunset header |

### 6.5 — Wave 12 dead-code sweep dependency

`wave-12-dead-code-inventory.md` is the authoritative list for what gets deleted post-retirement. Step 6 feeds into Wave 12 by populating the usage-counter evidence. No code is deleted in Wave 9 — only `Sunset` headers and counter metrics are added. Deletions happen in Wave 12 after all gates pass.

**Acceptance criteria for Step 6:**
- [ ] `@Deprecated` decorator and `DeprecationInterceptor` implemented and registered globally
- [ ] `Sunset` and `Deprecation` headers present on all listed legacy endpoints
- [ ] `legacy_endpoint_call` metric emitted on every deprecated endpoint call
- [ ] Grafana dashboard / alert configured for zero-count threshold
- [ ] Contract removal gate checklist documented and agreed by owner
- [ ] Retirement table above populated with verified sunset dates and owners
- [ ] Wave 12 dead-code inventory linked to usage counters as evidence source

---

## Overall Wave 9 Exit Gate

Wave 9 is complete only when ALL of the following are true:

- [ ] `outbox_events` + `inbox_records` tables exist; publisher worker running; first consumer (org lifecycle) proven end-to-end
- [ ] `email_outbox.organization_id` column exists + NOT NULL for new rows + lifecycle fence in retry processor
- [ ] Expiry sweep cron running; `command_fences` bounded
- [ ] `setModuleEnabled`, `inviteMember`, RBAC role/grant writes, billing creates all decorated with `@Idempotent`; e2e fenced
- [ ] `PortalJwtAuthGuard` exists; `InternalJwtAuthGuard` rejects portal tokens; portal JWT issued with `aud=CLIENT_PORTAL` and `PORTAL_JWT_SECRET`
- [ ] Portal invitation acceptance is atomic, non-replayable, never creates an org membership
- [ ] Portal frontend shell (`(portal)/layout.tsx`) renders no internal chrome
- [ ] All designated tenant tables have `ENABLE + FORCE ROW LEVEL SECURITY`; Neon pooler GUC isolation test is a committed test artifact
- [ ] `Sunset` + `Deprecation` headers on all listed legacy endpoints; usage counter metric emitting
- [ ] Build ✓ · Lint ✓ · Types ✓ · e2e specs covering all security invariants above · P95 latency within 10% of baseline

**Biggest unresolved item: the Neon pooler transaction-locality test (Step 5.2).** This is a hard empirical gate that has never been executed against the actual Neon environment. Until that test produces a written PASS artifact, `FORCE ROW LEVEL SECURITY` must not be applied to any tenant table in production. The test itself is fast to run; scheduling it against the Neon branch is the first action in Step 5.

---

## Appendix: Step Sequence Summary

| # | Step | Schema change? | Runtime change? | Risk | Blocks |
|---|------|---------------|----------------|------|--------|
| 1.1–1.2 | Outbox/inbox schema | YES — new tables | NO | Low (additive) | Step 1.3+ |
| 1.3 | Publisher worker | NO | YES — new cron | Medium | Nothing |
| 1.4–1.5 | Outbox write in aggregate services | NO | YES — transactional | Medium | Nothing |
| 2.1 | `email_outbox.org_id` nullable | YES — additive col | NO | Low | Step 2.2+ |
| 2.2–2.4 | Email outbox lifecycle fence | NO | YES | Low | Nothing |
| 3.1 | Fence sweep cron | NO | YES — new cron | Low | Nothing |
| 3.2–3.5 | `@Idempotent` expansions | NO | YES — decorator | Low | Nothing |
| 4.1–4.2 | `aud` claim + guard reject | NO | YES — security | **High** | Step 4.3+ |
| 4.3–4.4 | `PortalJwtAuthGuard` + `PortalAuthController` | NO | YES — new auth flow | **High** | Step 4.5+ |
| 4.5–4.6 | Portal endpoints + session invalidation | NO | YES | Medium | Step 4.7 |
| 4.7 | Portal frontend shell | NO | YES — new route tree | Medium | Nothing |
| 5.1 | RLS helpers deployment | NO — DDL | NO | Low | Step 5.2 |
| **5.2** | **Neon pooler GUC isolation test** | NO | NO — test only | **CRITICAL GATE** | All RLS |
| 5.3–5.4 | Pilot group ENABLE + FORCE | NO — DDL | NO | Medium | Step 5.5+ |
| 5.5–5.8 | Module table expansion | NO — DDL | NO | Low per batch | Wave 12 |
| 6.1–6.2 | Sunset headers + counters | NO | YES — response headers | Low | Step 6.3+ |
| 6.3–6.5 | Contract gate + retirement targets | NO | NO | Low | Wave 12 |
