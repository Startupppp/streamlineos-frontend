# Session 03 - Payroll, AI, Accounting, and Billing Actor Contraction

## Objective

Contract the scanner-reported actionable authority-bearing legacy actor fields owned by Payroll, AI, Accounting, and Billing.

Rebaseline before every batch:

```powershell
pnpm -C backend scan:legacy-actors
pnpm -C backend scan:legacy-actors:catalog
```

The scanner is authoritative for Drizzle-visible actionable fields. The catalog is also required because raw-SQL actor foreign keys, especially Accounting, can be invisible to the Drizzle source scan. The current actionable baseline is Payroll 12, AI 3, Accounting 2, and Billing 1; treat these as a starting baseline, not a completion claim. The repository-wide ratchet is not a session-zero gate.

## Ownership

Own only the tables and runtime paths identified by the live S03 baseline:

- `backend/src/db/schema/payroll/**` and `backend/src/modules/payroll/**`
- `backend/src/db/schema/ai/**` and `backend/src/modules/ai/**`
- `backend/src/db/schema/accounting/**` and `backend/src/modules/accounting/**`
- `backend/src/db/schema/billing/**` and `backend/src/modules/billing/**`
- the corresponding migrations, focused tests, and deliberately changed API/client contracts
- the Accounting raw-SQL actor inventory identified in `architecture-refactor/ACTOR-CONTRACTION-PLAN.md`

Do not edit HR, Build, Support, Common, KB, CRM, Inventory, or landing/public files. If a shared file is required, record a handoff to its owning session before changing it. Where older documents disagree on counts or ownership, the live scanner and this session's ownership table take precedence; preserve the discrepancy in the evidence log.

## Preconditions and deployment posture

- Read root `CLAUDE.md`, `backend/CLAUDE.md`, and applicable frontend guidance before editing.
- Confirm each field as AUTHORITY, ATTRIBUTION, or MIXED using `architecture-refactor/ACTOR-CLASSIFICATION.md` and real reader/writer sites. Never reclassify to make a gate pass.
- Payroll and Accounting changes require coordinated application/schema deployment or an approved maintenance window.
- Do not rewrite committed or finalized payroll runs, posted journals, paid payouts, tax ledgers, immutable invoices, billing snapshots, or provider-event history.
- A field without an existing membership counterpart must complete EXPAND and deploy verification before BACKFILL or CUTOVER.
- AUTHORITY fields require zero unresolved unmappable rows before cutover. Historical ATTRIBUTION may remain unmappable only with a stable former-actor display projection and an explicit report.

## Required implementation pattern

For every bounded batch, complete the phases in order:

1. **Inventory and classify**
   - Record table, legacy field, replacement field, classification, readers, writers, authorization predicates, approval/payout/tax/journal paths, uniqueness keys, cache keys, events, outbox consumers, webhook retries, revocation cleanup, and public contracts.
   - Include raw-SQL Accounting fields in a supplemental inventory; scanner counts alone are insufficient.

2. **EXPAND**
   - Add nullable `*_membership_id` fields where required.
   - Add tenant-leading composite foreign keys to `(organization_members.org_id, organization_members.id)`, initially `NOT VALID` when needed for online rollout.
   - Add indexes matching real `(org_id, membership_id, ...)` access paths.
   - Journal each migration and declare whether rollback is safe or irreversible.

3. **BACKFILL**
   - Use deterministic, resumable tenant-safe batches of at most 500 rows with an `(org_id, id)` cursor.
   - Prefer the unique active membership mapping; never guess between duplicates.
   - Produce explicit unmappable, orphan, duplicate, cross-tenant, and skipped-historical-row reports.
   - Backfill identity pointers only; never change financial amounts, status history, posted entries, snapshots, or provider-event payloads.

4. **VALIDATE**
   - Validate composite foreign keys and require zero unresolved AUTHORITY mappings.
   - Reconcile source/destination row counts, tenant totals, financial totals, uniqueness, nullability, RLS, and query plans.
   - Run deny-and-control tests before cutover.

5. **CUTOVER**
   - Move every reader, writer, authorization predicate, approval check, uniqueness key, cache key, event payload, outbox path, webhook retry path, and revocation cleanup to membership identity.
   - Preserve historical display through a membership-to-user projection or immutable snapshot that grants no authority.
   - Ensure payroll-to-accounting posting remains transactional or has an explicitly verified outbox boundary.

6. **CONTRACT**
   - Prove source and runtime zero-use with module-graph tooling and a successful backend build.
   - Drop legacy columns only after the zero-use proof, migration-ledger evidence, and operator verification.
   - Keep irreversible drops separate from additive/backfill/validation migrations.

## Work batches

- [ ] Record the live S03 inventory and classification evidence before implementation.
- [ ] Complete Payroll batches for approval, payout, employee subject, tax, journal, export, and historical display paths.
- [ ] Complete AI batches for job, chat, feedback, confirmation, usage, and revocation paths as identified by the live baseline.
- [ ] Complete Accounting batches for approval, journal, banking, AR/AP, tax, expense, and raw-SQL actor paths.
- [ ] Complete Billing batches for plan, seat, payment-provider, invoice, affiliate, webhook, and audit actor paths.
- [ ] Update API/OpenAPI and frontend types only where the public actor shape changes.
- [ ] Add deny-and-control tests for self-escalation, account-only actors, cross-tenant actors, revoked memberships, duplicate mappings, unmappable authority rows, former-actor rendering, approval replay, payout retry, duplicate and out-of-order webhooks, provider signature failure, and immutable financial snapshots.
- [ ] Add source and runtime zero-use proof before every legacy-column drop.

## Stop and rollback conditions

Stop the current batch and do not continue to CUTOVER or CONTRACT if any of the following occurs:

- an unresolved cross-tenant, orphan, duplicate, or AUTHORITY-unmappable mapping remains;
- foreign-key validation fails;
- source/destination counts or financial totals do not reconcile;
- a finalized payroll, posted journal, paid payout, tax record, immutable invoice, billing snapshot, or provider-event history changes;
- authorization, revocation, tenant isolation, idempotency, replay, outbox, or webhook tests fail;
- migration chain, ledger, discipline, rollback, typecheck, build, or OpenAPI verification fails;
- lock wait, replication lag, error rate, outbox age, retry pressure, or dead-letter volume exceeds the approved deployment threshold.

Before CONTRACT, disable the new cutover path and revert reads/writes to the legacy path while retaining additive membership fields and reports. After CONTRACT, column drops are irreversible; use an approved restore or forward-fix plan rather than treating them as rollback-capable.

## Exit criteria

- [ ] `pnpm -C backend scan:legacy-actors:check` reports zero S03 actionable fields.
- [ ] `pnpm -C backend scan:legacy-actors:catalog` has no untracked in-scope raw-SQL S03 actors, or every remainder has a documented exception and handoff.
- [ ] No legacy actor field remains in authorization, approval, payout, tax, journal, webhook, outbox, uniqueness, cache, or revocation logic.
- [ ] Finalized payroll, posted accounting, tax, payout, invoice, and billing history remains immutable and tenant-scoped.
- [ ] Historical actors remain renderable without restoring user-id authority.
- [ ] Composite tenant FKs, RLS predicates, nullability, and tenant-leading indexes are verified.
- [ ] Migration chain, ledger, discipline, rollback, and OpenAPI coverage checks pass.
- [ ] Outbox consumer and replay checks pass, including an explicit proof for synchronous payroll-to-accounting posting if no event exists.
- [ ] Backend build, backend typecheck, spec typecheck, frontend typecheck, tenant-isolation checks, and focused financial tests pass.
- [ ] Evidence records command output, migration identifiers, backfill report totals, final scanner/catalog output, and any external deployment approval.

## Required commands

```powershell
pnpm -C backend scan:legacy-actors
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

