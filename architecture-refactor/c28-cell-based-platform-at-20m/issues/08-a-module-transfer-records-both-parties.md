# 08 — A module transfer records its initiator and its expected current owner separately

**What to build:** An organization owner can hand a module from one person to another without owning it themselves. The transfer records who started it and who was expected to be holding the module, and acceptance validates against the second — so a transfer cannot complete against an owner who changed in the meantime.

**Blocked by:** [07 — Owner-only operations are enumerated, not implied](07-owner-only-operations-are-enumerated.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** PRD mistake #6 — an org owner could initiate a transfer whose acceptance then expected the *initiator* to be the module owner, so the flow was unusable in exactly the case it exists for. The module-standing work is already built (`modules/module-access/`, `common/rbac/grantability.ts`, `ownership/module-owner-role.helper.ts` transfers atomically); this is the two-field correction on top of it.

## Acceptance criteria

- [ ] The transfer record stores initiator, expected current owner and intended new owner as three distinct fields.
- [ ] Acceptance validates the *expected current owner* still holds the module; if ownership moved since initiation, the transfer fails with a message naming that, rather than silently reassigning.
- [ ] An organization owner may initiate a transfer for a module they do not own, which is the case that does not work today.
- [ ] A module owner may initiate a transfer of their own module — the common case keeps working.
- [ ] The transfer is atomic: the old owner's standing is removed and the new owner's granted in one operation, with no intermediate state where the module has two owners or none.
- [ ] Expiry and cancellation are explicit states, and an expired transfer cannot be accepted.

## Todo

- [ ] Read the existing acceptance path before adding fields — the bug may be one predicate reading the wrong column rather than a missing column.
- [ ] Cover the concurrent case: two transfers initiated for the same module, one accepted; the second must fail on its expected-owner check, not overwrite.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
