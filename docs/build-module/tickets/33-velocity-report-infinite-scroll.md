# 33 — Page the velocity report instead of truncating it silently

**What to build:** A project with more than 100 cycles shows all of them in its velocity report. The endpoint is already cursor-paginated and reports whether more data exists, but the client sends no cursor, reads no such signal, and has no cursor in its cache key — so it renders the first page and silently presents it as the whole history. Nothing indicates data is missing.

Decision already taken: infinite scroll, matching the pattern the board already uses, rather than a visible cap notice.

**Blocked by:** None — can start immediately.

**Status:** partial — infinite-query implementation exists; typing and multi-page behavior remain unverified

- [ ] The report fetches successive pages as the viewer scrolls
- [ ] One infinite-query key preserves ordered pages/pageParams; cursor travels as pageParam and does not fragment the report into separate cache entries
- [ ] A project with more than 100 cycles displays all of them
- [ ] Reaching the end is distinguishable from still loading
- [ ] The keyset page still reports no total, per BE-25

**Audit 2026-09-27:** Five component tests pass with a mocked hook/sentinel, not a 101+ cycle
scroll. `frontend/hooks/api/build/reports.ts:109` declares the infinite hook result as
`VelocityPage`, while `velocity-section.tsx:38` reads `.pages`; a focused installed-type probe
reports TS2339. Fix the result to the correct infinite-data shape and run the actual hook consumer
typecheck and multi-page test before closing.
