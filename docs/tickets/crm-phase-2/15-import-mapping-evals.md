# 15 — Mapping inference, measured

**Status:** not started
**Track:** C — importer
**Blocked by:** 13

## Acceptance criteria

- [ ] An `EVAL_ACCEPTANCE` gate on field-mapping precision.
- [ ] **A zero-tolerance gate on mapping a field into an identity column it does
      not belong in.** That is how one customer becomes another, and it is not a
      percentage question.
- [ ] The dataset covers the exports the big four actually produce, not
      synthetic headers.
- [ ] Enforced in CI, like Phase 1's gates.
