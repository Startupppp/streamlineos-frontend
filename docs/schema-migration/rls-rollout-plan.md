---
type: RLS rollout plan
status: EXECUTED — 740/740 tenant tables carry tenant_isolation; app-role cutover pending a restart
date: 2026-07-27 (executed 2026-08-01)
live-source: backend/src/common/tenant/README.md
owner: platform-engineering
depends-on: wave-0-rls-matrix.md, rls-phase1.sql, rls-phase2.sql, rls-phase3.sql
---

# RLS Rollout Plan

RLS is the DB-enforced backstop for tenant isolation. The app layer (BOLA guards in every service) remains the **primary** enforcement layer and is never removed because RLS exists. RLS catches the forgotten `WHERE org_id = :orgId` that slips through code review.

---

## GATE 0.5 — HARD BLOCKER (nothing executes until this passes)

**Claim to prove:** `set_config('app.organization_id', $1, true)` with the third argument `true` (transaction-local) is genuinely transaction-local when executed through the Neon serverless pooler in **transaction-pooling mode** (pgBouncer-compatible).

**Why it matters:** If the GUC persists beyond the transaction commit — either because the pooler reuses the connection in session mode, or because pgBouncer's transaction-pooling does not guarantee per-transaction GUC reset — then a connection reused for org B could carry org A's `app.organization_id` from the previous transaction. This is a **cross-tenant data leak**: a query run as org B would see org A's rows.

**Failure mode (what happens if GATE 0.5 fails):** Any connection pool reuse causes GUC bleed. A tenant query runs without calling `withTenant()` (e.g. a worker that directly queries the DB, or a code path that was missed during wiring) sees the previous connection's org context. With FORCE RLS on, the RLS policy enforces the leaked GUC — so the query returns rows from the wrong org. This is worse than no RLS because it is a silent leak with no error.

**Test required (POOL-01):**
1. From the actual Neon pooler endpoint (not a direct connection), connect as `streamline_app`.
2. In transaction 1: `BEGIN; SELECT set_config('app.organization_id', 'org_a', true); COMMIT;`
3. Reacquire the same connection from the pool (repeat step 2 many times until the same connection is reused).
4. In transaction 2: `BEGIN; SELECT current_setting('app.organization_id', true); COMMIT;`
5. Expected result: `''` or `NULL` — the GUC was cleared by the COMMIT in step 2.
6. Confirm with Neon support that their pooler operates in transaction-pooling mode (not session-pooling).

**GATE 0.5 — PASSED (2026-08-01).** POOL-01 was run against the live pooled Neon endpoint. The tenant id does NOT survive COMMIT, and two concurrent transactions never observe each other's value. It is now a permanent regression check: `pnpm db:verify-rls` asserts it on every run, alongside ten isolation checks executed as a non-BYPASSRLS role.

**Three findings from executing this plan correct what is written below — read them before following any SQL here:**

1. **`current_setting` does NOT reliably raise on an unset GUC.** Once a custom parameter has been set even once in a session it stays *known* and afterwards reads as `''`, so the no-`missing_ok` form raises only on a connection that has never served a request. Every later connection would compare against `''`, match nothing, and deny **silently**. Policies therefore call `app.current_org_id()` (migration `0374`), which raises `42501` explicitly.
2. **A RESTRICTIVE-only policy denies everything.** Postgres shows a row only if some *permissive* policy allows it; restrictive policies subtract but never grant. The shipped policies are PERMISSIVE.
3. **`FORCE ROW LEVEL SECURITY` is not required** — see the correction under "App Role Requirement" below.

---

## App Role Requirement

The runtime NestJS process must connect as **`streamline_app`**, a Postgres role with:

- No `BYPASSRLS` attribute (`pg_roles.rolbypassrls = false`)
- No table-owner status (tables are owned by `streamline_migrator`)
- `USAGE` on the `public` schema
- `SELECT, INSERT, UPDATE, DELETE` on all tenant tables

**CORRECTION — FORCE ROW LEVEL SECURITY is NOT required.** `BYPASSRLS` is checked *before* table ownership, so a role holding it ignores policies whether or not FORCE is set — and the migration role (`neondb_owner`, verified `rolbypassrls = true`) holds it. FORCE would therefore change nothing for the only role it could apply to. The real boundary is the role the app connects as, which is why the app now connects as `streamline_app` (verified: not owner, no BYPASSRLS, cannot create objects) and why a boot-time check refuses to serve production traffic when policies exist but the connected role can bypass them. The original reasoning is preserved below for context but is superseded.

**Original reasoning (superseded):**

In Postgres, `ENABLE ROW LEVEL SECURITY` applies to non-owner roles only. The table owner bypasses the policy. On Neon, the Neon admin / project-owner credential IS the table owner. If `streamline_app` were the table owner (or if `FORCE` were omitted), a bug in the migration scripts or a maintenance operation connecting with the owner credential would bypass RLS entirely — defeating the backstop. `FORCE ROW LEVEL SECURITY` subjects even the table owner to policies, closing this gap. The migration role (`streamline_migrator`) must therefore either DISABLE its own policy temporarily during DDL operations, or connect as a superuser that the policy explicitly exempts (not recommended).

**Verify before Phase 2:**
```sql
SELECT rolbypassrls FROM pg_roles WHERE rolname = 'streamline_app';
-- Expected: false
SELECT rolname FROM pg_roles WHERE rolbypassrls = true;
-- Should list only superuser / streamline_migrator, never streamline_app
```

---

## Phase Order

### Phase 1 — Shadow / Prepare (`rls-phase1.sql`)

**Pre-conditions:** GATE 0.5 passes (or: run only against a development/CI Postgres instance with a direct non-pooled connection where transaction-local GUC behaviour is proven).

**Actions:**
1. Deploy helper functions (`rls_org_id`, `rls_membership_id`, `rls_audience`) to the target DB.
2. Wire `withTenant()` into all NestJS request handlers and background jobs (see §4 Wiring).
3. Create `AS RESTRICTIVE` policies on the three pilot tables.
4. `ENABLE ROW LEVEL SECURITY` (not FORCE) on the three pilot tables.

**Pilot tables:** `access_versions`, `org_modules`, `group_roles` — all VERIFIED in wave-0-rls-matrix.md with text `org_id` and standard INTERNAL audience.

**Why these tables:** All three are RBAC / module-gate tables. A policy miss (GUC not set) returns 0 rows, which manifests immediately as a broken permission-check or missing module — visible in logs and monitoring within minutes. No silent data corruption.

**Shadow-observe period:** Run for ≥7 consecutive days including at least one peak-traffic window. Monitor for:
- Unexpected 0-row results on `org_modules` / `access_versions` / `group_roles`
- Any permission denied errors or application 500s traceable to these tables
- Log queries where `rls_org_id()` would have returned NULL (add `EXPLAIN ANALYZE` or a logging wrapper if needed)

**Rollback:**
```sql
DROP POLICY IF EXISTS rls_tenant ON access_versions;
DROP POLICY IF EXISTS rls_tenant ON org_modules;
DROP POLICY IF EXISTS rls_tenant ON group_roles;
ALTER TABLE access_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_modules     DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_roles     DISABLE ROW LEVEL SECURITY;
```

---

### Phase 2 — Pilot Enforce (`rls-phase2.sql`)

**Pre-conditions (ALL required):**
- GATE 0.5 passed
- Shadow-observe period (Phase 1) completed with zero regressions
- Negative tests NT-01 through NT-10 (wave-0-rls-matrix.md Part 6) executed against Neon pooler and all passing
- `withTenant()` wired into 100% of request paths (verify with a query-log scan for any tenant-table query running outside a transaction)

**Actions:**
1. Grant `streamline_app` minimum required privileges on pilot tables.
2. `FORCE ROW LEVEL SECURITY` on the three pilot tables.

**Rollback:**
```sql
ALTER TABLE access_versions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE org_modules     NO FORCE ROW LEVEL SECURITY;
ALTER TABLE group_roles     NO FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant ON access_versions;
DROP POLICY IF EXISTS rls_tenant ON org_modules;
DROP POLICY IF EXISTS rls_tenant ON group_roles;
ALTER TABLE access_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_modules     DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_roles     DISABLE ROW LEVEL SECURITY;
```

---

### Phase 3 — Fleet Rollout (`rls-phase3.sql`)

**Pre-conditions:**
- Phase 2 stable for ≥7 days
- All mandatory verification tasks (wave-0-rls-matrix.md Part 10) closed for the target wave group
- All open questions (OQ-1 through OQ-10) relevant to the target group resolved
- `SET statement_timeout = 0;` at the top of the script (required: the catalog loop applies hundreds of policies and will be cancelled by Neon's default statement timeout)

**Actions:**
1. Catalog-driven PL/pgSQL loop: find all `public` tables with a `text`/`varchar` `org_id` column, apply Template A (INTERNAL), ENABLE + FORCE.
2. Broad app-role grant: `GRANT … ON ALL TABLES` (run after all migrations are complete).
3. Special-case tables:
   - `organizations` — Template C (self-referential `id = rls_org_id()`, dual audience)
   - `membership_role_assignments`, `command_fences` — `organization_id` column name (not `org_id`)
   - `project_client_grants` — Template B (PORTAL audience + membership gate)
   - `feature_flags` — nullable-org policy (system rows with `org_id IS NULL`)

**Wave assignment (follows wave-0-rls-matrix.md Part 9):**

| Wave | Table groups | Fleet phase notes |
|------|-------------|------------------|
| Wave 4 | Core tenancy, RBAC/Access, Org structure, AI credits | Phase 1+2 pilot; Phase 3 for remaining verified tables in these groups |
| Wave 5 | Billing text-org_id tables (`org_ai_credits`, `ai_credit_transactions`, etc.) | Pre-condition: OQ-1 resolved |
| Wave 6 | CRM, Inventory | Pre-condition: CRM-01, INV-01, OQ-7 closed |
| Wave 7 | HR, Payroll, PM/Projects, Support, KB, Surveys, Workflows, AI Chat | Pre-condition: HR-01, PAY-01, PM-01, OQ-4, OQ-6 closed |
| Wave 9 | Deferred integer-org_id billing tables | Pre-condition: integer→text migration complete; OQ-1 resolved |

**Emergency fleet rollback:**
```sql
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT tablename FROM pg_policies WHERE policyname = 'rls_tenant'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS rls_tenant ON %I', rec.tablename);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', rec.tablename);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', rec.tablename);
  END LOOP;
END;
$$;
```

---

## §4 — Wiring `withTenant()` into NestJS (report only — do NOT modify existing files)

`src/db/rls-context.ts` exports `withTenant(db, context, fn)`. It is NOT wired into the DI module. The recommended wiring pattern for each service that performs tenant queries:

**Option A — Per-service injection (preferred for incremental adoption):**

In each NestJS service constructor, inject `@Inject(DRIZZLE) private readonly db: Db`. Replace:
```typescript
return this.db.transaction(async (tx) => { ... });
```
with:
```typescript
import { withTenant } from "../../db/rls-context";
...
return withTenant(this.db, { orgId, audience: "INTERNAL" }, async (tx) => { ... });
```

**Option B — Interceptor (preferred for uniform adoption):**

Create a `TenantTransactionInterceptor` that:
1. Reads `req.user.orgId` from the request (set by `JwtAuthGuard`).
2. Opens a `withTenant()` transaction and stores `tx` in `AsyncLocalStorage`.
3. Services read `tx` from `AsyncLocalStorage` instead of `this.db`.

This approach ensures no request can accidentally query outside a tenant transaction. It does not modify `DrizzleModule`.

**Workers and background jobs:**
```typescript
return withTenant(db, { orgId: job.data.orgId, audience: "INTERNAL" }, async (tx) => {
  // all queries within this closure use the tenant-scoped transaction
});
```

One transaction per org. Never set a null/wildcard orgId.

---

## §5 — Tables That Cannot Be RLS'd As-Is (require schema work first)

### Missing `org_id` column entirely — must add before ENABLE

These tables have no `org_id` and are listed in wave-10-rls-matrix.md as pre-RLS blockers. They derive tenant context from a parent FK (join table E-08 pattern) but lack a direct column for the policy predicate:

`department_members`, `ticket_label_mappings`, `ticket_watchers`, `work_item_relations`, `ticket_checklist_items`, `ticket_custom_field_values`, `release_tickets`, `webhook_deliveries`, `project_members`, `project_template_tickets`, `chat_channel_members`, `chat_messages`

**Required action:** `ALTER TABLE <t> ADD COLUMN org_id text REFERENCES organizations(id)` + backfill from parent FK + add NOT NULL constraint + add index, then re-run the catalog loop.

### Integer `org_id` — type must be fixed before ENABLE

`billing_profiles`, `app_installations`, `affiliates`, `revenue_events`, `referrals` use `integer org_id`. The GUC returns `text`. The catalog loop in Phase 3 skips these (the filter restricts to `typname IN ('text', 'varchar')`). Deferred to Wave 9 after integer→text migration.

### `organization_id` column name — handled manually in Phase 3 Section D

`membership_role_assignments`, `command_fences` use `organization_id` instead of `org_id`. The catalog loop misses them. Phase 3 Section D adds their policies explicitly.

---

## §6 — Tables Permanently Excluded from RLS

| Table(s) | Reason | Compensating control |
|----------|--------|----------------------|
| `users`, `accounts`, `sessions`, `verification_tokens`, `user_sessions`, `mfa_backup_codes`, `magic_link_tokens`, `email_otp_codes`, `user_api_tokens`, `devices` | Global identity; no `org_id`; accessed pre-tenant-session | Auth service restricts reads to `id = auth.sub` at the service layer |
| `roles`, `permissions`, `role_permissions` | Platform-global catalog | `role_permission_grants` (org-scoped, RLS-enforced) is the enforcement table |
| `marketplace_apps`, `ai_credit_packs`, `indian_states` | Global read-only catalog; no per-tenant data | Read-only; plan entitlement filter at service layer |
| `blog_posts`, `blog_authors`, `blog_categories` | Platform marketing blog; no `org_id` | Anonymous read; no tenant data |
| `user_preferences` | Keyed by `user_id`; no `org_id` | Service layer restricts to authenticated user's own row |
| `affiliate_commissions` | No direct `org_id`; joined through `affiliates` | Access only via `affiliates` (RLS-enforced); verify join plan (task OQ-9) |
| `platform.ts` tables | Control-plane / admin tables | Accessed only via separate admin service path |
| `notification_events` | Nullable `org_id` (system events); see Section G | Permissive USING with strict WITH CHECK in Phase 3 |
| Integer-org_id tables | Type mismatch; DEFERRED to Wave 9 | Service-layer BOLA mandatory; code review gate per PR |

---

## §7 — Tenant Column Convention (verified from schema files)

The dominant convention across the codebase is **`org_id text`** (Drizzle: `text("org_id")`). Exceptions found:

| Column name | Type | Tables | Notes |
|-------------|------|--------|-------|
| `org_id` | `text` | Vast majority (~280 tables) | Standard; catalog loop in Phase 3 covers these |
| `org_id` | `varchar(36)` | Some billing/RBAC tables (e.g. `resource_grants`) | Functionally `text`-compatible; catalog loop uses `typname IN ('text','varchar')` |
| `org_id` | `integer` | `billing_profiles`, `app_installations`, `affiliates`, `revenue_events`, `referrals`, `referrals` | Legacy; blocked until Wave 9 type fix |
| `organization_id` | `text` | `membership_role_assignments`, `command_fences` | Different column name; catalog loop misses; Phase 3 Section D handles manually |
| `id` (PK) | `text` | `organizations` | Self-referential; predicate is `id = rls_org_id()`; Phase 3 Section C |
| None | — | Excluded global tables | Permanently excluded; see §6 |
