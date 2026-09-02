# 25 — Reduce the remaining thick authenticated route modules through domain-owned seams

**What to build:** Authenticated `page.tsx` and `layout.tsx` files are thin route modules: metadata, parameters, server authorization and composition only. State, forms, queries and mutations move behind feature-owned interfaces. The ratchet has already come down substantially; this closes the remainder.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The thick-route ratchet reaches zero remaining in-scope offenders, and the ceiling is never raised to accommodate one.
- [ ] Implementation moves to feature-owned seams, not into an alternate oversized file that merely relocates the bulk.
- [ ] Converting a page to a thin server component must not drop its authorization. A client gate removed during extraction has to be replaced by the server-side permission the backend actually enforces on the data the page reads — take the key from the route's published permission metadata and confirm it exists verbatim in both catalogs.
- [ ] Platform-core self-service surfaces keep a session gate rather than acquiring a permission key they should not need.
- [ ] Public landing visuals and animations are untouched.
- [ ] Route ownership stays canonical: when a page moves, the old route files are deleted with no legacy redirect, and every link is updated.
- [ ] Any path-keyed or name-keyed gate that referenced an extracted file is re-run — splitting a file silently drops the extract from that gate's coverage.
