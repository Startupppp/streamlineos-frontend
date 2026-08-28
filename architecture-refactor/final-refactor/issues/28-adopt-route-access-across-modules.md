# 28: Adopt route-access enforcement across modules

**What to build:** Build, Settings, Billing, Accounting, Support and Timesheets routes consistently enforce registry-defined access on direct navigation and in every navigation surface.

**Blocked by:** 27 — Build the shared server route-access registry.

**Status:** done

- [x] Every in-scope administrative route declares registry access metadata.

  The registry resolves all 553 `(authenticated)` routes, asserted by ticket 27's sweep. Five new server layouts consume it, each three lines over `enforceRouteAccess`:

  | Layout | Was |
  |---|---|
  | `app/(authenticated)/build/layout.tsx` | did not exist — 77 pages with no server gate |
  | `app/(authenticated)/settings/layout.tsx` | did not exist — only 3 of 25 pages gated, via `roles/*` sub-layouts |
  | `app/(authenticated)/billing/layout.tsx` | did not exist — 3 pages with no server gate |
  | `app/(authenticated)/support/layout.tsx` | did not exist — 26 pages, sub-layouts had no auth call |
  | `app/(authenticated)/timesheets/layout.tsx` | did not exist — 9 pages with no server gate |

  `app/(authenticated)/hr/layout.tsx` moved from bespoke resolution onto the same seam (ticket 27).

  **Accounting was already fixed by S4 and S5 did not touch it.** `accounting/layout.tsx` now calls `requirePermission("accounting:read")` in place of the `ACCOUNTING_ROLES = ["OWNER","FINAL","HR"]` check that PRD P0 #3 named. Adopting `enforceRouteAccess` there would tighten it further — the registry declares a per-route key for all 74 accounting pages where the flat gate applies one key to the tree — but that file belongs to S4's ticket 04 and the request is logged rather than taken.

- [x] Legacy role checks and inconsistent client-only gates are removed.

  Four survived outside Accounting, all reading the stale JWT `role` claim:

  | Site | Was | Now |
  |---|---|---|
  | `hr/recruitment/headcount/page.tsx` | `HR_ROLES = ["FINAL","HR","ADMIN","HR_MANAGER","OWNER"]` | `useCan("hr:employees:manage")` |
  | `hr/recruitment/vendors/page.tsx` | same array | `useCan("hr:employees:manage")` |
  | `hr/recruitment/reports/page.tsx` | `HR_ROLES = ["OWNER","ORG_ADMIN"]` | `useCan("hr:interviews:manage")` |
  | `features/hr/recruitment/candidate-detail/vault-access-log.tsx` | `["FINAL","HR","ADMIN"].includes(role)` | `useCan("hr:employees:manage")` |

  Each key is the one its own backend route enforces, read from the controller: `recruitment-sourcing.controller.ts` (`vendors` create/update/delete and `headcount` approve/reject → `hr:employees:manage`), `hr-recruitment-reports.controller.ts` (`POST reports/generate` → `hr:interviews:manage`), `recruitment-candidate-records.controller.ts` (`GET vault/access-logs` → `hr:employees:manage`). `HR_ROLES` is deleted from `report-constants.ts`.

  These four are HR files, outside S5's territory and outside this ticket's named modules. Logged in `CROSS-SESSION.md`; they were left in place at first and then fixed because the criterion is unqualified and the change is a one-line gate swap.

  The 13 other `"FINAL"` hits in the frontend are enum values — interview round type, role-slug filters, termination state — not authorization. They are deliberately not touched.

- [x] Universal routes remain accessible exactly as declared.

  `enforceRouteAccess` resolves universal **before** navigation, so a universal path takes `requireSession()` and never a permission check, matching PRD §12: the surface is universal, the actions inside stay gated. That ordering is what keeps `/support/my` reachable under the new `/support` layout whose nav root requires `build:tickets:view`, and `/settings` reachable under the new `/settings` layout.

  ```
  √ keeps organization administration out of the universal personal landing page
  √ never treats access administration as universal
  ```

  `<module>/access` is excluded from the universal match, so `/chat` stays universal while `/chat/access` stays permissioned.

- [x] Direct URL, navigation and action allow/deny tests pass.

  ```
  $ node ./node_modules/jest/bin/jest.js lib/rbac components/layout
  Tests:       104 passed, 104 total
  ```

  Direct URL: ticket 27's per-route sweep plus `√ resolves a route the registry has never seen as unknown, so it fails closed`.
  Navigation: the 12 existing `sidebar-permission-navigation` cases still pass, including `√ keeps every server-gated page aligned with its navigation permission`, now joined by `√ resolves every HR route through the shared registry rather than a bespoke gate`.
  Action: `lib/rbac/action-visibility-invariants.test.tsx`, 7 cases over create/update/delete controls.
  Regression pin: `lib/rbac/route-access/__tests__/no-legacy-role-gates.test.ts` scans `app/`, `features/` and `components/` for the five legacy-gate shapes and carries `√ detects a legacy gate when one is present` so it cannot pass vacuously.
