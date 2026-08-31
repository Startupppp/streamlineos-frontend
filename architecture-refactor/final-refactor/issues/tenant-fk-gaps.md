# Tenant FK Gaps — Single-Column FKs to organization_members

**Lane:** P9 | **Date:** 2026-08-31 | **Territory:** `src/db/schema/common/audit-logs.ts`

---

## a) Claim verification

**File:** `backend/src/db/schema/common/audit-logs.ts` **line 27** (pre-edit):

```typescript
actorMembershipId: integer("actor_membership_id").references(() => organizationMembers.id, { onDelete: "set null" }),
```

Bare single-column FK confirmed. No composite `(org_id, actor_membership_id) → organization_members(org_id, id)` existed.

**DB state:** The FK was NOT in the Drizzle snapshot `migrations/meta/0464_snapshot.json` (column added by hand-written migration 0641 without a constraint). The bare FK also does not appear in any applied migration file. It existed only in the Drizzle schema source; `db:generate` would have proposed it as a new bare FK.

**Schema fix applied** (this lane's territory): removed `.references()` from the column, added `foreignKey({ columns: [orgId, actorMembershipId], foreignColumns: [organizationMembers.orgId, organizationMembers.id], name: "fk_audit_logs_org_actor_membership" })` in the table constraint list.

---

## b) Broader sweep — equivalent of pg_constraint query

Query logic: FK type `contype = 'f'`, single-column `array_length(conkey,1) = 1`, references `organization_members`, referencing table has an `org_id` column.

Source: static analysis of Drizzle schema files + snapshot `0464_snapshot.json`.

### Confirmed single-column FK gaps (table has org_id, no composite FK, references organization_members.id)

| Table | Column | onDelete | On DB? | Composite FK? |
|---|---|---|---|---|
| `audit_logs` | `actor_membership_id` | set null | No (schema only, now fixed) | Added by this lane |
| `invitations` | `inviter_membership_id` | set null | Yes (in snapshot) | None |
| `invitations` | `accepted_membership_id` | set null | Yes (in snapshot) | None |
| `invitations` | `revoked_by_membership_id` | set null | Yes (in snapshot) | None |

**Gap count:** 4 columns across 2 tables (3 live on DB, 1 fixed by this lane).

### Not a gap (redundant bare FK alongside an existing composite FK)

| Table | Column | Bare FK | Composite FK |
|---|---|---|---|
| `event_attendees` | `membership_id` | `.references(() => organizationMembers.id, onDelete: "restrict")` (schema only, not in snapshot) | `fk_event_attendees_org_membership` on `(org_id, membership_id)` (added post-snapshot via migration) |

The composite FK already enforces tenant integrity; the bare FK is redundant and uses a conflicting `onDelete` action. Not a correctness gap, but the bare FK should be removed from the schema to eliminate the redundant constraint generation.

### Tables with correct composite FK pattern (reference)

These are already correct and show the expected pattern:

- `principal_group_members.(org_id, organization_membership_id)`
- `role_assignments.(org_id, organization_membership_id)`
- `module_ownerships.(org_id, owner_membership_id)`
- `ownership_transfers.(org_id, from_membership_id)` and `(org_id, to_membership_id)`
- `managed_products.(org_id, owner_membership_id)`
- `calendar_events.(org_id, created_by_membership_id)`

---

## c) Migration SQL — audit_logs

The bare FK does NOT exist on the DB, so no DROP is needed. The migration adds the composite only.

```sql
SET lock_timeout = '5s';
--> statement-breakpoint

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_org_actor_membership
  FOREIGN KEY (org_id, actor_membership_id)
  REFERENCES organization_members (org_id, id)
  ON DELETE SET NULL (actor_membership_id)
  NOT VALID;
--> statement-breakpoint

ALTER TABLE audit_logs
  VALIDATE CONSTRAINT fk_audit_logs_org_actor_membership;
```

**Why NOT VALID + VALIDATE:** `ADD CONSTRAINT FOREIGN KEY` takes ACCESS EXCLUSIVE on both `audit_logs` and `organization_members` while installing triggers. The two-step split means the heavy lock is held only for the instantaneous NOT VALID install; VALIDATE runs with a weaker ShareRowExclusiveLock and can be interrupted without losing the constraint.

**Why `ON DELETE SET NULL (actor_membership_id)`:** The composite key includes `org_id`. Plain `ON DELETE SET NULL` on a composite FK NULLs every column in the key — including `org_id`, which would silently turn tenant audit rows into platform events, violating `chk_audit_logs_tenant_or_platform`. The Postgres 15 column-list syntax `SET NULL (actor_membership_id)` nulls only the membership column and leaves `org_id` intact. Neon runs PG 16.

**No CONCURRENTLY:** `db:migrate` runs inside a transaction; `CONCURRENTLY` is banned in transactions.

---

## d) Orphan check

Run before deploying the migration. If `orphan_count > 0`, the `VALIDATE` step will fail with FK violation.

```sql
SELECT COUNT(*) AS orphan_count
FROM audit_logs al
WHERE al.actor_membership_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.id    = al.actor_membership_id
      AND om.org_id = al.org_id
  );
```

**Expected count:** 0. Since no FK has ever been enforced on this column, it is theoretically possible for rows to carry a `(org_id, actor_membership_id)` pair that does not match any membership row (e.g. a membership deleted since the row was written, or a cross-org value written by a bug). If orphans exist, the repair step before VALIDATE is:

```sql
UPDATE audit_logs
SET actor_membership_id = NULL
WHERE actor_membership_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.id    = audit_logs.actor_membership_id
      AND om.org_id = audit_logs.org_id
  );
```

This should precede the VALIDATE statement in the migration, guarded by the orphan-check query to confirm the count.

---

## e) Partitioning status

`audit_logs` is NOT partitioned. The schema uses standard `pgTable("audit_logs", ...)` with a `serial` PK (not the `(id, created_at)` composite required by a partitioned PK). `relkind = 'r'` (ordinary table), not `'p'`.

CLAUDE.md §3 flags audit logs as a partitioning candidate alongside `ai_usage_logs`, notifications and chat messages. Partitioning must be decided before the composite FK is added, because:
- A partitioned table's PK must include the partition key (`created_at`), making bare `id` non-globally-unique
- FKs on partitioned tables require the PK/UNIQUE of the referenced table to include the partition key, or use a non-partitioned unique index

If partitioning is planned, the composite FK migration should be deferred until after the partitioning migration is settled.

---

## f) ON DELETE semantics for an audit trail

`SET NULL` on `actor_membership_id` is the correct action for an audit trail:
- The audit row is permanent; the membership reference is advisory ("who did this")
- `RESTRICT` would block membership hard-deletes that have associated audit entries — unacceptable for a high-volume table
- `CASCADE` would delete audit rows when a member leaves — catastrophically wrong

The column-list form `ON DELETE SET NULL (actor_membership_id)` is mandatory (not optional) because the FK is composite: the default `SET NULL` without a list NULLs every column in the key, including `org_id`. Since `org_id` is nullable by design (platform events have `org_id IS NULL`), Postgres would not raise 23502 — it would silently corrupt tenant events into platform events, breaking the `chk_audit_logs_tenant_or_platform` check only at query time.

---

## Open work (outside this lane's territory)

The three bare FKs on `invitations` are live on the DB and represent the same cross-tenant integrity gap. A separate migration (not numbered here) should:

1. Drop `invitations_inviter_membership_id_organization_members_id_fk`
2. Drop `invitations_accepted_membership_id_organization_members_id_fk`
3. Drop `invitations_revoked_by_membership_id_organization_members_id_fk`
4. Add composite FKs `(org_id, inviter_membership_id)`, `(org_id, accepted_membership_id)`, `(org_id, revoked_by_membership_id)` → `organization_members(org_id, id)`, each `NOT VALID`
5. Validate each
6. Run orphan checks first (same pattern as above)

The `event_attendees` bare FK should also be removed from the schema to avoid a spurious Drizzle-generated migration creating a redundant constraint alongside the existing composite FK.
