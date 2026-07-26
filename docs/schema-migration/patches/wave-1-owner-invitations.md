---
type: wave-1 patch spec
status: DRAFT
date: 2026-07-26
depends-on: wave-1-execution-plan.md (Steps 3-6, 2, 11)
verified-against:
  - backend/src/db/schema/auth.ts (2026-07-26)
  - backend/src/modules/organization/organization.service.ts (2026-07-26)
  - backend/src/modules/organization/invitations.service.ts (2026-07-26)
---

# Wave 1 Patch Spec — Owner Pointer + Invitation Lifecycle

All SQL is Neon-compatible (Postgres 16). Drizzle diffs show the exact
`auth.ts` and `enums.ts` lines to add/remove/change. "BEFORE" is the
current state verified from the repo on 2026-07-26.

---

## Verified baseline (confirmed from repo)

### `organizationMembers` columns (relevant subset)
```
id          serial PK
user_id     text NOT NULL → users.id CASCADE
org_id      text NOT NULL → organizations.id CASCADE
is_owner    boolean NOT NULL DEFAULT false
status      membershipStatusEnum (INVITED|ACTIVE|SUSPENDED|LEFT) NOT NULL DEFAULT ACTIVE
joined_at   timestamp NOT NULL DEFAULT NOW
```

### `organizationMembers` indexes (relevant)
```
UNIQUE  uniq_org_members_user_org    ON (user_id, org_id)         -- GLOBAL: blocks rejoin
UNIQUE  uniq_org_members_org_id      ON (org_id, id)              -- candidate key for composite FK
INDEX   idx_org_members_owner        ON (org_id, is_owner)
INDEX   idx_org_members_org_status   ON (org_id, status)
```

### `organizations` columns (relevant)
```
id                  text PK
owner_membership_id integer  -- NULLABLE; no FK constraint yet
status              text NOT NULL DEFAULT 'ACTIVE'  -- unconstrained text
```

### `invitations` columns
```
id          text PK
email       text NOT NULL
token       text NOT NULL UNIQUE
org_id      text NOT NULL → organizations.id CASCADE
role        text NOT NULL DEFAULT 'ENGINEERING'
invited_by  text NOT NULL → users.id   -- global user FK, NOT membership FK
expires_at  timestamp NOT NULL
accepted_at timestamp  -- NULL = pending; lifecycle via acceptedAt IS NULL
```

### `invitations` indexes
```
INDEX  idx_invitations_org_email         ON (org_id, email)
INDEX  idx_invitations_expires           ON (expires_at)
UNIQUE uniq_invitations_org_email_pending ON (org_id, email) WHERE accepted_at IS NULL
```

### `enums.ts` — confirmed absent
- `organizationStatusEnum` — does not exist
- `invitationStatusEnum` — does not exist

### Service behavior confirmed
- `OrganizationService.leaveOrg` — hard-DELETEs the membership row
- `OrganizationService.suspendMember` — guards with `member.isOwner` (column read)
- `InvitationsService.cancel` — hard-DELETEs the invitation row
- `InvitationsService.accept` — uses `onConflictDoNothing()` on member insert
- `InvitationsService.listPending` — filters `isNull(invitations.acceptedAt)`
- `OrganizationService.createOrganization` — already uses `SELECT nextval(...)` + sets `ownerMembershipId` in the same tx (circular-FK-safe pattern already present)

---

## Patch A — Deferred composite FK with NOT VALID + VALIDATE

**Applies to:** Step 4 of the execution plan.
**Precondition:** the candidate key `uniq_org_members_org_id ON (org_id, id)` already exists
as a `uniqueIndex`. Postgres FKs can reference unique indexes since PG 15; however, for
named constraint referencing we must promote it to a named constraint first.

### A-1 Promote the unique index to a named constraint

#### SQL (raw migration, not managed by Drizzle `generate`)

```sql
-- Migration: 0XXX_wave1_org_owner_fk_candidate_key.sql
-- Purpose: promote the existing uniq index to a named UNIQUE CONSTRAINT so
--          the composite deferred FK can reference it by name.

BEGIN;

-- Check whether the index already backs a constraint (idempotency fence):
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_org_members_org_id'
      AND conrelid = 'organization_members'::regclass
  ) THEN
    -- Postgres does not let you directly convert a unique index to a constraint.
    -- We must drop the index and recreate as a constraint.
    -- Step 1: create the replacement constraint (same columns, same effect):
    ALTER TABLE organization_members
      ADD CONSTRAINT uq_org_members_org_id
        UNIQUE (org_id, id)
        DEFERRABLE INITIALLY DEFERRED;
    -- The old index uniq_org_members_org_id will be auto-dropped because the
    -- new constraint creates an equivalent index; but if Postgres complains about
    -- a duplicate index, drop the old one first:
    -- DROP INDEX IF EXISTS uniq_org_members_org_id;
    -- then rerun the ADD CONSTRAINT.
  END IF;
END $$;

COMMIT;
```

> **Operator note:** run `\d organization_members` after applying to confirm
> `uq_org_members_org_id` appears under "Indexes" as "(unique, deferrable)".
> If the original `uniq_org_members_org_id` uniqueIndex still exists as a
> separate index entry, drop it: `DROP INDEX CONCURRENTLY uniq_org_members_org_id;`

#### Drizzle schema diff (`auth.ts` — `organizationMembers` table constraints)

BEFORE:
```typescript
}, (table) => [
  uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),
  uniqueIndex("uniq_org_members_org_id").on(table.orgId, table.id),
  index("idx_org_members_org_role").on(table.orgId, table.role),
  index("idx_org_members_owner").on(table.orgId, table.isOwner),
  index("idx_org_members_org_status").on(table.orgId, table.status),
]);
```

AFTER (Step A-1 only — the uniqueIndex becomes a named unique constraint; Drizzle
represents this with `unique()` not `uniqueIndex()` to signal it's a constraint):
```typescript
}, (table) => [
  uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),
  // Promoted to named constraint for composite FK reference:
  unique("uq_org_members_org_id").on(table.orgId, table.id).deferrable(),
  index("idx_org_members_org_role").on(table.orgId, table.role),
  index("idx_org_members_owner").on(table.orgId, table.isOwner),
  index("idx_org_members_org_status").on(table.orgId, table.status),
]);
```

> Drizzle's `unique(...).deferrable()` emits `DEFERRABLE INITIALLY DEFERRED` in
> the generated SQL. Verify with `pnpm -C backend db:generate` that the migration
> diff matches the intent above before pushing.

---

### A-2 Add composite FK as NOT VALID

#### SQL (raw migration — Drizzle cannot express deferred FKs in DSL)

```sql
-- Migration: 0XXX_wave1_org_owner_composite_fk.sql
-- Run AFTER A-1 and AFTER Step 5 bootstrap repair completes (zero NULL pointers,
-- zero quarantined orgs). Add NOT VALID first to avoid a full table scan at
-- lock-holding time; then VALIDATE separately.

BEGIN;

ALTER TABLE organizations
  ADD CONSTRAINT fk_org_owner_membership
    FOREIGN KEY (id, owner_membership_id)
    REFERENCES organization_members (org_id, id)
    DEFERRABLE INITIALLY DEFERRED
    NOT VALID;

COMMIT;
```

**Why NOT VALID:** Postgres acquires `SHARE ROW EXCLUSIVE` during a validating
`ADD CONSTRAINT`, which blocks all concurrent writes to the table for the duration
of the full scan. `NOT VALID` makes the DDL instant (only acquires a brief
`ACCESS EXCLUSIVE` to write the catalog entry) and defers validation to a later
`VALIDATE CONSTRAINT` which only needs `SHARE UPDATE EXCLUSIVE` (non-blocking to
reads and most writes).

#### Drizzle note
Drizzle does not support `DEFERRABLE` or `NOT VALID` on foreign keys via the
schema DSL. The constraint is declared in a raw SQL migration file and documented
in the composite-FK matrix. For TypeScript type safety only, add a non-deferrable
reference comment in the Drizzle schema — do not add an actual `foreignKey()` call
for this constraint as Drizzle would try to regenerate it without the deferrable
clause.

---

### A-3 VALIDATE CONSTRAINT (runs after Step 5 repair, zero quarantined orgs)

```sql
-- Migration: 0XXX_wave1_org_owner_validate_fk.sql
-- Gate: SELECT COUNT(*) FROM owner_repair_ledger WHERE problem_class = 'QUARANTINE' = 0
--       SELECT COUNT(*) FROM organizations WHERE owner_membership_id IS NULL
--         AND status NOT IN ('PURGED') = 0

ALTER TABLE organizations
  VALIDATE CONSTRAINT fk_org_owner_membership;
```

This runs with only `SHARE UPDATE EXCLUSIVE` — does not block writes, safe on a
live table of any size.

---

## Patch B — Owner lifecycle trigger (full plpgsql)

**Applies to:** Step 4 of the execution plan.
**Purpose:** DB-level backstop preventing the owner membership from being
SUSPENDED, LEFT, or deleted before ownership transfer. Uses a DEFERRABLE
CONSTRAINT TRIGGER so it fires at COMMIT, allowing `transferOwnership` to
update the pointer and the old-owner membership status atomically in one tx.

### SQL

```sql
-- Migration: 0XXX_wave1_owner_lifecycle_trigger.sql

-- ── Function 1: guard status transitions ──────────────────────────────────
CREATE OR REPLACE FUNCTION fn_guard_owner_membership_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_membership_id INTEGER;
BEGIN
  -- Only intercept transitions into SUSPENDED or LEFT.
  IF NEW.status NOT IN ('SUSPENDED', 'LEFT') THEN
    RETURN NEW;
  END IF;

  -- Look up the org's current owner pointer.
  -- Use a plain SELECT (no FOR UPDATE) because we are already inside a
  -- ROW-level trigger after the membership UPDATE; locking here would
  -- deadlock against the transferOwnership tx which holds locks on both rows.
  SELECT owner_membership_id
    INTO v_owner_membership_id
    FROM organizations
   WHERE id = NEW.org_id;

  -- If this membership IS the current owner pointer, block.
  IF v_owner_membership_id IS NOT NULL
     AND v_owner_membership_id = NEW.id THEN
    RAISE EXCEPTION
      'owner_membership_protected: membership id=% is the owner of org %. '
      'Transfer ownership before suspending or removing this member.',
      NEW.id, NEW.org_id
      USING ERRCODE = 'P0002',
            HINT    = 'Call POST /organizations/:orgId/transfer-ownership first.';
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger 1: on UPDATE OF status ────────────────────────────────────────
-- DEFERRABLE INITIALLY DEFERRED: fires at COMMIT, not at statement end.
-- This allows transferOwnership to run:
--   UPDATE organizations SET owner_membership_id = newMember.id ...    ← pointer moves
--   UPDATE organizationMembers SET status = 'LEFT' WHERE id = oldMember.id ← now OK at COMMIT
-- because by COMMIT the pointer no longer points at the old member.
DROP TRIGGER IF EXISTS trg_guard_owner_membership_status ON organization_members;
CREATE CONSTRAINT TRIGGER trg_guard_owner_membership_status
  AFTER UPDATE OF status ON organization_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_owner_membership_status();

-- ── Function 2: guard DELETE ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_guard_owner_membership_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_membership_id INTEGER;
BEGIN
  SELECT owner_membership_id
    INTO v_owner_membership_id
    FROM organizations
   WHERE id = OLD.org_id;

  IF v_owner_membership_id IS NOT NULL
     AND v_owner_membership_id = OLD.id THEN
    RAISE EXCEPTION
      'owner_membership_protected: cannot delete membership id=% which is '
      'the owner of org %. Transfer ownership first.',
      OLD.id, OLD.org_id
      USING ERRCODE = 'P0002',
            HINT    = 'Call POST /organizations/:orgId/transfer-ownership first.';
  END IF;

  RETURN OLD;
END;
$$;

-- ── Trigger 2: on DELETE ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_guard_owner_membership_delete ON organization_members;
CREATE CONSTRAINT TRIGGER trg_guard_owner_membership_delete
  AFTER DELETE ON organization_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_owner_membership_delete();
```

### Drizzle note
Drizzle has no DSL for `CONSTRAINT TRIGGER`. These triggers live permanently in
a raw SQL migration file. They must be re-applied to any branch database via
`pnpm -C backend db:migrate`.

### Backend error-handling change

When `OrganizationService.removeMember` or `suspendMember` triggers `P0002`:

```typescript
// In organization.service.ts — add to the catch block of any method that
// touches organizationMembers status or deletes a row:
} catch (err: unknown) {
  const pg = err as { code?: string; message?: string };
  if (pg.code === 'P0002') {
    throw new ForbiddenException(
      'Cannot modify the owner membership before transferring ownership.'
    );
  }
  throw err;
}
```

Both `suspendMember` and `removeMember` already guard via `isOwner` at the
application layer. The trigger is an additional DB-level backstop for any path
that bypasses the service layer (raw scripts, future services).

---

## Patch C — Owner bootstrap repair migration (idempotent plpgsql procedure)

**Applies to:** Step 5 of the execution plan (riskiest step).
**Run order:** after Patch A is applied; before Patch A-3 (VALIDATE) and Patch D (NOT NULL).

### C-1 Repair ledger table

```sql
-- Migration: 0XXX_wave1_owner_repair_ledger.sql
-- Must exist before the repair procedure runs.

CREATE TABLE IF NOT EXISTS owner_repair_ledger (
  org_id              TEXT          NOT NULL,
  repaired_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  problem_class       TEXT          NOT NULL
                        CHECK (problem_class IN (
                          'NO_OWNER', 'MULTI_OWNER', 'STALE_POINTER', 'QUARANTINE'
                        )),
  old_owner_member_id INTEGER,
  new_owner_member_id INTEGER,
  winning_user_id     TEXT,
  losing_member_ids   INTEGER[],
  notes               TEXT,
  checksum            TEXT          NOT NULL,
  -- checksum = md5(org_id || '|' || COALESCE(new_owner_member_id::text, 'NULL'))
  -- Used to detect post-repair drift on re-runs.
  PRIMARY KEY (org_id, repaired_at)
);

CREATE INDEX IF NOT EXISTS idx_repair_ledger_class
  ON owner_repair_ledger (problem_class)
  WHERE problem_class = 'QUARANTINE';
```

### C-2 Repair procedure

```sql
-- Migration: 0XXX_wave1_owner_repair_procedure.sql

CREATE OR REPLACE PROCEDURE proc_repair_owner_pointer(p_org_id TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_pointer    INTEGER;
  v_owner_members      RECORD;
  v_active_owners      INTEGER[] := '{}';
  v_candidate_id       INTEGER;
  v_candidate_user_id  TEXT;
  v_existing_ledger    RECORD;
  v_checksum           TEXT;
  v_losing_ids         INTEGER[];
BEGIN
  -- ── Idempotency: check ledger first ──────────────────────────────────────
  SELECT *
    INTO v_existing_ledger
    FROM owner_repair_ledger
   WHERE org_id = p_org_id
     AND problem_class <> 'QUARANTINE'
   ORDER BY repaired_at DESC
   LIMIT 1;

  IF FOUND THEN
    -- Already repaired. Verify the current state matches the recorded pointer.
    SELECT owner_membership_id
      INTO v_current_pointer
      FROM organizations
     WHERE id = p_org_id;

    IF v_current_pointer = v_existing_ledger.new_owner_member_id THEN
      RAISE NOTICE 'org % already repaired (pointer=%). Skipping.', p_org_id, v_current_pointer;
      RETURN;
    ELSE
      RAISE WARNING
        'org % was repaired (ledger says pointer=%) but current pointer=% drifted. '
        'Inserting a QUARANTINE entry for operator review.',
        p_org_id, v_existing_ledger.new_owner_member_id, v_current_pointer;
      INSERT INTO owner_repair_ledger
        (org_id, problem_class, old_owner_member_id, new_owner_member_id, notes, checksum)
      VALUES (
        p_org_id, 'QUARANTINE',
        v_current_pointer, v_existing_ledger.new_owner_member_id,
        'Post-repair drift detected. Operator must resolve.',
        md5(p_org_id || '|NULL')
      );
      RETURN;
    END IF;
  END IF;

  -- ── Acquire row-level locks to prevent concurrent repair ─────────────────
  PERFORM id, owner_membership_id
    FROM organizations
   WHERE id = p_org_id
     FOR UPDATE NOWAIT;

  PERFORM id, user_id, status, is_owner
    FROM organization_members
   WHERE org_id = p_org_id
     FOR UPDATE NOWAIT;

  -- ── Load current pointer ──────────────────────────────────────────────────
  SELECT owner_membership_id
    INTO v_current_pointer
    FROM organizations
   WHERE id = p_org_id;

  -- ── Collect is_owner=true membership IDs ─────────────────────────────────
  SELECT ARRAY_AGG(id ORDER BY joined_at ASC, id ASC)
    INTO v_active_owners
    FROM organization_members
   WHERE org_id   = p_org_id
     AND is_owner = TRUE
     AND status   = 'ACTIVE';

  -- ── Case 1: Exactly one active is_owner row, pointer already matches ──────
  IF array_length(v_active_owners, 1) = 1
     AND v_current_pointer = v_active_owners[1] THEN
    -- Nothing to repair for this org.
    v_checksum := md5(p_org_id || '|' || v_active_owners[1]::text);
    INSERT INTO owner_repair_ledger
      (org_id, problem_class, old_owner_member_id, new_owner_member_id,
       winning_user_id, notes, checksum)
    SELECT
      p_org_id, 'NO_OWNER',
      NULL, v_active_owners[1],
      user_id,
      'Verified: pointer already correct, no data changed.',
      v_checksum
    FROM organization_members WHERE id = v_active_owners[1];
    RETURN;
  END IF;

  -- ── Case 2: Exactly one active is_owner, but pointer is wrong/NULL ────────
  IF array_length(v_active_owners, 1) = 1 THEN
    v_candidate_id := v_active_owners[1];
    SELECT user_id INTO v_candidate_user_id
      FROM organization_members WHERE id = v_candidate_id;
    v_checksum := md5(p_org_id || '|' || v_candidate_id::text);

    UPDATE organizations
       SET owner_membership_id = v_candidate_id
     WHERE id = p_org_id;

    INSERT INTO owner_repair_ledger
      (org_id, problem_class, old_owner_member_id, new_owner_member_id,
       winning_user_id, notes, checksum)
    VALUES (
      p_org_id, 'STALE_POINTER',
      v_current_pointer, v_candidate_id,
      v_candidate_user_id,
      'Single is_owner=true member; pointer corrected.',
      v_checksum
    );
    RETURN;
  END IF;

  -- ── Case 3: Multiple is_owner=true rows ───────────────────────────────────
  IF array_length(v_active_owners, 1) > 1 THEN
    -- Winner = earliest ACTIVE is_owner member (deterministic tie-break: lowest id).
    v_candidate_id := v_active_owners[1]; -- ARRAY_AGG ordered by (joined_at ASC, id ASC)
    SELECT user_id INTO v_candidate_user_id
      FROM organization_members WHERE id = v_candidate_id;

    -- Check for genuine ambiguity: same joined_at on the top two candidates.
    DECLARE
      v_first_joined  TIMESTAMPTZ;
      v_second_joined TIMESTAMPTZ;
    BEGIN
      SELECT joined_at INTO v_first_joined
        FROM organization_members WHERE id = v_active_owners[1];
      SELECT joined_at INTO v_second_joined
        FROM organization_members WHERE id = v_active_owners[2];

      IF v_first_joined = v_second_joined THEN
        -- Ambiguous: quarantine for operator review.
        INSERT INTO owner_repair_ledger
          (org_id, problem_class, old_owner_member_id, new_owner_member_id,
           losing_member_ids, notes, checksum)
        VALUES (
          p_org_id, 'QUARANTINE',
          v_current_pointer, NULL,
          v_active_owners,
          'Multiple is_owner=true rows with identical joined_at. Operator must choose.',
          md5(p_org_id || '|NULL')
        );
        RETURN;
      END IF;
    END;

    -- Unambiguous: strip is_owner from losers, set pointer to winner.
    v_losing_ids := v_active_owners[2:]; -- all except index 1

    UPDATE organization_members
       SET is_owner = FALSE
     WHERE id = ANY(v_losing_ids)
       AND org_id = p_org_id;

    UPDATE organizations
       SET owner_membership_id = v_candidate_id
     WHERE id = p_org_id;

    v_checksum := md5(p_org_id || '|' || v_candidate_id::text);
    INSERT INTO owner_repair_ledger
      (org_id, problem_class, old_owner_member_id, new_owner_member_id,
       winning_user_id, losing_member_ids, notes, checksum)
    VALUES (
      p_org_id, 'MULTI_OWNER',
      v_current_pointer, v_candidate_id,
      v_candidate_user_id,
      v_losing_ids,
      'Multiple is_owner=true. Winner = earliest member by joined_at.',
      v_checksum
    );
    RETURN;
  END IF;

  -- ── Case 4: No is_owner=true row at all ───────────────────────────────────
  -- Best fallback: find the earliest ACTIVE member (likely the founder).
  SELECT id, user_id
    INTO v_candidate_id, v_candidate_user_id
    FROM organization_members
   WHERE org_id = p_org_id
     AND status = 'ACTIVE'
   ORDER BY joined_at ASC, id ASC
   LIMIT 1;

  IF v_candidate_id IS NULL THEN
    -- No active members at all — org is orphaned. Quarantine.
    INSERT INTO owner_repair_ledger
      (org_id, problem_class, old_owner_member_id, new_owner_member_id, notes, checksum)
    VALUES (
      p_org_id, 'QUARANTINE',
      v_current_pointer, NULL,
      'No active members. Operator must resolve or archive org.',
      md5(p_org_id || '|NULL')
    );
    RETURN;
  END IF;

  UPDATE organization_members
     SET is_owner = TRUE
   WHERE id = v_candidate_id;

  UPDATE organizations
     SET owner_membership_id = v_candidate_id
   WHERE id = p_org_id;

  v_checksum := md5(p_org_id || '|' || v_candidate_id::text);
  INSERT INTO owner_repair_ledger
    (org_id, problem_class, old_owner_member_id, new_owner_member_id,
     winning_user_id, notes, checksum)
  VALUES (
    p_org_id, 'NO_OWNER',
    v_current_pointer, v_candidate_id,
    v_candidate_user_id,
    'No is_owner=true row found. Earliest ACTIVE member promoted.',
    v_checksum
  );
END;
$$;
```

### C-3 Batch runner (call after procedure is created)

```sql
-- Run this AFTER creating the procedure. Safe to re-run — idempotent per org.
-- Wrap in a DO block to iterate all non-PURGED orgs:

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM organizations
     WHERE status NOT IN ('PURGED')
     ORDER BY created_at ASC  -- process oldest first
  LOOP
    BEGIN
      CALL proc_repair_owner_pointer(r.id);
    EXCEPTION
      WHEN lock_not_available THEN
        RAISE WARNING 'org % is locked by another session; skipping for now.', r.id;
      WHEN OTHERS THEN
        RAISE WARNING 'org % repair failed: % (SQLSTATE: %)', r.id, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END;
$$;

-- Gate check after repair:
SELECT
  COUNT(*)                                               AS total_orgs,
  COUNT(*) FILTER (WHERE owner_membership_id IS NULL)    AS null_pointers,
  (SELECT COUNT(*) FROM owner_repair_ledger
    WHERE problem_class = 'QUARANTINE')                  AS quarantine_count
FROM organizations
WHERE status NOT IN ('PURGED');

-- Expected: null_pointers = 0, quarantine_count = 0 before proceeding to Patch D.
```

### Drizzle schema change for repair ledger

Add to `auth.ts` (or a new `backend/src/db/schema/platform.ts`):

```typescript
// In backend/src/db/schema/auth.ts (append before relations):
export const ownerRepairLedger = pgTable("owner_repair_ledger", {
  orgId:            text("org_id").notNull(),
  repairedAt:       timestamp("repaired_at", { withTimezone: true })
                      .defaultNow().notNull(),
  problemClass:     text("problem_class").notNull(),
  oldOwnerMemberId: integer("old_owner_member_id"),
  newOwnerMemberId: integer("new_owner_member_id"),
  winningUserId:    text("winning_user_id"),
  losingMemberIds:  integer("losing_member_ids").array(),
  notes:            text("notes"),
  checksum:         text("checksum").notNull(),
}, (table) => [
  primaryKey({ columns: [table.orgId, table.repairedAt] }),
  index("idx_repair_ledger_quarantine").on(table.problemClass)
    .where(sql`problem_class = 'QUARANTINE'`),
]);
```

---

## Patch D — NOT NULL on owner_membership_id

**Applies to:** Step 6 of the execution plan.
**Precondition:** Patch A-3 (VALIDATE) completed. Repair ledger shows zero QUARANTINE rows
and zero NULL pointers (confirmed by the gate check in C-3).

### SQL

```sql
-- Migration: 0XXX_wave1_owner_not_null.sql
-- On Postgres 12+, SET NOT NULL is a metadata-only operation when a validated
-- CHECK constraint already guarantees the column is non-null. We use a CHECK
-- NOT VALID → VALIDATE pattern to keep the lock window minimal.

BEGIN;

-- Step 1: Add CHECK NOT VALID (instant — no table scan, brief ACCESS EXCLUSIVE):
ALTER TABLE organizations
  ADD CONSTRAINT chk_owner_membership_id_not_null
    CHECK (owner_membership_id IS NOT NULL)
    NOT VALID;

COMMIT;

-- Step 2: Validate CHECK (SHARE UPDATE EXCLUSIVE — non-blocking to writes):
ALTER TABLE organizations
  VALIDATE CONSTRAINT chk_owner_membership_id_not_null;

-- Step 3: Now SET NOT NULL is instant (Postgres skips the scan):
BEGIN;
ALTER TABLE organizations
  ALTER COLUMN owner_membership_id SET NOT NULL;
-- Step 4 (optional cleanup): drop the CHECK once NOT NULL is enforced by the column:
ALTER TABLE organizations
  DROP CONSTRAINT chk_owner_membership_id_not_null;
COMMIT;
```

> Steps 1–2 and 3–4 can be in separate migration files to keep lock windows short.
> On Neon serverless (no ALTER blocking concern), they can be one file.

### Drizzle schema diff (`auth.ts` — `organizations` table)

BEFORE:
```typescript
ownerMembershipId: integer("owner_membership_id"),
```

AFTER:
```typescript
ownerMembershipId: integer("owner_membership_id").notNull(),
```

### Service change

`OrganizationService` already inserts `ownerMembershipId` in `createOrganization`.
After NOT NULL is enforced, remove any `?? null` fallbacks:

BEFORE (anywhere this field is read):
```typescript
ownerMembershipId: org.ownerMembershipId ?? null,
```

AFTER:
```typescript
ownerMembershipId: org.ownerMembershipId,  // guaranteed non-null
```

---

## Patch E — Partial unique replacing global (user_id, org_id)

**Applies to:** Step 3 of the execution plan.
**Purpose:** Allow a previously-LEFT member to rejoin via a new invitation.
The current global unique blocks this entirely.

### E-1 Create replacement partial index (CONCURRENT — no lock)

```sql
-- Migration: 0XXX_wave1_partial_unique_member_active.sql
-- Step A: create partial index first (CONCURRENTLY = no ACCESS EXCLUSIVE lock):
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_org_members_user_org_active
  ON organization_members (user_id, org_id)
  WHERE status <> 'LEFT';

-- Verify zero violations before proceeding to Step B:
-- SELECT user_id, org_id, COUNT(*) FROM organization_members
-- WHERE status <> 'LEFT'
-- GROUP BY user_id, org_id HAVING COUNT(*) > 1;
-- Expected: zero rows.
```

### E-2 Drop old global unique (SEPARATE migration — run after shadow phase)

```sql
-- Migration: 0XXX_wave1_drop_global_unique_member.sql
-- Run ONLY after:
--   1. leaveOrg is confirmed to write status='LEFT' (not DELETE) in production for ≥7 days.
--   2. Zero duplicate (user_id, org_id) active rows confirmed by the gate query above.
--   3. InvitationsService.accept is updated to handle the rejoin path.

DROP INDEX CONCURRENTLY IF EXISTS uniq_org_members_user_org;
```

### Drizzle schema diff (`auth.ts` — `organizationMembers` constraints)

BEFORE:
```typescript
uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),
```

AFTER (replace the line above with both entries; remove old one once Step E-2 runs):
```typescript
// During transition (both indexes coexist):
uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),     // DROP after Step E-2
uniqueIndex("uniq_org_members_user_org_active")
  .on(table.userId, table.orgId)
  .where(sql`status <> 'LEFT'`),                                            // canonical

// After Step E-2 (remove the first line):
uniqueIndex("uniq_org_members_user_org_active")
  .on(table.userId, table.orgId)
  .where(sql`status <> 'LEFT'`),
```

### Service change — `leaveOrg` (DELETE → status update)

**This change must land before Step E-2 (dropping the old global unique).**

BEFORE (`organization.service.ts` lines 588–609):
```typescript
const nextOrgId = await this.db.transaction(async (tx) => {
  await tx
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId),
      ),
    );
  const [remaining] = await tx
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .orderBy(desc(organizationMembers.joinedAt))
    .limit(1);
  const fallbackOrgId = remaining?.orgId ?? null;
  await tx
    .update(users)
    .set({ lastActiveOrgId: fallbackOrgId })
    .where(and(eq(users.id, userId), eq(users.lastActiveOrgId, orgId)));
  return fallbackOrgId;
});
```

AFTER:
```typescript
const nextOrgId = await this.db.transaction(async (tx) => {
  // Status update — preserves history, enables partial-unique rejoin.
  await tx
    .update(organizationMembers)
    .set({ status: "LEFT", leftAt: new Date() })
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId),
      ),
    );
  const [remaining] = await tx
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        sql`status <> 'LEFT'`,              // only active memberships as fallback
      ),
    )
    .orderBy(desc(organizationMembers.joinedAt))
    .limit(1);
  const fallbackOrgId = remaining?.orgId ?? null;
  await tx
    .update(users)
    .set({ lastActiveOrgId: fallbackOrgId })
    .where(and(eq(users.id, userId), eq(users.lastActiveOrgId, orgId)));
  return fallbackOrgId;
});
```

### Service change — `InvitationsService.accept` (rejoin path)

After the partial unique lands, a rejoin must insert a new membership row (new PK)
rather than rely on `onConflictDoNothing()` which would silently do nothing on the
new partial-unique violation.

BEFORE (in both accept paths, lines ~325 and ~369):
```typescript
await tx
  .insert(organizationMembers)
  .values({ userId: existingUser.id, orgId: invitation.orgId, role: invitation.role })
  .onConflictDoNothing();
```

AFTER — explicit pre-check + clean insert:
```typescript
// Check for any non-LEFT membership (would violate the new partial unique):
const activeMembership = await tx.query.organizationMembers.findFirst({
  where: and(
    eq(organizationMembers.userId, existingUser.id),
    eq(organizationMembers.orgId, invitation.orgId),
    sql`status <> 'LEFT'`,
  ),
  columns: { id: true },
});
if (activeMembership) {
  throw new ConflictException("You are already an active member of this organization");
}
// Insert fresh row — serial PK allocates a new id regardless of any LEFT row.
await tx.insert(organizationMembers).values({
  userId: existingUser.id,
  orgId: invitation.orgId,
  role: invitation.role,
  status: "ACTIVE",
  activatedAt: new Date(),
});
```

Apply the same change to the new-user accept path (the `userId = randomUUID()` branch),
removing `.onConflictDoNothing()` (a brand-new userId cannot conflict anyway, but the
explicit insert is cleaner and avoids a silent no-op if any logic changes).

---

## Patch F — Invitation status enum + lifecycle columns

**Applies to:** Step 2 of the execution plan.

### F-1 Enum: add to `enums.ts`

BEFORE: `invitationStatusEnum` does not exist in `enums.ts`.

AFTER — add after `membershipStatusEnum` (line 57 of `enums.ts`):
```typescript
export const invitationStatusEnum = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "REVOKED",
]);
```

### F-2 Schema columns: add to `invitations` table in `auth.ts`

BEFORE (`invitations` table, lines 187–201):
```typescript
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("ENGINEERING").notNull(),
  invitedBy: text("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_invitations_org_email").on(table.orgId, table.email),
  index("idx_invitations_expires").on(table.expiresAt),
  uniqueIndex("uniq_invitations_org_email_pending").on(table.orgId, table.email).where(sql`accepted_at IS NULL`),
]);
```

AFTER:
```typescript
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("ENGINEERING").notNull(),
  invitedBy: text("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // ── Wave 1: invitation lifecycle columns ──────────────────────────────────
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  inviterMembershipId: integer("inviter_membership_id")
    .references(() => organizationMembers.id, { onDelete: "set null" }),
  acceptedMembershipId: integer("accepted_membership_id")
    .references(() => organizationMembers.id, { onDelete: "set null" }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  revokedAt:  timestamp("revoked_at",  { withTimezone: true }),
  revokedBy:  integer("revoked_by")
    .references(() => organizationMembers.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_invitations_org_email").on(table.orgId, table.email),
  index("idx_invitations_expires").on(table.expiresAt),
  // Legacy partial unique — keep until Step 13:
  uniqueIndex("uniq_invitations_org_email_pending")
    .on(table.orgId, table.email)
    .where(sql`accepted_at IS NULL`),
  // New status-based partial unique (canonical after Step 11):
  uniqueIndex("uniq_invitations_org_email_status_pending")
    .on(table.orgId, table.email)
    .where(sql`status = 'PENDING'`),
  index("idx_invitations_org_status").on(table.orgId, table.status),
]);
```

Import additions needed at top of `auth.ts`:
```typescript
// Add invitationStatusEnum to the existing import from "./enums":
import { ..., invitationStatusEnum } from "./enums";
```

### F-3 SQL migration

```sql
-- Migration: 0XXX_wave1_invitation_status_enum.sql

BEGIN;

-- Enum type:
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM (
    'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New columns (all nullable or defaulted — additive, non-breaking):
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS status               invitation_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS inviter_membership_id INTEGER
    REFERENCES organization_members(id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN IF NOT EXISTS accepted_membership_id INTEGER
    REFERENCES organization_members(id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN IF NOT EXISTS declined_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by   INTEGER
    REFERENCES organization_members(id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- New index:
CREATE INDEX IF NOT EXISTS idx_invitations_org_status
  ON invitations (org_id, status);

-- Partial unique for status-based PENDING gate:
CREATE UNIQUE INDEX IF NOT EXISTS uniq_invitations_org_email_status_pending
  ON invitations (org_id, email)
  WHERE status = 'PENDING';

COMMIT;
```

### F-4 Backfill (idempotent, run in same or next migration)

```sql
-- Migration: 0XXX_wave1_invitation_status_backfill.sql

BEGIN;

-- Backfill status from legacy lifecycle fields (idempotent — touches only DEFAULT 'PENDING' rows):
UPDATE invitations
   SET status =
       CASE
         WHEN accepted_at IS NOT NULL          THEN 'ACCEPTED'
         WHEN expires_at  < NOW()              THEN 'EXPIRED'
         ELSE                                       'PENDING'
       END
 WHERE status = 'PENDING';
-- Note: 'DECLINED' and 'REVOKED' cannot be backfilled because cancel was a hard-delete;
-- all surviving rows with acceptedAt IS NULL are PENDING or EXPIRED.

-- Backfill inviter_membership_id (match invited_by user → membership in same org):
UPDATE invitations i
   SET inviter_membership_id = om.id
  FROM organization_members om
 WHERE om.user_id = i.invited_by
   AND om.org_id  = i.org_id
   AND i.inviter_membership_id IS NULL;
-- Rows where the inviter has LEFT (no non-LEFT membership found): remain NULL — acceptable.
-- If you want to match even LEFT memberships:
-- WHERE om.user_id = i.invited_by AND om.org_id = i.org_id AND i.inviter_membership_id IS NULL
-- ORDER BY om.status ASC -- prefer ACTIVE over LEFT if multiple rows exist

-- Backfill accepted_membership_id for ACCEPTED invitations:
UPDATE invitations i
   SET accepted_membership_id = om.id
  FROM organization_members om
       JOIN users u ON u.id = om.user_id
 WHERE i.status = 'ACCEPTED'
   AND u.email  = i.email
   AND om.org_id = i.org_id
   AND i.accepted_membership_id IS NULL;

COMMIT;

-- Gate check:
SELECT
  COUNT(*)                                                       AS total,
  COUNT(*) FILTER (WHERE status IS NULL)                         AS null_status,
  COUNT(*) FILTER (WHERE status = 'PENDING')                     AS pending,
  COUNT(*) FILTER (WHERE status = 'ACCEPTED')                    AS accepted,
  COUNT(*) FILTER (WHERE status = 'EXPIRED')                     AS expired,
  COUNT(*) FILTER (WHERE status = 'REVOKED')                     AS revoked
FROM invitations;
-- null_status must be 0 (NOT NULL enforced by column definition).
-- pending count should match: SELECT COUNT(*) FROM invitations WHERE accepted_at IS NULL AND expires_at > NOW()
```

### F-5 Service changes — `InvitationsService`

#### `cancel` — DELETE → REVOKED status update

BEFORE (`invitations.service.ts` lines 448–474):
```typescript
async cancel(orgId: string, invitationId: string, actorUserId: string) {
  const invitation = await this.db.query.invitations.findFirst({
    where: and(
      eq(invitations.id, invitationId),
      eq(invitations.orgId, orgId),
      isNull(invitations.acceptedAt),
    ),
  });
  if (!invitation) throw new NotFoundException("Invitation not found or already accepted");

  await this.db.delete(invitations).where(eq(invitations.id, invitationId));
  ...
}
```

AFTER:
```typescript
async cancel(orgId: string, invitationId: string, actorUserId: string) {
  const actorMembership = await this.db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, actorUserId),
      eq(organizationMembers.orgId, orgId),
    ),
    columns: { id: true },
  });

  const invitation = await this.db.query.invitations.findFirst({
    where: and(
      eq(invitations.id, invitationId),
      eq(invitations.orgId, orgId),
      isNull(invitations.acceptedAt),          // legacy guard (tolerant)
    ),
  });
  if (!invitation) throw new NotFoundException("Invitation not found or already accepted");

  await this.db
    .update(invitations)
    .set({
      status:    "REVOKED",
      revokedAt: new Date(),
      revokedBy: actorMembership?.id ?? null,
    })
    .where(eq(invitations.id, invitationId));

  this.audit.log({
    action:     "user.invitation.cancelled",
    userId:     actorUserId,
    orgId,
    targetId:   invitationId,
    targetType: "invitation",
    metadata:   { email: invitation.email },
  });

  return { success: true };
}
```

#### `listPending` — dual filter (tolerant)

BEFORE:
```typescript
.where(
  and(
    eq(invitations.orgId, orgId),
    isNull(invitations.acceptedAt),
    gt(invitations.expiresAt, new Date()),
  ),
)
```

AFTER (tolerant dual filter — both conditions return the same set during transition):
```typescript
.where(
  and(
    eq(invitations.orgId, orgId),
    or(
      eq(invitations.status, "PENDING"),    // new canonical
      isNull(invitations.acceptedAt),       // legacy fallback
    ),
    gt(invitations.expiresAt, new Date()),
  ),
)
```

Switch to `eq(invitations.status, "PENDING")` alone after the shadow phase
confirms 100% of pending rows have `status = 'PENDING'`.

#### `accept` — write status + acceptedMembershipId

In both accept branches, after the membership insert, add:
```typescript
await tx
  .update(invitations)
  .set({
    acceptedAt:           new Date(),
    status:               "ACCEPTED",
    acceptedMembershipId: newMembershipId,  // the id from the INSERT above
  })
  .where(eq(invitations.id, invitation.id));
```

To get `newMembershipId` from the insert:
```typescript
const [inserted] = await tx
  .insert(organizationMembers)
  .values({ userId: ..., orgId: invitation.orgId, role: invitation.role, ... })
  .returning({ id: organizationMembers.id });
const newMembershipId = inserted?.id ?? null;
```

#### `invite` (resend path) — also backfill `inviterMembershipId`

When resending, lookup the actor's membership to fill `inviterMembershipId`:
```typescript
const actorMembership = await tx.query.organizationMembers.findFirst({
  where: and(
    eq(organizationMembers.userId, actorUserId),
    eq(organizationMembers.orgId, orgId),
  ),
  columns: { id: true },
});
await tx.update(invitations).set({
  token:              hashToken(rawToken),
  expiresAt:          newExpiresAt,
  role,
  invitedBy:          actorUserId,
  inviterMembershipId: actorMembership?.id ?? null,
}).where(eq(invitations.id, pendingInvitation.id));
```

---

## Execution order

```
F-1 + F-2 + F-3  →  F-4 (backfill)  →  F-5 service changes
A-1               →  B (triggers)
E-1               →  (shadow ≥7 days) → E-2 (drop old index)
leaveOrg change   must land before E-2
C-1 + C-2         →  C-3 (run repair)
A-2 (NOT VALID FK, after zero NULL pointers confirmed)
D   (NOT NULL, after A-3 validates)
A-3 (VALIDATE FK, after D)

Parallelism: F-*, A-1, E-1, and C-1/C-2 can all run in the same migration
             window (they are additive). B depends on A-1.
             A-2 depends on C-3 completing with zero quarantine rows.
```

---

## Risk register

| Patch | Risk | Severity | Mitigation |
|-------|------|----------|------------|
| A-2 (deferred FK NOT VALID) | FK references a candidate key promoted from a uniqueIndex; Postgres may refuse if the index backing is not exactly `(org_id, id)` in that order | HIGH | Verify with `\d organization_members` that `uq_org_members_org_id` covers `(org_id, id)` before running A-2 |
| B (constraint trigger) | `SECURITY DEFINER` allows the trigger function to bypass RLS; if `organizations.owner_membership_id` is modified by a malicious transaction before the trigger fires, a false positive / false negative could occur | MEDIUM | Trigger reads current pointer with a plain SELECT — race is bounded by the deferred check at COMMIT; the pointer-update and membership-status-update must be in the same transaction |
| C-3 (batch repair) | `NOWAIT` lock acquisition means any org actively being transacted during the repair run is skipped | MEDIUM | Re-run the batch runner until the gate check shows zero quarantines and zero NULL pointers |
| C-3 (repair decision) | "Earliest ACTIVE member" heuristic for Case 4 may promote an admin instead of the actual founder if the founder's membership row was deleted | HIGH | Review all Case 4 rows manually before promoting; add a QUARANTINE sub-case for orgs where the earliest member joined more than 90 days after the org was created |
| E-2 (drop global unique) | If any code path still does a raw INSERT without the status guard, removing the global unique creates a window for duplicate active rows | HIGH | Gate E-2 on ≥7 days of production logs showing leaveOrg writes `status='LEFT'`; run the gate query from E-1 immediately before running E-2 |
| D (NOT NULL) | If a QUARANTINE org is missed, `ALTER COLUMN SET NOT NULL` will fail (non-NULL violation) and rollback, revealing the gap | LOW (desired failure) | The failure is recoverable: repair the quarantined org, re-run Patch D |

**Riskiest item: C-3 Case 4 heuristic** — promoting the "earliest ACTIVE member" for an org
with no `is_owner=true` row assumes membership order reflects founding intent, which is not
always true (e.g. the founder was removed and re-added). All Case 4 orgs should be audited
by an operator before the batch runner promotes them automatically; consider defaulting
all Case 4 orgs to QUARANTINE and requiring explicit resolution via the
`OrganizationService.repairOwnerPointer(orgId)` admin endpoint.
