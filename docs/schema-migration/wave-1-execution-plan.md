---
wave: 1
type: execution plan
status: DRAFT
date: 2026-07-26
author: senior-architect pass
depends-on: Wave 0 composite-FK matrix approved; reconciled baseline migration at head
collision-risk-files:
  - backend/src/db/schema/auth.ts          # active edits — coordinate before adding columns/enums
  - backend/src/modules/organization/organization.service.ts
  - backend/src/modules/organization/invitations.service.ts
  - backend/src/common/auth/jwt-auth.guard.ts
---

# Wave 1 — Tenant Invariants: Execution Plan

## Context and current state (verified against repo, 2026-07-26)

### What already exists
- `organizations.owner_membership_id` — nullable `integer` column, present in schema.
- `organization_members.status` — `membershipStatusEnum` (`ACTIVE | INVITED | SUSPENDED | LEFT`) with lifecycle timestamps (`invitedAt`, `activatedAt`, `suspendedAt`, `leftAt`).
- `uniqueIndex("uniq_org_members_org_id").on(orgId, id)` — the candidate key required for the composite FK already exists on `organization_members`.
- `uniqueIndex("uniq_org_members_user_org").on(userId, orgId)` — global unique; blocks re-join. **Target: make partial (non-LEFT rows only).**
- Organization creation preallocates the membership ID via `SELECT nextval(...)` inside a transaction and inserts the org with `ownerMembershipId` set — the circular-FK-safe pattern is **already coded** in `OrganizationService.createOrganization`.
- Transfer ownership: updates both `organization_members.isOwner` and `organizations.ownerMembershipId` in a single locked transaction — **already coded**.
- `JwtAuthGuard.isMembershipActive` re-checks DB on every request with a 15 s in-process cache; busts on suspend/remove — **already coded** (commit daa8303).
- `bustMembershipStatusCache` / `bustPlatformAdminCache` / `revokeMemberAccess` — **already coded**.
- Invitation hashed token (`hashToken`) — **already in use**.
- Archive / restore org — **already coded** (but uses `deletedAt` for ARCHIVED state, not a dedicated status value; purge lifecycle does not exist).
- `invitations.invitedBy` references `users.id` (global user FK, not membership FK). No explicit status enum; lifecycle tracked via `acceptedAt IS NULL` + `expiresAt`.

### What is missing or incomplete
1. Deferred composite FK `(organizations.id, owner_membership_id) → organization_members(org_id, id)`.
2. Lifecycle constraint: owner membership cannot be SUSPENDED, LEFT, or deleted before transfer.
3. `owner_membership_id NOT NULL` — the pointer is nullable; the constraint and bootstrap repair must land first.
4. `is_owner` still used as independent authority in several read paths (guard `fetchOrgContext`, `suspendMember`, `leaveOrg`); must become derived.
5. `uniq_org_members_user_org` is a global unique — blocks rejoin after LEFT. Must become partial.
6. `invitations` has no status enum (PENDING/ACCEPTED/DECLINED/EXPIRED/REVOKED); no inviter membership FK; no accepted membership FK. Cancel currently hard-deletes rows.
7. Org lifecycle: no `PURGE_SCHEDULED`/`PURGED` states; no `purge_scheduled_at`/`purged_at`; no purge worker. `organizations.status` is an unconstrained `text` field.

### Already done — do not re-plan
- Per-request membership check in `JwtAuthGuard` (commit daa8303).
- `computeUserPermissions` ACTIVE gate.
- Suspend / reactivate member with immediate cache bust and session revocation.

---

## Program discipline for this wave

```
expand schema (nullable/defaulted)
  → tolerant backend (reads both old and new paths)
    → idempotent bootstrap repair migration
      → shadow-read + compare (≥7 days)
        → switch reads to canonical pointer
          → stop legacy is_owner writes
            → observe 2 releases
              → contract (drop legacy column)
```

Recovery = forward repair. No destructive down-migration is the primary rollback path.

---

## Step overview

| # | Step | Phase | Risk |
|---|------|-------|------|
| 1 | Org status enum + purge columns | expand | low |
| 2 | Invitation status enum + membership FKs | expand | low |
| 3 | Partial unique index for membership rejoin | expand | medium |
| 4 | Deferred composite FK + lifecycle trigger | expand | **HIGH** |
| 5 | Owner bootstrap repair migration | idempotent repair | **HIGHEST** |
| 6 | NOT NULL constraint on owner_membership_id | constraint | high |
| 7 | Tolerant backend: dual-read is_owner and pointer | tolerant backend | medium |
| 8 | Shadow-read: verify pointer == is_owner | shadow | low |
| 9 | Switch reads: derive isOwner from pointer | switch reads | medium |
| 10 | Stop legacy is_owner writes | stop writes | medium |
| 11 | Invitation lifecycle backend hardening | tolerant backend | medium |
| 12 | Purge worker (resumable, idempotent) | new feature | medium |
| 13 | Observe + contract | retirement | low |

---

## Step 1 — Org status enum + purge lifecycle columns

**Phase:** expand schema (additive, non-breaking).

### Migration sketch

```sql
-- Add an explicit pgEnum for organization status (currently unconstrained text)
DO $$ BEGIN
  CREATE TYPE organization_status AS ENUM (
    'ACTIVE', 'ARCHIVED', 'PURGE_SCHEDULED', 'PURGED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill the existing text values into a typed column via shadow strategy:
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS status_v2 organization_status
    GENERATED ALWAYS AS (
      CASE status
        WHEN 'ACTIVE'           THEN 'ACTIVE'::organization_status
        WHEN 'ARCHIVED'         THEN 'ARCHIVED'::organization_status
        WHEN 'PURGE_SCHEDULED'  THEN 'PURGE_SCHEDULED'::organization_status
        WHEN 'PURGED'           THEN 'PURGED'::organization_status
        ELSE 'ACTIVE'::organization_status
      END
    ) STORED;
-- Note: generated columns are read-only; switch writes after shadow phase.
-- Simpler alternative if generated columns add complexity: add plain nullable column,
-- backfill, then switch writes.

-- Purge lifecycle columns (all nullable — additive only):
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS purge_scheduled_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS purge_scheduled_by  INTEGER  -- membership id FK added in Step 4
    REFERENCES organization_members(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN IF NOT EXISTS purge_job_id        TEXT,
  ADD COLUMN IF NOT EXISTS purged_at           TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS purge_reason        TEXT;

CREATE INDEX IF NOT EXISTS idx_orgs_purge_scheduled
  ON organizations (purge_scheduled_at)
  WHERE status = 'PURGE_SCHEDULED';
```

### Drizzle schema changes (`backend/src/db/schema/auth.ts`)

```typescript
// Add to organizations table:
statusV2: organizationStatusEnum("status_v2"),  // shadow; becomes authoritative later
purgeScheduledAt: timestamp("purge_scheduled_at", { withTimezone: true }),
purgeScheduledBy: integer("purge_scheduled_by"), // FK added after Step 4
purgeJobId: text("purge_job_id"),
purgedAt: timestamp("purged_at", { withTimezone: true }),
purgeReason: text("purge_reason"),
```

Add `organizationStatusEnum` to `enums.ts`:
```typescript
export const organizationStatusEnum = pgEnum("organization_status", [
  "ACTIVE", "ARCHIVED", "PURGE_SCHEDULED", "PURGED",
]);
```

### Backend changes
- None yet. The `archiveOrg` / `restoreOrg` methods continue writing the text `status` column until Step 9+.
- Add `scheduleOrgPurge` and `cancelOrgPurge` stubs (return `{ success: true }`) so the API surface exists; the worker (Step 12) populates them.

### Gate / exit criteria
- Migration applies cleanly from the current head on a production clone.
- Previous app version still starts and passes smoke tests (no breaking change).
- `organizations` has all new columns; index exists on purge rows.

### Rollback / forward repair
- All columns are nullable → drop them. Enum type removed. No data loss.

---

## Step 2 — Invitation status enum + inviter and accepted membership FKs

**Phase:** expand schema.

### Current state
`invitations.invitedBy` → `users.id` (global user reference).
No status column; lifecycle is `acceptedAt IS NULL && expiresAt > NOW`.
Cancel is a hard-delete.

### Migration sketch

```sql
-- Explicit invitation status enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM (
    'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS status invitation_status NOT NULL
    DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS inviter_membership_id INTEGER
    REFERENCES organization_members(id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN IF NOT EXISTS accepted_membership_id INTEGER
    REFERENCES organization_members(id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN IF NOT EXISTS declined_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revoked_at    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revoked_by    INTEGER
    REFERENCES organization_members(id) ON DELETE SET NULL;

-- Backfill status from current state (idempotent):
UPDATE invitations
SET status =
  CASE
    WHEN accepted_at IS NOT NULL       THEN 'ACCEPTED'
    WHEN expires_at < NOW()            THEN 'EXPIRED'
    ELSE 'PENDING'
  END
WHERE status = 'PENDING';  -- only touch default-filled rows on re-run

-- Backfill inviter_membership_id from invitedBy (users.id) → membership lookup:
UPDATE invitations i
SET inviter_membership_id = om.id
FROM organization_members om
WHERE om.user_id = i.invited_by
  AND om.org_id  = i.org_id
  AND i.inviter_membership_id IS NULL;
-- Rows where the inviter has LEFT the org or their membership was deleted: left NULL (acceptable).

-- Backfill accepted_membership_id:
UPDATE invitations i
SET accepted_membership_id = om.id
FROM organization_members om
WHERE i.accepted_at IS NOT NULL
  AND om.user_id = (
    SELECT u.id FROM users u WHERE u.email = i.email LIMIT 1
  )
  AND om.org_id = i.org_id
  AND i.accepted_membership_id IS NULL;

-- New partial unique: one PENDING invitation per (org, email)
-- (the existing uniq_invitations_org_email_pending covers this already; keep it;
--  add a status-based equivalent for the new column once writes switch):
CREATE UNIQUE INDEX IF NOT EXISTS uniq_invitations_org_email_status_pending
  ON invitations (org_id, email)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations (org_id, status);
```

### Drizzle schema changes

```typescript
// Add to invitations table definition:
status: invitationStatusEnum("status").notNull().default("PENDING"),
inviterMembershipId: integer("inviter_membership_id"),   // FK declared separately
acceptedMembershipId: integer("accepted_membership_id"), // FK declared separately
declinedAt: timestamp("declined_at", { withTimezone: true }),
revokedAt: timestamp("revoked_at", { withTimezone: true }),
revokedBy: integer("revoked_by"),
```

Add `invitationStatusEnum` to `enums.ts`.

### Backend changes (tolerant — both paths work)
- `InvitationsService.cancel`: change hard-delete to status update `SET status = 'REVOKED', revoked_at = NOW(), revoked_by = <membership_id>`. Legacy `DELETE` path is removed only after shadow phase proves no consumer depends on the row disappearing.
- `InvitationsService.listPending`: add `status = 'PENDING'` to the WHERE alongside the existing `acceptedAt IS NULL` guard (tolerant — both conditions return the same set during transition).
- `InvitationsService.accept`: additionally write `SET status = 'ACCEPTED', accepted_membership_id = <new_membership_id>`.
- Token validation: no change (still checks `acceptedAt IS NULL` and `expiresAt`; shadow phase compares with `status = 'PENDING'`).

### Gate / exit criteria
- Backfill completes: 100% of `invitations` rows have a non-NULL `status`; count of `PENDING` rows matches the former `acceptedAt IS NULL AND expiresAt > NOW()` predicate.
- Acceptance acceptance creates both `acceptedAt` (legacy) and `status = 'ACCEPTED'` (new).
- Cancel writes `status = 'REVOKED'` without deleting the row.

### Collision risk
`InvitationsService` is actively used. Coordinate schema change before a backend deploy that touches this file.

---

## Step 3 — Partial unique index for membership rejoin

**Phase:** expand schema (replacing a global unique with a partial one — the riskiest change in this step because Postgres does not let you drop and recreate a unique constraint transactionally on a live table without a brief gap).

### Current state
```sql
UNIQUE INDEX uniq_org_members_user_org ON organization_members (user_id, org_id)
```
This prevents a LEFT member from ever rejoining. Per the plan, LEFT is terminal for a row; a rejoin creates a new row.

### Migration sketch

```sql
-- Step A: create the replacement partial index FIRST (concurrent, no lock on reads/writes):
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  uniq_org_members_user_org_active
  ON organization_members (user_id, org_id)
  WHERE status <> 'LEFT';

-- Step B: validate there are no violations in the new partial index (should be zero):
-- SELECT user_id, org_id, COUNT(*) FROM organization_members
-- WHERE status <> 'LEFT' GROUP BY user_id, org_id HAVING COUNT(*) > 1;

-- Step C: drop the old global unique (requires a brief ACCESS EXCLUSIVE lock — schedule during low traffic):
DROP INDEX CONCURRENTLY IF EXISTS uniq_org_members_user_org;
```

**Important:** Steps A and C must NOT run in the same migration transaction. A and B can be one migration; C must be a separate migration executed only after the shadow-read phase confirms no code path inserts duplicate (user_id, org_id) active rows.

### Drizzle schema changes

Replace in `organizationMembers` table definition:
```typescript
// Remove:
uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),
// Add:
uniqueIndex("uniq_org_members_user_org_active")
  .on(table.userId, table.orgId)
  .where(sql`status <> 'LEFT'`),
```

### Backend changes
- `InvitationsService.accept` — currently uses `onConflictDoNothing()` which silently swallows duplicates. After the partial index, the conflict target changes. The tolerant path:
  - Check for an existing non-LEFT membership first (explicit query). If found, throw `ConflictException`. If the only row is LEFT, insert a fresh membership row with a new `id` (the sequence will allocate a new integer PK).
  - Do NOT use `onConflictDoNothing()` on the new partial index — it needs an explicit `onConflictDoUpdate` or the explicit pre-check.
- `OrganizationService.leaveOrg` — currently hard-deletes the membership row. **This must change to a status update** before the partial index drop (Step C). The leaveOrg method should set `status = 'LEFT', leftAt = NOW()` and **not** delete the row. This preserves historical actor attribution and enables the new partial unique to work correctly.

### Gate / exit criteria (before dropping old index)
- The new partial index exists and shows no duplicate active rows.
- `leaveOrg` writes `status = 'LEFT'` (not DELETE) and the row is visible in history.
- Acceptance of a new invitation by a previously-LEFT member creates a new membership row with a different PK.
- Integration test: user joins, leaves (row LEFT), is re-invited, accepts — two membership rows for that (user, org) pair, one LEFT and one ACTIVE, no constraint violation.

### Rollback
- If `CREATE INDEX CONCURRENTLY` fails: retry. No lock held.
- If old index is dropped prematurely: recreate with `CREATE UNIQUE INDEX CONCURRENTLY` (will fail on any real duplicates — those must be repaired first).

---

## Step 4 — Deferred composite FK + owner lifecycle trigger

**Phase:** expand schema (the constraint layer; applied only after bootstrap repair in Step 5 closes all ownerless orgs).

### Why deferred
A deferred FK (checked at `COMMIT`, not statement-level) allows the circular insert: `INSERT organizations (owner_membership_id = X)` + `INSERT organization_members (id = X, org_id = ...)` in the same transaction. Without `DEFERRABLE INITIALLY DEFERRED`, neither insert can go first.

### Migration sketch

```sql
-- 4a: Declare the candidate key explicitly (already exists as a unique index;
--     promote to a named constraint so the FK can reference it by name):
ALTER TABLE organization_members
  ADD CONSTRAINT pk_org_members_org_id
    UNIQUE (org_id, id)
    DEFERRABLE INITIALLY DEFERRED;
-- Note: if the existing uniqueIndex("uniq_org_members_org_id") is the same index,
-- you may need to DROP the implicit index first and recreate as a named constraint.

-- 4b: Add the deferred composite FK on organizations:
ALTER TABLE organizations
  ADD CONSTRAINT fk_owner_membership
    FOREIGN KEY (id, owner_membership_id)
    REFERENCES organization_members (org_id, id)
    DEFERRABLE INITIALLY DEFERRED;
-- This FK is NOT VALID until Step 5 repair + 6 NOT NULL are complete.
-- Add as NOT VALID first, then VALIDATE CONSTRAINT after repair:
ALTER TABLE organizations
  ADD CONSTRAINT fk_owner_membership
    FOREIGN KEY (id, owner_membership_id)
    REFERENCES organization_members (org_id, id)
    NOT VALID
    DEFERRABLE INITIALLY DEFERRED;

-- 4c: Lifecycle trigger — prevent owner membership from becoming SUSPENDED/LEFT
--     before transfer (deferred trigger fires at COMMIT so the transfer transaction
--     can update the pointer and the membership status atomically):
CREATE OR REPLACE FUNCTION guard_owner_membership_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_owner_membership_id INTEGER;
BEGIN
  -- Only enforce on status transitions to SUSPENDED or LEFT
  IF NEW.status NOT IN ('SUSPENDED', 'LEFT') THEN
    RETURN NEW;
  END IF;

  SELECT owner_membership_id INTO v_owner_membership_id
  FROM organizations
  WHERE id = NEW.org_id;

  IF v_owner_membership_id IS NOT NULL AND v_owner_membership_id = NEW.id THEN
    RAISE EXCEPTION
      'Cannot change owner membership (id=%) to status % before transferring ownership',
      NEW.id, NEW.status
      USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_guard_owner_membership
  AFTER UPDATE OF status ON organization_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION guard_owner_membership_transition();

-- Similarly guard DELETE on the owner membership row:
CREATE OR REPLACE FUNCTION guard_owner_membership_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_owner_membership_id INTEGER; BEGIN
  SELECT owner_membership_id INTO v_owner_membership_id
  FROM organizations WHERE id = OLD.org_id;
  IF v_owner_membership_id IS NOT NULL AND v_owner_membership_id = OLD.id THEN
    RAISE EXCEPTION
      'Cannot delete owner membership (id=%) before transferring ownership', OLD.id
      USING ERRCODE = 'P0002';
  END IF;
  RETURN OLD;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_guard_owner_membership_delete
  AFTER DELETE ON organization_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION guard_owner_membership_delete();
```

### Drizzle schema changes

Drizzle does not natively express deferred FKs or constraint triggers in the schema DSL. Declare them via a raw SQL migration file (not regenerated by `db:generate`). Document them in the composite-FK matrix. The Drizzle schema `foreignKey()` builder on `organizations.ownerMembershipId` can be added as a non-deferrable reference for TS type safety; the deferred version is a raw SQL constraint declared separately and not managed by Drizzle's `generate`.

### Backend changes
- No application-layer changes required at this step.
- The trigger will fire when `OrganizationService.removeMember` tries to delete an owner membership, or when `suspendMember` tries to suspend one. Both paths already guard via `isOwner` check — the trigger is a DB-level backstop.
- After this step, any code path that deletes or suspends a membership must handle the new `P0002` error code and translate it to a `ForbiddenException` or `BadRequestException`.

### Gate / exit criteria
- `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` applies without error.
- Trigger function exists and unit-tested in isolation: attempt to suspend the owner membership → trigger raises exception; attempt to change owner via `transferOwnership` → pointer updated before membership status changes → deferred trigger sees no violation at commit.
- The `NOT VALID` FK does not enforce existing rows — `VALIDATE CONSTRAINT` runs in Step 6 after repair.

### Collision risk
Changes `organization_members` DDL. Coordinate with any concurrent schema work on `auth.ts`.

---

## Step 5 — Owner bootstrap repair migration (RISKIEST STEP)

**Phase:** idempotent repair. This is the highest-risk step because it modifies ownership data.

### Problem classes to repair

```sql
-- Query to discover each class before running repair:

-- Class A: org has no membership with is_owner = true AND owner_membership_id IS NULL
SELECT o.id, o.name, o.owner_membership_id,
       COUNT(om.id) FILTER (WHERE om.is_owner) AS owner_count
FROM organizations o
LEFT JOIN organization_members om ON om.org_id = o.id
WHERE o.status = 'ACTIVE'
GROUP BY o.id, o.name, o.owner_membership_id
HAVING COUNT(om.id) FILTER (WHERE om.is_owner) = 0
   AND o.owner_membership_id IS NULL;

-- Class B: multiple is_owner = true memberships (data corruption)
SELECT org_id, COUNT(*) FROM organization_members
WHERE is_owner = true
GROUP BY org_id HAVING COUNT(*) > 1;

-- Class C: owner_membership_id points to a non-existent or non-active membership
SELECT o.id, o.owner_membership_id, om.status
FROM organizations o
LEFT JOIN organization_members om
  ON om.org_id = o.id AND om.id = o.owner_membership_id
WHERE o.owner_membership_id IS NOT NULL
  AND (om.id IS NULL OR om.status NOT IN ('ACTIVE'));
```

### Repair ledger table (created before repair runs)

```sql
CREATE TABLE IF NOT EXISTS owner_repair_ledger (
  org_id              TEXT NOT NULL,
  problem_class       TEXT NOT NULL,  -- 'NO_OWNER' | 'MULTI_OWNER' | 'STALE_POINTER' | 'QUARANTINE'
  old_owner_member_id INTEGER,
  new_owner_member_id INTEGER,
  repaired_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum            TEXT,           -- deterministic hash of the chosen membership row
  notes               TEXT,
  PRIMARY KEY (org_id, repaired_at)
);
```

### Repair algorithm (execute as a single idempotent transaction per org)

```sql
-- For each organization requiring repair, run in a transaction with SELECT ... FOR UPDATE NOWAIT:

BEGIN;

SELECT id, owner_membership_id FROM organizations
  WHERE id = :org_id FOR UPDATE NOWAIT;

SELECT id, user_id, status, is_owner, joined_at FROM organization_members
  WHERE org_id = :org_id FOR UPDATE NOWAIT;

-- Decision logic (pseudocode; implement as plpgsql procedure or application-side loop):

IF exactly_one_active_owner_candidate THEN
  -- Set the pointer to the canonical membership; set is_owner = true on that row.
  UPDATE organizations SET owner_membership_id = :candidate_id WHERE id = :org_id;
  UPDATE organization_members SET is_owner = true
    WHERE id = :candidate_id AND org_id = :org_id;
  INSERT INTO owner_repair_ledger VALUES (..., 'NO_OWNER', NULL, :candidate_id, checksum, ...);

ELSIF multiple_is_owner_rows THEN
  -- De-duplicate: prefer the earliest ACTIVE membership among the multi-owner rows.
  -- If provenance is ambiguous (same joined_at, multiple users), QUARANTINE.
  IF unambiguous THEN
    UPDATE organization_members SET is_owner = false WHERE id IN (:losers);
    UPDATE organizations SET owner_membership_id = :winner_id WHERE id = :org_id;
    INSERT INTO owner_repair_ledger VALUES (..., 'MULTI_OWNER', :losers, :winner_id, ...);
  ELSE
    INSERT INTO owner_repair_ledger VALUES (..., 'QUARANTINE', NULL, NULL,
      'Ambiguous multi-owner — operator decision required', ...);
  END IF;

ELSIF stale_pointer THEN
  -- pointer points to LEFT/SUSPENDED membership or non-existent row.
  -- Find the best active is_owner=true member; if none, find earliest active member.
  IF replacement_found THEN
    UPDATE organizations SET owner_membership_id = :replacement_id WHERE id = :org_id;
    UPDATE organization_members SET is_owner = true WHERE id = :replacement_id;
    INSERT INTO owner_repair_ledger VALUES (..., 'STALE_POINTER', :old_id, :replacement_id, ...);
  ELSE
    INSERT INTO owner_repair_ledger VALUES (..., 'QUARANTINE', :old_id, NULL,
      'No eligible active member — operator required', ...);
  END IF;
END IF;

COMMIT;
```

### Idempotency guarantee
Re-running the procedure on a previously repaired org reads the ledger first:
```sql
SELECT * FROM owner_repair_ledger WHERE org_id = :org_id;
-- If a non-QUARANTINE entry exists, verify current state matches the recorded new_owner_member_id.
-- If it matches → skip (already repaired). If it doesn't → raise an alert for operator review.
```

### QUARANTINE handling
- Quarantined orgs are NOT given a `NOT NULL` pointer until an operator explicitly resolves them.
- The `VALIDATE CONSTRAINT` in Step 6 is run only after zero quarantined orgs remain.
- A quarantine report is emailed / logged for operator action.

### Backend changes
- Add `OrganizationService.repairOwnerPointer(orgId)` (platform-admin-only endpoint) that reruns the repair logic for a single org. Used for operator resolution of quarantined cases.
- Surface quarantine status in a `/owner/orgs/owner-health` platform-admin route.

### Gate / exit criteria
- `SELECT COUNT(*) FROM owner_repair_ledger WHERE problem_class = 'QUARANTINE'` = 0.
- `SELECT COUNT(*) FROM organizations WHERE owner_membership_id IS NULL AND status <> 'PURGED'` = 0.
- Checksum of `(org_id, owner_membership_id)` pairs is recorded; re-running the script changes zero rows.
- `VALIDATE CONSTRAINT fk_owner_membership` runs without error (this is the FK added as `NOT VALID` in Step 4).

### Rollback / forward repair
- Rollback: the ledger captures old state → restore from it. No schema changes in this step (data only).
- Forward repair: operator resolves quarantined orgs individually using the admin endpoint.

---

## Step 6 — NOT NULL constraint on owner_membership_id

**Phase:** constraint tightening (runs only after Step 5 completes with zero quarantined rows).

### Migration sketch

```sql
-- Validate the deferred FK (will scan the table; on Neon use NOT VALID → VALIDATE to
-- avoid locking all writes for the full scan):
ALTER TABLE organizations VALIDATE CONSTRAINT fk_owner_membership;

-- Now make the column NOT NULL:
-- NOTE: on Postgres/Neon, ALTER COLUMN SET NOT NULL acquires ACCESS EXCLUSIVE.
-- Use a CHECK constraint instead for zero-downtime (equivalent for NOT NULL):
ALTER TABLE organizations
  ADD CONSTRAINT chk_owner_membership_not_null
    CHECK (owner_membership_id IS NOT NULL)
    NOT VALID;
ALTER TABLE organizations VALIDATE CONSTRAINT chk_owner_membership_not_null;
-- After validation passes, can also do:
ALTER TABLE organizations ALTER COLUMN owner_membership_id SET NOT NULL;
-- (The SET NOT NULL is instant if a validated CHECK constraint already exists in PG 12+.)
```

### Drizzle schema change

```typescript
// Change in organizations table:
ownerMembershipId: integer("owner_membership_id").notNull(),
```

### Backend changes
- `OrganizationService.createOrganization` already inserts `ownerMembershipId` in the same transaction as the membership row — no change needed (this is the correct circular-insert-safe path).
- Remove any defensive `?? null` fallbacks on `ownerMembershipId` in service queries — the type is now guaranteed.

### Gate / exit criteria
- `VALIDATE CONSTRAINT` completes without error.
- `ALTER COLUMN SET NOT NULL` applies instantly (the validated CHECK makes it a metadata-only operation on PG 12+).
- New org creation succeeds in smoke test; transfer succeeds; bootstrap scenario (first org) succeeds.

---

## Step 7 — Tolerant backend: dual-read for isOwner derivation

**Phase:** tolerant backend (both old `is_owner` column and new pointer-derived check work simultaneously).

### The problem
`JwtAuthGuard.fetchOrgContext` (line 326) reads `organizationMembers.isOwner` directly to populate `req.user.isOrgOwner`. Similarly, `OrganizationService.suspendMember`, `leaveOrg`, and `transferOwnership` all read `isOwner` from the membership row as the authority signal.

The target: `isOwner` is derived by comparing `organizationMembers.id === organizations.ownerMembershipId`. This is already partially done in `transferOwnership` (the check uses both: `currentMember.isOwner || org.ownerMembershipId === currentMember.id`). The remaining paths need updating.

### Backend changes

**`JwtAuthGuard.fetchOrgContext`** — add the org `ownerMembershipId` to the JOIN and derive:
```typescript
// Current:
isOwner: organizationMembers.isOwner,
// Add to SELECT:
ownerMembershipId: organizations.ownerMembershipId,
// Derive (after query):
const derivedIsOwner = member.ownerMembershipId != null
  ? member.ownerMembershipId === member.id   // new canonical path
  : member.isOwner;                           // legacy fallback during transition
```

**`OrganizationService.suspendMember`** — currently: `if (member.isOwner) throw ...`
Change to: load the org's `ownerMembershipId` in the same query and compare:
```typescript
const isOwner = org.ownerMembershipId != null
  ? org.ownerMembershipId === member.id
  : member.isOwner;
if (isOwner) throw new BadRequestException("Cannot suspend the organization owner");
```

**`OrganizationService.leaveOrg`** — same pattern: derive from pointer, fall back to `isOwner`.

**`OrganizationService.listUserOrganizations`** — does not currently expose `isOwner`; update when it needs to.

### Gate / exit criteria
- All code paths that check ownership use the dual-read logic.
- Unit tests: create an org (pointer set), verify `isOwner` is derived correctly; create a scenario where only `is_owner=true` exists (no pointer) and verify the fallback.
- No 403 regressions for existing owners.

### Collision risk
`jwt-auth.guard.ts` and `organization.service.ts` are both high-traffic files. Changes here require careful review and a dedicated PR.

---

## Step 8 — Shadow-read: verify pointer matches is_owner

**Phase:** shadow comparison (≥7 consecutive days including a peak business day).

### Telemetry to add

In `JwtAuthGuard.fetchOrgContext`, log a mismatch metric when `member.isOwner !== derivedIsOwner`:
```typescript
if (member.isOwner !== derivedIsOwner) {
  // Emit a counter metric: owner_pointer_mismatch{org_id, membership_id}
  // Log at WARN level with org_id and membership_id (no PII)
}
```

In `OrganizationService.suspendMember` and `leaveOrg`, log similarly.

### Gate / exit criteria
- Zero `owner_pointer_mismatch` events over ≥7 consecutive days (including peak traffic).
- If mismatches appear: run the repair logic from Step 5 for those orgs before proceeding.

---

## Step 9 — Switch reads: derive isOwner exclusively from the pointer

**Phase:** switch reads (remove the `is_owner` fallback).

### Backend changes
Remove the dual-read fallback from every location in Step 7. Read only `ownerMembershipId`:
```typescript
const isOwner = membership.orgOwnerMembershipId === membership.id;
```

Update `JwtAuthGuard` to include `organizations.ownerMembershipId` in `fetchOrgContext`'s join and derive cleanly. The `isOwner` field in `organization_members` is no longer read for ownership decisions, only written for compatibility display until Step 10.

### Gate / exit criteria
- Zero ownership-related 403/500 errors for two releases.
- The `owner_pointer_mismatch` metric is removed (no longer needed).
- All `suspendMember`, `leaveOrg`, `removeMember`, `transferOwnership` paths use the pointer exclusively.

---

## Step 10 — Stop legacy is_owner writes; retire the column

**Phase:** stop writes → observe → contract.

### Stop writes (before column removal)
Remove `isOwner: true/false` from all `UPDATE organizationMembers SET ...` calls:
- `createOrganization`: remove `isOwner: true` from the initial member insert.
- `transferOwnership`: remove `isOwner: false` / `isOwner: true` writes.
- `removeMember`: no change (cascade OR status update — neither writes `isOwner`).

After write removal, `is_owner` values may drift, which is fine since reads no longer use them.

### Observe
Two releases without any write to `is_owner`. Confirm via query:
```sql
SELECT COUNT(*) FROM organization_members WHERE is_owner = true
  AND id != (SELECT owner_membership_id FROM organizations WHERE id = org_id);
-- Should trend toward 0 over time (old data only).
```

### Contract (drop the column)

```sql
ALTER TABLE organization_members DROP COLUMN is_owner;
DROP INDEX IF EXISTS idx_org_members_owner;
```

Drizzle schema: remove `isOwner` field and the `idx_org_members_owner` index from `organizationMembers`.

Remove `isOwner` from `BackendClaims` interface and `extractClaims` in `jwt-auth.guard.ts`.

### Gate / exit criteria
- ≥30 days + 2 releases with zero writes to `is_owner`.
- Zero `owner_pointer_mismatch` telemetry.
- Owner approval recorded in the release checklist.
- Backup restore tested with the dropped column.

---

## Step 11 — Invitation lifecycle backend hardening

**Phase:** tolerant backend (completes the invitation changes begun in Step 2).

### Backend changes — InvitationsService

**`cancel`** (currently hard-deletes):
```typescript
// Replace delete with status update:
await this.db.update(invitations)
  .set({
    status: "REVOKED",
    revokedAt: new Date(),
    revokedBy: actorMembershipId,  // require callers to pass membership ID
  })
  .where(and(eq(invitations.id, invitationId), eq(invitations.orgId, orgId)));
```

**`listPending`** / **`listPaginated`**: switch from `isNull(invitations.acceptedAt)` to `eq(invitations.status, "PENDING")` as the canonical filter once the backfill in Step 2 is verified complete. Keep the dual-filter (`status = 'PENDING' OR acceptedAt IS NULL`) during shadow.

**`accept`** (new membership path):
- Populate `status = 'ACCEPTED'` and `accepted_membership_id = <new membership id>`.
- For the rejoin case (after Step 3 lands): the new membership insert no longer conflicts on `(user_id, org_id)` because the partial index ignores LEFT rows.

**`validate`**: additionally verify `status = 'PENDING'` (dual check during transition).

**Expiry maintenance**: add a scheduled task (NestJS `@Cron`) that runs daily and bulk-updates:
```sql
UPDATE invitations
SET status = 'EXPIRED'
WHERE status = 'PENDING'
  AND expires_at < NOW()
  AND accepted_at IS NULL;
```

### Gate / exit criteria
- 100% of invitations have a non-null `status`.
- `listPending` returns identical results from both the legacy and new filters for ≥7 days.
- Cancel no longer deletes rows; the row is visible in history with `status = 'REVOKED'`.
- Acceptance correctly sets `accepted_membership_id`.

---

## Step 12 — Org purge worker (resumable, idempotent)

**Phase:** new feature (builds on the purge columns from Step 1).

### API surface

```
POST /organizations/:orgId/purge/schedule   (Owner only)
  Body: { scheduledForDays: 30, reason: string }
  → sets status='PURGE_SCHEDULED', purge_scheduled_at, purge_job_id, actor membership

DELETE /organizations/:orgId/purge          (Owner only, cancels scheduled purge)
  → sets status='ARCHIVED', clears purge_* columns
```

### OrganizationService additions

```typescript
async schedulePurge(orgId: string, actorMembershipId: number, scheduledForDays: number, reason: string) {
  const deadline = addDays(new Date(), scheduledForDays);
  const jobId = randomUUID();
  await this.db.transaction(async (tx) => {
    const [org] = await tx.select({ status: organizations.status })
      .from(organizations).where(eq(organizations.id, orgId)).for("update");
    if (!org) throw new NotFoundException("Organization not found");
    if (org.status !== "ARCHIVED")
      throw new BadRequestException("Only ARCHIVED organizations can be scheduled for purge");
    await tx.update(organizations).set({
      status: "PURGE_SCHEDULED",
      purgeScheduledAt: deadline,
      purgeScheduledBy: actorMembershipId,
      purgeJobId: jobId,
      purgeReason: reason,
    }).where(eq(organizations.id, orgId));
  });
  this.audit.log({ action: "org.purge_scheduled", orgId, ... });
  return { success: true, jobId, scheduledAt: deadline };
}

async cancelPurge(orgId: string, actorMembershipId: number) {
  await this.db.update(organizations).set({
    status: "ARCHIVED",
    purgeScheduledAt: null,
    purgeScheduledBy: null,
    purgeJobId: null,
    purgeReason: null,
  }).where(and(eq(organizations.id, orgId), eq(organizations.status, "PURGE_SCHEDULED")));
  this.audit.log({ action: "org.purge_cancelled", orgId, ... });
  return { success: true };
}
```

### Purge worker (NestJS `@Cron`, resumable)

```typescript
// Runs every 15 minutes. Idempotent: processes one batch of due orgs.
@Cron("*/15 * * * *")
async runPurgeWorker() {
  const duePurges = await this.db
    .select({ id: organizations.id, purgeJobId: organizations.purgeJobId })
    .from(organizations)
    .where(and(
      eq(organizations.status, "PURGE_SCHEDULED"),
      lte(organizations.purgeScheduledAt, new Date()),
    ))
    .limit(5); // process in small batches

  for (const org of duePurges) {
    await this.executePurge(org.id, org.purgeJobId);
  }
}

private async executePurge(orgId: string, jobId: string | null) {
  // 1. Re-verify org is still PURGE_SCHEDULED and deadline passed (idempotency fence):
  const [org] = await this.db.select({ status: organizations.status, purgeJobId: organizations.purgeJobId })
    .from(organizations).where(eq(organizations.id, orgId)).for("update");
  if (!org || org.status !== "PURGE_SCHEDULED") return;   // cancelled or already purged
  if (jobId && org.purgeJobId !== jobId) return;          // stale worker claim

  // 2. Anonymize/destroy data per retention policy.
  //    Expand this as retention policy is formalized:
  await this.db.transaction(async (tx) => {
    // Nullify PII in audit logs (retain event records):
    await tx.update(auditLogs).set({ userId: null }).where(eq(auditLogs.orgId, orgId));
    // Mark org as PURGED:
    await tx.update(organizations).set({
      status: "PURGED",
      purgedAt: new Date(),
      name: "[Purged Organization]",
      slug: `purged-${orgId}`,
    }).where(eq(organizations.id, orgId));
  });
  // 3. Audit event for the purge completion (written to a platform audit table, not org-scoped):
  this.audit.log({ action: "org.purged", orgId, ... });
}
```

### Gate / exit criteria
- Scheduling a purge requires ARCHIVED status first.
- Cancelling a purge before its deadline restores ARCHIVED status.
- Worker re-run on an already-PURGED org is a no-op.
- Worker processes at most 5 orgs per run (bounded execution).
- End-to-end test: archive → schedule purge → wait past deadline → cron fires → org is PURGED.

### Collision risk
Low — this is new code with no existing callers. Safe to develop in parallel with other steps.

---

## Step 13 — Observe and contract

**Phase:** retirement (minimum 30 days + 2 releases after Step 10 writes stop).

### Checklist before contracting

- [ ] `is_owner` column has zero writes for ≥30 days and 2 releases (confirmed by query + telemetry).
- [ ] `owner_pointer_mismatch` metric is zero for ≥7 days.
- [ ] `invitations.acceptedAt`-based filter has zero reads (all consumers use `status`).
- [ ] Invitation hard-delete (`cancel`) path has zero calls (all use `status = REVOKED`).
- [ ] The old `uniq_org_members_user_org` global unique index is confirmed dropped (done in Step 3C).
- [ ] `VALIDATE CONSTRAINT fk_owner_membership` passed (done in Step 6).
- [ ] Zero quarantined orgs in `owner_repair_ledger`.
- [ ] Backup restore tested against the target schema.
- [ ] Owner approval in release checklist.

### Contraction migrations

```sql
-- Drop retired is_owner column:
ALTER TABLE organization_members DROP COLUMN is_owner;
DROP INDEX IF EXISTS idx_org_members_owner;

-- Drop legacy invitation filter compatibility index
-- (the new status-based index from Step 2 is canonical):
DROP INDEX IF EXISTS uniq_invitations_org_email_pending;
-- (replaced by uniq_invitations_org_email_status_pending)
```

Drizzle schema updates: remove `isOwner` from `organizationMembers`; remove the `isNull(acceptedAt)` guard from all service methods.

---

## Dependency graph

```
Step 1 (purge columns)
Step 2 (invitation schema)
Step 3 (partial unique)     → Step 11 (invitation backend hardening)
Step 4 (deferred FK)        → Step 5 (bootstrap repair) → Step 6 (NOT NULL)
                                                        → Step 7 (dual-read)
                                                            → Step 8 (shadow)
                                                                → Step 9 (switch)
                                                                    → Step 10 (retire column)
                                                                        → Step 13 (contract)
Step 12 (purge worker) — independent after Step 1

Steps 1, 2, 3, 12 can run in parallel.
Steps 4, 5, 6 are strictly sequential.
Steps 7, 8, 9, 10, 13 are strictly sequential.
Step 11 depends on Step 2 backfill being complete.
```

---

## Composite-FK matrix entry for this wave

| Child table | Child column | Parent table | Parent key | Tenant-owned | Candidate key | Composite FK | Nullability | Repair query | Wave | State |
|---|---|---|---|---|---|---|---|---|---|---|
| `organizations` | `(id, owner_membership_id)` | `organization_members` | `(org_id, id)` | Yes | `uniq_org_members_org_id` | `fk_owner_membership` DEFERRABLE | NOT NULL after Step 6 | Step 5 repair | 1 | PLANNED |
| `invitations` | `inviter_membership_id` | `organization_members` | `id` | Yes | PK | Simple FK DEFERRABLE | Nullable | Step 2 backfill | 1 | PLANNED |
| `invitations` | `accepted_membership_id` | `organization_members` | `id` | Yes | PK | Simple FK DEFERRABLE | Nullable | Step 2 backfill | 1 | PLANNED |
| `organizations` | `purge_scheduled_by` | `organization_members` | `id` | Yes | PK | Simple FK | Nullable | N/A (new) | 1 | PLANNED |

---

## Wave 1 exit criteria (from schema-change-plan.md §9)

- [ ] Exactly one valid owner per active organization (pointer enforced by NOT NULL + deferred FK + lifecycle trigger).
- [ ] Suspended and LEFT memberships fail immediately (guard rejects within the existing 15 s cache TTL; trigger prevents owner suspension before transfer).
- [ ] Concurrent transfer tests pass: two simultaneous `transferOwnership` calls for the same org → one commits, other gets a serialization or lock-conflict error.
- [ ] `is_owner` no longer used as an authorization source.
- [ ] Membership rejoin works: a LEFT member can accept a new invitation and receive a fresh membership row.
- [ ] Invitation lifecycle is explicit: PENDING / ACCEPTED / DECLINED / EXPIRED / REVOKED; cancel writes REVOKED, not DELETE.
- [ ] Purge lifecycle exists: PURGE_SCHEDULED and PURGED states, resumable cron worker, schedule/cancel API.
- [ ] All of the above confirmed over ≥2 releases with no regressions.

---

## Notes on collision risk and active editing

The following files are at high collision risk because they are actively edited by the user and this plan requires changes to them:

- `backend/src/db/schema/auth.ts` — Steps 1, 2, 3, 4, 6, 10 all modify this file. Coordinate migrations as a dedicated commit/PR before backend service changes land.
- `backend/src/modules/organization/organization.service.ts` — Steps 7, 9, 10, 12 require changes. Highest collision surface.
- `backend/src/modules/organization/invitations.service.ts` — Steps 2, 11 require changes.
- `backend/src/common/auth/jwt-auth.guard.ts` — Steps 7, 9, 10 require changes. Any parallel work on auth must be coordinated; a merge conflict here can silently break ownership derivation.

Recommended: open a `wave-1/tenant-invariants` branch, land schema migration PRs first (Steps 1–4), then service PRs (Steps 7, 11, 12), then the constraint PR (Step 6), then the shadow/switch PRs (Steps 8–10).
