# 18 — Resolve project access once per request

**What to build:** Rendering a board resolves the viewer's access to the project once, not four times per endpoint across two endpoints. For anyone without organisation-wide manage rights, the access check currently costs three to four sequential queries — permissions, the project row, then a membership check, then a team-assignment check — and the board fetches its ticket list and its column counts through separate requests that each repeat the whole sequence. A near-identical copy of the sequence also exists in the project read path.

Sequential checks extend the lifetime of the request's transaction and its pooled connection; they do not each reserve an additional connection. Pool saturation is a hypothesis to measure, not an observed result of this review.

**Decision correction (2026-09-27):** Request-local memoization only removes repeated resolutions within one HTTP request. The board's list and counts are separate requests, so they still each require authorization. Do not introduce a process-global access cache to make the original "once per board" claim true. Cache only within the authenticated request/transaction, keyed by organization, actor/membership, project and access mode; invalidate after any in-request membership or ACL mutation. Cross-request reuse would require an explicit revocation/version contract and is outside this ticket.

The duplicate sequence is worse than this ticket assumed: there are **eight** independent constructions of project reachability across six files, and they do not check the same branches. Ticket 42 consolidates them, which is what gives this ticket one seam to cache behind instead of eight.

**Blocked by:** 42 — The remaining reachability copies go, and the answers stop disagreeing.

**Status:** ready-for-agent

- [ ] Access resolves once per request and is reused by every caller in that request
- [ ] The membership and team-assignment checks are answered in one round trip, not two sequential ones
- [ ] The duplicate sequence in the project read path is gone
- [ ] The access module's interface states its cost, which is currently invisible to callers
- [ ] Allow and deny outcomes are unchanged, and a cross-tenant miss is still 404 per BE-91
- [ ] Tests prove request-local reuse, isolation between two requests/actors/organizations, and refresh after an ACL change; separate list/count requests are not reported as one authorization query
- [ ] Before/after measurements record query count and transaction duration for direct-member, team-member and denied reads; no latency or pool-capacity claim is inferred from deduplication alone
