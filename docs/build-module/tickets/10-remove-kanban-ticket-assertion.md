# 10 — Remove the Kanban ticket type assertion

**What to build:** The gallery view passes its ticket data to the Kanban card without a type assertion, so the compiler verifies that every field the card reads is present in the response contract. The assertion currently hides a possible structural gap: if the contract lacks a field the card expects, the card receives nothing and fails at runtime with no type error.

The repository enforces a hard zero on assertions; this is a Build-module offender.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The assertion is gone, replaced by a type the compiler can check structurally
- [ ] Any field the card reads but the contract omits now surfaces as a type error
- [ ] The type-assertion gate carries no Build-module offender from this file
- [ ] The gallery renders unchanged
