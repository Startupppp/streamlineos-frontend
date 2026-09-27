# 53 — Batch D: the org-scoped lists adopt the surface

**What to build:** The organisation-wide lists — all-work, my work, the projects directory, portfolios, programs, teams, templates, goals, roadmap, inbox, command centre — render through the list surface.

**Premise correction (2026-09-27):** No current Build page measured exactly 500 lines in this
audit. A line count would not establish an author's motive in any case. Judge shared behavior,
dependency direction and testability; command-center/dashboard compositions need not become tables.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each org-scoped list renders through the surface
- [ ] Applicable pages satisfy the documented file-size rules through cohesive composition, without padding, artificial splits or unsupported historical line-count assumptions
- [ ] No page in the batch changes visibly, including its empty and error states
- [ ] Lists using a cursor pager keep their pagination in the URL and use the cursor pagination mode, per FE-86 and FE-125
- [ ] Each page's rows can be supplied as props
