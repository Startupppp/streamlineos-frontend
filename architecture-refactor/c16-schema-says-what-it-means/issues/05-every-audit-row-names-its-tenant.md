# 05 — Every audit row names its tenant

**What to build:** An audit trail can be scoped with confidence. Today the tenant column is nullable, so a row without one is either a platform event or a bug and no query can tell the difference.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** Confirmed at source. `backend/src/db/schema/common/shared.ts:175`: `orgId: text("org_id").references(() => organizations.id)` — no `.notNull()`, so it is nullable. An `isPlatformEvent` boolean column exists at `shared.ts:183` (`isPlatformEvent: boolean("is_platform_event").notNull().default(false)`), which partially addresses AC #2, but no CHECK constraint enforces that a platform event must have `orgId IS NULL` or that a tenant event must have `orgId IS NOT NULL`. Migration `0479_audit_log_platform_events.sql` is unapplied. All ACs are BLOCKED on migration 0479.

**Lane 4 correction (2026-08-26): the premise of that audit note is false. `0479` IS journalled.** `migrations/meta/_journal.json` carries `0479_audit_log_platform_events` at **idx 268** (verified by reading the journal, not by inference). The migration therefore runs on `db:migrate` and reproduces on a cold DB, so its backfill and its CHECK constraint are live. Three of the four criteria below are met; only the literal "non-nullable" wording is not, and it is not met **by design** — see AC 1.

## Acceptance criteria

- [ ] The tenant column is non-nullable. — **NOT SATISFIED, AND DELIBERATELY SO — this needs a product ruling, not more work.** `orgId` is still nullable at `backend/src/db/schema/common/shared.ts:175`. Migration `0479` resolved the tension between this criterion and the next one *the other way*: a platform-level event genuinely has no tenant, so making the column `NOT NULL` would either delete the platform-event representation AC 2 requires, or force a sentinel org id, which is worse than a NULL. `0479` instead enforces the real invariant — "every row is either a tenant row or an explicit platform row" — with `CHECK (org_id IS NOT NULL OR is_platform_event = true)`. Left unticked rather than reworded: the criterion as written is unsatisfiable alongside AC 2, and that is a decision for the ticket's author to confirm or overrule.
- [x] Platform-level events have an explicit representation, distinguishable from tenant events. — `shared.ts:183`: `isPlatformEvent: boolean("is_platform_event").notNull().default(false)`. The earlier "partially satisfied" caveat is now resolved: the CHECK that ties the flag to `org_id` nullability is live via `0479` (journal idx 268), so `isPlatformEvent = false AND org_id IS NULL` is rejected by the database.
- [x] A row with neither is rejected by the constraint. — `backend/migrations/0479_audit_log_platform_events.sql`: `ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_logs_tenant_or_platform CHECK (org_id IS NOT NULL OR is_platform_event = true) NOT VALID;` followed by `VALIDATE CONSTRAINT`. Journalled at idx 268, so it applies on `db:migrate` and on a cold rebuild.
- [x] Existing rows are backfilled before the constraint is applied. — Same migration, in this order: `UPDATE audit_logs SET is_platform_event = true WHERE org_id IS NULL;` runs **before** `ADD CONSTRAINT`. The `NOT VALID` → `VALIDATE` split keeps it online-safe per `backend/CLAUDE.md` §3.

## Todo

- [x] Backfill first, then constrain — `0479_audit_log_platform_events.sql` does the `UPDATE` before the `ADD CONSTRAINT`.
- [x] Add the constraint NOT VALID then validate, so the migration is online-safe — same migration; `ADD CONSTRAINT … NOT VALID` then `VALIDATE CONSTRAINT`.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — held open by AC 1 only.

**Lane 4 note (2026-08-26):** One gap found that no criterion covers, and Lane 4 could not fix it because `db/schema/common/shared.ts` is being split by domain in the orchestrator lane (c23-05) and Lane 4 was told not to restructure it. The CHECK constraint exists in SQL but is **not expressed in the Drizzle table definition** — `auditLogs` at `shared.ts:170-190` declares only `index()` entries, no `check()`. For a candidate whose whole theme is "the schema says what it means", the schema does not currently say this one. Requested in [`../../`architecture-refactor/OPEN-FINDINGS.md`](../../`architecture-refactor/OPEN-FINDINGS.md`).

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
