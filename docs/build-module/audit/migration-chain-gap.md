# Invitation migration chain gap

Status: Current unverified on a database; source ordering concern confirmed 2026-10-03
Owner: `ARCH-14-ACTIVATION` migration prerequisite, with `ARCH-10-EVIDENCE-CLEANUP` review
Finding: `BLD-MIGRATION-CHAIN-01`

## Source evidence

`backend/migrations/0965_ar02_canonical_tenant_fks_3.sql` adds `invitation_events(org_id, invitation_id) -> invitations(org_id, id)`. The original invitations table has an `id` primary key. A search of the checked-in SQL before `0965` found no nonpartial unique key on `(org_id, id)`, which PostgreSQL requires for that composite reference. `backend/migrations/1728_organization_setup_invitation_receipts.sql` now adds `uniq_invitations_org_id_setup_receipts`, but its journal entry runs after `0965`.

The migration journal places `0965` at index 607 with `when=1803000010052`. There is a free timestamp `1803000010033` between the existing `0941` and `0943` entries. The source suggests a new prerequisite can be inserted there without editing `0965` or changing any existing timestamp. The repository migration seal rejects an ordinary backdated insert; its emit mode must not be used as an unchecked bypass. Source inspection alone does not prove how a real fresh or upgraded database behaves. `db-bootstrap` can defer and retry failures, which may mask an ordering error; fail-fast migration remains a separate check.

Migration journal reconciliation currently also reports six unrelated unjournalled files (`1231`, `1232`, `1233`, `1705`, `1706`, `1707`) and one earlier journal timestamp regression (`0619` after `0271a`). The receipt slice `e1001a934` journals `1728`, passes migration-integrity tests, and does not repair these earlier conditions. Attribute those repository-wide findings separately from the Build-owned `0965` prerequisite.

## Planned repair contract

1. Reserve a single migration owner for an idempotent, journalled prerequisite before `0965`. Candidate: a new `0941a_*` migration at `when=1803000010033` that creates a nonpartial unique `(org_id, id)` index on invitations with bounded lock acquisition. Do not edit applied SQL or restamp existing journal entries.
2. Add a narrowly reviewed migration-seal exception bound to the exact new tag, timestamp, SQL hash, and predecessor/successor. Verify the seal still rejects arbitrary backdated changes. Do not treat a passing `--emit` result as immutability proof.
3. Reconcile `1728` with the prerequisite so it does not create a duplicate unique index. Its rollback must not remove a key required by the `0965` foreign key. Preserve the same-org receipt foreign key in `1728`.
4. Check both migration runners against the final journal. Record whether each selects missing entries by identity or watermark, and prove an existing database applies the prerequisite once without replaying applied migrations.
5. Use only disposable databases. From empty state, run the full fail-fast chain and bootstrap; from an already migrated snapshot, run the upgrade. Inspect `pg_index`, `pg_constraint`, migration ledger hashes, lock behavior, RLS, and rollback. Do not infer database success from SQL text or unit tests.

## Acceptance criteria

- A cold database reaches the latest journal entry through both supported runners without a deferred `0965` failure.
- An upgraded snapshot retains all existing migration identities, gains one valid composite invitation key, and has no duplicate equivalent index.
- `0965` and `1728` tenant foreign keys validate in PostgreSQL; `1728` rollback leaves the key needed by `0965`.
- The migration seal and journal checks pass with an explicit, narrow exception, while negative self-tests still reject an unrelated backdated entry.
- Lock duration and failure/retry behavior are recorded on representative disposable data; no production database is used for proof.

## Delivery checklist

- [x] Identify the checked-in `0965` prerequisite gap and its later `1728` index; record the journal order and separate it from unrelated chain findings.
- [ ] Commit a reviewed, journalled pre-`0965` prerequisite and a narrow migration-seal exception without rewriting existing entries.
- [ ] Align `1728` index and rollback ownership with the prerequisite and pass schema/migration integrity, journal, and immutability checks.
- [ ] Prove cold and upgraded disposable database paths, PostgreSQL constraints, RLS, rollback, and lock behavior before closing BLD-MIGRATION-CHAIN-01.
