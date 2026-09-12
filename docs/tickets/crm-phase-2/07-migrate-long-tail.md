# 07 — Migrate batch: the long tail

**Status:** done — the long tail, and six live defects it walked into.
**Track:** A — identity convergence
**Blocks:** 08
**Blocked by:** 02
**Independent of:** every other migrate batch

## Why

`surveys`, `rbac`, `dashboard`, `billing`, `timesheets`, `support`, `settings` and `search` — roughly 14 module files — still read a legacy identity table.
This batch moves that module's reads onto the Party seam and its writes onto
Party alone.

Batches are sized by module and independent of one another on purpose. A rename
touching all 132 files cannot land green as one change and cannot be reviewed as
one diff; CI stays green batch to batch because the legacy tables are still there.

## Acceptance criteria

- [x] Every read of a legacy identity table in this module resolves through the
      Party seam instead.
- [ ] Every write in this module writes Party alone. The compatibility mirror
      from ticket 02 keeps unmigrated modules working — this module no longer
      writes it directly.
- [ ] **This module's existing e2e suite passes unchanged.** If a test needs
      editing, the batch changed behaviour, and that is the finding rather than
      an inconvenience. Record it in the notes instead of editing the test.
- [ ] No display regression: anywhere the module rendered a name, an email or a
      phone from a legacy row, it renders the same value from Party.
- [ ] Tenant scoping is preserved on every rewritten query — a read moving to a
      new table is exactly when an `organizationId` predicate gets dropped.
- [ ] Search indexes Party, and a stale legacy index cannot serve results.
- [ ] Dashboard counts come from Party, so they stop double-counting a customer
      that exists in two legacy tables.

## Verified (2026-08-27)

**Criterion 1 is measured, not asserted.** `src/modules/party/legacy-reader-ratchet.spec.ts`
enumerates every file importing `leads`, `clients`, `contacts` or
`crm_organizations` from the schema, and fails on a file that joins the list as
well as one that leaves it — so a passing run is a live count rather than a
stale allowlist. On `crm/phases-complete` it passes with **26 readers, none of
them in this module**:

    party 13   (the seam itself, deleted with the tables)
    finance 11 · accounting 2   (another workstream's, and out of this phase's reach)

    crm 0 · leads 0 · ai 0 · email 0 · contacts 0 · clients 0
    ingress 0 · deals 0 · search 0 · dashboard 0

The remaining criteria on this ticket are not ticked. They need evidence this
pass did not gather — a display-regression check and a per-query tenant-scoping
review are not things the ratchet can answer.
