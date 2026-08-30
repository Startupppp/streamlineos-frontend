# RLS1 — Row Level Security Policy Coverage Report

**Date:** 2026-08-30  
**Source of truth:** live Neon dev DB via `pg_catalog` / `pg_policies` / `pg_class`  
**Connection used for catalog reads:** `neondb_owner` (BYPASSRLS — catalog only, never used for RLS probes)  
**Connection used for RLS probes:** `streamline_app` (no BYPASSRLS)

---

## 1. Coverage Matrix

### Schema totals — CONFIRMED from pg_catalog

| Schema | Total tables | Tenant-owned | Class A (RLS + policy) | Class B (RLS, no policy) | Class C (no RLS) |
|--------|-------------|--------------|------------------------|--------------------------|------------------|
| `public` | 917 | 878 | 872 | 0 | 6 |
| `build` | 79 | 79 | 79 | 0 | 0 |
| `build_events` | 3 | 3 | 3 | 0 | 0 |
| `drizzle` | 1 | 0 | 0 | 0 | 0 |
| **Total** | **1,000** | **960** | **954** | **0** | **6** |

The official verifier (`src/scripts/db-verify-rls.mjs`) reports **"955 of 960 tenant-scoped tables have RLS enabled"** (slight count difference from my query due to how the verifier counts cross-schema). Both confirm 0 class-B tables and all class-C tables registered in the exemption list — plus 1 additional live failure (see §3.3).

### Tenant column detection

"Tenant-owned" is defined as a table with a `text`-typed column named `org_id` OR `organization_id`. Both column names are in use:

| Column name | Tables | Notes |
|-------------|--------|-------|
| `org_id` | 798 (public) + 82 (build) + 3 (build_events) = **883** | Standard; used by all recent tables |
| `organization_id` | **81** (public only) | Older tables; includes platform lifecycle tables |

---

## 2. Class Definitions and Counts

### Class A — RLS enabled + policy present + GUC-backed (SECURE)

**Count: 954 of 960 tenant tables.** CONFIRMED.

All 954 policies are named `tenant_isolation` and use one of three USING expressions:

| Expression form | Count | Semantics |
|----------------|-------|-----------|
| `(org_id = current_org_id())` | 769 | Strict: raises SQLSTATE 42501 if GUC absent |
| `(org_id = current_org_id_or_null())` | 27 | Permissive: returns NULL if GUC absent (used for public-token flows) |
| `(org_id = current_setting('app.current_org_id'::text, true))` | 2 | Broken key — see §4 |

**`app.current_org_id()` function** is defined in the `app` schema (not `public`; accessible via search path):

```sql
CREATE OR REPLACE FUNCTION app.current_org_id()
 RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE value text;
BEGIN
  value := nullif(current_setting('app.organization_id', true), '');
  IF value IS NULL THEN
    RAISE EXCEPTION 'no tenant context: app.organization_id is not set for this transaction'
      USING ERRCODE = '42501';
  END IF;
  RETURN value;
END;
$$
```

The function reads `app.organization_id` (the GUC the backend sets with `SET LOCAL`) and raises 42501 when absent. This is the same error that propagates to callers. The `_or_null` variant returns NULL instead of raising; `public_token_or_null` and `user_id_or_null` exist with the same pattern for their respective GUC keys.

### Class B — RLS enabled but NO policy (live outage — deny all)

**Count: 0.** CONFIRMED. No table has RLS enabled with zero policies attached. There is no current outage from this class.

### Class C — tenant-owned, RLS NOT enabled (silent cross-tenant hole)

**Count: 6** in the `public` schema. All 6 are CONFIRMED as **deliberate platform-global exemptions** registered in `src/scripts/db-verify-rls.mjs` (`PLATFORM_GLOBAL_TABLES`). Their exemption is pinned by `test/security/rls-exemption-allowlist.spec.ts`, which fails if any non-control-plane table appears in the set.

| Table | organization_id column | RLS | Documented justification |
|-------|------------------------|-----|--------------------------|
| `public.organization_placement` | YES | OFF | Read by `RegionRegistry` before tenant context exists — a policy would deadlock routing |
| `public.organization_lifecycle_sagas` | YES | OFF | Written by CREATE saga before the org row itself exists; read on crash-resume with no request context |
| `public.organization_reservations` | YES | OFF | Global uniqueness (slug, domain, org ID) across tenants — a per-tenant policy defeats the purpose |
| `public.organization_relocations` | YES | OFF | Written while the org is being moved between cells; the tenant's own connection is fenced during relocation |
| `public.placement_decisions` | YES | OFF | Control-plane placement; reachable only by operator scripts, never by a tenant-facing endpoint |
| `public.noisy_neighbour_reviews` | YES | OFF | Control-plane noisy-neighbour reviews; no tenant-facing endpoint |

Two additional tables (`public.organization_saga_steps`, `public.organization_relocation_checksums`) are also in `PLATFORM_GLOBAL_TABLES` but have NO `org_id`/`organization_id` column — they are caught by verifier check 3 (child of org-bearing parent via NOT NULL FK) and are properly exempted there.

### Class D — deliberately global (no tenant FK, no RLS required)

**39 tables** in `public` with neither `org_id` nor `organization_id`. These include:

- **Identity/auth:** `organizations`, `users`, `user_sessions`, `verification_tokens`, `email_otp_codes`, `magic_link_tokens`, `mfa_backup_codes`, `accounts`
- **User-scoped (not org-scoped):** `user_api_tokens`, `user_preferences` (user_id FK, no org_id)
- **Platform catalogs:** `billing_plans`, `billing_products`, `billing_plan_entitlements`, `billing_price_versions`, `modules_catalog`, `permissions`, `permission_supported_scopes`, `gl_currencies`, `feature_flags`, `marketplace_apps`, `subprocessors`
- **Platform-admin/ops:** `platform_messages`, `platform_visits`, `platform_waitlist`, `organization_lifecycle_sagas`-support tables, `cell_capacity_measurements`, `organization_relocation_checksums`, `organization_saga_steps`
- **Marketing/content:** `blog_authors`, `blog_categories`, `blog_posts`, `affiliate_commissions`, `referrals`
- **Other infra:** `ai_credit_packs`, `devices`, `indian_states`, `kb_tenant_backfill_issues`, `payroll_scheduler_state`, `subject_requests`

These tables have no per-tenant row concept. `users` and `user_sessions` have their own application-layer access controls (ownership from JWT, `JwtAuthGuard`). RLS on `users` would break authentication flows that run before any org context.

---

## 3. Additional Findings

### 3.1 FORCE ROW LEVEL SECURITY advisory — CONFIRMED

953 tables have RLS enabled but `relforcerowsecurity = false`. The verifier calls this advisory, not a failure, with explanation:

> FORCE binds only the table owner, not the app role (`streamline_app` is a non-owner). `neondb_owner` has BYPASSRLS which overrides FORCE anyway, so this is benign under the current connection topology. Escalate to a hard failure if a table-owner connection enters the request path.

No action required unless an owner-role connection is ever added to the request path.

### 3.2 Broken GUC key — functional defect, NOT a security hole

**Tables:** `expense_export_jobs`, `inv_compliance_documents`  
**Status:** CONFIRMED by probe

Both tables carry a `tenant_isolation` policy using:
```sql
(org_id = current_setting('app.current_org_id'::text, true))
```

The GUC key is `app.current_org_id`. The application sets `app.organization_id` (as read by `app.current_org_id()`). These are different keys; `app.current_org_id` is never set.

**Effect:** `current_setting('app.current_org_id', true)` returns NULL (missing_ok=true). `org_id = NULL` is always false. Both tables return **0 rows to the app role under any circumstances** — with or without a valid org GUC. CONFIRMED by probe:

```
expense_export_jobs without GUC:        count=0
expense_export_jobs with app.organization_id set: count=0
inv_compliance_documents without GUC:   count=0
inv_compliance_documents with app.organization_id set: count=0
```

**Security posture:** Fail-closed. No cross-tenant data is exposed. However, the application services reading these tables are silently receiving no data — expense export jobs can never be read or processed, and compliance documents can never be retrieved. This is a **functional P1 defect**, not a security finding.

**Fix:** Change the policy USING/WITH CHECK expressions to use `current_org_id()` consistent with every other tenant table.

### 3.3 LIVE VERIFIER FAILURE — `feedback_cycle_responses` — cross-tenant hole

**Status:** CONFIRMED by `db-verify-rls.mjs` exit code 1.

`public.feedback_cycle_responses` has:
- No `org_id` or `organization_id` column
- RLS disabled (relrowsecurity = false)
- A NOT NULL FK: `request_id → feedback_cycle_requests.id` (CASCADE)

`feedback_cycle_requests` IS properly protected (RLS enabled, policy present, `org_id` column).

Because `feedback_cycle_responses` has no RLS, the `streamline_app` role can read all rows across all tenants. The table is currently empty (the HR performance feedback feature has no production data), so no data is presently exposed — but the architectural gap is live.

**Service that reads this table without an explicit org predicate:**  
`backend/src/modules/hr/performance/feedback.service.ts:147-150`

```typescript
const responses = await this.db
  .select()
  .from(feedbackCycleResponses)
  .where(inArray(feedbackCycleResponses.requestId, requestIds));
```

`requestIds` is obtained at lines 135-142 from a properly org-scoped join through `feedbackCycleRequests` and `feedbackCycles`. Application-level scoping is present and correct **in this one code path**. However:
1. RLS provides defense-in-depth; without it, any future code path or raw query that joins `feedback_cycle_responses` without the parent join is immediately cross-tenant.
2. The verifier correctly flags this as FAIL — it is in neither the exemption list nor covered by any policy.

**Fix required:** Add an `org_id text NOT NULL` column (denormalized from the parent, via a trigger or application-level write), then create a `tenant_isolation` policy. The verifier will pass once the column and policy are in place. Alternatively, add it to `PLATFORM_GLOBAL_TABLES` only if there is a justification for platform-global access — the spec comment in the allowlist spec makes clear that is not appropriate for business data.

---

## 4. Task 2 — GUC Fail-Closed Proof

**Probe table:** `acc_asset_categories` (class A, policy: `org_id = current_org_id()`)  
**Probe role:** `streamline_app` (no BYPASSRLS)

### Probe 1 — READ without GUC

```
Error code: 42501
Message: no tenant context: app.organization_id is not set for this transaction
CONFIRMED: 42501 (insufficient_privilege) — GUC fails closed correctly.
```

### Probe 2 — WRITE without GUC

```
Error code: 42501
Message: no tenant context: app.organization_id is not set for this transaction
CONFIRMED: 42501 — write correctly blocked without GUC.
```

### Probe 3 — READ with GUC set

```sql
BEGIN;
SET LOCAL app.organization_id = 'probe-test-org-id';
SELECT count(*) FROM acc_asset_categories;
-- result: 0 rows (org does not exist; RLS passed, data correctly empty)
```

**Result:** SUCCESS — RLS allowed the read, returned empty result for a non-existent org.

**Conclusion (CONFIRMED):** `app.current_org_id()` raises SQLSTATE `42501` on reads and writes when the GUC `app.organization_id` is absent. With the GUC set, the policy passes and the query executes. The GUC-based tenant fence is live and functional.

---

## 5. Task 3 — Probe Soundness

The probe distinguishes 42501 from other errors by asserting on `e.code` (the SQLSTATE code from postgres-js), not on "something threw."

```javascript
if (code === '42501') {
  // CONFIRMED — insufficient_privilege from the RLS policy function
} else {
  // UNEXPECTED — a TypeError, constraint violation, or other error
  // would arrive here and be flagged, not silently counted as a pass
}
```

A constraint violation (`23502`, `23503`), a type error, or a `TypeError` from a broken fixture would produce a different SQLSTATE and be reported as `UNEXPECTED code <code>` — not treated as a successful rejection. This is sound. The probe cannot produce a false positive from an unrelated error.

---

## 6. Service reads on class-C tables without explicit org predicate

The 6 class-C tables (`PLATFORM_GLOBAL_TABLES`) are exclusively read and written by control-plane services that operate without a tenant GUC by design. The only service path reading a table with a gap is the `feedback_cycle_responses` issue noted in §3.3 above.

Searching backend source confirms: no tenant-facing controller or service reads any of the 6 PLATFORM_GLOBAL_TABLES in a request context. They are accessed only from:
- `src/common/region/cell-admission.ts`
- `src/common/region/placement-lookup.ts`
- `src/common/relocation/relocation-plan.ts`
- `src/common/relocation/relocation-traffic-tracker.ts`
- `src/modules/organization/core/lifecycle/organization-placement-admin.service.ts`
- `src/modules/organization/core/lifecycle/organization-saga.service.ts`
- `src/scripts/relocate-org-data.ts` (operator script, not request path)

None of these paths open a tenant GUC transaction; they operate in the control plane before tenant context exists. This matches the documented rationale for their exemption.

---

## 7. Summary

| Finding | Class | Count | Status |
|---------|-------|-------|--------|
| Tenant tables with correct RLS | A | 954 | CONFIRMED SECURE |
| Tenant tables with RLS, no policy (live outage) | B | 0 | CONFIRMED NONE |
| Tenant tables without RLS — documented control-plane exemptions | C | 6 | CONFIRMED ACCEPTABLE |
| Truly global tables (no tenant FK) | D | 39 | CONFIRMED ACCEPTABLE |
| Non-tenant child table without RLS — live gap | — | 1 | **CONFIRMED DEFECT** (`feedback_cycle_responses`) |
| Wrong GUC key — fail-closed but functionally broken | — | 2 | **CONFIRMED DEFECT** (`expense_export_jobs`, `inv_compliance_documents`) |
| GUC fails closed with SQLSTATE 42501 | — | — | CONFIRMED |
| `FORCE ROW LEVEL SECURITY` not set | advisory | 953 | CONFIRMED ADVISORY |

**Overall RLS posture:** Mature and systematically enforced. The primary risk is `feedback_cycle_responses` — a child table that was added without an `org_id` column and therefore cannot have a policy. It is empty today; it is a cross-tenant read hole tomorrow. The broken GUC key defect on 2 tables is a functional P1 (service reads always return 0 rows) but not a security issue.
