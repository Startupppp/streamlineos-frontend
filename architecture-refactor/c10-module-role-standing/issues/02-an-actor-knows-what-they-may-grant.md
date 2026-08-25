# 02 — An actor knows what they may grant, before they try

**What to build:** Opening the grant form shows only the ranks this actor may actually award and states the scope ceiling they cannot exceed. Today the rules exist only as a refusal at write time, so a person discovers the boundary by hitting it.

**Blocked by:** 01 — A module's roster is readable

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The grant form offers only ranks strictly below the actor's own.
- [ ] The scope ceiling is shown, and scopes above it are not offered.
- [ ] An org admin sees that they may not change the org owner.
- [ ] A module owner sees a different set of options than a module admin in the same module.

## Todo

- [ ] Add the describe read beside the roster read
- [ ] Render the form from it rather than from a static list
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
