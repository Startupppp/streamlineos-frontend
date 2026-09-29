# 61 — A test name states what the test proves

**What to build:** Three test names in the assignee filter spec stop asserting a rule they cannot check. They are titled for BE-81 — no top-level OR, split into a union — and prove it with a substring match for "UNION ALL", which is satisfied by the correlated exists-clause that ticket 14's own correction establishes does **not** meet the rule. The ticket was corrected; the names were not. A reader grepping for the rule finds a passing test and concludes it holds.

Small, but it is the exact mechanism by which a rule gets reported satisfied, and since this repository forbids code comments the test name is where the reason lives.

**Blocked by:** None — can start immediately.

**Status:** complete (re-verified 2026-09-29, Lane F)

- [x] Each of the three names describes what its assertion actually checks
      Lane 14 owns `assignee-filter.spec.ts` and applied all three renames:
        line 41:  → "combined assignee filter: IS NULL or membership EXISTS checks — UNION ALL lives inside the EXISTS, not at the top level"
        line 109: → describe "listTickets — combined assignee filter contains a UNION ALL inside the EXISTS clause (see ticket-14 for the top-level UNION that BE-81 requires)"
        line 147: → describe "getColumnCounts — combined assignee filter contains a UNION ALL inside the EXISTS clause (see ticket-14 for the top-level UNION that BE-81 requires)"
- [x] No test name in Build claims BE-81 unless it asserts the absence of a top-level OR
      After renaming, no test name in `modules/build/` contains "BE-81". The only other BE-81
      describe in the repo is in `modules/kb/` (knowledge-collection.service.spec.ts:440), which
      is outside the Build module and outside this ticket's scope.
      **Re-verified 2026-09-29 (Lane F), and this box's absolute wording is now the stale half.**
      Three Build test names contain "BE-81" again, and they are correct: ticket 14's box 2
      shipped the top-level UNION, so the names were re-cut to claim it. The criterion is the
      conditional one — a name may claim BE-81 if it asserts the absence of a top-level OR — and
      all three do. `src/modules/build/core/tickets/assignee-filter.spec.ts:110`, `:174` and
      `:212` now assert `includes("UNION ALL") && !includes("EXISTS")` on the rendered SQL, which
      is the absence of the correlated EXISTS the interim names had to hedge around. The interim
      titles quoted in the box above ("UNION ALL lives inside the EXISTS") no longer exist and
      would now be false. Two further BE-81 describes in
      `core/work-query/projects-work-query-assignee-union.spec.ts:64` and `:177` assert
      independently indexable branches and "no OR between the null check and the semi-join".
      Run 2026-09-29: both suites, 23 tests, all pass.
- [x] Ticket 14's remaining open half is referenced where a reader of these tests would look for it
      Both service-level describe labels (lines 109 and 147) now carry
      "(see ticket-14 for the top-level UNION that BE-81 requires)".
- [x] The spec still passes, and the rename changes no assertion
      `npx jest src/modules/build/core/assignee-filter.spec.ts` — 12 passed, 0 failed.
      Assertions in each renamed test body are unchanged.
      Re-run 2026-09-29 at the spec's current path after the concept-group move:
      `npx jest src/modules/build/core/tickets/assignee-filter.spec.ts src/modules/build/core/work-query/projects-work-query-assignee-union.spec.ts`
      — 2 suites, 23 tests, all pass.
