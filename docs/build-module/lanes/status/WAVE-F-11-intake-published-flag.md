# Wave-F-11 status: intake published-flag guard

**Lane:** F-11 — intake published-flag (stage 1)
**Criterion:** `10-public-intake.md` box 2 — "The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence."
**Status: BOX 2 REMAINS UNTICKED — stage 1 closes capability 2 only; stage 2 needed for the existence oracle**

---

## Finding re-verified

**Route:** `POST /public/intake/:projectId`
**File:** `backend/src/modules/public/public.controller.ts:328–339`
**Param schema:** `projectIdParams = z.object({ projectId: z.coerce.number().int().positive() }).strict()` at line 110
**Service:** `backend/src/modules/public/intake.service.ts:43–102`

Three oracle capabilities confirmed in current code before this wave's changes:

1. **Sequential integer in URL** — `projectId` is `generatedAlwaysAsIdentity()`, platform-wide sequential. All five sibling write endpoints use opaque tokens.
2. **201 vs 400 existence oracle** — `app.resolve_project_org_id(projectId)` (SECURITY DEFINER, called outside tenant transaction) returns null for never-existed projects → 400; returns orgId for live projects → inserts + 201. Walking 1, 2, 3… reveals which projects exist across all tenants.
3. **Uninvited cross-tenant anonymous writes** — any live project accepted anonymous intake submissions without opting in. Fixed by this wave.

---

## Migration decision: `intake_published_at timestamptz` nullable on `build.projects`

**Column chosen: nullable `timestamptz`**, named `intake_published_at`. Rationale:

- Matches the lifecycle pattern used throughout this schema (`deleted_at`, `legal_hold_set_at`): `NULL = not in state`, timestamp value = in state with temporal provenance.
- A `boolean` carries no audit trail of when publication happened; a timestamp is strictly more useful.
- Consistent with migration 1275 (`roadmap_public_token`), which also uses a nullable column to express "not published" without a backfill default.

**Trade-off between the two backfill choices:**

| Choice | Production impact | Leak 3 status |
|---|---|---|
| Default NULL, no backfill | Breaks all existing intake forms immediately after deployment | Closed for all rows |
| Default NULL, backfill existing rows to `now()` | Existing intake forms continue working | Leak 3 open for pre-migration rows (they are all "published") |

**Decision: backfill existing rows.** The migration sets `intake_published_at = now()` for all non-deleted projects at apply time. This preserves every live intake URL. The trade-off is that every project that existed before the migration is treated as "published" regardless of whether its intake form was ever shared. A follow-up backfill — outside this migration — should review which projects genuinely have published intake forms and reset `intake_published_at = NULL` on the rest. That follow-up cannot be done in a migration because the information lives in the application (which projects deliberately exposed their intake URL) rather than the database schema.

---

## Migration files

- **Forward:** `backend/migrations/1300_build_projects_intake_published_flag.sql`
  - Precondition DO-block: asserts `build.projects` exists, asserts `intake_published_at` does not yet exist.
  - `ALTER TABLE build.projects ADD COLUMN IF NOT EXISTS intake_published_at timestamptz`
  - `UPDATE build.projects SET intake_published_at = now() WHERE deleted_at IS NULL` (backfill)
  - Post-check DO-block: asserts column exists and is nullable.

- **Rollback:** `backend/migrations/1300_build_projects_intake_published_flag_rollback.sql`
  - Precondition DO-block: asserts `intake_published_at` exists (cannot roll back what is not there).
  - `ALTER TABLE build.projects DROP COLUMN IF EXISTS intake_published_at`

Both follow the 1295 template: `SET lock_timeout = '5s'`, `statement-breakpoint` after each statement, precondition DO-block, DDL, post-check DO-block.

**The migration is NOT journalled and NOT applied. The orchestrator journals and applies.**

---

## Deploy-ordering risk

**Railway ships every backend push. The guard code depends on the `intake_published_at` column. If the guard code is deployed before the migration is applied, the service will attempt to select `projects.intakePublishedAt` from a column that does not exist, which will raise `42P01` (undefined column) and crash every intake submission request — 500 for all callers.**

The guard in `intake.service.ts` is **not safe to deploy before the migration is applied.**

Safe sequence:
1. Orchestrator journals and applies migration 1300 (adds `intake_published_at` column, backfills existing rows).
2. Backend code with the guard is deployed (Railway).

There is no safe way to deploy the guard ahead of the migration. If a phased rollout is needed, a feature flag on the guard itself would be required.

---

## Schema change

`backend/src/db/schema/build/core.ts` — `projects` table, new field:
```
intakePublishedAt: timestamp("intake_published_at", { withTimezone: true }),
```

Nullable by design (no `.notNull()`). Type inferred as `Date | null`.

---

## Guard wiring

`backend/src/modules/public/intake.service.ts` — inside the tenant transaction, after the project row is read:

```typescript
const [project] = await tx
  .select({ id: projects.id, intakePublishedAt: projects.intakePublishedAt })
  .from(projects)
  .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
  .limit(1);
if (!project) return null;
if (project.intakePublishedAt == null) return null;
```

Both `null` returns follow the same code path: the outer `if (!item) throw new BadRequestException("Invalid request")` fires. The response to an unpublished project is therefore byte-identical to the response to a non-existent project: same HTTP status (400), same error code, same message body.

The SECURITY DEFINER call (`app.resolve_project_org_id`) outside the tenant transaction is preserved unchanged. The published check runs inside the tenant transaction where RLS is live — the same structure the previous wave verified as correct.

---

## Tests

File: `backend/src/modules/public/intake-response-shape.spec.ts`

9 tests, all pass:

**Pre-existing (preserved):**
1. "returns only a message string on success"
2. "does not include a sequential id in the success response"
3. "throws BadRequestException when the project id does not resolve to any org"
4. "throws BadRequestException when the org resolves but the project is absent under RLS"
5. "both refusal paths produce the same message — walking the id space learns nothing"

**New (published-flag guard):**
6. "accepts a submission when intake_published_at is set" — positive pair
7. "refuses a submission when intake_published_at is null" — negative
8. "unpublished project and non-existent project produce byte-identical errors" — oracle neutrality
9. "refusing an unpublished project leaves the negative assertion paired with a published acceptance" — prevents vacuous negative

All 9 pass (`npx jest --runTestsByPath src/modules/public/intake-response-shape.spec.ts`).

---

## Box 2 assessment

Box 2 is **not ticked**. Stage 1 closes capability 2 (uninvited anonymous writes to unpublished projects) but stage 2 must close the existence oracle: stage 2 must replace the sequential integer `projectId` in the URL with an opaque token so that the path segment itself reveals nothing.
