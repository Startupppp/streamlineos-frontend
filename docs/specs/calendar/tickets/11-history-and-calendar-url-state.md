# 11: Add durable History and Calendar URL state

**What to build:** Give Calendar a real paged historical feed and deep links that preserve the user's date, view, filters, and selected item.

**Blocked by:** 10: Use one authorized event set across every view.

**Status:** ready-for-agent

- [ ] History loads past authorized occurrences in descending order independently of the current Grid window.
- [ ] Older history remains reachable through stable pagination with complete/partial coverage.
- [ ] Date, view mode, source filters, saved filter selection, and selected event survive reload and back/forward navigation.
- [ ] Invalid or unauthorized URL state falls back safely without leaking record existence.
- [ ] Mobile and desktop can open an old event, return to the same history position, and retain filters.

