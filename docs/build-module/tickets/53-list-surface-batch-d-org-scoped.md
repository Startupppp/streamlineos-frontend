# 53 — Batch D: the org-scoped lists adopt the surface

**What to build:** The organisation-wide lists — all-work, my work, the projects directory, portfolios, programs, teams, templates, goals, roadmap, inbox, command centre — render through the list surface.

Two of these sit exactly at the 500-line cap, which means the number was moved to pass rather than the structure fixed. Migration is the structural fix, so the count should fall well clear of the boundary rather than land on it again.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each org-scoped list renders through the surface
- [ ] The two pages sitting at exactly 500 lines end comfortably under it, not at it
- [ ] No page in the batch changes visibly, including its empty and error states
- [ ] Lists using a cursor pager keep their pagination in the URL and use the cursor pagination mode, per FE-86 and FE-125
- [ ] Each page's rows can be supplied as props
