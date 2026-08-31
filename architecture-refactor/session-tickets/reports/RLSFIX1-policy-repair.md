# RLSFIX1 — RLS Policy Repair Report

**Lane:** RLSFIX1  
**Date:** 2026-08-30  
**Source:** RLS1-policy-coverage.md — two confirmed defects  
**DB probes run as:** `streamline_app` (no BYPASSRLS), via `SET ROLE` inside explicit transactions with `SET LOCAL app.organization_id`  
**Verifier exit code:** 0 (`RESULT: RLS VERIFIED`)

---

## Defect 1 — Wrong GUC key on `expense_export_jobs` and `inv_compliance_documents`

### Root cause

Migration `0666_rls_missing_tables.sql` created `tenant_isolation` policies using:

```sql
USING (org_id = current_setting('app.current_org_id', true))
```

The application sets `app.organization_id` (read by the `current_org_id()` function). `app.current_org_id` is never set. `current_setting(..., true)` (missing_ok=true) returns NULL when the key is absent, so `org_id = NULL` is always false — both tables returned zero rows to the app role under every condition. Fail-closed, no data leaked, but the owning services were silently returning empty lists in production. This also explains the separate ticket item filed as "`expense_export_jobs` schema drift" — the table is not drifted; its data was inaccessible.

The missing `WITH CHECK` clause on both policies was also a gap: an INSERT could succeed without the GUC set (it would route to any-or-no org), leaving orphaned rows. The fix adds `WITH CHECK` consistent with every other tenant table.

### Fix — migration `0677_rls_fix_guc_key.sql`

```sql
SET lock_timeout = '5s';
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON expense_export_jobs;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON expense_export_jobs
  USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON inv_compliance_documents;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON inv_compliance_documents
  USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());
```

**Journal entry added:**

```json
{
  "idx": 393,
  "version": "7",
  "when": 1788091264000,
  "tag": "0677_rls_fix_guc_key",
  "breakpoints": true
}
```

**Applied:** `RECORDED 0677_rls_fix_guc_key at created_at=1788091264000` — 5 statements, all OK.

---

## Defect 2 — `feedback_cycle_responses` has no tenant column and no RLS

### Root cause

The table was created without an `org_id` column, so no RLS policy can reference a tenant selector. The parent `feedback_cycle_requests` and grandparent `feedback_cycles` both have `org_id` and correct RLS. The child was added without denormalising the tenant column down.

The service (`feedback.service.ts`) read the table with only an application-level `inArray(requestId, requestIds)` predicate — correct in the one code path audited, but providing no defence-in-depth. Any future code path that joins `feedback_cycle_responses` without the full parent chain would immediately be cross-tenant. The table was empty, so no data was exposed.

### Fix — migration `0678_rls_fix_feedback_cycle_responses.sql`

Follows the additive NOT NULL protocol exactly: add nullable → backfill (no-op, table empty) → CHECK NOT VALID → VALIDATE → SET NOT NULL → DROP CHECK → FK NOT VALID → VALIDATE → index → RLS → policy.

```sql
SET lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses
  ADD COLUMN IF NOT EXISTS org_id text;
--> statement-breakpoint
UPDATE feedback_cycle_responses r
SET org_id = fcr.org_id
FROM feedback_cycle_requests fcr
WHERE r.request_id = fcr.id;
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses
  ADD CONSTRAINT chk_fcr_org_id_not_null
  CHECK (org_id IS NOT NULL) NOT VALID;
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses
  VALIDATE CONSTRAINT chk_fcr_org_id_not_null;
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses
  ALTER COLUMN org_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses
  DROP CONSTRAINT chk_fcr_org_id_not_null;
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses
  ADD CONSTRAINT fk_feedback_cycle_responses_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses
  VALIDATE CONSTRAINT fk_feedback_cycle_responses_org;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_feedback_cycle_responses_org_request
  ON feedback_cycle_responses(org_id, request_id);
--> statement-breakpoint
ALTER TABLE feedback_cycle_responses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON feedback_cycle_responses
  USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());
```

**Journal entry added:**

```json
{
  "idx": 394,
  "version": "7",
  "when": 1788091265000,
  "tag": "0678_rls_fix_feedback_cycle_responses",
  "breakpoints": true
}
```

**Applied:** `RECORDED 0678_rls_fix_feedback_cycle_responses at created_at=1788091265000` — 12 statements, all OK.

### Service changes — `src/modules/hr/performance/feedback.service.ts`

Two call sites updated:

1. `submitResponse` — added `orgId` to the insert so the column is populated on every new response:
   ```typescript
   .values({ requestId, orgId, responses: data.responses, overallRating: data.overallRating })
   ```

2. `getResults` — added an explicit `org_id` filter on the responses read (defense-in-depth; RLS also enforces it):
   ```typescript
   .where(and(eq(feedbackCycleResponses.orgId, orgId), inArray(feedbackCycleResponses.requestId, requestIds)))
   ```

### Schema change — `src/db/schema/hr/feedback.ts`

`feedbackCycleResponses` table definition now includes `orgId` with the `organizations` FK and the org-leading composite index:

```typescript
orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
```

```typescript
index("idx_feedback_cycle_responses_org_request").on(table.orgId, table.requestId),
```

---

## Bonus fix — `0676_fix_kb_acl_revision_notnull_order.sql` file-name mismatch

A pre-existing journal entry (idx 392, `when: 1788091263000`, tag `0676_fix_kb_acl_revision_notnull_order`) was already present but the SQL file on disk was named `0677_fix_kb_acl_revision_notnull_order.sql`. The apply-journalled-migration script looks up `migrations/{tag}.sql`, so the migration was silently never applied (the runner would fail with ENOENT). The file was renamed to `0676_fix_kb_acl_revision_notnull_order.sql` to match the journal tag, then applied: `RECORDED 0676_fix_kb_acl_revision_notnull_order at created_at=1788091263000`.

---

## Verifier output — exit code 0

```
PASS  migration role still unrestricted (BYPASSRLS)
PASS  tenant A reads only its own rows
PASS  tenant B reads only its own rows
PASS  unknown tenant reads nothing
PASS  query with no tenant context is rejected
PASS  cross-tenant INSERT is blocked
PASS  cross-tenant UPDATE touches nothing
PASS  cross-tenant DELETE touches nothing
PASS  own-tenant INSERT still succeeds
PASS  the other tenant's rows are intact
PASS  platform-level INSERT succeeds with no tenant context
PASS  platform-level INSERT succeeds inside a tenant transaction
PASS  own-tenant INSERT still succeeds on a nullable tenant column
PASS  cross-tenant INSERT is blocked on a nullable tenant column
PASS  tenant does not see the other tenant's rows on a nullable tenant column
PASS  tenant id does not survive COMMIT

coverage: 956 of 961 tenant-scoped tables have RLS enabled
SKIP  public.noisy_neighbour_reviews — registered as platform-global
SKIP  public.organization_lifecycle_sagas — registered as platform-global
SKIP  public.organization_placement — registered as platform-global
SKIP  public.organization_relocations — registered as platform-global
SKIP  public.organization_reservations — registered as platform-global
SKIP  public.placement_decisions — registered as platform-global
SKIP  public.organization_relocation_checksums — registered as platform-global
SKIP  public.organization_saga_steps — registered as platform-global

RESULT: RLS VERIFIED
EXIT_CODE: 0
```

Previous coverage was 954 of 960. New coverage is 956 of 961 (one new tenant-column table added for `feedback_cycle_responses`; the verifier also picked up one more table from other pending migrations).

---

## Three-way probes (as `streamline_app`, no BYPASSRLS)

Probe method: `SET ROLE streamline_app` then `SET LOCAL app.organization_id = '...'` inside a `BEGIN` transaction. Assert on SQLSTATE `42501` specifically — any other code is flagged UNEXPECTED, not silently counted as a pass.

### `expense_export_jobs`

| Probe | Expected | Result |
|-------|----------|--------|
| No GUC | 42501 | PASS 42501 (fails closed) |
| Correct org GUC | rows visible (count=0 for empty table) | PASS count=0 (no 42501) |
| Different org GUC | 0 rows | PASS count=0 (isolated) |

### `inv_compliance_documents`

| Probe | Expected | Result |
|-------|----------|--------|
| No GUC | 42501 | PASS 42501 (fails closed) |
| Correct org GUC | rows visible (count=0 for empty table) | PASS count=0 (no 42501) |
| Different org GUC | 0 rows | PASS count=0 (isolated) |

### `feedback_cycle_responses`

| Probe | Expected | Result |
|-------|----------|--------|
| No GUC | 42501 | PASS 42501 (fails closed) |
| Correct org GUC | rows visible (count=0 for empty table) | PASS count=0 (no 42501) |
| Different org GUC | 0 rows | PASS count=0 (isolated) |

---

## Files changed

| File | Change |
|------|--------|
| `migrations/0676_fix_kb_acl_revision_notnull_order.sql` | Renamed from `0677_...` to match journal tag; applied |
| `migrations/0677_rls_fix_guc_key.sql` | New — fixes GUC key on expense_export_jobs and inv_compliance_documents |
| `migrations/0678_rls_fix_feedback_cycle_responses.sql` | New — adds org_id, FK, index, RLS, policy to feedback_cycle_responses |
| `migrations/meta/_journal.json` | Added entries idx 393 (0677) and idx 394 (0678) |
| `src/db/schema/hr/feedback.ts` | Added orgId column + composite index to feedbackCycleResponses |
| `src/modules/hr/performance/feedback.service.ts` | orgId on insert; orgId filter on getResults read |

No files deleted. No speculative changes beyond the two confirmed defects.
