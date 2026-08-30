# 34: Reduce unnecessary client route pages

**What to build:** Thin route files render as Server Components while interactive behavior remains in feature-level client islands, reducing initial JavaScript without changing behavior.

**Blocked by:** 27 — Build the shared server route-access registry.

**Status:** in-progress — mechanically-safe batch complete; feature-island extraction remains

The completed batch reduced client pages from 282 to 259 of 598 and added a ratchet check. The remaining pages are not safe mechanical conversions: 10 call custom data hooks directly, 3 combine async route params with query hooks, and 3 use partial boolean permission gates. Their hooks must move into feature islands before the route directive can be removed.

- [x] Mechanically-safe pages are classified and converted with server auth/access preserved.
- [x] Client-page count is measured and guarded by a ratchet check.
- [x] Typecheck, build and representative navigation proof exists for the completed batch.
- [ ] Extract custom data hooks from the remaining 10 route pages into feature islands.
- [ ] Refactor the remaining parameter/query and partial-permission pages without changing behavior.
- [ ] Re-run client-page count, typecheck, build and navigation tests after the remaining extraction.
