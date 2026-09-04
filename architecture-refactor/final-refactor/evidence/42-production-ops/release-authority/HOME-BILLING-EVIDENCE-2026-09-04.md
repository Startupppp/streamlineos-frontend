# Lane F — Home (C115) & Billing (C125) Current-Head Evidence
**Date:** 2026-09-04  **Auditor:** Lane F (release-verification agent)  
**Repos:** frontend/root `HEAD` + backend `HEAD`

---

## VERDICT

| Criterion | Verdict | Blocker |
|---|---|---|
| **PRD-C115 Home** | **OPEN** | `RecruitmentWidget` (interviews) and `PayrollAdminCard` (payroll runs) render on the Home page in violation of the product rule that those surfaces stay in their owning product nav. |
| **PRD-C125 Billing/Payments** | **CLOSED** | All sub-claims verified at current HEAD. |

---

## C115 — Home

### Sub-claim table

| Sub-claim | Status | Evidence (file:line) |
|---|---|---|
| Folder ownership — Home feature code in `features/dashboard/` | PASS | `frontend/features/dashboard/` — all Home widgets; route files in `frontend/app/(authenticated)/dashboard/` (page.tsx, error.tsx, loading.tsx only) |
| Universal-versus-module composition — Home holds ONLY universal work | **FAIL — P0** | `features/dashboard/home-widget-grid.tsx:148-150` mounts `<RecruitmentWidget>` (interviews); `features/dashboard/recruitment-widget.tsx:89` calls `useInterviews({ relevant: true, pageSize: 6 })` which fires `GET /hr/recruitment/interviews` — a module endpoint, never a dashboard endpoint. |
| Universal-versus-module composition — payroll runs on Home | **FAIL — P1** | `features/dashboard/home-widget-grid.tsx:142-144` mounts `<PayrollWidget>`; `features/dashboard/payroll-widget.tsx:72-124` renders `PayrollAdminCard` (when `canViewPayrollAdmin`) which calls `GET /payroll/command-center` and links to `/payroll/runs`. Product rule: "payroll runs… stay in their owning product nav." |
| Universal-versus-module composition — self-service payroll on Home | PASS | `features/dashboard/payroll-widget.tsx:19-70` `PayrollSelfCard` shows "My Payroll", calls `GET /me/pay` (self-service), gated on `self:payroll`. Permitted: employees keep "their own… pay". |
| Self-service enforcement at backend — not a frontend entitlement constant | PASS | `backend/src/modules/access/access-policy.ts:112-120` `EMPLOYEE_SELF_SERVICE_GRANTS` is derived from `ROLE_DEFAULT_PERMISSIONS["MEMBER"]`; applied unconditionally in `applyUniversalGrants` at line 166. `self:payroll`, `self:leaves`, `self:attendance`, etc. are MEMBER defaults (verified `backend/src/modules/rbac/permissions/role-defaults.ts:20-24`). |
| Section-level authorization/privacy — per-section permission gates | PASS | `features/dashboard/use-dashboard-access.ts:40-85` resolves per-section permissions from `useAccess()`. Each widget checks its enabled flag before firing its query (e.g., `enabled: hrEnabled && canViewInterviews` at `recruitment-widget.tsx:87`). |
| Bounded parallel queries — deferred loading with IntersectionObserver | PASS | `features/dashboard/deferred-dashboard-content.tsx:16-43` — IntersectionObserver with 240px rootMargin; expensive queries are behind `deferredVisible && <module>Enabled` at `dashboard-deferred-body.tsx:122-176`. |
| Independent loading/error states — `HomeSectionBoundary` isolation | PASS | `features/dashboard/home-section-boundary.tsx` wraps each widget; `home-section-boundary.test.tsx:64-120` verifies every listed widget is individually wrapped. `home-section-independence.test.tsx:105-183` (PRD-C144) proves answered sections render while siblings are loading or have failed. |
| Cache/query keys — `queryKeys.dashboard.*` factory | PASS | `frontend/lib/query-keys/collaboration.ts:55-74` — `queryKeys.dashboard.{stats,recentProjects,teamAttendance,leavesToday,upcomingHolidays,myLeaveBalance,birthdays,pendingApprovals,myIssues,todayActivities,activeSprintSummary,recentActivity,announcements,personal,executive,publicDocuments}`. Hook `hooks/api/dashboard.ts:55` uses factory. Tenant scoping via `scopedQueryKeyHashFn` (project-wide; factory arrays are tenant-free per CLAUDE.md). |
| Home manifest driven from backend controller | PASS | `frontend/lib/home/home-manifest.generated.json` — 17 sections, none referencing `/hr/recruitment/interviews` or `/payroll/command-center` (those are called directly by the violating widgets). |
| Accessibility test present | PASS | `features/dashboard/home-a11y.test.tsx` exists in the feature folder. |

### P0 Defect — RecruitmentWidget on Home

**File:** `frontend/features/dashboard/home-widget-grid.tsx:148-150`  
**File:** `frontend/features/dashboard/recruitment-widget.tsx:85-148`

```
// home-widget-grid.tsx:148-150
<HomeSectionBoundary sectionLabel="Recruitment">
  <RecruitmentWidget />
</HomeSectionBoundary>
```

`RecruitmentWidget` calls `useInterviews({ relevant: true, pageSize: 6 }, { enabled: hrEnabled && canViewInterviews })` (`recruitment-widget.tsx:89`), which fires `GET /hr/recruitment/interviews` (verified at `frontend/hooks/api/hr/recruitment/interviews.ts:99`). It renders interview rows with links to `/hr/recruitment/candidates/:id`. This is a **recruitment/interview surface rendered on Home**, directly violating the product rule: _"Recruitment, interviews… stay in their owning product nav."_

The permission key `hr:interviews:view` exists in both catalogs (backend: `hr-foundation.permissions.ts:249`; frontend: `permission-key-foundation.ts:8`). The key is valid — but the surface it gates does not belong on Home.

### P1 Defect — PayrollAdminCard on Home

**File:** `frontend/features/dashboard/payroll-widget.tsx:72-124`  
**File:** `frontend/features/dashboard/home-widget-grid.tsx:142-144`

`PayrollWidget` renders `PayrollAdminCard` when `canViewPayrollAdmin` (`payroll:runs:view`) is true. `PayrollAdminCard` calls `GET /payroll/command-center` (`hooks/api/payroll/command-center.ts:14`) and links to `/payroll/runs`. It shows run status (blockers, warnings, approvals). This violates: _"payroll runs… stay in their owning product nav."_

The permission key `payroll:runs:view` exists in both catalogs (backend: `billing/core/billing.controller.ts` area; frontend: `permission-key-business.ts:54`). Valid key, wrong surface.

---

## C125 — Billing and Payments

### Sub-claim table

| Sub-claim | Status | Evidence (file:line) |
|---|---|---|
| Exactly 2 platform billing Settings pages | PASS | `/settings/billing/page.tsx:1` — gated `billing:subscription:view`. `/settings/billing/ai-credits/page.tsx:1` — gated `billing:ai-credits:view`. |
| Forbidden routes absent: `/billing/ai-credits` | PASS | Path does not exist in `app/(authenticated)/billing/`. |
| Forbidden routes absent: `/settings/subscription` | PASS | Path does not exist under `app/(authenticated)/settings/`. |
| Forbidden routes absent: `/billing/seats` | PASS | Path does not exist under `app/(authenticated)/billing/`. |
| `/billing/invoices` is legitimate accounting invoicing | PASS | `app/(authenticated)/billing/invoices/page.tsx:8` — gated `accounting:view`. `app/(authenticated)/billing/layout.tsx:9` — `enforceRouteAccess("/billing/invoices")`. `/billing` itself has no `page.tsx` — not an accessible route. |
| Plan entitlements resolve server-side from `subscriptions` via `PlanLimitsService` | PASS | `backend/src/modules/billing/core/plan-limits.service.ts:97-156` — `resolveTier` reads `subscriptions` table via tenant transaction; cached 30s in Redis under `billing:tier:<orgId>`. |
| Every limited-resource creation calls `assertWithinLimit` before insert | PASS | All 14 `LimitKey` values covered: `members` (`users.service.ts:129,175`; `invitation-create.service.ts:254`; `employee-onboarding.service.ts:102`), `projects` (`projects-provision.service.ts:37,138`; `projects-templates.service.ts:138`), `kbPages` (`kb-pages.service.ts:57`; `kb-page-duplicate.service.ts:35`; `kb-import-export.service.ts:99`), `chatChannels` (`chat-channels.service.ts:163`), `crmLeads` (`leads.service.ts:104,361`; `leads-import.service.ts:39`; `public/crm.service.ts:112`), `crmContacts` (`contacts.service.ts:62,104`), `crmDeals` (`deals-crud.service.ts:78,305`; `deals-import-export.service.ts:25`; `lead-status.service.ts:55`), `supportTickets` (`support-tickets.service.ts:123`), `automations` (`automation.service.ts:419`; `projects-automations.service.ts:38`; `settings-automations.service.ts:56`; `crm-automations.service.ts:34`), `signEnvelopes` (`sign-envelopes.service.ts:64`; `sign-templates.service.ts:126`), `surveys` (`survey-forms.service.ts:54,171`), `acctInvoices` (`invoices-write.service.ts:48`; `so-lifecycle.service.ts:145`; `quotes-lifecycle.service.ts:139`), `hrCandidates` (`recruitment-candidates.service.ts:198`), `hrJobPostings` (`recruitment-jobs.service.ts:90`). |
| AI billing is token-metered via `computeTokenCharge(model, in, out)` | PASS | `backend/src/modules/ai/core/billing/ai-model-pricing.constants.ts:35` defines `computeTokenCharge`; called in `ai-gateway-credit.helper.ts:51`, `ai-gateway-embed.helper.ts:174`, `ai-gateway-runner-call.ts:165`, `ai-gateway.service.ts:296`. |
| Ledger stores integer milli-credits | PASS | `computeTokenCharge` returns `{ costUsd, milliCredits }` where `milliCredits` is `Math.max(...)` (integer); stored as `milliCredits` throughout gateway settle paths. `ai-model-pricing.constants.ts:43-47`. |
| `AI_FEATURE_COSTS` are reserve ceilings only | PASS | `ai-cost-catalog.ts:1` — constants used as reserve (ceiling), not as flat per-action charges; actual settlement uses `computeTokenCharge`. |
| Idempotent provider events / replay-safe webhooks | PASS | `backend/src/modules/billing/core/provider-event-ledger.ts:22-60` — `claim()` inserts with `onConflictDoNothing` on composite `(org_id, provider, provider_event_id)`, then reads `processedAt` to distinguish RETRY from PROCESSED. Webhook signature verified BEFORE claim at `billing-webhook.handler.ts:50-54`. |
| Immutable invoices | PASS | `backend/src/modules/billing/core/invoice-snapshot.service.ts:87` — `issueInvoice` writes a snapshot; status transitions are `DRAFT→ISSUED→PAID/VOID` without overwriting line data; credit note mechanism for adjustments (`CreditNoteInput` at line 71). |
| Tax/currency handling | PASS | `invoice-pricing.ts` referenced in `invoice-snapshot.service.ts:22`; `TaxBehavior` type enforced; currency validated as 3-letter ISO at `invoice-snapshot.service.ts:90`. |
| Proration | PASS | `backend/src/modules/billing/core/proration-ledger.service.ts` — `ProrationLedgerService` with `idempotencyKey` and `computeProrationMinor`. |
| Seats | PASS | `backend/src/modules/billing/core/seat-ledger.service.ts` — `SeatLedgerService` with `SeatEventInput.idempotencyKey`. |
| Cached feature access — frontend reads `GET /billing/entitlements` via `useEntitlements` | PASS | `frontend/hooks/api/entitlements.ts:23` — `apiClient.get("/billing/entitlements", …, entitlementsResponseContract)`; used in `product-switcher-menu.tsx:62`, `plan-usage-meters.tsx:82`, `huddle-panel.tsx:71`. Backend caches entitlements at `billing:entitlements:<orgId>`, 60s TTL (`plan-limits.service.ts:161`). |
| Permission keys in both catalogs | PASS | `billing:subscription:view` — backend `billing.ts:5`, frontend `billing.ts:4` + `permission-key-foundation.ts:210`. `billing:ai-credits:view` — backend `billing.ts:68`, frontend `billing.ts:13` + `permission-key-foundation.ts:208`. |
| Authorization on billing routes | PASS | `/settings/billing/page.tsx:10` — `requirePermission("billing:subscription:view")`. `/settings/billing/ai-credits/page.tsx:10` — `requirePermission("billing:ai-credits:view")`. `/billing/invoices/page.tsx:8` — `DashboardGate permission="accounting:view"`. |

---

## Summary

**C115 is OPEN.** Two product-rule violations exist at current HEAD:

1. **P0** — `RecruitmentWidget` (`features/dashboard/home-widget-grid.tsx:148`) renders interview administration on Home, calling `GET /hr/recruitment/interviews` directly. Interviews are explicitly listed as a surface that must stay in its owning product nav.

2. **P1** — `PayrollAdminCard` (rendered by `PayrollWidget` at `features/dashboard/home-widget-grid.tsx:142`) calls `GET /payroll/command-center` and links to `/payroll/runs` from Home. Payroll runs administration is explicitly listed as a surface that must stay in its owning product nav.

**C125 is CLOSED.** All sub-claims are verified: exactly 2 platform billing settings pages exist (forbidden routes absent), `assertWithinLimit` is called before every limited-resource creation across all 14 quota keys, AI billing is token-metered via `computeTokenCharge`, the ledger stores integer milli-credits, webhooks are idempotent via composite-key claim, invoices are immutable snapshots, proration and seats are ledgered, and cached feature access is served from `GET /billing/entitlements` with both permission keys present verbatim in both catalogs.
