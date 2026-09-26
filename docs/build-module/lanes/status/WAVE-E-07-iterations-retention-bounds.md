# WAVE-E-07: Iterations and Retention — Box 4 Bounds Audit

Agent B-7. Session date: 2026-09-26.

---

## Task

Close box 4 ("Lists are bounded/virtualized and remain usable at 10k work items and 1k members") on:

- `docs/build-module/10-project-settings-iterations.md`
- `docs/build-module/10-project-settings-retention.md`

---

## Iterations page

### List enumeration

| Surface | Hook / query | Server-side bound | Virtualisation | At 10k items |
|---|---|---|---|---|
| Duration select | None (static `DURATION_OPTIONS` constant, 4 entries, `as const`) | N/A — compile-time constant | N/A | Unaffected — no server fetch |
| Naming prefix input | None (scalar field) | N/A | N/A | Unaffected |
| Settings fetch | `useIterationSettings(projectId)` → `GET /build/:projectId/settings/iterations` | `.limit(1)` at `projects-settings-iterations.service.ts:29` | N/A | Single-row read |

**No growable list exists.** `DURATION_OPTIONS` is a 4-element `as const` array declared at
`features/build/settings/project-settings-iterations-page.tsx:40-45`. It is not server-fetched and
cannot grow. The backend `getSettings` method selects one row from `projects` with `.limit(1)`.
There is nothing to bound or virtualise.

### Backend service queries (read for completeness)

- `getSettings` (`projects-settings-iterations.service.ts:25`): `.select(...).from(projects).where(...).limit(1)` — single row
- `updateSettings` (`projects-settings-iterations.service.ts:44`): `.select(...).limit(1)` read + `.update(projects).set(...)` — single row

No unbounded collection query anywhere in the iterations settings surface.

### Box 4 verdict

Satisfiable by absence of a growable list. Both halves of the criterion hold:
- "Bounded" — the only selects use `.limit(1)`.
- "Usable at 10k / 1k" — a singleton settings form has no data volume dependency.

**Box 4 ticked.**

---

## Retention page

### List enumeration

| Surface | Hook / query | Server-side bound | Virtualisation | At 10k items |
|---|---|---|---|---|
| Section tabs (Policy / Holds) | None (`NAV_SECTIONS` = 2-element `as const`) | N/A — compile-time constant | N/A | Unaffected |
| Retention period selects (3 rows) | None (`RETENTION_DAYS_OPTIONS` = 5-element `as const` from schema) | N/A — compile-time constant | N/A | Unaffected |
| Legal hold status display | None (scalar fields from singleton settings) | N/A | N/A | Unaffected |
| Settings fetch | `useProjectRetentionSettings(projectId)` → `GET /build/:projectId/settings/retention` | `.limit(1)` at `projects-retention-settings.service.ts:81` | N/A | Single-row read |

**No growable list exists.** The page renders a 2-section form. Both sections present static
dropdowns and scalar status fields drawn from a single settings row. The `projectRetentionSettings`
table has a unique constraint on `(org_id, project_id)` (see
`backend/migrations/1295_build_project_retention_settings.sql`) — at most one row per project.

### Backend service queries (read for completeness)

- `getSettings` (`projects-retention-settings.service.ts:64`): two `.limit(1)` selects
- `updatePolicy` (`projects-retention-settings.service.ts:102`): two `.limit(1)` selects + upsert
- `setLegalHold` (`projects-retention-settings.service.ts:171`): two `.limit(1)` selects + update/insert

No unbounded collection query anywhere in the retention settings surface.

### Box 4 verdict

Satisfiable by absence of a growable list. Both halves of the criterion hold:
- "Bounded" — every select uses `.limit(1)` against a singleton table.
- "Usable at 10k / 1k" — a singleton settings form has no data volume dependency.

**Box 4 ticked.**

---

## Tests added

### Iterations

File: `frontend/features/build/settings/project-settings-iterations-page.test.tsx`

Added to the existing test suite:

```
it("has no data table or paginated list — singleton settings form satisfies box 4 by absence of a growable collection")
```

Verifies `queryByRole("table")` and `queryByRole("grid")` return null; confirms the duration select
and naming prefix input are the only rendered controls. Fails if a DataTable or list component is
introduced.

### Retention

File: `frontend/features/build/settings/project-settings-retention-page.test.tsx`

Added as `describe("ProjectSettingsRetentionPage — box 4: no growable list (BLD-RETENTION-007)", ...)`:

```
it("has no data table or paginated list — singleton settings form satisfies box 4 by absence of a growable collection")
it("renders exactly two section navigation buttons — static NAV_SECTIONS collection is bounded at compile time")
```

First test: `queryByRole("table")` and `queryByRole("grid")` return null. Fails if a DataTable is
added. Second test: exactly the "Policy" and "Legal Holds" buttons are present (exact match,
avoiding the "Save policy" button). Fails if a third section is added without review.

---

## Test run output (verbatim)

### Iterations — 8/8 passed

```
PASS features/build/settings/project-settings-iterations-page.test.tsx
  √ renders no-permission state and not the form when page state is denied (52 ms)
  √ renders error state when settings fetch fails (8 ms)
  √ does not show denial state while the access snapshot is still loading (9 ms)
  √ renders the duration select and naming prefix input with loaded settings values (37 ms)
  √ calls the update mutation with changed form values on save (90 ms)
  √ hides the save button when the user lacks build:update permission (19 ms)
  √ disables form fields while the mutation is pending (28 ms)
  √ has no data table or paginated list — singleton settings form satisfies box 4 by absence of a growable collection (19 ms)

Tests: 8 passed, 8 total
```

### Retention — 20/20 passed

```
PASS features/build/settings/project-settings-retention-page.test.tsx
  ProjectSettingsRetentionPage — access control (BLD-RETENTION-001) ... 3 passed
  ProjectSettingsRetentionPage — keyboard shortcuts (BLD-RETENTION-002) ... 2 passed
  ProjectSettingsRetentionPage — URL state / section param (BLD-RETENTION-003) ... 4 passed
  ProjectSettingsRetentionPage — policy section (BLD-RETENTION-004) ... 3 passed
  ProjectSettingsRetentionPage — holds section (BLD-RETENTION-005) ... 3 passed
  ProjectSettingsRetentionPage — box 4: no growable list (BLD-RETENTION-007) ... 2 passed
  ProjectSettingsRetentionPage — schema type predicate (BLD-RETENTION-006) ... 3 passed

Tests: 20 passed, 20 total
```

---

## Summary

Both pages are singleton settings forms. Neither renders a growable list. Every backend query
uses `.limit(1)`. Box 4 is ticked on both pages on the explicit grounds that no unbounded
collection exists to bound or virtualise.
