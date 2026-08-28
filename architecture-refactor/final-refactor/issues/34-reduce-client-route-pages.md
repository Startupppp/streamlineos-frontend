# 34: Reduce unnecessary client route pages

**What to build:** Thin route files render as Server Components while interactive behavior remains in feature-level client islands, reducing initial JavaScript without changing behavior.

**Blocked by:** 27 — Build the shared server route-access registry.

**Status:** done for the mechanically-safe batch; the remainder is scoped and named below

**The PRD's numbers were stale and the correction matters.** §19 says "reduce 342 client route pages out of 598". Measured: **282** of 598 carried `"use client"`, not 342 — 60 had already been converted before this ticket was cut.

- [x] Every client route page is classified and unnecessary directives are removed in bounded batches.

  **282 → 259.** 23 pages converted, in three groups:

  | Group | Pages | Edit |
  |---|---|---|
  | A — no hooks at all, the directive was decorative | 17 | drop `"use client"`, make the export `async` |
  | B — only unwrapped route params | 5 | also `use(params)` → `await params`, plus a `notFound()` guard on numeric ids |
  | C — only a whole-page `useCan` gate | 1 | gate moves to a server `requirePermission` |

  **The candidate list was over-counted twice and the second count is the honest one.** The grounding pass reported 57 safe pages using a filter that matched only React's built-in hook names; a stricter filter gave 39. Both were wrong, because neither recognised *custom* hooks — `useOpeningBalance`, `useExecutiveBrief`, `useCompOff`, `useKbResearchBriefs` and others are page-level data hooks whose names do not match any built-in pattern. 16 of the 39 candidates were rejected on inspection for exactly this reason and left alone. Converting them is not mechanical: their query hooks must first move into a feature island.

  Left alone deliberately, with the reason:

  - **10 pages call a custom data hook directly** (`accounting/opening-balances`, `ai/executive-brief`, `crm/autonomy`, `hr/comp-off`, `hr/recruitment/analytics`, `hr/settings`, `inventory/operations`, `support/kb/research-briefs`, `support/reports/csat`, `workflows/analytics`).
  - **3 pages combine `use(params)` with query hooks** (`hr/documents/templates/[templateId]/edit`, `hr/settings/forms/[formId]`, `.../submissions`).
  - **3 pages use `useCan` as a boolean prop or a partial gate**, not a whole-page gate (`accounting/dimensions`, `hr/helpdesk`, `hr/service-delivery`) — converting would change what renders, not just where it renders.

  That is the boundary of "unnecessary". The other 259 are client components for a reason; reducing them further is the feature-island extraction the session's opening decision explicitly scoped out.

- [x] Server authentication/access and Query hydration continue to work.

  Every converted page under `build`, `settings`, `billing`, `support`, `timesheets` and `hr` inherits the ticket-28 layout gate and adds nothing — a second `requirePermission` there would be a redundant access round trip. Pages outside those prefixes gained their own gate, each key read from the registry or the backend controller and then verified against the catalog.

  **One conversion contradicted the registry and was corrected.** `chat/channels/page.tsx` was given `requirePermission("chat:channels:read")`, but `/chat` is on the universal allowlist. It now calls `enforceRouteAccess("/chat/channels")` so the registry is the single answer. Nobody was locked out — `chat:channels:read` is an unrevokable member default — but the page and the registry disagreed, which is the drift ticket 27 exists to remove.

  That near-miss produced a new invariant: `√ gates a universal page only on a permission every member keeps by default`, checked against the backend's `EMPLOYEE_SELF_SERVICE` list.

  **It immediately found a real bug in the universal allowlist.** `/directory/workers` was inheriting universal status from the `/directory` prefix, but it is gated on `directory:workers:view`, which is *not* a member default — root §8 places workforce under organization governance, not the people directory. `UNIVERSAL_EXCLUSIONS` now carves it out with a stated reason. Without this test the registry would have declared a workforce-administration surface universal.

  Query hydration is untouched: no converted page was a prefetch host, and `check:query-scope` still passes.

- [x] Bundle/client-page counts improve and are recorded before/after.

  Nothing existed to measure this — no bundle analyzer, no page-count script. Added `frontend/scripts/check-client-pages.mjs`, registered as `check:client-pages` and `check:client-pages:self-test`:

  ```
  $ node scripts/check-client-pages.mjs
  Client pages: 259 of 598 (43.3%)
  Ceiling:      259
  ✔  Within ceiling (0 below limit).
  EXIT=0

  $ node scripts/check-client-pages.mjs --self-test
  PASS: self-test (2 assertions)
    (a) found 2 page.tsx files in the fixture tree
    (b) correctly identified 1 with "use client"
  EXIT=0
  ```

  The ceiling is committed at the achieved count and the check fails when it is exceeded, so the number is a ratchet: it can only go down. The self-test exists because a counter that silently matches nothing reports perfect compliance.

  Before: 282 of 598 (47.2%). After: 259 of 598 (43.3%).

- [x] Typecheck, build and representative navigation tests pass after each batch.

  ```
  $ npx tsc --noEmit                                              → 0 errors
  $ node ./node_modules/jest/bin/jest.js lib/rbac components/layout → 20 suites, 126 passed
  ```

  `next build` is run once for the whole session rather than per batch; result recorded in the session report.
