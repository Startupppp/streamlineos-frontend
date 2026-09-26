# 18 — Resolve project access once per request

**What to build:** Rendering a board resolves the viewer's access to the project once, not four times per endpoint across two endpoints. For anyone without organisation-wide manage rights, the access check currently costs three to four sequential queries — permissions, the project row, then a membership check, then a team-assignment check — and the board fetches its ticket list and its column counts through separate requests that each repeat the whole sequence. A near-identical copy of the sequence also exists in the project read path.

Each sequential hop holds a pooled connection, and the request-wide tenant transaction caps concurrency at the pool size, so this overhead saturates the pool before any ticket data is read.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Access resolves once per request and is reused by every caller in that request
- [ ] The membership and team-assignment checks are answered in one round trip, not two sequential ones
- [ ] The duplicate sequence in the project read path is gone
- [ ] The access module's interface states its cost, which is currently invisible to callers
- [ ] Allow and deny outcomes are unchanged, and a cross-tenant miss is still 404 per BE-91
