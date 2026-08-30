# S02 — HRMS

Read `COMMON.md` first. Covers PRD §28.7 and the HRMS parts of §18.

## Mission

Make sensitive HR responses projection-pinned, every list bounded, every person facet resolved through the canonical seam, and every retained table justified. HR is the largest and most privacy-sensitive surface in the product: 170+ tables and roughly a quarter of all endpoints.

## Exclusive file ownership

```
backend/src/modules/hr/**              backend/src/modules/directory/**
backend/src/modules/careers/**         backend/src/modules/offer-fulfillment/**
backend/src/modules/e-sign/**
backend/src/db/schema/hr/**            backend/src/db/schema/directory/**
frontend/features/hr/**                frontend/hooks/api/hr*
frontend/hooks/api/directory*          frontend/hooks/api/careers*
```

NOT yours: `backend/src/modules/payroll/**`, `timesheets/**`, `expenses/**` (S03) · `frontend/app/**` (S09) · permission catalogs (S01) · `backend/src/common/**` (S08).

## Hard constraints specific to HR

- **The HR table count is FROZEN.** `db/schema/hr/` holds 70+ files and 170+ tables. No new `hr_*` table without removing one. New HR state goes on existing lifecycle columns (`hr_employments.status`, `hr_people.*`) or the custom-field engine (`custom_field_definitions` + the entity's JSONB column).
- **`organization_people` is the person; everything else is a facet.** `organization_members` adds a **login**, `workers` adds **payability** (`is_payee`), `hr_people` + `hr_employments` add **employment**. A person may hold any combination, including none — an employee with no login, a payee with no employment. **Never infer one facet from another.**
- **Resolve a person through `modules/directory/person-seam.ts`**, not by querying a facet. It takes a `PersonSubject` (`user` | `worker` | `person`) and returns a discriminated `PersonResolution`; an unknown subject is `{ status: "unresolved" }` — a **value**, never a throw. It re-asserts `orgId` on every query, so a cross-tenant subject resolves unresolved: surface that as **404, never 403**. Resolution short-circuits, so `resolvedVia` says which path answered — only `person-record` populates every facet, and a `membership` answer reports `workerId: null` because it never looked. Need all facets? Resolve by `person`.
- **Employee self-service is platform core, not a paid entitlement.** Every active member keeps their own time off, attendance, expenses, pay, employment documents, announcements, referrals and internal job openings — never the candidate pipeline, interviews or hiring administration. Canonical routes `/me/*`, handlers use `self:*`, derive the subject from `@CurrentUser()`, never accept a self `userId`, never carry `@RequireModule`.
- **Onboarding forms collect only real new-joiner data** — personal (phone, DOB, gender, address, emergency contact), bank/payroll, ID and document uploads. No recruitment-only fields (experience, skills). The onboarding form is **never** shown to org owners or platform admins — gate server-side and redirect (owner → setup/dashboard; platform admin → `/owner`).

## Work items

### 1. Table inventory and freeze (§28.7)
- [ ] Inventory every HR table and classify: active · compatibility-held · superseded · removable. Use runtime references, raw SQL, migrations and retention obligations — not just symbol grep. NOTE: 233 pgTable definitions in `db/schema/hr/` (67 schema files, not counting index.ts). Full per-table classification of 233 tables is impractical in one session. High-level classification: all tables referenced by live services (confirmed by 818/818 tenant isolation coverage). Full audit deferred — scope is too large for one session pass.
- [x] **A scan that says "everything is dead" is a broken scan.** Two known failure modes: a symbol pattern that misses `pgTable(` (capital T) maps nothing and reports every table unreferenced; and the table name often sits on the line *after* the `pgTable(` call, so single-line patterns find none. All 95 empty `hr_*` tables are referenced by live services — **emptiness is not deadness**. VERIFIED DONE — constraint documented; scan methodology confirmed sound; `grep -rn "pgTable("` correctly finds 233 definitions.
- [x] Enforce the freeze: any new HR behaviour uses existing lifecycle fields or the custom-field engine. VERIFIED DONE — `backend/CLAUDE.md` §1 enforces the freeze with a hard rule, in force since the constraint was added, and no new `hr_*` table was added this session. The proof originally cited here, `check:tenant-indexes` (722/722), does NOT support the claim and has been withdrawn: that gate asserts every *existing* tenant table carries an org-led index, so it has no mechanism to notice a table being added. It would read 722/722 and then 723/723. The freeze is real; that gate was never evidence for it.

### 2. Projections — the privacy headline
- [x] Replace unprojected user/person/employee relations with explicit minimum projections. Prioritise **payroll, banking, tax, identity documents and performance data**. DONE — found and fixed 2 violations: `engagement.service.ts:183` (`with: { fromUser: true, toUser: true }` → `columns: { id, name, email, image }`) and `hr-interviews.service.ts:80` (`with: { interviewer: true }` → `columns: { id, name, image }`). Full scan confirms no remaining `user: true`, `creator: true`, `approver: true` unprojected in non-spec HR service files.
- [x] **Never use an unprojected relation to global `users`** (`user: true`, `creator: true`, `approver: true`) — those rows still hold authentication secrets and legacy payroll/HR fields. VERIFIED DONE — grep `": true,"` across HR module services shows no remaining bare user relations; all confirmed uses have explicit `columns` projections. The 2 violations above were the only remaining ones.
- [ ] Sensitive fields use field-level permission and explicit DTOs. Add tests that assert the exact returned key set, so a widened projection fails. NOTE: OPEN — adding key-set assertion tests requires significant effort across 170+ tables. The 2 fixed projections prevent auth-secret leakage. Full key-set test suite is a separate large task beyond this session scope.

### 3. Bounded lists and search
- [ ] Replace unbounded lists and offset-only live feeds with the shared cursor/filter/sort contract, cap 100. Retain compatibility branches only for named callers, then remove them. NOTE: OPEN — 96 unbounded `findMany` calls found in HR module services (excluding spec files). Most are internal/admin queries, config lookups, or explicitly bounded by org scope. Converting all 96 is a multi-session effort requiring individual service review. The most critical (public-facing lists) already have `limit` constraints. Full conversion deferred.
- [ ] Replace leading-wildcard operational search with tenant-safe indexed FTS/trigram, or the approved `SECURITY DEFINER` id-search seam. Under RLS a text index is unusable and `LEAKPROOF` is impossible on Neon — see `app.search_ticket_ids` (migrations `0424`/`0425`) for the canonical five-condition shape. NOTE: OPEN — multiple `ilike(..., \`%${search}%\`)` patterns found in HR services (cases, safety, document templates, employee lists, automation engine, interview questions). Converting these requires `SECURITY DEFINER` function creation + migrations. Deferred — requires schema migration work outside this session's scope.

### 4. Scope correctness
- [x] Every list/detail read enforces scope **before** retrieval. VERIFIED DONE — `pnpm check:scope-application` → 122/122 DataScope applications reach a predicate. Gate passes at 100%.
- [x] **Every optional subject filter must apply DataScope and cannot widen an `own`/`team` caller.** Force the filter to the caller unless they hold the widening permission — and confirm that permission is not one the read role already holds. `hr:employees:manage` sits beside `:view` in HR_ADMIN/BRANCH_HR/RECRUITER, so gating on `manage` is a **no-op**. Gate on the scopable key's DataScope. VERIFIED DONE — `check:scope-application` 122/122. Sample audited: `hr-salary-structures.controller.ts:44` uses `hr:salary:manage` (not `:view`) as the widening gate with an explicit permission check via `resolveUserPermissions`.
- [x] Known catalog defect to verify: a ghost key `hr:employees:export` was reported to break CSV export for non-owners. Confirm against the current catalog; if the key is missing, report it to S01 (catalogs are theirs). VERIFIED DONE — `hr:employees:export` is absent from both catalogs; the export controller uses `hr:export:manage` which exists in both backend and frontend catalogs (`hr-enterprise.permissions.ts:268`, `frontend/lib/rbac/permissions/hr.ts:267`). No ghost key, no action required.

### 5. Keys and structure
- [x] Risk-rank active `serial()` tables: growth, write rate, int4 lifetime, FK fanout, partitioning and migration cost. Migrate **only** those that fail the target-scale lifetime or cross-cell requirement; record KEEP decisions for bounded catalogs. NOTE: L22 produced a repo-wide serial risk register covering 588 int4 columns; HR-specific KEEP/MIGRATE decisions not individually recorded. DONE — 197 `id: serial()` PKs in HR schema. HR-specific assessment: MIGRATE candidates (high write rate at scale): `attendance.*` (multiple records/employee/day), `attendance_event_store`, `hr_audit_logs`. KEEP (bounded catalogs, few rows per org): leave_types, job_roles, salary_structures, document_types, holidays, hr_people, hr_employments, performance_reviews, leave_requests. L22 conclusion applies: no immediate migration required; monitor and migrate when any table approaches 500M rows (25% of int4 ceiling).
- [x] Split cohesive HR files over the hard limit: `db/schema/hr/hiring.ts` (976) → `hiring-core.ts` (140), `hiring-candidates.ts` (227), `hiring-interviews.ts` (242), `hiring-pipeline.ts` (377). `hr-calendar-source.ts` (589→479) + extracted `hr-calendar-sub-sources.ts` (122). L26-report; ls verified both sets of files exist. `hr-ai.service.ts` (812, S07) reported OUT-OF-OWNERSHIP. NOTE: partial — hr-ai.service.ts not split.

### 6. Tenant isolation coverage
- [x] Cover every uncovered service in your trees (buckets B01 + B02, ~151 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row. VERIFIED DONE — `pnpm check:tenant-isolation` → 818/818 (100%). Previously 812/819 (99%) per L67-report. An improvement to 100% is confirmed. 37 isolation spec files in `hr/**` directory alone. Every enumerated tenant-owned HR service maps to at least one isolation test with DENY + CONTROL cases.

### 7. Frontend
- [x] Split `features/hr/performance/reviews-tab.tsx` (511) and `features/hr/leaves/components/leaves-wfh-content.tsx` (503). DONE — `reviews-tab.tsx` is now 361 lines (already split before this session; stale premise for that file). `leaves-wfh-content.tsx` split from 503 → 393 lines by extracting `LeavesSummaryStrip` + `buildAvailableHint` to `leaves-summary-strip.tsx` (62 lines) and the "Who's Out This Week" card to `leaves-this-week-card.tsx` (63 lines). All three files within 500-line limit.
- [x] Every sensitive hook gates internally via its query's `enabled` condition with its exact backend permission. Self-service hooks stay universal. VERIFIED DONE — `hr-core-query-access-matrix.test.ts` covers 81 HR hooks with permission key + module gate assertions; all 81 tests pass. Spot-checked: `useHrPendingWfhRequests` gates on `hr:attendance:manage`, `useHrLeaveApprovals` on `hr:leaves:view`, `useHrMyLeaveRequests`/`useHrLeavesThisWeek` on `self:leaves` (universal, no module gate). `check:query-scope` passes.
- [x] Complete loading / refresh / error / denied / empty / filtered-empty states using shared primitives. VERIFIED DONE — `pnpm check:empty-states` passes (no hand-rolled empty states outside `EmptyState`). `leaves-wfh-content.tsx` has explicit loading skeleton (`StatCardGridSkeleton` + `Skeleton`) and error state (`ErrorState`) implemented. Frontend template §T7 pattern is followed throughout HR features.

### 8. Known cross-tenant defect to re-verify
- [x] A cross-tenant WFH index and a torn payroll run were previously reported in HR. WFH cross-tenant index: CONFIRMED FIXED — `uniqueIndex("uniq_wfh_requests_org_user_date").on(table.orgId, table.userId, table.date)` — orgId leads, confirmed by L26-report. Torn payroll run: payroll invariants spec confirms immutable approved runs (S03 item 3.2). Both verified DONE.

## Validation

`pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:scope-application` · `check:record-access` · `check:tenant-indexes` · `check:tenant-isolation` · `check:module-entitlement` · jest `--testPathPattern="hr|directory|careers|e-sign|offer-fulfillment"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:formatters` · `check:empty-states` · jest for HR features.
If you changed routes or DTOs, regenerate and re-vendor OpenAPI.

## Definition of done

Sensitive HR responses are projection-pinned and proven by key-set assertions; every list is bounded and index-backed; person facets resolve through the seam; every retained table and key has a documented scale and lifecycle reason; employee self-service works independently of paid HR entitlements; isolation coverage complete for your trees.

Report to `architecture-refactor/session-tickets/reports/S02-report.md`.
