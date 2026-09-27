# 10 — Remove the Kanban ticket type assertion

**What to build:** The gallery view passes its ticket data to the Kanban card without a type assertion, so the compiler verifies that every field the card reads is present in the response contract. The assertion currently hides a possible structural gap: if the contract lacks a field the card expects, the card receives nothing and fails at runtime with no type error.

The repository enforces a hard zero on assertions; this is a Build-module offender.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

- [ ] The assertion is gone, replaced by a type the compiler can check structurally
- [ ] Any field the card reads but the contract omits now surfaces as a type error
- [x] The type-assertion gate carries no Build-module offender from this file
- [x] The gallery renders unchanged

**Premise correction (2026-09-26).** This ticket was written on the belief that the gallery
passes *response* data to the card. It does not: `COLUMNS` is a hardcoded stub literal, so no
response contract crosses this seam and the second criterion cannot be met here — it stays
unticked. The assertion was a workaround for `as const` deepening the literal to readonly, not
cover for a structural gap. Removing `as const` made the stub assignable on its own.

The real contract check belongs where the board reads live data. That surface is a separate
candidate, not this file.

The remaining ticked boxes were verified by reading, not by running `tsc` — the typechecker
needs an 8-10 GB heap and the tree was shared with concurrent agents.
