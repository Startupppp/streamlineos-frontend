# 39 — Module interface depth and Home composition boundary

**What to build:** Domain modules expose small stable interfaces and keep implementation local; shallow pass-through layers that add no behaviour are removed. Home composes universal experiences without absorbing the modules it surfaces.

**Blocked by:** 36.

**Status:** ready-for-agent

- [ ] Pass-through wrappers that add no policy, adaptation or depth are deleted; modules that provide real depth are retained.
- [ ] Public interfaces and barrel surfaces are reduced to verified consumers; implementation details stay private to their module.
- [ ] Deep imports across module ownership are removed or replaced by the smallest stable interface at the correct seam.
- [ ] Home only composes. Chat, Calendar, Inbox and Notifications keep independent schema, authorization, caching, workers and implementation behind small interfaces.
- [ ] Home holds universal work only; module-owned destinations stay in their owning product's navigation.
- [ ] The backend owns the authoritative Home section and access manifest; the frontend consumes a generated contract with no hand-maintained parallel registry.
- [ ] Duplicated constants are replaced by a canonical domain-owned catalog only where at least two real callers share the invariant — no generic dumping grounds, no speculative seams.
- [ ] Deduplication names which implementation is canonical; that decision is the point of the work.
