# 08 — Execute the proven schema and key removals, then re-prove the database contract

**What to build:** Apply the REMOVE and REFACTOR verdicts from ticket 07 as coordinated contract changes, then re-establish every database guarantee they could have disturbed.

**Blocked by:** 07, 03.

**Status:** ready-for-agent

- [ ] Each removal carries dependency evidence: zero reads/writes through Drizzle, raw SQL, migrations, exports, search/vector ingestion, audit/retention jobs, analytics and external contracts.
- [ ] Schema-file deletion additionally requires zero symbol references, zero raw table-name references, no dependent foreign key, and a grep of the file's **path** to catch specs that assert its existence. A dead-code tool reporting a schema file as unused never justifies deleting it on its own — some files are deliberately unimported.
- [ ] Redundant single-column foreign keys are removed only after all callers and migrations target the composite relationship.
- [ ] Unused request/response/DTO/Zod fields are removed across backend, OpenAPI and frontend hooks/forms as one contract change. Server-controlled tenant/actor fields, idempotency/version fields, authorization dimensions and audit fields are never removed.
- [ ] A removed field is proven removed at the boundary too — a bare `z.object({})` strips silently rather than rejecting, which turns a dropped field into a wrong-subject write rather than an error.
- [ ] After cleanup: regenerate artifacts, then re-prove chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI compatibility, cache invalidation and focused behavior tests.
- [ ] Before/after counts are recorded. Final acceptance is zero unclassified unnecessary keys and no orphaned schema or code reference.
