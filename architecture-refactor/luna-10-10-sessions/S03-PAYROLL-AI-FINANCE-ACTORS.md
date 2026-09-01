# Session 03 - Payroll, AI, Accounting, and Billing Actor Contraction

## Objective

Contract the live scanner-reported authority-bearing legacy actor fields owned by Payroll, AI, Accounting, and Billing. The scanner is authoritative for Drizzle-visible fields; the catalog is required for raw-SQL Accounting actors. The initial S03 baseline was Payroll 12, AI 3, Accounting 2, and Billing 1.

## Required phases

1. **Inventory and classify** every field as AUTHORITY, ATTRIBUTION, or MIXED, including readers, writers, authorization, approval, payout, tax, journal, uniqueness, cache, events, outbox, webhook, revocation, and public-contract paths.
2. **EXPAND** with nullable membership columns, tenant-leading composite FKs, indexes, journal entries, and rollback/irreversibility declarations.
3. **BACKFILL** deterministically in resumable batches of at most 500 rows using `(org_id, id)` cursors. Never guess duplicate memberships; report unmappable, orphan, duplicate, cross-tenant, skipped, and historical rows.
4. **VALIDATE** FKs, mappings, row and financial totals, tenant isolation, RLS, uniqueness, nullability, plans, and deny/control tests.
5. **CUTOVER** all authorization, approval, payout, tax, journal, uniqueness, cache, event, outbox, webhook, and revocation paths to membership identity. Retain legacy IDs only as non-authoritative historical display projections.
6. **CONTRACT** only after source/runtime zero-use proof, successful build/typechecks, migration-ledger evidence, and operator verification. Destructive drops are irreversible.

## Ownership

Own only `backend/src/db/schema/{payroll,ai,accounting,billing}/**`, corresponding module paths, migrations, focused tests, and explicitly changed API/client contracts. Do not edit HR, Build, Support, Common, KB, CRM, Inventory, or public landing files without a documented handoff.

## Work TODO

- [ ] Record live S03 inventory and classification evidence.
- [ ] Complete Payroll approval, payout, employee subject, tax, journal, export, and historical-display paths.
- [ ] Complete AI job, chat, feedback, confirmation, usage, and revocation paths.
- [ ] Complete Accounting approval, journal, banking, AR/AP, tax, expense, and raw-SQL paths.
- [ ] Complete Billing plan, seat, provider, invoice, affiliate, webhook, and audit paths.
- [ ] Update API/OpenAPI/frontend types where public actor shapes change.
- [ ] Add deny/control tests for cross-tenant, revoked, duplicate, unmappable, replay, retry, webhook, and immutable-financial cases.
- [ ] Prove source/runtime zero-use before each legacy-column drop.

## Stop conditions

Stop before cutover/contract if any cross-tenant, orphan, duplicate, or authority-unmappable row remains; FK validation, reconciliation, authorization, revocation, idempotency, replay, outbox, webhook, migration, typecheck, build, or OpenAPI checks fail; immutable financial history changes; or deployment thresholds are exceeded.

## Exit criteria

- [x] `pnpm -C backend scan:legacy-actors:check` reports zero actionable fields (0/20; 20 migrated).
- [ ] Catalog has no untracked in-scope raw-SQL S03 actors, or every remainder has an explicit exception/handoff.
- [ ] No legacy actor field remains in authority logic; history remains immutable and renderable.
- [ ] Composite FKs, RLS, nullability, and tenant-leading indexes are verified.
- [ ] Migration chain, ledger, discipline, rollback, OpenAPI, outbox/replay, backend/frontend typecheck, tenant-isolation, and focused financial tests pass.
- [ ] Evidence records command output, migration IDs, backfill totals, final scanner/catalog output, and deployment approval.

## Current evidence (2026-09-01)

- [x] Migration ledger: 579 applied, 579 journal entries, zero pending; chain and ledger gates pass.
- [x] Rollback gate passes for all 579 migrations; S03 contract migration 0926 is explicitly irreversible.
- [x] Outbox consumer coverage passes.
- [x] Focused AI, Accounting, and Billing tenant-isolation tests pass (16 tests).
- [ ] The session is not complete: full backend/spec/frontend typechecks, tenant-isolation coverage, OpenAPI coverage, catalog exception review, and the remaining payroll focused suite still require resolution.

## Required commands

```powershell
pnpm -C backend scan:legacy-actors:check
pnpm -C backend scan:legacy-actors:catalog
pnpm -C backend check:migration-discipline
pnpm -C backend check:migration-chain
pnpm -C backend db:migrate
pnpm -C backend check:migration-ledger
pnpm -C backend check:migration-rollback
pnpm -C backend check:outbox-consumers
pnpm -C backend check:tenant-isolation
pnpm -C backend check:openapi-coverage
pnpm -C backend typecheck
pnpm -C backend check:spec-typecheck
pnpm -C frontend type-check
pnpm exec knip --no-progress
```
