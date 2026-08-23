# 08 — Filters take a description of what a page filters by

**What to build:** Turn the filter machinery's closed, Build-shaped type layer into a declarative spec, with Build as its first caller.

The interaction machinery — command menu, submenus, overflow, chips, flat search, trigger — is already generic. The type layer is not, and this is the part the architecture review undersold when it called the whole thing "a move plus one rename". Today the category set is a closed union of Build's nine categories, the filter state is an object with nine named Build fields, and the URL hook takes no arguments and knows Build's parameter names by heart. A payroll run list would work perfectly well behind this machinery and cannot reach any of it.

Nothing leaves Build in this ticket. Build's nine categories become Build's spec — the first caller, not the definition.

**Blocked by:** 03 — Fence Build's filter bar.

**Status:** ready-for-agent

- [ ] A page declares its filter categories: key, label, how options are obtained, single- or multi-valued, and how a value serialises to and from a URL parameter.
- [ ] Filter state is a **record keyed by category key** rather than an object with named fields. This is the change that makes the category set open.
- [ ] The URL hook takes the declaration rather than hard-coding parameter names, so one list can serialise dates where another serialises a sprint.
- [ ] Build's nine categories are expressed as one declaration, and Build's category type is **derived from that declaration** rather than hand-written.
- [ ] Nothing in the machinery's public signature names a ticket, sprint, cycle or project.
- [ ] The fence from ticket 03 passes unchanged. If a test needs editing, external behaviour moved and that needs justifying rather than accommodating.
- [ ] Build's list screens behave identically — verified by running them, not by the types compiling.
