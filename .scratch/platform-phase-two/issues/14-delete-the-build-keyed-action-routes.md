# 14 — Remove the four Build-keyed action routes and the wrong gate they carry

**What to build:** The contract step for the actions path.

The four chat action endpoints are named after Build nouns and each is gated on a Build permission key. On a route the reference seam serves, a module permission key can only ever exclude the modules the seam was built to include: the seam resolves a CRM deal into a chat bubble, and the gate on the route beside it makes acting on one impossible. The adapter already authorises the actor internally, so the guard-level key is a second gate that is wrong by construction.

By this point every action runs through the generic path (ticket 09), so these four routes have no callers.

**Blocked by:** 09 — Migrate the remaining three actions.

**Status:** ready-for-agent

- [ ] The four endpoints are deleted, not deprecated. A moved surface deletes its old route rather than leaving a redirect.
- [ ] Their guard-tier specs **move to the generic route** rather than being deleted alongside them. These specs were named as the behaviour-preservation control for this whole seam, and losing them loses the control.
- [ ] A spec asserts a caller lacking a Build permission is **not** refused when the reference is not a Build record. This is the assertion that proves the wrong gate is gone, and it is the point of the ticket.
- [ ] A caller lacking the owning module's permission is still refused, now by the adapter, and indistinguishably from outside.
- [ ] An unauthenticated caller is refused; a caller who is not a member of the conversation is refused.
- [ ] An action against a record in a disabled module is refused.
- [ ] No client path references a deleted endpoint, proven by a real build rather than a search.
- [ ] Note when closing: the guard-tier harness stubs the access, entitlement and membership services, so these specs prove authorization **outcomes** and not authorization **sources**. The adapter-level checks are covered by the adapters' own specs.
