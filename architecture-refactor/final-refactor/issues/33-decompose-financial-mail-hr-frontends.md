# 33: Decompose Billing, Mail, HR and Accounting oversized surfaces

**What to build:** Large in-scope forms and pages are separated into cohesive query, state, schema, mutation and presentation units without duplicate abstractions.

**Blocked by:** 04 and 27.

**Status:** ready-for-agent

- [ ] Every audited file over the hard review limit is split or carries a documented valid exception.
- [ ] Permission-aware actions and form validation are preserved.
- [ ] Shared primitives are introduced only for demonstrated repeated behavior.
- [ ] File-size, typecheck and representative workflow tests pass.
