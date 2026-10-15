# 11: Add durable History and Calendar URL state

**What to build:** Give Calendar a real paged historical feed and deep links that preserve the user's date, view, filters, and selected item.

**Blocked by:** 10: Use one authorized event set across every view.

**Status:** accepted

- [x] History loads past authorized occurrences in descending order independently of the current Grid window.
- [x] Older history remains reachable through stable pagination with complete/partial coverage.
- [x] Date, view mode, source filters, saved filter selection, and selected event survive reload and back/forward navigation.
- [x] Invalid or unauthorized URL state falls back safely without leaking record existence.
- [x] Mobile and desktop can open an old event, return to the same history position, and retain filters.

