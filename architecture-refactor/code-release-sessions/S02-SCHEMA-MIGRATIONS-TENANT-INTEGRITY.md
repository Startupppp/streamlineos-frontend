# S02 — Schema, migrations, tenant integrity and retention

Status: active

Independent scope: `backend/src/db/schema/**`, migration/journal files, catalog/RLS/tenant-index/retention/migration scripts and focused tests. CRM and Inventory relations are classified as excluded, never repaired or counted complete.

Master coverage: section 4 and schema/retention portions of sections 5, 10 and 11.

## Acceptance criteria

- [ ] Inventory every in-scope tenant table and relationship; enforce non-null tenant paths, tenant-leading indexes, tenant-scoped uniqueness and canonical composite foreign keys.
- [ ] Reduce the catalog-backed single-column tenant-relationship inventory to zero actionable in-scope relationships; include Build, Billing, Workflows, Accounting, Support and Knowledge and remove redundant weaker constraints after dependency proof.
- [ ] Reconcile Drizzle declarations, migration catalog and snapshots; use safe validation ordering where retained and the authorized clean destructive baseline where simpler.
- [ ] Produce two clean bootstraps plus interrupted/resumed catalog parity, audit-log immutability proof, deterministic journal state and artifact hashes.
- [ ] Close retention policy/worker coverage for `helpdesk_tickets`, `performance_reviews`, `mail_message_metadata` and `announcements`, including legal-hold and dependent-row behavior.
- [ ] Make RLS/catalog gates scope-aware: CRM/Inventory separately excluded, every in-scope table classified and known-bad inline `.references()` plus cross-tenant fixtures fail self-tests.
- [ ] Run targeted schema/catalog/migration/retention tests and gates only; record commands and results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S02 is complete; commit/evidence: _pending_.
