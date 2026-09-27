# 61 — A test name states what the test proves

**What to build:** Three test names in the assignee filter spec stop asserting a rule they cannot check. They are titled for BE-81 — no top-level OR, split into a union — and prove it with a substring match for "UNION ALL", which is satisfied by the correlated exists-clause that ticket 14's own correction establishes does **not** meet the rule. The ticket was corrected; the names were not. A reader grepping for the rule finds a passing test and concludes it holds.

Small, but it is the exact mechanism by which a rule gets reported satisfied, and since this repository forbids code comments the test name is where the reason lives.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Each of the three names describes what its assertion actually checks
      BLOCKED (Lane 6 territory): the three mis-named tests live in
      `backend/src/modules/build/core/assignee-filter.spec.ts` (lines 41, 109, 147). That file is
      owned by Lane 6. Lane 9 may not edit it. Lane 6 must rename:
        line 41:  "combined filter: EXISTS with UNION ALL — no top-level OR between IS NULL and the semi-join (BE-81)"
                  → "combined assignee filter: IS NULL or membership EXISTS checks — UNION ALL lives inside the EXISTS, not at the top level"
        line 109: describe "listTickets — combined assignee filter produces UNION ALL, not OR (BE-81)"
                  → describe "listTickets — combined assignee filter contains a UNION ALL inside the EXISTS clause"
        line 147: describe "getColumnCounts — combined assignee filter produces UNION ALL, not OR (BE-81)"
                  → describe "getColumnCounts — combined assignee filter contains a UNION ALL inside the EXISTS clause"
      Each test checks for the substring "UNION ALL" and would pass with either name; the rename
      changes no assertion. Ticket 14 (remaining open: split OR into top-level UNION, not correlated
      EXISTS) should be cross-referenced in the describe block after renaming.
- [ ] No test name in Build claims BE-81 unless it asserts the absence of a top-level OR
      BLOCKED — same file, same lane. See above.
- [ ] Ticket 14's remaining open half is referenced where a reader of these tests would look for it
      BLOCKED — same file, same lane. After Lane 6 renames, it should add a comment-free reference
      in the describe label: "…(see ticket-14 for the top-level UNION that BE-81 requires)".
- [ ] The spec still passes, and the rename changes no assertion
      BLOCKED — same file, same lane. Will be trivially true once Lane 6 applies the renames, since
      each test body is unchanged.
