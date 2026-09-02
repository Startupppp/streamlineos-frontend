# 40 — Reconcile every PRD checkbox against current source

**What to build:** The PRD's checkboxes and its blocker list have drifted from the tree — at the time these tickets were written, nine listed blockers were already closed and two "proven" claims were false. Reconcile every item against current source, so the final gate is measured against reality.

**Blocked by:** All tickets 01–39.

**Status:** ready-for-agent

- [ ] Every checkbox is classified VERIFIED DONE, REGRESSED, STILL PENDING or NEW against current source, not against the previous reconciliation.
- [ ] A verified fix appears once under DONE and is not reintroduced as pending without current regression evidence.
- [ ] Each DONE item names its evidence: the command run, the commit, and the number produced.
- [ ] Claims are verified against artifacts rather than reports. A delegated fix can land inert, and an agent report can narrate a tick that was never written — count what is on disk.
- [ ] Gates that were not run are recorded as not run, never as passing. Lint and end-to-end runs are only claimed if explicitly requested and actually executed.
- [ ] The module checklist table and the completion counts are recomputed, not carried forward.
- [ ] Superseded evidence is marked as covering a former head so it cannot be cited as current.
