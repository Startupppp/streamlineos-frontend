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
- [ ] Inventory every HR table and classify: active · compatibility-held · superseded · removable. Use runtime references, raw SQL, migrations and retention obligations — not just symbol grep.
- [ ] **A scan that says "everything is dead" is a broken scan.** Two known failure modes: a symbol pattern that misses `pgTable(` (capital T) maps nothing and reports every table unreferenced; and the table name often sits on the line *after* the `pgTable(` call, so single-line patterns find none. All 95 empty `hr_*` tables are referenced by live services — **emptiness is not deadness**.
- [ ] Enforce the freeze: any new HR behaviour uses existing lifecycle fields or the custom-field engine.

### 2. Projections — the privacy headline
- [ ] Replace unprojected user/person/employee relations with explicit minimum projections. Prioritise **payroll, banking, tax, identity documents and performance data**.
- [ ] **Never use an unprojected relation to global `users`** (`user: true`, `creator: true`, `approver: true`) — those rows still hold authentication secrets and legacy payroll/HR fields.
- [ ] Sensitive fields use field-level permission and explicit DTOs. Add tests that assert the exact returned key set, so a widened projection fails.

### 3. Bounded lists and search
- [ ] Replace unbounded lists and offset-only live feeds with the shared cursor/filter/sort contract, cap 100. Retain compatibility branches only for named callers, then remove them.
- [ ] Replace leading-wildcard operational search with tenant-safe indexed FTS/trigram, or the approved `SECURITY DEFINER` id-search seam. Under RLS a text index is unusable and `LEAKPROOF` is impossible on Neon — see `app.search_ticket_ids` (migrations `0424`/`0425`) for the canonical five-condition shape.

### 4. Scope correctness
- [ ] Every list/detail read enforces scope **before** retrieval.
- [ ] **Every optional subject filter must apply DataScope and cannot widen an `own`/`team` caller.** Force the filter to the caller unless they hold the widening permission — and confirm that permission is not one the read role already holds. `hr:employees:manage` sits beside `:view` in HR_ADMIN/BRANCH_HR/RECRUITER, so gating on `manage` is a **no-op**. Gate on the scopable key's DataScope.
- [ ] Known catalog defect to verify: a ghost key `hr:employees:export` was reported to break CSV export for non-owners. Confirm against the current catalog; if the key is missing, report it to S01 (catalogs are theirs).

### 5. Keys and structure
- [ ] Risk-rank active `serial()` tables: growth, write rate, int4 lifetime, FK fanout, partitioning and migration cost. Migrate **only** those that fail the target-scale lifetime or cross-cell requirement; record KEEP decisions for bounded catalogs. NOTE: L22 produced a repo-wide serial risk register covering 588 int4 columns; HR-specific KEEP/MIGRATE decisions not individually recorded.
- [x] Split cohesive HR files over the hard limit: `db/schema/hr/hiring.ts` (976) → `hiring-core.ts` (140), `hiring-candidates.ts` (227), `hiring-interviews.ts` (242), `hiring-pipeline.ts` (377). `hr-calendar-source.ts` (589→479) + extracted `hr-calendar-sub-sources.ts` (122). L26-report; ls verified both sets of files exist. `hr-ai.service.ts` (812, S07) reported OUT-OF-OWNERSHIP. NOTE: partial — hr-ai.service.ts not split.

### 6. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (buckets B01 + B02, ~151 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row.

### 7. Frontend
- [ ] Split `features/hr/performance/reviews-tab.tsx` (511) and `features/hr/leaves/components/leaves-wfh-content.tsx` (503).
- [ ] Every sensitive hook gates internally via its query's `enabled` condition with its exact backend permission. Self-service hooks stay universal.
- [ ] Complete loading / refresh / error / denied / empty / filtered-empty states using shared primitives.

### 8. Known cross-tenant defect to re-verify
- [x] A cross-tenant WFH index and a torn payroll run were previously reported in HR. WFH cross-tenant index: CONFIRMED FIXED — `uniqueIndex("uniq_wfh_requests_org_user_date").on(table.orgId, table.userId, table.date)` — orgId leads, confirmed by L26-report. Torn payroll run: payroll invariants spec confirms immutable approved runs (S03 item 3.2). Both verified DONE.

## Validation

`pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:scope-application` · `check:record-access` · `check:tenant-indexes` · `check:tenant-isolation` · `check:module-entitlement` · jest `--testPathPattern="hr|directory|careers|e-sign|offer-fulfillment"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:formatters` · `check:empty-states` · jest for HR features.
If you changed routes or DTOs, regenerate and re-vendor OpenAPI.

## Definition of done

Sensitive HR responses are projection-pinned and proven by key-set assertions; every list is bounded and index-backed; person facets resolve through the seam; every retained table and key has a documented scale and lifecycle reason; employee self-service works independently of paid HR entitlements; isolation coverage complete for your trees.

Report to `architecture-refactor/session-tickets/reports/S02-report.md`.
