# 34: Reduce unnecessary client route pages

**What to build:** Thin route files render as Server Components while interactive behavior remains in feature-level client islands, reducing initial JavaScript without changing behavior.

**Blocked by:** 27 — Build the shared server route-access registry.

**Status:** ready-for-agent

- [ ] Every client route page is classified and unnecessary directives are removed in bounded batches.
- [ ] Server authentication/access and Query hydration continue to work.
- [ ] Bundle/client-page counts improve and are recorded before/after.
- [ ] Typecheck, build and representative navigation tests pass after each batch.
