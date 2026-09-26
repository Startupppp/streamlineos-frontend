# 61 — A test name states what the test proves

**What to build:** Three test names in the assignee filter spec stop asserting a rule they cannot check. They are titled for BE-81 — no top-level OR, split into a union — and prove it with a substring match for "UNION ALL", which is satisfied by the correlated exists-clause that ticket 14's own correction establishes does **not** meet the rule. The ticket was corrected; the names were not. A reader grepping for the rule finds a passing test and concludes it holds.

Small, but it is the exact mechanism by which a rule gets reported satisfied, and since this repository forbids code comments the test name is where the reason lives.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Each of the three names describes what its assertion actually checks
- [ ] No test name in Build claims BE-81 unless it asserts the absence of a top-level OR
- [ ] Ticket 14's remaining open half is referenced where a reader of these tests would look for it
- [ ] The spec still passes, and the rename changes no assertion
