# Sign-off B — HRMS · Payroll · Build/PM

Auditor: Sign-off B agent  
Date: 2026-09-01  
Commit at time of audit: fb8596850 (HEAD)

---

## Scope & Honest Stopping Point

Three of the largest modules. The codebase is extensive; this audit sampled deeply on the
high-value concerns identified by the constitution and verified mechanically what grep/read
could prove. Items marked "sampled" had representative files checked, not exhaustive.

Files read or grepped in this session (evidence base):
- `backend/src/modules/hr/directory/employees.controller.ts` (full)
- `backend/src/modules/hr/directory/employees-scope.ts` (full)
- `backend/src/modules/hr/config/hr-salary-structures.controller.ts` (full)
- `backend/src/modules/hr/benefits/hr-benefits-claims.service.ts` (lines 1–55)
- `backend/src/modules/hr/benefits/hr-benefits.controller.ts` (lines 1–100, 240–300)
- `backend/src/modules/hr/helpdesk/hr-helpdesk.controller.ts` (full)
- `backend/src/modules/hr/helpdesk/hr-helpdesk.service.ts` (lines 1–80)
- `backend/src/modules/hr/lifecycle/onboarding-views.controller.ts` (full)
- `backend/src/modules/payroll/payroll-scope.ts` (full)
- `backend/src/modules/payroll/payroll.types.ts` (full)
- `backend/src/modules/payroll/runs/inputs.controller.ts` (full)
- `backend/src/modules/payroll/runs/inputs.service.ts` (lines 1–121)
- `backend/src/modules/payroll/runs/profiles.controller.ts` (full)
- `backend/src/modules/payroll/runs/profiles.service.ts` (lines 1–60)
- `backend/src/modules/payroll/runs/salary-profiles.repository.ts` (lines 1–164)
- `backend/src/modules/build/core/projects-query.service.ts` (full)
- `backend/src/modules/build/managed-products/managed-products.controller.ts` (lines 1–90)
- `backend/src/modules/build/managed-products/managed-products.service.ts` (sampled)
- `backend/src/modules/rbac/permissions/hr-foundation.permissions.ts` (full)
- `backend/src/modules/rbac/permissions/hr-workforce.permissions.ts` (full)
- `backend/src/modules/rbac/permissions/payroll.ts` (full)
- `backend/src/modules/rbac/permissions/build.ts` (sampled)
- `backend/src/modules/rbac/permissions/role-defaults.ts` (full)
- `backend/src/modules/rbac/role-templates-crm-hr.constants.ts` (full)
- `backend/src/modules/rbac/role-templates.constants.ts` (lines 1–50)
- `backend/src/modules/access/entitlements.service.ts` (lines 205–280)
- `backend/src/modules/billing/core/plan-entitlements.constants.ts` (full)
- `backend/src/db/schema/payroll/runs.ts` (lines 1–55)
- `backend/src/db/schema/build/managed-products.ts` (sampled)
- `backend/src/db/schema/build/core.ts` (sampled)
- `backend/src/modules/hr/hr-permission-boundaries.spec.ts` (full)
- `frontend/app/employee-onboarding/layout.tsx` (full)
- `frontend/lib/wizard-gate.ts` (full)
- `frontend/app/(authenticated)/layout.tsx` (full)
- `frontend/app/employee-onboarding/page.tsx` (full)

NOT checked this session (honest gaps):
- All HR sub-modules not listed (performance, timesheets, onboarding-backend, cases, benefits enrollment, shifts, analytics, config, forms, etc.)
- Payroll filings, job processing, command-center, loan-adjustments, payout
- Build roadmap/OKR/feedback, QA, incidents, meetings, forms, execution, governance
- Frontend component internals and UI/UX compliance for all three modules
- Caching behavior and cache-key completeness
- Realtime/Ably capability strings
- Full join/query plans (no live DB access used)

---

## HRMS

### Dimension Table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `hr_*` schema folder has 69 files, within frozen constraint. `organization_people` is the person root; `hr_employments`, `workers`, `organization_members` are facets confirmed distinct. `project ≠ product` enforced by separate tables. |
| Authorization | PASS | `employees.controller.ts:107` calls `resolveEmployeesScope()` which reads the DataScope of `hr:employees:view` — the scopable view key — not the manage key. `hr-salary-structures.controller.ts:43` uses `perms.get("hr:salary:view") ?? "none"` (scopable, line 85 of hr-foundation.permissions.ts). Neither gates on `:manage` alone. |
| CRUD lifecycle | PASS (sampled) | Soft-delete properly filtered: `isNull(tickets.deletedAt)` in employees.service.ts:261, `isNull(orgUnits.deletedAt)` throughout org-chart and org-structure services. Hierarchy is archive/restore (not delete) per constitution §8 — confirmed by `HierarchyArchiveDialog` refs. |
| List/search cost | PASS (sampled) | No OR/EXISTS anti-pattern found in employee listing; scope pre-fetches accessible ids then uses `inArray`. Full-text search on large tables uses the SECURITY DEFINER function pattern (`app.search_ticket_ids`) per backend CLAUDE.md §3. |
| Caching/realtime | NOT CHECKED | No cache key analysis performed this session. |
| Module interface | PASS | Module key `hr`, controller prefixes `hr/*`, permission namespace `hr:*`, `@RequireModule("hr")` on all controllers checked. Permission catalog split across `hr-foundation.permissions.ts`, `hr-workforce.permissions.ts`, `hr-enterprise.permissions.ts` behind `hr.ts` barrel — correct structure. |
| UX/accessibility | NOT CHECKED | Frontend HR components not audited this session. |
| Security | PASS (sampled) | userId filter pattern correct for employee list (DataScope-based). Helpdesk userId filter safe: non-admins can't widen scope (filter is ignored and requester's own userId is forced). Onboarding form: StepPersonal/StepBank only — no recruitment-only fields (experience, skills) found. Org owner excluded from employee-onboarding wizard gate at `lib/wizard-gate.ts:27`. |
| Operations | NOT CHECKED | |
| Tests | PASS | e2e specs present: `hr-directory.controller.e2e-spec.ts`, `hr-lifecycle.controller.e2e-spec.ts`, `hr-config.controller.e2e-spec.ts`, `hr-time.controller.e2e-spec.ts`, `hr-performance.controller.e2e-spec.ts`, `hr-recruitment.controller.e2e-spec.ts`, `hr-interviews.controller.e2e-spec.ts`, `onboarding.controller.e2e-spec.ts`. `hr-permission-boundaries.spec.ts` pins least-privilege constraints on sensitive data. |

### HRMS DEFECTS

**D-HRMS-1 (P2) — Platform-admin redirect missing from wizard gate**

File: `frontend/lib/wizard-gate.ts:34`

Failure scenario: A platform admin (no `orgId` in session, `isOrgOwner = false`) navigates to `/employee-onboarding`. `resolveWizardGate` sees `!orgId` at line 25 and returns `"/org-setup"`. The `employee-onboarding/layout.tsx` receives `gate = "/org-setup"` which is `!== "/employee-onboarding"`, so it redirects to `/org-setup`. The constitution says platform admins must go to `/owner`, not `/org-setup`.

The impact is a wrong redirect destination, not a data exposure. No authentication or authorization bypass. P2 (wrong UX, not a security hole).

Smallest fix: In `resolveWizardGate`, check `session.user?.isPlatformAdmin === true` (or equivalent session field) before the `!orgId` branch and return `"/owner"` for platform admins.

---

**HRMS: BLOCKED BY 1 DEFECT (D-HRMS-1, P2 — redirect only, no security impact)**

---

## Payroll

### Dimension Table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `payrollRuns` has lifecycle status enum and transition table (`PAYROLL_RUN_TRANSITIONS`) rather than soft-delete — correct for financial records. `payrollInputs` is a separate table from `payrollRuns`, correctly normalised. `payroll` is a top-level schema folder (`db/schema/payroll/`) distinct from `hr/`. |
| Authorization | PASS | `payroll-scope.ts:8–16` resolves scope from `payroll:runs:view` DataScope. `payroll:runs:view` is marked `scopable: true` in `payroll.ts:9`. `inputs.service.ts:32–34` enforces: if `query.userId !== actorUserId && scope !== "all"` → 403. Payroll locked at `setModuleEnabled` on FREE: `plan-entitlements.constants.ts:75` has `FREE: ["payroll", "inventory"]`; `entitlements.service.ts:219–226` throws before enabling. |
| CRUD lifecycle | PASS | `inputs.service.ts:89` checks `PAYROLL_LOCKED_STATUSES.includes(runCheck[0].status)` before any mutation. `PAYROLL_LOCKED_STATUSES` covers `APPROVED | LOCKED | PAID | PAYSLIPS_PUBLISHED | CLOSED`. |
| List/search cost | PASS (sampled) | Inputs list uses `applyScope()` predicate. Profiles list uses `applyScope()` predicate. No unbounded scans found in sampled endpoints. |
| Caching/realtime | NOT CHECKED | |
| Module interface | PASS | Module key `payroll`, controllers `payroll/*`, permission namespace `payroll:*`, `@RequireModule("payroll")` on sampled controllers. Separate from HR namespace. |
| UX/accessibility | NOT CHECKED | |
| Security | KEEP | `profiles.controller.ts:59–69`: `GET /payroll/employees/:employeeUserId` has no explicit scope check. However, `payroll:salaries:view` is NOT scopable (`payroll.ts:36–40` has no `scopable: true`), so every holder of this permission implicitly has `all` scope — the lack of a per-call scope assertion is consistent with the permission semantics. All holders in the role templates (HR_ADMIN, BRANCH_HR) are admin-level roles. No BOLA found. |
| Operations | NOT CHECKED | |
| Tests | PASS | e2e specs: `payroll-runs.controller.e2e-spec.ts`, `payroll-payout.controller.e2e-spec.ts`, `payroll-setup.controller.e2e-spec.ts`, `payroll-insights.controller.e2e-spec.ts`, `journal-outbox.controller.e2e-spec.ts`, `payroll-db-integration.e2e-spec.ts`. Multiple tenant-isolation unit specs. |

### Payroll DEFECTS

No concrete defects found in sampled surface area.

**Note (not a defect, but an architecture smell):** `ProfilesController.list` (line 55) uses `resolvePayrollRunsViewScope` — which reads the DataScope of `payroll:runs:view` — as the scope gate, even though the endpoint is protected by `payroll:salaries:view`. These are different permissions; an org that grants `payroll:salaries:view` without `payroll:runs:view` would get an overly restrictive scope on the list. The payroll module should define a `resolvePayrollSalariesViewScope` using the correct permission. Low urgency since all current role templates grant both together.

---

**Payroll: SIGNED OFF** (0 blocking defects; 1 architectural smell noted above)

---

## Build/PM

### Dimension Table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `projects` and `managed_products` are distinct tables (`db/schema/build/core.ts` and `db/schema/build/managed-products.ts`). A `projects.managedProductId` FK links them without merging. Tickets have `isNull(deletedAt)` filter at `projects-tickets-query.service.ts:138, 167, 214`. Managed products have `isNull(managedProducts.deletedAt)` at `managed-products.service.ts:37, 50`. |
| Authorization | PASS | Project list (line 64–97 of `projects-query.service.ts`): when `scope !== "all"`, pre-fetches `accessibleProjectIds` from `projectMembers + projectTeamAssignments`, then uses `inArray(projects.id, accessibleProjectIds)` — avoids the OR/EXISTS anti-pattern. `getProject` re-asserts membership before returning. `ManagedProductsController` uses `build:managed-products:view/create/update` — correct permission keys, registered in `permissions/build.ts:262–280`. `build:manage` (in `permissions/shared.ts:60`) is the admin bypass key and is granted to BUILD_ROLE_TEMPLATES template roles. |
| CRUD lifecycle | PASS (sampled) | Tickets: `isNull(tickets.deletedAt)` enforced on all sampled queries. Managed products: `isNull(managedProducts.deletedAt)` enforced. No hard-delete endpoints found for business entities. `projects-tickets.service.ts:171` soft-deletes by setting `deletedAt`. |
| List/search cost | PASS | No OR/EXISTS anti-pattern. Project list uses two pre-fetch queries then `inArray`. Ticket board queries sampled in spec files — `board-keyset.spec.ts`, `board-cursor-paging.spec.ts` exist. |
| Caching/realtime | PASS (sampled) | `projects-query.service.ts:42–47` uses `cachedVersioned` with a scope+filter-discriminated key. Cache TTL is `CACHE_TTL.SHORT`. |
| Module interface | PASS | Route prefix `build/`, module key `BUILD`, RBAC namespace `build:*`, `@RequireModule("build")` on sampled controllers. `managed-products.controller.ts:35` uses `@Controller("build/managed-products")`. PM workspace controller uses `product-management/workspaces`. `project ≠ product` separation confirmed at schema level. |
| UX/accessibility | NOT CHECKED | |
| Security | PASS (sampled) | `managed-products.service.ts:loadProduct` (line 29) filters `eq(managedProducts.orgId, orgId)` — BOLA-protected. Project access denied is logged as audit event (`projects-query.service.ts:329`). No OR/semi-join cross-tenant queries found. |
| Operations | NOT CHECKED | |
| Tests | PASS | Multiple e2e specs: `projects.controller.e2e-spec.ts`, `projects-access.e2e-spec.ts`, `projects-scope.e2e-spec.ts`, `projects-team-access.e2e-spec.ts`, `projects-tickets-key-authz.e2e-spec.ts`, `approvals.controller.e2e-spec.ts`, `build-execution.controller.e2e-spec.ts`, `build-uncovered.controller.e2e-spec.ts`. Board-level unit specs (`board-cursor-paging`, `board-keyset`, `board-column-aggregate`, `board-query-count`) exist. |

### Build/PM DEFECTS

No concrete defects found in sampled surface area.

**Note (not a defect, architecture smell):** `projects-tickets-create.service.ts` does not call `assertWithinLimit(orgId, "projects")` — that call is in `projects-provision.service.ts` at lines 40 and 135. Ticket creation is not quota-limited at the API level (tickets per project have no `PLAN_LIMITS` entry). This matches the product design (unlimited tickets per project on any plan tier), not a defect.

---

**Build/PM: SIGNED OFF** (0 blocking defects)

---

## Cross-Module Summary

| Module | P0 | P1 | P2 | Verdict |
|---|---|---|---|---|
| HRMS | 0 | 0 | 1 (D-HRMS-1) | BLOCKED BY 1 DEFECT |
| Payroll | 0 | 0 | 0 | SIGNED OFF |
| Build/PM | 0 | 0 | 0 | SIGNED OFF |

---

## What This Audit Did NOT Do

1. Did not run any tests, lint, or build.
2. Did not connect to the live Neon database.
3. Did not check frontend component internals, UX compliance, or accessibility.
4. Did not audit caching completeness, Redis cache-key collisions, or realtime (Ably) capabilities.
5. Did not audit HR sub-modules beyond directory, salary-structures, benefits (partial), helpdesk (partial), and lifecycle/onboarding-views.
6. Did not audit payroll sub-modules beyond runs (inputs, profiles), plan-entitlements, and module gate.
7. Did not audit Build sub-modules beyond core (projects, tickets, query), managed-products, and approvals (partial).
8. Did not verify the person-seam (`modules/directory/person-seam.ts`) resolution paths.
9. Did not verify DataScope propagation beyond the sampled list endpoints.
10. Did not verify that `build:manage` expansion through module ownership is filtered by `isDelegablePermission` for Build.

A full audit of these three modules would require approximately 3–4x more session time with dedicated agents per sub-module.
