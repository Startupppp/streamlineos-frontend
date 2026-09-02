# 08 — Execute the proven schema and key removals, then re-prove the database contract

**What to build:** Apply the REMOVE and REFACTOR verdicts from ticket 07 as coordinated contract changes, then re-establish every database guarantee they could have disturbed.

**Blocked by:** 07, 03.

**Status:** 5 of 7 closed · 2 PARTIAL · report at `reports/08-execute-schema-key-minimization.md`

**Also landed here (routed in mid-session, both in this territory):**
- **P0 — organisation creation was broken at head.** `feedbucket` had no `modules_catalog` row, so `seedSystemRolesForOrg` raised `23503` on `fk_roles_module` inside `createOrganization`'s transaction. Migration `1005` inserts the row (ticket 19's statement, unchanged). Ticket 19's deliberately red `seeded-role-modules-are-catalogued.spec.ts` is now **green, 2/2**, and the exact failing `INSERT INTO roles ... module_key='feedbucket'` now succeeds on a scratch database.
- **Payroll financial immutability** (`1001`) and **three payroll read-path indexes** (`1002`), from ticket 24.
- **`1004`** — a forward correction to migration `0445`, whose `BEFORE DELETE` guards blocked `cron-org-purge-worker`'s organisation purge. Found by the purge failing on a scratch database, not by reading.
- Ticket 19's `check:migration-discipline` exit 1 on `1001`/`1002` was a race against a half-written journal. At rest it is **exit 0, 651 files, 0 new violations**.

- [x] Each removal carries dependency evidence: zero reads/writes through Drizzle, raw SQL, migrations, exports, search/vector ingestion, audit/retention jobs, analytics and external contracts.
- [x] Schema-file deletion additionally requires zero symbol references, zero raw table-name references, no dependent foreign key, and a grep of the file's **path** to catch specs that assert its existence. A dead-code tool reporting a schema file as unused never justifies deleting it on its own — some files are deliberately unimported.
      No schema file was deleted. `hrms-phase1-sql-managed` and `communication_backfill_issues` were re-confirmed unimported-by-design; `check:hr-table-freeze` exit 0.
- [ ] Redundant single-column foreign keys are removed only after all callers and migrations target the composite relationship.
      PARTIAL: done where the catalog had already converged (`support_ticket_tags`' two dead `.references()`). 171 single-column FKs still sit beside a composite twin; they span CRM/HR/inventory/accounting service code, outside `src/db/schema`. Listed in report §9.
- [ ] Unused request/response/DTO/Zod fields are removed across backend, OpenAPI and frontend hooks/forms as one contract change. Server-controlled tenant/actor fields, idempotency/version fields, authorization dimensions and audit fields are never removed.
      BLOCKED on territory: no DTO or Zod schema lives under `src/db/schema/**` or `migrations/**`. `check:openapi-coverage` and `check:contract-breaking-change` both exit 0 — nothing regressed, nothing was executed here.
- [x] A removed field is proven removed at the boundary too — a bare `z.object({})` strips silently rather than rejecting, which turns a dropped field into a wrong-subject write rather than an error.
      `support_ticket_tags.orgId` is `notNull()`, so both insert sites are compile-enforced; the write is tenant-scoped in code instead of by the `trg_set_org_id` trigger.
- [x] After cleanup: regenerate artifacts, then re-prove chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI compatibility, cache invalidation and focused behavior tests.
      Two independent cold bootstraps (`scratch_t08` 646/646, `scratch_t08b` 650/650). chain/ledger/discipline/rollback/tenant-indexes (both modes)/tenant-relationships (pg_catalog)/verify-rls/restrict-fks/set-null-column-lists/openapi-coverage/contract-breaking-change all exit 0. typecheck and spec-typecheck exit 0. 37 jest suites, 362 tests green. 8/8 trigger assertions.
- [x] Before/after counts are recorded. Final acceptance is zero unclassified unnecessary keys and no orphaned schema or code reference.
      Duplicates 9→0, prefix-redundant 6→0, S16 0, S23 3-intentional, FKs 3,150 unchanged, payroll immutability triggers 2→7, `check:tenant-indexes` 821/828→829/829. Everything not executed is classified and handed on in report §9, not left unclassified.
