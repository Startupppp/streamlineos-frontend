# 10 — Route embedding through the AI gateway and reserve credit before public KB embedding

**What to build:** Every AI feature reaches a provider through one backend gateway with centralized timeouts, usage accounting, policy and redaction. Embedding currently bypasses that interface, and public KB embedding calls a paid provider before reserving credit — on a route where the caller supplies the organization id, that is unmetered spend on anonymous traffic.

**Blocked by:** 09 — the limiter must be required first, or the new call sites inherit the fail-open shape.

**Status:** ready-for-agent

- [ ] Embedding goes through the gateway interface, not a direct provider client. No frontend direct-provider calls exist.
- [ ] Credit is reserved atomically **before** any paid call, including on public routes, and the reservation is settled against actual input/output usage.
- [ ] Charges are token-metered via the token-charge computation, never flat per action; feature costs remain reserve ceilings only.
- [ ] The ledger stores integer milli-credits; APIs emit fractional credits; under-run refunds and overage debits settle correctly.
- [ ] Refunds follow the documented failure contract — a cancelled or failed call never silently keeps the reservation, and never double-charges on retry.
- [ ] Deterministic RBAC and tenant/record ACL checks complete before retrieval or provider invocation; AI participates in no authorization decision.
