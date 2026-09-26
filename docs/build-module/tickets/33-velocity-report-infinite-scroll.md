# 33 — Page the velocity report instead of truncating it silently

**What to build:** A project with more than 100 cycles shows all of them in its velocity report. The endpoint is already cursor-paginated and reports whether more data exists, but the client sends no cursor, reads no such signal, and has no cursor in its cache key — so it renders the first page and silently presents it as the whole history. Nothing indicates data is missing.

Decision already taken: infinite scroll, matching the pattern the board already uses, rather than a visible cap notice.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The report fetches successive pages as the viewer scrolls
- [ ] The cursor is part of the cache key, so pages do not collide
- [ ] A project with more than 100 cycles displays all of them
- [ ] Reaching the end is distinguishable from still loading
- [ ] The keyset page still reports no total, per BE-25
