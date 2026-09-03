# 07: Directory and HRMS

**What to build:** Directory and HRMS workflows are tenant-safe, bounded, privacy-aware, accessible, and verifiable end to end.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** partial — 2 self-service module-gate defects fixed, 1 confirmed 42P10 runtime defect fixed with migration 1052; frontend a11y/responsive and E2E not run. Report: `reports/07-directory-hrms.md`

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C118** — Reconstruct current-head Directory/Me evidence across canonical ownership, self-versus-administrative authorization, tenant-scoped schema and indexes, bounded search/list projections, privacy-safe caching, TanStack keys, responsive accessibility and allow/deny/cross-tenant E2E.
  PARTIAL: self-versus-administrative authorization is DONE and proved — swept 3,661 handlers / 78 self-service handlers by two independent passes; found and fixed 2 `@RequireModule("hr")` decorators on `self:onboarding-tasks` routes (`onboarding.controller.ts:334,363`) that 403'd every member of an HR-disabled org out of their own onboarding tasks. Zero impersonation holes: exactly one self-service handler takes a subject id and it asserts the manager relationship in-service. Privacy-safe caching audited (684 files / 46 sites). NOT RUN: responsive accessibility, TanStack key audit, allow/deny/cross-tenant E2E, bounded-projection read-cost measurement.
- [ ] **PRD-C119** — Reconstruct current-head HRMS evidence across employee lifecycle schema, tenant-composite integrity, module/record/DataScope authorization, bounded indexed queries, async imports/exports, cache invalidation, frontend states, folder cohesion and representative HR workflows.
  PARTIAL: tenant-composite integrity advanced on `roster_entries` — migration 1052 lands the natural key `(org_id, roster_id, user_membership_id, date)` plus two objects that were DECLARED and absent from the catalog (`idx_roster_entries_org_user_membership_date`, FK `fk_roster_entries_user_actor`); `upsertRosterEntry` was 42P10-ing on every call since it shipped, with NO spec covering it at any level. DataScope widening filters checked against root section 5's `hr:employees:manage` no-op trap — does not bite in HR. Cache invalidation audited: two dead bumps found (`hr:salary-bands`, `hr:dashboard:payroll-summary` — the `chat:unread` shape) and two silently-ignored `departmentId` filters, both reported not fixed. NOT RUN: employee lifecycle schema sweep, async import/export paths, frontend states, folder cohesion, representative HR workflow E2E.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
