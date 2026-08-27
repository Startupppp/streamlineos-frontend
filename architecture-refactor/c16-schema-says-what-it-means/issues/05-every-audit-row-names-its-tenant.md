# 05 — Every audit row names its tenant

**What to build:** An audit trail can be scoped with confidence. Today the tenant column is nullable, so a row without one is either a platform event or a bug and no query can tell the difference.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** Confirmed at source. `backend/src/db/schema/common/shared.ts:175`: `orgId: text("org_id").references(() => organizations.id)` — no `.notNull()`, so it is nullable. An `isPlatformEvent` boolean column exists at `shared.ts:183` (`isPlatformEvent: boolean("is_platform_event").notNull().default(false)`), which partially addresses AC #2, but no CHECK constraint enforces that a platform event must have `orgId IS NULL` or that a tenant event must have `orgId IS NOT NULL`. Migration `0479_audit_log_platform_events.sql` is unapplied. All ACs are BLOCKED on migration 0479.

## Acceptance criteria

- [ ] The tenant column is non-nullable. — **BLOCKED:** `orgId` is nullable at `shared.ts:175`; migration 0479 unapplied.
- [x] ~~Platform-level events have an explicit representation, distinguishable from tenant events.~~ **Partially satisfied:** `isPlatformEvent boolean NOT NULL DEFAULT false` exists at `shared.ts:183`, making platform events distinguishable by flag. However, no CHECK constraint ties the flag to `orgId` nullability, so a row can have `isPlatformEvent = false` AND `orgId IS NULL` (the "neither" case the next AC catches). Constraint is BLOCKED on migration 0479.
- [ ] A row with neither is rejected by the constraint. — **BLOCKED:** no CHECK constraint exists; migration 0479 unapplied.
- [ ] Existing rows are backfilled before the constraint is applied. — **BLOCKED:** requires live DB access; no DB access in this program.

## Todo

- [ ] Backfill first, then constrain — **BLOCKED:** migration 0479 unapplied.
- [ ] Add the constraint NOT VALID then validate, so the migration is online-safe — **BLOCKED:** migration 0479 unapplied.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
