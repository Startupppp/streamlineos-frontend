# 05 — Every audit row names its tenant

**What to build:** An audit trail can be scoped with confidence. Today the tenant column is nullable, so a row without one is either a platform event or a bug and no query can tell the difference.

**Blocked by:** None — can start immediately

**Status:** done

**Audit note (2026-08-26):** Confirmed at source. `backend/src/db/schema/common/shared.ts:175`: `orgId: text("org_id").references(() => organizations.id)` — no `.notNull()`, so it is nullable. An `isPlatformEvent` boolean column exists at `shared.ts:183` (`isPlatformEvent: boolean("is_platform_event").notNull().default(false)`), which partially addresses AC #2, but no CHECK constraint enforces that a platform event must have `orgId IS NULL` or that a tenant event must have `orgId IS NOT NULL`. Migration `0479_audit_log_platform_events.sql` is unapplied. All ACs are BLOCKED on migration 0479.

**Lane 4 correction (2026-08-26): the premise of that audit note is false. `0479` IS journalled.** `migrations/meta/_journal.json` carries `0479_audit_log_platform_events` at **idx 268**. Its backfill and CHECK constraint are live on `db:migrate` and cold rebuilds. The product conflict is resolved below: platform events retain a NULL tenant, and the marker makes that state explicit.

## Acceptance criteria

- [x] Every audit row has a tenant or an explicit platform representation. — **RULING:** keep `orgId` nullable because a platform event genuinely has no tenant; do not use a sentinel organization. The invariant is exact and mutually exclusive: `(org_id IS NULL) = is_platform_event`. It is declared in `backend/src/db/schema/common/audit-logs.ts` and enforced by `0479` plus corrective migration `0606`.
- [x] Platform-level events have an explicit representation, distinguishable from tenant events. — `audit-logs.ts`: `isPlatformEvent` is non-null with a false default, and the exact consistency CHECK rejects either mixed state.
- [x] A row with neither is rejected by the constraint. — `0479` introduced the check; `0606` tightened it to `CHECK ((org_id IS NULL) = is_platform_event)` and validated it online-safely.
- [x] Existing rows are backfilled before the constraint is applied. — Same migration, in this order: `UPDATE audit_logs SET is_platform_event = true WHERE org_id IS NULL;` runs **before** `ADD CONSTRAINT`. The `NOT VALID` → `VALIDATE` split keeps it online-safe per `backend/CLAUDE.md` §3.

## Todo

- [x] Backfill first, then constrain — `0479_audit_log_platform_events.sql` does the `UPDATE` before the `ADD CONSTRAINT`.
- [x] Add the constraint NOT VALID then validate, so the migration is online-safe — same migration; `ADD CONSTRAINT … NOT VALID` then `VALIDATE CONSTRAINT`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md).

The ORM definition and database constraint now agree. The earlier split-file gap is closed by `backend/src/db/schema/common/audit-logs.ts`.

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
