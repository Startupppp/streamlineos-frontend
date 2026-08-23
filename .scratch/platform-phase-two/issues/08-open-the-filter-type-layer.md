# 08 — Filters take a description of what a page filters by

**What to build:** Turn the filter machinery's closed, Build-shaped type layer into a declarative spec, with Build as its first caller.

The interaction machinery — command menu, submenus, overflow, chips, flat search, trigger — is already generic. The type layer is not, and this is the part the architecture review undersold when it called the whole thing "a move plus one rename". Today the category set is a closed union of Build's nine categories, the filter state is an object with nine named Build fields, and the URL hook takes no arguments and knows Build's parameter names by heart. A payroll run list would work perfectly well behind this machinery and cannot reach any of it.

Nothing leaves Build in this ticket. Build's nine categories become Build's spec — the first caller, not the definition.

**Blocked by:** 03 — Fence Build's filter bar.

**Status:** DONE - with three criteria not met, recorded below

- [ ] ~~A page declares its filter categories: key, label, **how options are obtained**, single- or multi-valued, and how a value serialises to and from a URL parameter.~~ **Partly met.** The declaration carries key, label, arity and the URL parameters it owns. It does **not** carry how options are obtained - option loading still lives in the component. Moving data-loading into the spec is a second, larger change and was not attempted.
- [x] Filter state is a **record keyed by category key** rather than an object with named fields. This is the change that makes the category set open.
- [x] The URL hook takes the declaration rather than hard-coding parameter names, so one list can serialise dates where another serialises a sprint.
- [ ] ~~Build's nine categories are expressed as one declaration, and Build's category type is **derived from that declaration** rather than hand-written.~~ **Partly met.** The nine categories are one declaration. The `FilterCategory` union in Build's `filter-types.ts` is still hand-written, because the presentation components consume it and generalising them is ticket 13's unfinished half.
- [x] Nothing in the machinery's public signature names a ticket, sprint, cycle or project.
- [x] The fence from ticket 03 passes unchanged - 20/20, not one line edited. This is the ticket's main evidence.
- [ ] ~~Build's list screens behave identically - verified by running them.~~ **Not met.** Verified by the 20-test fence and a clean typecheck only; the app was not booted. Given this repository's own recorded lesson that typecheck, build and mocked tests can all pass while nothing works, this needs confirming in a browser before the stream is called done.

## Result

`useTicketFilterParams` is now a thin adapter over a shared, spec-driven hook, and its public surface is exactly what it was - which is why `ticket-filter-bar.tsx` needed no edit and the fence needed no edit.

Three arities carry all nine Build categories: `multi` (comma list in one parameter), `single` (one value; toggling its own value clears it), and `range` (several parameters, one active count, cleared as a unit). `range` is what the old hook special-cased by name for due dates, and it is why a payroll period filter now needs no code at all.

18 tests drive the hook through a deliberately non-Build spec - payroll runs, with `runState` / `payCycleId` / `periodFrom` / `periodTo`, a `search` search parameter and an `offset` page parameter. A Build-shaped test would have proved nothing about generality.

Verified: 39/39 tests across the build and shared suites; frontend `tsc --noEmit` 0 errors.
