# F1 — Frontend Route Audit (Read-Only Inventory)

> Lane F1 · 2026-07-31  
> Scope: `app/(authenticated)/hr/**`, `payroll/**`, `billing/**`, `settings/**` (roles/org/modules/subscription), `users/**`, `app/api/**`  
> Repo: `D:\projects\personal\Streamlineos\frontend`

---

## 0. Page Count Summary

| Area | page.tsx count |
|---|---|
| `/hr/**` | 125 |
| `/payroll/**` | 23 |
| `/billing/**` | 6 |
| `/settings/**` (all pages found) | 19 |
| `/users/**` | 2 |
| **TOTAL** | **175** |

---

## 1. Layout Chain (gate inheritance)

| Layout file | Auth gate |
|---|---|
| `app/(authenticated)/layout.tsx` | `getServerAuth()` → redirect if no session (session gate, not permission gate) |
| `app/(authenticated)/hr/layout.tsx` | None — wraps in `HrProvider`, `HrPathTracker`, `HrWelcomeDialog`. No permission check. |
| `app/(authenticated)/hr/recruitment/layout.tsx` | `requirePermission(["hr:employees:view","hr:employees:create","hr:offers:view","hr:interviews:view","hr:requisitions:view"], { redirectTo: "/hr" })` |
| `app/(authenticated)/hr/settings/layout.tsx` | `"use client"` tab nav — NO auth gate |
| `app/(authenticated)/payroll/layout.tsx` | `requireSession()` + `<RequireModule module="payroll">` |

Key implication: ALL HR pages that are `"use client"` and do not have `requirePermission` in the page itself are **only session-protected** (not permission-protected at the server layer). The recruitment subtree is additionally layout-gated.

---

## 2. Page Table — `/users/**` (2 pages)

| Route path | File:line | SC/CC | Gate type + key | LOC | loading? | error? | not-found? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/users` | `app/(authenticated)/users/page.tsx:1` | SC | `requirePermission("hr:employees:view")` | 17 | ✗ | ✗ | ✗ | ✗ | Thin shim → `features/users/users-page.tsx` |
| `/users/invitations` | `app/(authenticated)/users/invitations/page.tsx:1` | SC | `requirePermission("hr:employees:manage")` | 14 | ✗ | ✗ | ✗ | ✗ | Thin shim → `features/users/user-invitations-panel.tsx` |

**Missing loading:** 2/2. **Missing error:** 2/2. **Missing gate:** 0/2 (all server-gated).

---

## 3. Page Table — `/billing/**` (6 pages)

| Route path | File:line | SC/CC | Gate type + key | LOC | loading? | error? | not-found? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/billing` | `app/(authenticated)/billing/page.tsx:1` | CC | None | 97 | ✓ | ✓ | ✗ | ✓ | Tabs: Plan · Invoices & Payments · Billing Profile; no server gate |
| `/billing/ai-credits` | `app/(authenticated)/billing/ai-credits/page.tsx:1` | CC | None | **564** | ✓ | ✗ | ✗ | ✓ | **LOC VIOLATION >500**; full UI monolith in route file |
| `/billing/invoices` | `app/(authenticated)/billing/invoices/page.tsx:1` | SC | `DashboardGate("accounting:view")` (client) | 10 | ✓ | ✓ | ✗ | ✗ | Delegates → `features/billing/invoices-client.tsx`; unusual `accounting:view` key for billing path |
| `/billing/invoices/[invoiceId]` | `app/(authenticated)/billing/invoices/[invoiceId]/page.tsx:1` | CC | None | 13 | ✓ | ✓ | ✗ | ✗ | `use(params)` ✓; delegates → `InvoiceDetail`; no gate |
| `/billing/invoices/new` | `app/(authenticated)/billing/invoices/new/page.tsx:1` | CC | None | **678** | ✓ | ✓ | ✗ | ✓ | **LOC VIOLATION >500**; entire invoice-creation form in route file; Zod schema inline |
| `/billing/seats` | `app/(authenticated)/billing/seats/page.tsx:1` | SC | — (redirect) | 5 | ✗ | ✗ | ✗ | ✗ | **Redirect-only** → `/billing?tab=plan` |

**Missing loading:** 1/6 (`/billing/ai-credits` missing error). **Missing gate:** 4/6 (billing, ai-credits, invoices/[id], invoices/new).

---

## 4. Page Table — `/settings/**` (19 pages — all found)

> In-scope per brief: roles, members, subscription, modules, org profile.  
> All settings pages listed for completeness; in-scope subset highlighted.

| Route path | File:line | SC/CC | Gate type + key | LOC | loading? | error? | not-found? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/settings` (catch-all `[[...rest]]`) | `app/(authenticated)/settings/[[...rest]]/page.tsx:1` | CC | None | 44 | ✓ | ✓ | ✗ | ✓ | Profile + Security + MFA; no gate (correct — any signed-in user) |
| `/settings/api-tokens` | `app/(authenticated)/settings/api-tokens/page.tsx:1` | CC | None | 64 | ✗ | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/settings/audit-log` | `app/(authenticated)/settings/audit-log/page.tsx:10` | CC | `DashboardGate("audit-log:read")` | **529** | ✓ | ✓ | ✗ | ✓ | **LOC VIOLATION >500** |
| `/settings/connected-accounts` | `app/(authenticated)/settings/connected-accounts/page.tsx:1` | CC | None | 218 | ✗ | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/settings/delegations` | `app/(authenticated)/settings/delegations/page.tsx:47` | CC | `DashboardGate("settings:rbac:manage")` | **734** | ✗ | ✗ | ✗ | ✓ | **LOC VIOLATION >500**; missing loading + error |
| `/settings/devices` | `app/(authenticated)/settings/devices/page.tsx:1` | CC | None | 170 | ✓ | ✓ | ✗ | ✓ | No gate (user-level, ok) |
| `/settings/incoming-transfer` | `app/(authenticated)/settings/incoming-transfer/page.tsx:1` | CC | None | 44 | ✗ | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/settings/login-history` | `app/(authenticated)/settings/login-history/page.tsx:1` | CC | None | 181 | ✗ | ✗ | ✗ | ✓ | No gate (user-level, ok) |
| `/settings/module-access/[moduleKey]` ⭐ | `app/(authenticated)/settings/module-access/[moduleKey]/page.tsx:2` | SC | `requirePermission(meta.permission)` | 45 | ✓ | ✗ | ✗ | ✗ | `await params` ✓; resolves per-module permission from map; `notFound()` for unknown key |
| `/settings/modules` ⭐ | `app/(authenticated)/settings/modules/page.tsx:9` | CC | `DashboardGate("settings:manage")` | 170 | ✓ | ✗ | ✗ | ✓ | Module enable/disable |
| `/settings/organization` ⭐ | `app/(authenticated)/settings/organization/page.tsx:1` | CC | None | 183 | ✓ | ✓ | ✗ | ✓ | No permission gate — org profile visible to any signed-in user |
| `/settings/payments` | `app/(authenticated)/settings/payments/page.tsx:1` | CC | None | 112 | ✗ | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/settings/roles` ⭐ | `app/(authenticated)/settings/roles/page.tsx:49` | CC | `DashboardGate("settings:rbac:manage")` | **544** | ✓ | ✓ | ✗ | ✓ | **LOC VIOLATION >500** |
| `/settings/roles/[roleId]` ⭐ | `app/(authenticated)/settings/roles/[roleId]/page.tsx:19` | CC | `DashboardGate("settings:rbac:manage")` | 225 | ✓ | ✗ | ✗ | ✓ | `useParams()` ✓ (client component) |
| `/settings/roles/audit` | `app/(authenticated)/settings/roles/audit/page.tsx:6` | CC | `DashboardGate("settings:rbac:manage")` | 223 | ✗ | ✗ | ✗ | ✓ | Missing loading + error |
| `/settings/roles/simulate` | `app/(authenticated)/settings/roles/simulate/page.tsx:15` | CC | `DashboardGate("settings:rbac:manage")` | 450 | ✗ | ✗ | ✗ | ✓ | Missing loading + error |
| `/settings/sessions` | `app/(authenticated)/settings/sessions/page.tsx:1` | CC | None | 242 | ✗ | ✗ | ✗ | ✓ | No gate (user-level, ok) |
| `/settings/subscription` ⭐ | `app/(authenticated)/settings/subscription/page.tsx:1` | SC | — (redirect) | 5 | ✗ | ✗ | ✗ | ✗ | **Redirect-only** → `/billing?tab=plan` |
| `/settings/webhooks` | `app/(authenticated)/settings/webhooks/page.tsx:15` | CC | None | 423 | ✗ | ✓ | ✗ | ✓ | No gate; missing loading |

**Missing loading:** 12/19. **Missing error:** 14/19. **Missing gate:** 10/19 (user-level pages are intentionally ungated; roles/modules are properly gated).

---

## 5. Page Table — `/payroll/**` (23 pages)

All payroll pages inherit `requireSession + RequireModule("payroll")` from `payroll/layout.tsx`.

| Route path | File:line | SC/CC | Page-level gate (above layout) | LOC | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|---|
| `/payroll` | `app/(authenticated)/payroll/page.tsx:1` | CC | None | 349 | ✓ | ✓ | ✓ | |
| `/payroll/access` | `app/(authenticated)/payroll/access/page.tsx:1` | SC | `requirePermission("payroll:access:view")` | 7 | ✗ | ✗ | ✗ | → `ModuleAccessPage` |
| `/payroll/bank-transfers` | `app/(authenticated)/payroll/bank-transfers/page.tsx:1` | SC | `requirePermission("payroll:bank:manage")` | 9 | ✓ | ✓ | ✗ | |
| `/payroll/bonuses` | `app/(authenticated)/payroll/bonuses/page.tsx:1` | SC | `requirePermission("hr:bonuses:manage")` | 15 | ✓ | ✓ | ✗ | Key uses `hr:` prefix, not `payroll:` |
| `/payroll/components` | `app/(authenticated)/payroll/components/page.tsx:2` | SC | `requirePermission("payroll:components:view")` | 15 | ✓ | ✓ | ✗ | |
| `/payroll/employees` | `app/(authenticated)/payroll/employees/page.tsx:1` | SC | `requirePermission("payroll:salaries:view")` | 9 | ✓ | ✓ | ✗ | |
| `/payroll/employees/[employeeUserId]` | `app/(authenticated)/payroll/employees/[employeeUserId]/page.tsx:1` | SC | `requirePermission("payroll:salaries:view")` | 14 | ✓ | ✓ | ✗ | `await params` ✓ |
| `/payroll/fnf` | `app/(authenticated)/payroll/fnf/page.tsx:1` | SC | `requirePermission("payroll:fnf:view")` | 15 | ✓ | ✓ | ✗ | |
| `/payroll/inputs` | `app/(authenticated)/payroll/inputs/page.tsx:1` | SC | `requirePermission("hr:payroll:view")` | 9 | ✓ | ✓ | ✗ | `hr:` prefix |
| `/payroll/loans` | `app/(authenticated)/payroll/loans/page.tsx:1` | SC | `requirePermission("hr:payroll:view")` | 15 | ✓ | ✓ | ✗ | `hr:` prefix |
| `/payroll/me` | `app/(authenticated)/payroll/me/page.tsx:1` | SC | `requireSession()` | 15 | ✓ | ✓ | ✗ | Weaker gate — any signed-in user can access |
| `/payroll/payslips` | `app/(authenticated)/payroll/payslips/page.tsx:1` | SC | `requirePermission("payroll:payslips:view")` | 9 | ✓ | ✓ | ✗ | |
| `/payroll/reimbursements` | `app/(authenticated)/payroll/reimbursements/page.tsx:1` | SC | `requirePermission("hr:payroll:view")` | 15 | ✓ | ✓ | ✗ | `hr:` prefix |
| `/payroll/reports` | `app/(authenticated)/payroll/reports/page.tsx:3` | SC | `requirePermission("payroll:reports:view")` | 16 | ✓ | ✓ | ✗ | |
| `/payroll/runs` | `app/(authenticated)/payroll/runs/page.tsx:1` | SC | `requirePermission("payroll:runs:view")` | 9 | ✓ | ✓ | ✗ | |
| `/payroll/runs/[runId]` | `app/(authenticated)/payroll/runs/[runId]/page.tsx:1` | SC | `requirePermission("payroll:runs:view")` | 14 | ✓ | ✓ | ✗ | `await params` ✓ |
| `/payroll/salary-structures` | `app/(authenticated)/payroll/salary-structures/page.tsx:2` | SC | `requirePermission("hr:salary:view")` | 15 | ✓ | ✓ | ✗ | `hr:` prefix |
| `/payroll/settings` | `app/(authenticated)/payroll/settings/page.tsx:2` | SC | `requirePermission("payroll:settings:manage")` | 15 | ✓ | ✓ | ✗ | |
| `/payroll/settings/import-export` | `app/(authenticated)/payroll/settings/import-export/page.tsx:1` | SC | `requireSession()` | 15 | ✓ | ✓ | ✗ | Weaker gate |
| `/payroll/setup` | `app/(authenticated)/payroll/setup/page.tsx:2` | SC | `requirePermission("payroll:policies:manage")` | 15 | ✓ | ✓ | ✗ | |
| `/payroll/taxes` | `app/(authenticated)/payroll/taxes/page.tsx:1` | SC | `requirePermission("payroll:tax:view")` | 15 | ✓ | ✓ | ✗ | |
| `/payroll/team` | `app/(authenticated)/payroll/team/page.tsx:1` | SC | `requireSession()` | 15 | ✓ | ✓ | ✗ | Weaker gate |
| `/payroll/templates` | `app/(authenticated)/payroll/templates/page.tsx:1` | SC | `requirePermission("payroll:templates:view")` | 15 | ✓ | ✓ | ✗ | |

**Notes:** All payroll pages correctly use server-side gates (SC). Layout adds session + module guard as baseline. 3 pages use `requireSession()` instead of `requirePermission()` — these bypass RBAC (only check login state): `/payroll/me`, `/payroll/team`, `/payroll/settings/import-export`. Mixed `hr:` prefix permission keys for payroll routes: bonuses, inputs, loans, reimbursements, salary-structures.

---

## 6. Page Table — `/hr/**` (125 pages)

> Gate column: SC = server-gated with `requirePermission`; CC (DG) = `DashboardGate` client-side; CC (-) = client component, no page-level gate.  
> Layout provides: session check (top) + no further HR permission gate.  
> Recruitment sub-layout provides: `requirePermission([...5 keys...])` for all `/hr/recruitment/**`.

### 6a. HR Root & Core

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr` | 388 | CC | - | ✓ | ✓ | ✓ | No permission gate; HR dashboard |
| `/hr/employees` | 413 | CC | - | ✓ | ✓ | ✓ | No permission gate |
| `/hr/employees/[employeeId]` | 29 | SC | `hr:employees:view` | ✓ | ✓ | ✗ | `await Promise.all([requirePermission, params])` ✓ |
| `/hr/employees/find-expert` | 267 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/hr/employees/skills-matrix` | 185 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/hr/org` | 7 | SC | `hr:employees:view` | ✓ | ✗ | ✗ | → `OrgHubClient` |
| `/hr/org-chart` | 373 | CC | - | ✓ | ✓ | ✓ | No permission gate |
| `/hr/access` | 7 | SC | `hr:access:view` | ✗ | ✗ | ✗ | → `ModuleAccessPage` |
| `/hr/setup` | 7 | SC | `hr:employees:view` | ✗ | ✗ | ✗ | → `HrSetupClient` |

### 6b. Leaves & Attendance

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/leaves` | 12 | SC | `["self:leaves","hr:leaves:view"]` (any) | ✓ | ✓ | ✗ | Self-service OR manager view |
| `/hr/leaves/analytics` | 25 | SC | `hr:leaves:view` | ✓ | ✗ | ✓ | Inline PageWrapper in server file |
| `/hr/leave-policies` | 137 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/attendance` | 46 | CC | - | ✓ | ✓ | ✓ | Uses `useSession()` + `useCan("hr:attendance:manage")` |
| `/hr/holidays` | 238 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/comp-off` | 64 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/hr/overtime` | 56 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |

### 6c. Onboarding & Offboarding

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/onboarding` | 243 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/onboarding/[userId]` | 306 | CC | - | ✗ | ✗ | ✓ | `use(params)` ✓; no gate |
| `/hr/onboarding/my-tasks` | 172 | CC | - | ✗ | ✓ | ✓ | No gate; missing loading |
| `/hr/onboarding/probation` | 237 | CC | - | ✗ | ✗ | ✓ | `backHref="/hr/onboarding"` ✓ (sub-page); no gate; missing loading + error |
| `/hr/termination` | **516** | CC | - | ✓ | ✓ | ✓ | **LOC VIOLATION >500**; no gate |
| `/hr/exit` | 307 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/fnf` | 7 | SC | `hr:payroll:approve` | ✓ | ✓ | ✗ | |

### 6d. Performance, Goals, Feedback

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/performance` | 7 | SC | `hr:performance:manage` | ✓ | ✓ | ✗ | → feature component |
| `/hr/performance/analytics` | 180 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/goals` | 260 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/kpis` | 28 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/feedback` | 34 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/engagement` | 370 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/hr/retention` | 16 | SC | `hr:retention:manage` | ✗ | ✗ | ✓ | Thin shim with PageWrapper |
| `/hr/analytics` | 7 | SC | `hr:analytics:read` | ✓ | ✓ | ✗ | → `AnalyticsPageClient` |

### 6e. Payroll-adjacent (in HR module)

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/expenses` | 439 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/reimbursements` | 486 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/benefits` | 445 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/compensation-planning` | 102 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/equity` | 158 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/workforce-cost` | 124 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/workforce` | 7 | SC | `hr:analytics:read` | ✗ | ✗ | ✗ | |
| `/hr/simulator` | 7 | SC | `hr:policies:manage` | ✗ | ✗ | ✗ | |

### 6f. Compliance, Legal, Safety

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/compliance` | 7 | SC | `hr:compliance:manage` | ✓ | ✗ | ✗ | |
| `/hr/safety` | 7 | SC | `hr:safety:view` | ✓ | ✗ | ✗ | |
| `/hr/legal-holds` | 16 | SC | `hr:legalhold:view` | ✗ | ✗ | ✓ | Thin shim |
| `/hr/labor-relations` | 16 | SC | `hr:labor:view` | ✗ | ✗ | ✓ | Thin shim |
| `/hr/background-verification` | 7 | SC | `hr:employees:update` | ✓ | ✓ | ✗ | Uses employee update key — possibly too broad |
| `/hr/cases` | 7 | SC | `hr:cases:view` | ✓ | ✗ | ✗ | |
| `/hr/identity` | 7 | SC | `hr:identity:view` | ✗ | ✗ | ✗ | |
| `/hr/emergency` | 7 | SC | `hr:emergency:manage` | ✗ | ✗ | ✗ | |
| `/hr/event-stream` | 7 | SC | `hr:eventstream:view` | ✗ | ✗ | ✗ | |

### 6g. Asset & Device Management

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/assets` | 383 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/asset-returns` | 257 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/devices` | 222 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/biometric` | 70 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/hr/geofencing` | 56 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |

### 6h. Operations

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/shifts` | 75 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/rosters` | 45 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/hr/work-logs` | 362 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/travel` | 179 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/travel/approvals` | 382 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/accommodations` | 7 | SC | `hr:accommodations:view` | ✗ | ✗ | ✗ | |
| `/hr/contingent` | 7 | SC | `hr:contracts:view` | ✓ | ✗ | ✗ | |
| `/hr/delegations` | 16 | SC | `hr:employees:view` | ✗ | ✗ | ✓ | Thin shim |
| `/hr/positions` | 16 | SC | `hr:positions:view` | ✗ | ✗ | ✓ | Thin shim |
| `/hr/approvals` | 216 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/service-delivery` | 178 | CC | - | ✗ | ✗ | ✓ | No gate; missing loading + error |
| `/hr/helpdesk` | 35 | CC | - | ✓ | ✗ | ✓ | No gate |

### 6i. Documents

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/documents` | 281 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/documents/editor/[documentId]` | 175 | CC | - | ✓ | ✗ | ✓ | `useParams()` ✓; no gate |
| `/hr/documents/editor/new` | 423 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/documents/templates` | 413 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/documents/templates/[templateId]/edit` | 79 | CC | - | ✗ | ✗ | ✓ | `use(params)` ✓; no gate; missing loading + error |
| `/hr/documents/templates/new` | 7 | CC | - | ✗ | ✗ | ✗ | No gate |
| `/hr/document-review` | 133 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/document-types` | 346 | CC | - | ✓ | ✓ | ✓ | No gate |
| `/hr/handbook` | 7 | SC | `hr:documents:manage` | ✓ | ✓ | ✗ | |

### 6j. Announcements, Org Communication

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/announcements` | 253 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/email-templates` | 7 | SC | `hr:email-templates:manage` | ✓ | ✓ | ✗ | |

### 6k. HR Settings

| Route | LOC | SC/CC | Gate key | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/settings` | 59 | CC | - | ✗ | ✗ | ✓ | No gate; settings layout is "use client" tab nav |
| `/hr/settings/policies` | 353 | CC | - | ✗ | ✗ | ✓ | No gate |
| `/hr/settings/workflows` | 286 | CC | - | ✓ | ✗ | ✓ | No gate |
| `/hr/settings/automations` | 316 | CC | - | ✗ | ✗ | ✓ | No gate |
| `/hr/settings/templates` | 281 | CC | - | ✗ | ✗ | ✓ | No gate |
| `/hr/settings/forms` | 100 | CC | - | ✗ | ✗ | ✓ | No gate |
| `/hr/settings/forms/[formId]` | 62 | CC | - | ✗ | ✗ | ✓ | `use(params)` ✓; no gate |
| `/hr/settings/forms/[formId]/submissions` | 45 | CC | - | ✗ | ✗ | ✓ | `use(params)` ✓; no gate |
| `/hr/settings/custom-fields` | 122 | CC | - | ✗ | ✗ | ✓ | No gate |
| `/hr/settings/import-export` | 8 | SC | `["hr:import:manage","hr:export:manage"]` | ✗ | ✗ | ✗ | Only server-gated HR settings page |
| `/hr/settings/integrations` | 7 | CC | - | ✗ | ✗ | ✗ | No gate; no PageWrapper |
| `/hr/settings/preview` | 36 | CC | - | ✗ | ✗ | ✓ | No gate |
| `/hr/settings/versions` | 168 | CC | - | ✗ | ✗ | ✓ | No gate |
| `/hr/settings/company` | 48 | CC | - | ✗ | ✗ | ✓ | No gate |

### 6l. Recruitment (all sub-layout gated)

> All pages under `/hr/recruitment/**` inherit `requirePermission([...5 keys...])` from `hr/recruitment/layout.tsx`.

| Route | LOC | SC/CC | Additional page gate | loading? | error? | PageWrapper? | Notes |
|---|---|---|---|---|---|---|---|
| `/hr/recruitment` | 339 | CC | - | ✓ | ✓ | ✓ | |
| `/hr/recruitment/jobs` | 262 | CC | - | ✓ | ✓ | ✓ | |
| `/hr/recruitment/jobs/new` | 18 | CC | - | ✗ | ✗ | ✓ | Missing loading + error |
| `/hr/recruitment/jobs/[jobId]/edit` | 117 | CC | - | ✗ | ✗ | ✓ | `use(params)` ✓; missing loading + error |
| `/hr/recruitment/candidates` | 434 | CC | - | ✓ | ✓ | ✓ | |
| `/hr/recruitment/candidates/[candidateId]` | 328 | CC | - | ✓ | ✗ | ✓ | `useParams()` ✓; missing error |
| `/hr/recruitment/candidates/import` | 395 | CC | - | ✗ | ✗ | ✓ | Missing loading + error |
| `/hr/recruitment/candidates/intake` | 274 | CC | - | ✗ | ✗ | ✓ | Missing loading + error |
| `/hr/recruitment/pipeline` | 111 | CC | - | ✓ | ✓ | ✓ | |
| `/hr/recruitment/analytics` | 158 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/headcount` | 443 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/interviews` | 283 | CC | - | ✓ | ✓ | ✓ | |
| `/hr/recruitment/interviewer-performance` | 254 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/offers` | 177 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/offer-templates` | 449 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/diversity-report` | 332 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/inbox` | 339 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/internal-jobs` | 222 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/requisitions` | 200 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/hiring-flows` | 186 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/question-bank` | 181 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/scorecard-templates` | 398 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/scorecard-analytics` | 183 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/sla` | 359 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/sla-report` | 217 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/talent-pools` | 365 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/automations` | 323 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/email-sequences` | 456 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/refer` | 225 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/referrals` | 37 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/reports` | 126 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/recruiters` | 236 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/settings` | 93 | CC | - | ✓ | ✗ | ✓ | |
| `/hr/recruitment/booking-links` | 7 | SC | - | ✓ | ✗ | ✗ | No gate; delegates to `BookingLinksView`; server component under client layout gate |
| `/hr/recruitment/vendors` | 142 | CC | - | ✓ | ✗ | ✓ | |

---

## 7. Redirect-Only Pages

| File | Redirect target |
|---|---|
| `app/(authenticated)/billing/seats/page.tsx:4` | `/billing?tab=plan` |
| `app/(authenticated)/settings/subscription/page.tsx:4` | `/billing?tab=plan` |

---

## 8. LOC Violations

### Over 500 lines (hard-review violations)

| File (relative) | LOC |
|---|---|
| `app/(authenticated)/settings/delegations/page.tsx` | **734** |
| `app/(authenticated)/billing/invoices/new/page.tsx` | **678** |
| `app/(authenticated)/settings/roles/page.tsx` | **544** |
| `app/(authenticated)/billing/ai-credits/page.tsx` | **564** |
| `app/(authenticated)/settings/audit-log/page.tsx` | **529** |
| `app/(authenticated)/hr/termination/page.tsx` | **516** |

### Between 300–500 lines (target ≤300 violated)

| File (relative) | LOC |
|---|---|
| `app/(authenticated)/settings/roles/simulate/page.tsx` | 450 |
| `app/(authenticated)/hr/recruitment/email-sequences/page.tsx` | 456 |
| `app/(authenticated)/hr/recruitment/offer-templates/page.tsx` | 449 |
| `app/(authenticated)/hr/recruitment/headcount/page.tsx` | 443 |
| `app/(authenticated)/hr/benefits/page.tsx` | 445 |
| `app/(authenticated)/hr/expenses/page.tsx` | 439 |
| `app/(authenticated)/hr/recruitment/candidates/page.tsx` | 434 |
| `app/(authenticated)/hr/documents/editor/new/page.tsx` | 423 |
| `app/(authenticated)/settings/webhooks/page.tsx` | 423 |
| `app/(authenticated)/hr/documents/templates/page.tsx` | 413 |
| `app/(authenticated)/hr/employees/page.tsx` | 413 |
| `app/(authenticated)/hr/recruitment/candidates/import/page.tsx` | 395 |
| `app/(authenticated)/hr/recruitment/scorecard-templates/page.tsx` | 398 |
| `app/(authenticated)/hr/page.tsx` | 388 |
| `app/(authenticated)/hr/assets/page.tsx` | 383 |
| `app/(authenticated)/hr/travel/approvals/page.tsx` | 382 |
| `app/(authenticated)/hr/reimbursements/page.tsx` | 486 |
| `app/(authenticated)/hr/org-chart/page.tsx` | 373 |
| `app/(authenticated)/hr/engagement/page.tsx` | 370 |
| `app/(authenticated)/hr/recruitment/talent-pools/page.tsx` | 365 |
| `app/(authenticated)/hr/work-logs/page.tsx` | 362 |
| `app/(authenticated)/hr/recruitment/sla/page.tsx` | 359 |
| `app/(authenticated)/payroll/page.tsx` | 349 |
| `app/(authenticated)/hr/document-types/page.tsx` | 346 |
| `app/(authenticated)/hr/recruitment/page.tsx` | 339 |
| `app/(authenticated)/hr/recruitment/inbox/page.tsx` | 339 |
| `app/(authenticated)/hr/recruitment/diversity-report/page.tsx` | 332 |
| `app/(authenticated)/hr/recruitment/candidates/[candidateId]/page.tsx` | 328 |
| `app/(authenticated)/hr/recruitment/automations/page.tsx` | 323 |
| `app/(authenticated)/hr/onboarding/[userId]/page.tsx` | 306 |
| `app/(authenticated)/hr/exit/page.tsx` | 307 |

> Note: Many >300 line files are pure UI client components that should be extracted to `features/`. The route file should be a thin server shim (≤20 lines) calling `requirePermission` and delegating to a feature component.

---

## 9. Misplaced Files

None found. All files in `app/(authenticated)/hr/**`, `payroll/**`, `billing/**`, `settings/**`, `users/**` are route convention files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`). No `_components/`, `_lib/`, hooks, or utility files exist inside `app/`.

---

## 10. Route Params

### Dynamic segment folders

| Segment | Path | Naming |
|---|---|---|
| `[employeeId]` | `hr/employees/[employeeId]` | ✓ Descriptive |
| `[userId]` | `hr/onboarding/[userId]` | ✓ Descriptive |
| `[documentId]` | `hr/documents/editor/[documentId]` | ✓ Descriptive |
| `[templateId]` | `hr/documents/templates/[templateId]/edit` | ✓ Descriptive |
| `[formId]` | `hr/settings/forms/[formId]` | ✓ Descriptive |
| `[jobId]` | `hr/recruitment/jobs/[jobId]/edit` | ✓ Descriptive |
| `[candidateId]` | `hr/recruitment/candidates/[candidateId]` | ✓ Descriptive |
| `[invoiceId]` | `billing/invoices/[invoiceId]` | ✓ Descriptive |
| `[moduleKey]` | `settings/module-access/[moduleKey]` | ✓ Descriptive |
| `[roleId]` | `settings/roles/[roleId]` | ✓ Descriptive |
| `[runId]` | `payroll/runs/[runId]` | ✓ Descriptive |
| `[employeeUserId]` | `payroll/employees/[employeeUserId]` | ✓ Descriptive |
| `[[...rest]]` | `settings/[[...rest]]` | ✓ Catch-all for account settings |
| `[...nextauth]` | `api/auth/[...nextauth]` | ✓ Convention |

**No bare `[id]` segments found.** All params are descriptive. ✓

### Params unwrapping patterns

| Page | Component type | Method | Correct? |
|---|---|---|---|
| `hr/employees/[employeeId]` | SC | `await Promise.all([requirePermission, params])` | ✓ |
| `hr/onboarding/[userId]` | CC | `use(params)` | ✓ |
| `hr/documents/editor/[documentId]` | CC | `useParams<{documentId: string}>()` | ✓ |
| `hr/documents/templates/[templateId]/edit` | CC | `use(params)` | ✓ |
| `hr/settings/forms/[formId]` | CC | `use(params)` | ✓ |
| `hr/settings/forms/[formId]/submissions` | CC | `use(params)` | ✓ |
| `hr/recruitment/jobs/[jobId]/edit` | CC | `use(params)` | ✓ |
| `hr/recruitment/candidates/[candidateId]` | CC | `useParams<{candidateId: string}>()` | ✓ |
| `billing/invoices/[invoiceId]` | CC | `use(params)` | ✓ |
| `settings/module-access/[moduleKey]` | SC | `await params` | ✓ |
| `settings/roles/[roleId]` | CC | `useParams()` (bare, no generic) | ⚠ Minor: no TypeScript generic, accesses `params.roleId` without type safety |
| `payroll/employees/[employeeUserId]` | SC | `await params` | ✓ |
| `payroll/runs/[runId]` | SC | `await params` | ✓ |

---

## 11. The `/users` Reference Page — Detailed Responsive Layout Pattern

**Route shim:** `app/(authenticated)/users/page.tsx` (17 LOC, SC, `requirePermission("hr:employees:view")`).  
**Feature component:** `features/users/users-page.tsx` (687 LOC, CC `"use client"`).

### Wrapper
`<PageWrapper title="Users" subtitle="..." actions={...} filters={...}>` — standard PageWrapper, no additional outer shell.

### Actions bar (top-right)
- `<div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:justify-end">`
- On mobile: 2-column grid, full-width buttons.
- On `sm+`: flex row, auto-width buttons.
- Contains: `AnimatedIconButton` ("More" dropdown with Export/Import/BulkInvite) + `Button` ("Invite User").
- Both wrapped in `useCan` guards.

### Filter bar (below header, above table)
`filters` prop receives:
```
<div className="flex w-full min-w-0 items-center gap-2">
  <div className="min-w-0 flex-1 basis-0">               ← SearchInput fills all remaining space
    <SearchInput placeholder="Search users..." … />
  </div>
  <ResponsivePopover>                                     ← Filters button, shown only on < lg
    <ResponsivePopoverTrigger …>
      <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs lg:hidden">
        <SlidersHorizontal /> [Filters]
      </Button>
    </ResponsivePopoverTrigger>
    <ResponsivePopoverContent … >
      {renderFilterSelects()}                             ← vertical stacked selects in popover/Drawer
    </ResponsivePopoverContent>
  </ResponsivePopover>
  {renderFilterSelects("toolbar")}                        ← Horizontal selects, hidden below lg
</div>
```

- **Mobile** (`< lg`): SearchInput fills width + a "Filters" button appears that opens a `ResponsivePopover` (Drawer on `< md`, Popover on desktop).
- **Large screens** (`lg+`): SearchInput + 4 filter Selects inline (status, role, dept, branch) using `hidden … lg:flex`. Filter button hidden.
- Select triggers use `FILTER_SELECT_TRIGGER` class (`h-8 border-input bg-card`) + `SelectContent className="min-w-[var(--radix-select-trigger-width)]"`.
- All selects: `status`, `role`, `departmentId`, `branchId`. Each pushes URL params via `router.replace` with `useTransition`.

### Table
`<DataTable>` (`components/ui/data-table.tsx`):
- `data={users}`, `columns={[...8 cols]}`, `getRowKey`, `onRowClick`, `isLoading`, `emptyState`, `selection`, `sortState`, `pagination`.
- Built-in loading skeleton (inside DataTable).
- `className="flex-1 min-h-0"` — fills available height.
- Server-side pagination: `{ mode: "server", page, pageSize: 20, total, onPageChange }`.
- Sort: fields `name`, `joinedAt`, `status` — pushes URL params.

### Pagination
Uses DataTable's built-in server pagination prop — delegates to `TablePagination` internally (`components/ui/table-pagination.tsx`). URL param `page` tracks current page.

### Stat cards
`<UserStatsCards />` — `StatCardGrid` single horizontal-scrolling row above the table.

### Bulk selection bar
Appears above table when `someSelected`. Flex row with: count label + action buttons (Suspend/Archive/Restore/Assign/Clear) — all RBAC-gated with `useCan`. Also shows "Select all matching" banner.

### Empty state
`<EmptyState illustrationPreset="team" title="No users found" … />` — context-sensitive description + action button.

### Error state
`<ErrorState title="Failed to load users" onRetry={handleRetry} />` — appears instead of table.

### Loading state
DataTable built-in skeleton columns matching real layout — no separate spinner.

### Mobile overlays
`ResponsivePopover` for filter overflow (Drawer `< md`, Popover `md+`). Detail panel = `<UserDetailSheet />` (Sheet always).

### Breakpoints in use
- `sm` (640px): buttons switch from grid-2-cols to flex-row.
- `lg` (1024px): inline filter selects appear; Filters button hides.
- No `md` breakpoint in the main layout (only in ResponsivePopover internally).

### Key patterns for conformance
1. Route shim is server-component calling `requirePermission`, delegates to feature client component.
2. Feature component uses `PageWrapper` with `title`, `subtitle`, `actions`, `filters` props.
3. Actions: `grid-cols-2 sm:flex` pattern for mobile → desktop transition.
4. Filters: lone SearchInput + `ResponsivePopover` for collapsed selects on `< lg`.
5. `DataTable` with server pagination props — never inline hand-rolled pagination.
6. `useCan()` guards every action button — no hardcoded role checks.
7. Empty state uses `EmptyState` with `illustrationPreset`.
8. Error state uses `ErrorState` with `onRetry`.
9. URL params for all filter state — `useSearchParams` + `router.replace` + `useTransition`.
10. `useDebouncedValue` for search, synced to URL via `useEffect` (guarded with `=== q` to prevent loop).

---

## 12. Responsive & State Coverage Summary

| Area | Pages with skeleton/loading | Pages with error state | Pages with empty state (in feature) | Pages using ResponsivePopover/Drawer in page file |
|---|---|---|---|---|
| `/users/**` | DataTable built-in | DataTable built-in + `ErrorState` | `EmptyState` in feature | ✓ (ResponsivePopover for filters) |
| `/billing/**` | 5/6 (seats=redirect) | 4/6 | In feature components | 0 (feature-delegated) |
| `/settings/**` | 7/19 have loading.tsx | 5/19 have error.tsx | In feature components | 0 (feature-delegated) |
| `/payroll/**` | 21/23 have loading.tsx | 21/23 have error.tsx | In feature components | 0 (feature-delegated) |
| `/hr/**` | ~75/125 have loading.tsx | ~30/125 have error.tsx | In feature components | Used in users-page; not in HR route files |

**Note:** Most `page.tsx` files are thin shims. Skeleton, empty, and error states live inside `features/**` client components — which is correct per §9. The loading.tsx files in `app/` are route-level streamed skeletons; client components inside features handle their own local loading/empty/error states via TanStack Query.

---

## 13. `app/api/**` Route Handlers

| File | Type | Assessment |
|---|---|---|
| `app/api/auth/[...nextauth]/route.ts:1` | Auth bridge | ✓ ALLOWED — exports `{ GET, POST } = handlers` from `lib/auth`; pure NextAuth bridge |

**Total:** 1 route handler. No business logic routes found. ✓

---

## 14. Top 25 Findings

| SEV | File:line | Finding |
|---|---|---|
| P0 | `app/(authenticated)/settings/delegations/page.tsx:1` | **734 LOC in a route file.** Full feature UI in `app/` — must be extracted to `features/settings/delegations/`. |
| P0 | `app/(authenticated)/billing/invoices/new/page.tsx:1` | **678 LOC in a route file.** Full invoice-creation form with inline Zod schema — must be extracted to `features/billing/`. |
| P0 | `app/(authenticated)/settings/roles/page.tsx:1` | **544 LOC in a route file.** Role list + RBAC matrix UI in `app/`. |
| P0 | `app/(authenticated)/billing/ai-credits/page.tsx:1` | **564 LOC, no server gate.** Entire AI-credits dashboard in route file with no `requirePermission`. |
| P0 | `app/(authenticated)/settings/audit-log/page.tsx:1` | **529 LOC in a route file.** Full audit-log UI in `app/`. |
| P0 | `app/(authenticated)/hr/termination/page.tsx:1` | **516 LOC, no gate.** Full termination workflow in route file with no permission gate. |
| P1 | `app/(authenticated)/hr/**` (majority) | **~60 "use client" HR pages have zero server-side permission gate.** Only session-checked via top-level layout. URL-navigating to any HR page bypasses all RBAC at the page level. |
| P1 | `app/(authenticated)/hr/settings/**` (13 pages) | **All HR settings pages ungated.** `hr/settings/layout.tsx` is `"use client"` with no auth check. Only `hr/settings/import-export` has `requirePermission`. |
| P1 | `app/(authenticated)/billing/page.tsx:1` | **Billing page has no permission gate.** Any signed-in user can reach subscription/payment tabs. |
| P1 | `app/(authenticated)/billing/invoices/[invoiceId]/page.tsx:1` | **Invoice detail has no permission gate.** |
| P1 | `app/(authenticated)/payroll/me/page.tsx:9` | Uses `requireSession()` instead of `requirePermission()`. Any authenticated user can read any employee's own-payroll view. |
| P1 | `app/(authenticated)/payroll/team/page.tsx:9` | Uses `requireSession()` — any authenticated user can access team payroll view. |
| P1 | `app/(authenticated)/payroll/settings/import-export/page.tsx:9` | Uses `requireSession()` — any authenticated user can access payroll import/export. |
| P2 | `app/(authenticated)/hr/recruitment/booking-links/page.tsx:1` | No permission gate. Delegates to `BookingLinksView` without `requirePermission`. Under recruitment layout gate but booking links may be a lower-privilege path. |
| P2 | `app/(authenticated)/billing/invoices/page.tsx:6` | Uses `DashboardGate("accounting:view")` — client-side only gate (bypassable). No server-side `requirePermission`. |
| P2 | `app/(authenticated)/settings/roles/**` (4 pages) | All use `DashboardGate("settings:rbac:manage")` (client-side only). RBAC management pages should have server-side `requirePermission`. |
| P2 | `app/(authenticated)/settings/audit-log/page.tsx:251` | `DashboardGate("audit-log:read")` is client-side only — audit log is sensitive. |
| P2 | `app/(authenticated)/payroll/bonuses/page.tsx:9` | Uses `hr:bonuses:manage` (wrong module prefix — should be `payroll:bonuses:manage`). |
| P2 | `app/(authenticated)/payroll/inputs/page.tsx:7` | Uses `hr:payroll:view` (cross-module prefix mismatch). |
| P2 | `app/(authenticated)/payroll/loans/page.tsx:9` | Uses `hr:payroll:view` (cross-module prefix mismatch). |
| P2 | `app/(authenticated)/payroll/reimbursements/page.tsx:9` | Uses `hr:payroll:view` (cross-module prefix mismatch). |
| P2 | `app/(authenticated)/payroll/salary-structures/page.tsx:9` | Uses `hr:salary:view` (cross-module prefix mismatch). |
| P3 | `app/(authenticated)/settings/roles/[roleId]/page.tsx:33` | `useParams()` used without TypeScript generic — `params.roleId` is `string \| string[] \| undefined`, not narrowed. |
| P3 | `app/(authenticated)/hr/settings/integrations/page.tsx:1` | 7-LOC client component with no gate and no PageWrapper. Renders `HrIntegrationsSettings` directly. |
| P3 | `app/(authenticated)/users/page.tsx:11` | `requirePermission("hr:employees:view")` — gating the /users path on an HR-module key couples org user management to HR module access. |
