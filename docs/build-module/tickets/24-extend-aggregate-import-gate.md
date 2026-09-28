# 24 — Extend the aggregate-import gate to cover hooks

**What to build:** The rule that already protects query-key imports also protects hook imports, so the work in tickets 21 to 23 cannot silently regress. A gate exists today enforcing that consumers import a query-key domain module rather than the aggregate; there is no equivalent for hooks, which is why the aggregates accumulated 122 Build callers between them unnoticed.

Note this is an extension of an existing rule, not the enforcement of one already written. FE-18 covers query keys only — do not cite it as though it already forbade the hook aggregates.

**Blocked by:** 21 — Deep-import the cross-module hooks aggregate. 22 — batch A. 23 — batch B.

**Status:** all four boxes earned; gate root widened 2026-09-28 (see the correction below)

- [x] A gate fails when a Build file imports from either hooks aggregate
- [x] The gate's self-test proves it resolves files and would actually fire, rather than passing vacuously on zero matches
- [x] Test-only importers are permitted, explicitly
- [x] The rule is written down alongside the existing query-key rule

**Correction 2026-09-28 (lane EXEC) — all four boxes stay ticked, and none of them was false. The
gate's *root* was too narrow to reach the violations that mattered, which is the "gates report green
over unread code" pattern rather than a wrong criterion.**

Every criterion above is scoped to "a Build file", and the gate did exactly that:
`hooks/api/build/aggregate-import-boundary.test.ts:5` set `buildFeatureRoot =
join(frontendRoot, "features", "build")` as its **only** root. So `features/build/**` was at a true
zero — and still is — while every other consumer of the Build hooks was invisible to it. The gate
was not lying about what it checked; it was silent about what it never looked at. Nothing here is
untickable, so nothing is unticked.

**Found by** the sibling sweep for the stale-mock defect in
`features/__tests__/menu-driven-sheet-focus.a11y.test.tsx`: two suites mocked the
`@/hooks/api/build` barrel and were green **because their production subjects imported the barrel**,
which is precisely the FE-127 violation this gate exists to stop —
`features/timesheets/settings/rate-preview-panel.tsx:22` (`useProjects`) and
`features/calendar/ticket-picker-dialog.tsx:13-14` (`useTicketSearch`, `TicketSearchResult`).

**Root, before → after.**

| | Before | After |
|---|---|---|
| Roots walked | `features/build` | `features`, `components`, `app`, `lib` |
| Production files reached | 1,196 under `features/build` | the four roots, tests excluded as before |
| Violations the gate could see | 0 of 47 outside Build | all of them |

**Counts at the moment of widening.** 47 production files imported `@/hooks/api` or
`@/hooks/api/build` outside `features/build/**`. Two are fixed in this change — both named above,
repointed onto their domain modules (`@/hooks/api/build/projects`,
`@/hooks/api/build/ticket-search`), with their suites' `jest.mock` targets moved to match, the same
correction the a11y suite needed. The remaining **45** are recorded in
`frontend/hooks/api/build/aggregate-import-known.json` and may only shrink:

| Area | Files |
|---|---:|
| `features/chat` | 19 |
| `features/recruitment` | 12 |
| `features/calendar` | 4 |
| `components/**` | 4 |
| `features/crm` | 2 |
| `features/timesheets` | 2 |
| `features/hr` | 1 |
| `app/(public)/design-system` | 1 |

They are deliberately not mass-fixed: 45 files across five unrelated feature lanes is a change no
one can review as one diff, and a gate that ships red over live debt is a gate someone switches off.

**The gate now has four arms, each mutation-checked.**

1. `no Build feature file imports from the hooks aggregate or Build hooks barrel` — the original
   hard zero, unchanged, so the criteria above keep the exact guarantee they were ticked for.
2. `adds no file that is not already known about` — measured minus the ratchet must be empty.
   Mutation: re-pointing `features/calendar/ticket-picker-dialog.tsx` back at the barrel fails this
   arm and names the file. That is the proof the widening works — the old root could not see that
   file at all.
3. `keeps no entry for a file that no longer imports an aggregate` — the ratchet cannot rot into a
   permanent allowlist, and a fixed, renamed or deleted file must leave it. Mutation: adding an
   already-fixed path fails.
4. `names no Build feature file, because Build is a hard zero and a ratchet entry would excuse it` —
   without this, arm 1 could be quietly defeated by adding a `features/build/**` line to the JSON.
   Mutation: adding `features/build/epics/epics-page.tsx` fails arms 3 and 4 together.

The self-test was widened with them: it still proves the pattern matches both barrels and neither a
domain path nor `@/hooks/api/access`, and now also asserts every one of the four roots resolves
files, that the ratchet is non-empty, and that it holds no duplicates — so the whole thing cannot
pass vacuously on a root that silently stopped resolving, which is how it came to be narrow.

```text
$ cd frontend && nice -n 10 npx jest --maxWorkers=2 hooks/api/build/aggregate-import-boundary
Tests:       5 passed, 5 total

$ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/calendar/ticket-picker-dialog features/timesheets/settings/rate-preview-panel
Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total

$ cd frontend && nice -n 10 npx jest --maxWorkers=2 hooks/api/build features/build features/calendar features/timesheets
Test Suites: 427 passed, 3 failed, 430 total
Tests:       4464 passed, 14 failed
```

The three red suites are other lanes' and are not touched by this change — none of their subjects is
in this change's file set: `features/calendar/unified-calendar-surface-boundary.test.ts` (its census
expects `build/views/calendar-view.tsx` to still be hand-rolled, and the views lane has converted
it), `features/calendar/calendar-events-panel-row-height.test.tsx` (a `truncate` class on the
foreign-zone row) and `features/timesheets/reports/reports-tab-fetching.test.tsx` (per-tab fetch
gating). This change only moves two import specifiers and two `jest.mock` targets.

**One follow-up, outside this lane's write territory.** FE-127 in `frontend/CLAUDE.md` should carry
the ratchet the way FE-48 already does for `denial-is-not-emptiness.known.json` — a sentence naming
`hooks/api/build/aggregate-import-known.json`, its 45 entries and that the count may only shrink.
Without it the ratchet is enforced but undocumented, and the next reader of FE-127 will assume the
gate is a hard zero everywhere.
