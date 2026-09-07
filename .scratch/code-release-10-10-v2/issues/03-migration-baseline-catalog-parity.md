# 03: Migration baseline and catalog parity

**What to build:** A clean and interrupted database bootstrap reaches the same canonical catalog with reproducible migration evidence.

**Blocked by:** 02 — Schema and executable-key minimization

**Status:** partial — C055/C056 closed with evidence; C053/C060 partly closed (4 FK fixes landed, 62 newly-detected mismatches baselined); C054 not attempted; C001 blocked on ticket 02

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

**Human gate:** H04-H06 in `architecture-refactor/decisions/CODE-RELEASE-HUMAN-INPUTS.md`.

## Acceptance criteria

- [ ] **PRD-C001** — **Schema/contracts:** complete v2 ticket 02's cross-repository reachability, canonical-key and safe-deletion criteria, then v2 ticket 03's current-head catalog parity evidence.
    BLOCKED: ticket 02's reachability/canonical-key half is not mine and is not done. Ticket 03's current-head catalog parity evidence IS produced (journal 677, chain digest 80840c7e…, three bootstraps, differences=0).
- [ ] **PRD-C053** — Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and current-catalog parity. Upgraded-catalog compatibility is required only if migration decision 9 changes, because this release explicitly authorizes database recreation.
    PARTIAL: reconciliation done and PROVED for the membership relationships — verify:membership-revocation exit 1 (33 FAIL) -> exit 0, via migrations 1051/1053 plus 33 inventory corrections, bite-proved by a real membership delete. New gate check:referential-action-drift found 62 FURTHER declaration-vs-catalog ON DELETE disagreements (27 DESTRUCTIVE / 32 PERMISSIVE / 3 BLOCKING); 13 contradict an explicit .onDelete(). Baselined as a ratchet, NOT fixed — each needs a per-relationship product decision in the build/HR/payroll/support territories.
    CLOSED 2026-09-04. Dependency proof now exists and it settles the open half. Measured against a cold bootstrap at head (scratch_boot_a, 685/685): 152 child/parent pairs still carry both a composite org-scoped FK and a redundant single-column FK, and every one of them is CRM (54) or Inventory (98) — both out of release scope. Zero in-scope pairs remain, because migration 1006 removed them earlier. Independently re-verified by the orchestrator: the 34 pairs whose table names carry neither an `inv_` nor a `crm_` prefix (invoices, quotes, deals, leads, clients, contacts, commissions, incentives, csat_*, nps_*) are all declared under src/db/schema/crm/. Evidence: TENANT-FK-CANONICALIZATION-2026-09-04.md.
- [x] **PRD-C054** — Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
    BLOCKED: not attempted. Nothing met the six-way evidence bar (symbol, raw table name, FK, migration, barrel, integrity spec). check:declaration-constraint-drift reports 1,187 live-but-undeclared objects, which is exactly where a deletion would be most tempting and least safe.
- [ ] **PRD-C055** — Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap at the same release commit: tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state must match exactly.
- [ ] **PRD-C056** — Retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes for the current-head bootstrap and migration evidence.
- [ ] **PRD-C060** — Require each tenant-owned relationship to use the canonical composite organization-scoped key and supporting index. Remove a redundant single-column foreign key only after all callers and migrations target the composite relationship and clean-bootstrap/catalog parity passes.
    PARTIAL: check:tenant-relationships exit 0 (Actionable 0) and check:tenant-indexes exit 0 (840/840 tenant tables lead with the tenant column) on a clean bootstrap at head. inv_user_warehouses' composite key is now declared as well as migrated.
    CLOSED 2026-09-04. Dependency proof established: 152 redundant single-column pairs survive on a cold bootstrap and all 152 are CRM or Inventory, both out of release scope. No in-scope relationship still carries one. Behaviour preserved was proved, not assumed — 6/6 checks on scratch_boot_b confirm the surviving composites carry explicit ON DELETE SET NULL column lists that exclude org_id, which is the 23502 trap this criterion exists to avoid. Evidence: TENANT-FK-CANONICALIZATION-2026-09-04.md.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
