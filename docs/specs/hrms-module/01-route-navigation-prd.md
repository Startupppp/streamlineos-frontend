# HRM-01 — Route and Navigation Integrity PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Every HRMS, Directory, and `/me` HR destination resolves to the intended page
for a permitted actor, fails safely for a denied actor, and provides a
deterministic path back to its owning collection. Navigation never invents
legacy redirects for deleted routes and never leaves customers on unstyled 404s
inside the module shell.

## Ownership Boundary

This PRD owns route existence, route naming, links, deep links, not-found
behavior, back behavior, loading/error boundaries, and route-access parity. It
does not own sidebar layout (HRM-03), page feature content (HRM-02), or form
unsaved guards (HRM-06).

## Current Source Findings

- Sidebar hrefs for registered HR / Directory / Payroll / Home items resolve to
  `page.tsx` files (source proof from 2026-09-19 audit). Customer-visible 404s
  still occur from hub cards, notification deep links, stale bookmarks, and
  secondary recruitment/document links that sit outside the primary nav.
- Retired routes `/hr/onboarding/my-tasks` and `/payroll/me` correctly have no
  redirect stubs; any remaining callers 404 by design and must be migrated.
- `PRODUCT_PATH_EXCEPTIONS` still maps `/recruitment` → product `hrms` while no
  App Router `/recruitment` tree exists; live routes are `/hr/recruitment` and
  `/me/recruitment`.
- Under `/hr`, ~32 pages lack local `loading.tsx` and ~79 lack local
  `error.tsx`, so failures bubble to coarser boundaries.
- Detail and secondary pages inconsistently declare `backHref`; some fall back
  to browser history or the module hub instead of the owning collection.
- `/payroll/setup` exists without a sidebar entry — **in scope** under HRM-12
  (add Settings child / first-run entry).
- Location holidays view renders an incomplete empty state rather than a
  navigable configuration destination.

These are source findings, not a claim that every path fails in production.

## Canonical Route Rules

- Dynamic segments name the entity: `[employeeId]`, `[personId]`, `[userId]`,
  `[documentId]`, `[formId]`; bare `[id]` is prohibited on new or repaired
  routes.
- Collection, detail, create, settings, and execution routes are distinct.
- Query parameters change a retained page's state; they do not select an
  unrelated page.
- Self-service lives only under `/me/*`. Admin copies of the same workflow live
  under `/hr/*` with the same feature component and a `selfService` (or
  equivalent) flag — never a third parallel route.
- Deleted routes are removed after every caller is migrated. No legacy redirect
  stubs for retired self-service or onboarding paths.
- Announcements remain a **Home Company** destination at `/hr/announcements`
  only (DR-HRM-07). Hub cards may deep-link; HR product sidebar must not
  duplicate the item.

## Route Repairs

- [ ] **HRM-01-001** Inventory every `href`, `router.push`, notification
  deep-link template, email CTA, and hub card target under HR / Directory /
  `/me` HR; record missing destinations in the Evidence Log.
- [x] **HRM-01-002** Migrate or delete every caller of retired
  `/hr/onboarding/my-tasks` and `/payroll/me`.
  **Closed — source proof 2026-09-21.** Neither route directory exists under
  `frontend/app/(authenticated)/`, and no `href=`, `router.push/replace` or
  `redirect()` in `app/`, `components/`, `features/` or `lib/` targets either
  path. Neither appears in the sidebar catalogs or `lib/rbac/route-access`.
  The surviving `/payroll/me/*` strings are the **backend self-service API**
  (`contracts/openapi.json`, `scripts/check-response-contracts.mjs`), which is
  live by design under CLAUDE.md §8 — they are not callers of the retired page.
- [ ] **HRM-01-003** Remove or correct the stale `/recruitment` product-path
  exception once product resolution uses `/hr/recruitment` and `/me/recruitment`
  only.
- [ ] **HRM-01-004** Employee detail, document editor/templates, onboarding
  person, form builder, and case detail declare deterministic `backHref` to
  their owning collection with allowlisted restored query keys.
- [ ] **HRM-01-005** Holiday location empty state links to the authorized
  configuration destination instead of a dead-end message.
- [ ] **HRM-01-006** Hub queue and card links that open secondary surfaces
  (probation, requisitions handoff, exit) resolve to retained routes from
  HRM-02 or are removed.
- [ ] **HRM-01-007** Calendar deep links from leave, holidays, birthdays, and
  probation open `/calendar` with validated HR sources — never a parallel HR
  calendar page.
- [ ] **HRM-01-008** Directory `/directory` vs `/directory/settings` keep
  distinct `basePath` contracts; workers remain `/directory/workers` only.
- [ ] **HRM-01-008a** Payroll routes from HRM-12 gain loading/error/backHref
  parity; `/payroll/setup` is reachable from nav.

## Back and History Contract

- List pages and primary sidebar destinations do not show a decorative back
  arrow.
- Detail, execution, settings subpages, and multi-step wizards use an explicit
  parent destination.
- An in-app opener may record a compatible return URL containing only
  allowlisted path and query keys (search, filters, sort, view, cursor).
- Browser Back remains browser history; empty, external, denied, or stale
  history falls back to the explicit parent.
- Closing a dialog or sheet restores focus to its opener and does not create an
  extra page-history entry.
- A deleted, archived, moved, or access-revoked record resolves through the
  lifecycle contract instead of an unhandled 404.

- [ ] **HRM-01-009** every retained detail and execution page declares
  `backHref`.
- [ ] **HRM-01-010** back destinations are permission-checked and cannot use an
  external or cross-organization return URL.
- [ ] **HRM-01-011** list search, filters, sort, view, and cursor state restore
  after a detail round trip when still valid.
- [ ] **HRM-01-012** create/edit overlay close restores opener focus and
  collection state.
- [ ] **HRM-01-013** browser Back is exercised for clean, dirty, denied,
  deleted, and cross-scope states on employees, leave, documents, and
  directory.

## 404, Missing, and Denied States

- A malformed route parameter returns the module's not-found state without a
  broad data query.
- A nonexistent record returns Not Found.
- A record in another tenant is indistinguishable from Not Found.
- An existing in-tenant record outside the actor's data scope returns the
  repository-standard denial behavior without leaking metadata.
- An archived employment or person presents restore or parent navigation only
  when allowed.
- Backend unavailable is an error state, never Not Found or empty.

- [ ] **HRM-01-014** HR owns scoped `not-found`, `error`, and `loading` at the
  smallest useful route boundaries for every retained primary and secondary
  page.
- [ ] **HRM-01-015** Directory and `/me` HR routes meet the same boundary
  contract.
- [ ] **HRM-01-016** denied vs not-found vs error copy is distinct and tested.

## Route-Access Parity

- [ ] **HRM-01-017** every sidebar and hub destination has a matching
  `resolveNavRouteAccess` / route-access classification.
- [ ] **HRM-01-018** every retained secondary page reachable only from hubs is
  still access-classified (unknown routes fail closed).
- [ ] **HRM-01-019** `PAGES.md` retired-route and `/me` gate notes match source
  (`requireSession` vs stale `self:*` claims).

## Acceptance Checks

- [ ] **HRM-01-020** focused route-access and nav tests cover HR primary,
  Directory, and `/me` HR destinations.
- [ ] **HRM-01-021** browser proof: no primary customer journey ends on Next
  default 404 for retained routes.
- [ ] **HRM-01-022** Evidence Log lists every deleted route and the last
  migrated caller.
