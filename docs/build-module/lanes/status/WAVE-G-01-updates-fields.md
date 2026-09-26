## Wave-G-01 — updates fields, author name

Session agent: G-01  
Page: `10-project-updates.md`

---

### Deliverables

| File | Change |
|------|--------|
| `backend/migrations/1305_build_project_updates_content_fields.sql` | Adds `wins`, `risks`, `next`, `citations` (nullable text) to `build.project_updates` |
| `backend/migrations/1305_build_project_updates_content_fields_rollback.sql` | Drops those four columns |
| `backend/src/db/schema/build/project-updates.ts` | Four new nullable text columns in the Drizzle schema |
| `backend/src/modules/build/updates/dto/updates-response.schemas.ts` | `updateRowSchema` extended: `authorName`, `wins`, `risks`, `next`, `citations` |
| `backend/src/modules/build/updates/dto/updates.schemas.ts` | `createUpdateSchema` and `editUpdateSchema` extended with optional wins/risks/next/citations |
| `backend/src/modules/build/updates/updates.service.ts` | LEFT JOIN on `organizationMembers` + `users`; `COALESCE(name, email, 'Unknown')` projected as `authorName`; new fields projected in `listUpdates`; `selectFullRow` private helper; create/edit now insert/update new fields and return full joined row |
| `frontend/hooks/api/build/project-updates-schema.ts` | `updateRowContract` extended with `authorName`, `wins`, `risks`, `next`, `citations` |
| `frontend/hooks/api/build/project-updates.ts` | `ProjectUpdateRow` and `CreateProjectUpdateInput` extended |
| `frontend/features/build/updates/updates-schema.ts` | `createUpdateSchema` extended with optional wins/risks/next/citations |
| `frontend/features/build/updates/update-form-fields.tsx` | Four new labeled Textarea fields (Wins, Risks, Next, Citations) |
| `frontend/features/build/updates/updates-page.tsx` | `UpdateCard` renders `authorName` and the four new sections (null-guarded); form now uses `UpdateFormFields` |
| `frontend/features/build/updates/updates-page.test.tsx` | `makeUpdateRow` factory with new fields; 10 new paired tests (author name ×2, wins ×2, risks ×2, next ×2, citations ×2) |
| `frontend/features/build/updates/update-form-dirty-guard.test.tsx` | `getByRole("textbox")` scoped to `{ name: /^update$/i }` to survive multiple text areas |

---

### Field shape decision

All four fields (`wins`, `risks`, `next`, `citations`) are **nullable text** columns, not arrays.

Justification:
- The spec's detail response lists them as peer fields to `body` and `summary` — top-level narrative sections, not collections of structured items.
- BE-42 bans JSONB arrays for entities that need indexing, pagination, or soft-delete. These are editorial text fields (prose, not records). The same logic that makes `body` a `text` column applies here.
- Nullable (not NOT NULL with a default) because existing rows must remain valid without backfill. NULL means "the author did not provide this section," which is the correct sentinel.

---

### Author name join

Follows `client-portal.service.ts:249` exactly:
```sql
COALESCE(users.name, users.email, 'Unknown')
```
via LEFT JOIN through `organizationMembers` (`org_id + id` composite) then `users` (`user_id`). A LEFT JOIN means a dangling membership gracefully falls back to 'Unknown' rather than dropping the row.

`updateRowSchema.authorName` is `z.string()` (never null, COALESCE guarantees a value).

---

### Deploy-ordering risk

**The backend code (service + schema) selects `projectUpdates.wins` etc. which do not exist in the database until migration 1305 is applied. Deploying the backend before applying migration 1305 will cause every request to `GET /build/:projectId/updates` to raise `42703` (undefined_column) and return 500.**

Apply migration 1305 before the backend is deployed. The migration is additive (ADD COLUMN IF NOT EXISTS on an existing table) and backward-compatible with any currently-deployed frontend that does not reference the new columns.

The openapi.json vendor file has NOT been hand-edited. The orchestrator must regenerate it after applying the migration and deploying the backend, or `check:permission-binding` and the drift gate will be disarmed.

---

### Test run output

```
PASS features/build/updates/update-form-dirty-guard.test.tsx
PASS features/build/updates/updates-page.test.tsx

Test Suites: 2 passed, 2 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        5.182 s
```

36 tests: 23 pre-existing + 3 dirty-guard + 10 new field tests.

---

### Criteria status

| # | Criterion | Status |
|---|-----------|--------|
| C3 | Fields, states, permissions | **OPEN** — see remaining gap below |

### Remaining gap blocking C3

The Permissions table in `10-project-updates.md` lists "Edit: Yes/Yes/Own-or-explicit permission/No." No frontend edit form exists (the backend PATCH route at `PATCH /build/:projectId/updates/:updateId` accepts `body`, `wins`, `risks`, `next`, `citations` and is fully implemented). Without an edit form, the edit action is not testable from the UI, and the permission row in the spec is not validated. An `EntityFormSheet` (≥6 fields: body + 4 content + status/audience) wired to the PATCH route would close this gap. The `e` shortcut (per CCG-4) is not required until the edit target exists.
