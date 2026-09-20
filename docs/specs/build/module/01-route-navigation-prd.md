# BLD-01 — Route and Navigation Integrity PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Every Build destination resolves to the intended page for a permitted actor,
fails safely for a denied actor, and provides a deterministic path back to its
owning collection. Navigation preserves compatible state and never copies a
project subpath or query onto another scope.

## Ownership Boundary

This PRD owns route existence, route naming, links, deep links, not-found
behavior, back behavior, scope changes, and route-access parity. It does not
own sidebar layout, page feature content, or unsaved-form implementation.
BLD-01A is the canonical current-to-final route manifest for this policy.

## Current Source Findings

- `product-feedback-page.tsx` opens
  `/build/feedbucket/{submissionId}` although feedback detail is project
  scoped and the registered route requires `projectId`.
- `views-page.tsx` opens a saved issue view on `/build/{projectId}` even though
  that route is now Project Overview.
- `sprint-card.tsx` and `module-card.tsx` also send issue filters to the project
  overview route.
- `ticket-detail-page.tsx` sends its back action to Project Overview rather
  than the Issues collection that owns the ticket.
- project settings navigate to Project Overview after every successful save,
  discarding the user's settings location.
- `/build/goal` is a singular collection URL while workspace and product
  collections use `/goals`.
- both `/sprints` and `/cycles` are registered for materially overlapping
  iteration concepts.
- the current project navigation catalog links `Cycles` to `/sprints`, while
  the normative BLD-00 route is `/cycles`.
- internal portal preview uses `/portal/*`, while external client access uses
  `/client-portal/*` plus `/accept-invitation`; treating them as one route
  family would mix employee and portal identities.
- `frontend/PAGES.md` still says workspace scope has only root, All Work, and
  My Work and lists only the managed-product root, while the source tree now
  also contains workspace Overview/Products/Teams/Goals/Roadmap and product
  Projects/Goals/Roadmap/Feedback/Insights pages.
- the existing route-access test proves registered access classification for
  sidebar destinations; it does not prove that every contextual link maps to a
  physical page or the semantically correct page.

These are source findings, not a claim that every path fails in the deployed
application.

## Canonical Route Rules

- Organization collections use plural nouns.
- Dynamic segments name the entity: `[projectId]`, `[ticketKey]`,
  `[submissionId]`; bare `[id]` is prohibited.
- Project Overview is `/build/{projectId}`.
- Project issue exploration is `/build/{projectId}/issues`.
- Saved issue layouts and issue filters resolve under `/issues`, never
  Overview.
- A ticket route uses the stable human key where supported. Numeric identity
  remains internal to API and cache contracts.
- Collection, detail, create, settings, and execution routes are distinct.
- Query parameters change a retained page's state; they do not select an
  unrelated page.
- Deleted routes are removed after all callers and customer-visible links are
  migrated. No hidden duplicate route or legacy redirect is retained.

## Route Repairs

- [ ] **BLD-01-001** Feedback rows include and validate their owning
  `projectId`, then open
  `/build/{projectId}/feedbucket/{submissionId}`.
- [ ] **BLD-01-002** Saved views open under
  `/build/{projectId}/issues?viewId=...`.
- [ ] **BLD-01-003** module, iteration, epic, assignee, label, and status links
  that represent issue filters open under `/issues`.
- [ ] **BLD-01-004** ticket detail back actions return to the recorded,
  permission-safe issue collection state; direct deep links fall back to
  `/build/{projectId}/issues`.
- [ ] **BLD-01-005** saving settings stays on the active settings page and
  preserves its tab or subroute.
- [ ] **BLD-01-006** the organization goal collection is canonicalized to
  `/build/goals`; every caller and access rule is migrated before the singular
  route is deleted.
- [ ] **BLD-01-007** iteration routes follow the normative BLD-00 Cycle
  decision; the `/sprints` route and every stale caller are deleted.
- [ ] **BLD-01-008** calendar links open `/calendar` with a validated Build
  source and scope filter.
- [ ] **BLD-01-009** configuration links moved by BLD-02B resolve under
  `/build/{projectId}/settings/*`.
- [ ] **BLD-01-010** workspace and product routes preserve their own scope and
  never reuse a project suffix.

## Back and History Contract

- List pages and primary sidebar destinations do not show a decorative back
  arrow.
- Detail, execution, and settings subpages use an explicit parent destination.
- An in-app opener may record a compatible return URL containing only
  allowlisted path and query keys.
- Browser Back remains browser history, but an empty, external, denied, or
  stale history entry falls back to the explicit parent.
- Closing a dialog or sheet restores focus to its opener and does not create an
  extra page-history entry.
- A deleted, archived, moved, or access-revoked record resolves through the
  lifecycle contract instead of an unhandled 404.

- [ ] **BLD-01-011** every detail and execution page declares a deterministic
  `backHref`.
- [ ] **BLD-01-012** back destinations are permission checked and cannot use an
  external or cross-organization return URL.
- [ ] **BLD-01-013** list search, filters, sort, view, group, and cursor state
  are restored after a detail round trip where still valid.
- [ ] **BLD-01-014** create/edit overlay close restores the opener's focus and
  collection state.
- [ ] **BLD-01-015** browser Back is exercised in a real browser for clean,
  dirty, denied, deleted, and cross-scope states.

## 404, Missing, and Denied States

- A malformed route parameter returns the module's not-found state without
  issuing a broad data query.
- A nonexistent record returns Not Found.
- A record in another tenant is indistinguishable from Not Found.
- An existing in-tenant record outside the actor's data scope returns the
  repository-standard denial behavior without leaking metadata.
- An archived record presents restore or parent navigation only when allowed.
- Backend unavailable is an error state, never Not Found or empty.

- [ ] **BLD-01-016** Build owns scoped `not-found`, `error`, and loading states
  at the smallest useful route boundaries.
- [ ] **BLD-01-017** 400, 403, 404, 409, and 5xx responses map to distinct,
  actionable customer states.
- [ ] **BLD-01-018** wrong-tenant IDs reveal no title, key, existence,
  membership, or parent information.
- [ ] **BLD-01-019** stale notification and email links recover to the nearest
  accessible parent and explain the missing target.
- [ ] **BLD-01-020** no empty-state component is used to hide permission or
  network failure.

## Scope Switching

- The selected destination is mapped by semantic identity, not copied by raw
  suffix.
- Overview maps to Overview and Issues maps to Issues only when both scopes
  support that destination.
- Unsupported destinations fall back to the new scope's overview.
- Saved view IDs, record IDs, and search cursors never cross scope.
- Organization changes clear all tenant-scoped return locations and query
  state before rendering.

- [ ] **BLD-01-021** project, product, workspace, and organization switches
  pass the semantic destination matrix.
- [ ] **BLD-01-022** renamed, moved, archived, deleted, and revoked scopes pass
  the existing sidebar lifecycle contract.
- [ ] **BLD-01-023** unsaved changes intercept sidebar, command palette, scope
  selector, breadcrumbs, browser Back, and programmatic navigation.
- [ ] **BLD-01-024** late responses from the previous organization or scope
  never render in the new route.

## Automated Route Inventory

- [ ] **BLD-01-025** one canonical manifest maps each retained customer route
  to its owner, scope, module, permission, page file, and parent route.
- [ ] **BLD-01-026** a static gate extracts sidebar destinations, `Link`
  targets, router pushes/replaces, notification links, email-link builders, and
  command actions, then rejects missing physical pages.
- [ ] **BLD-01-027** the gate rejects a registered but semantically wrong
  destination such as an issue-filter query on Overview.
- [ ] **BLD-01-028** route-access and navigation permissions are identical for
  every retained route.
- [ ] **BLD-01-029** route parameters and frontend folder names match backend
  parameter names end to end.
- [ ] **BLD-01-030** the gate has a self-test that plants one missing target,
  one unknown access rule, and one wrong-scope destination.

## Browser Matrix

- [ ] **BLD-01-031** crawl every retained route as owner, manager, member,
  restricted member, client, and no-access actor.
- [ ] **BLD-01-032** crawl primary actions, table/card links, breadcrumbs,
  overlay completions, empty-state CTAs, and error recovery.
- [ ] **BLD-01-033** direct load and hard refresh work for every dynamic route.
- [ ] **BLD-01-034** malformed query values are rejected or normalized without
  broadening the result set.
- [ ] **BLD-01-035** mobile and keyboard navigation preserve focus and expose
  the current page.

## Acceptance

- [ ] **BLD-01-A01** static route and route-access gates pass with non-vacuous
  self-tests.
- [ ] **BLD-01-A02** the known wrong-root and missing-project links have focused
  regressions that fail before and pass after repair.
- [ ] **BLD-01-A03** the browser crawl records zero unexpected 404s and zero
  semantically wrong destinations.
- [ ] **BLD-01-A04** denial and cross-tenant route tests pass against a named
  database environment.
- [ ] **BLD-01-A05** `frontend/PAGES.md` matches the retained route manifest
  exactly, and root `PAGES.md` contains the release evidence entry without
  becoming a duplicate route inventory.
