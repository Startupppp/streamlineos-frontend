# 06 — Migrate batch: clients and contacts

**Status:** not started
**Track:** A — identity convergence
**Blocks:** 08
**Blocked by:** 02
**Independent of:** every other migrate batch

## Why

`clients` and `contacts` — roughly 14 module files — still read a legacy identity table.
This batch moves that module's reads onto the Party seam and its writes onto
Party alone.

Batches are sized by module and independent of one another on purpose. A rename
touching all 132 files cannot land green as one change and cannot be reviewed as
one diff; CI stays green batch to batch because the legacy tables are still there.

## Acceptance criteria

- [ ] Every read of a legacy identity table in this module resolves through the
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
- [ ] The contact/client distinction survives as a Party role, not as a table.
