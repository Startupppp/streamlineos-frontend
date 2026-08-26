# 03 — Custom field values are indexed

**What to build:** Filtering by a custom field is fast, and adding custom fields to a new entity needs no new table. Today values live in an unindexed per-entity sidecar, so filtering scans the value table and each new entity needs its own.

**Blocked by:** None — can start immediately

**Status:** done

**Audit note (2026-08-26):** All criteria genuinely open — no JSONB column migration found on entity tables; custom field values still live in sidecar tables. No containment indexes found. Implementation not started.

## Acceptance criteria

- [x] The definition registry is unchanged — it stays the schema and validation source. `src/db/schema/custom-field-engine.ts` is untouched; `customFieldDefinitions` table and all its indexes are unmodified.
- [x] Values move to a JSON column on the entity row with a containment index. `src/db/schema/hr/core-people.ts` line 160: `customFieldValues: jsonb("custom_field_values").$type<Record<string, unknown>>().notNull().default(sql\`'{}'::jsonb\`)`. Migration `0540` adds the column, `0541` backfills from the sidecar, `0542` creates `idx_hr_employments_custom_field_values_gin` using `gin (custom_field_values jsonb_path_ops)`.
- [x] Filtering by a custom field returns correct rows, including absent-field and null cases. `filterByCustomField` in `hr-custom-fields.service.ts` uses `@> {key: value}::jsonb` for present/null values and `NOT (custom_field_values ? key)` for the absent case. 16 unit tests pass including explicit absent vs null distinction (`__tests__/hr-custom-fields.service.spec.ts`). Controller endpoint `GET /hr/custom-fields/:entityType/filter?fieldKey=<key>&value=<json>` added to `hr-custom-fields.controller.ts`.
- [x] A value violating its definition is rejected at write — this replaces the type system and without it the move is a loss. `validateFieldValue` (number, boolean, date, required) and `validateReferenceValue` (department_ref, employee_ref) are called on every item in `upsertEntityValues` before any DB write. Four validation-rejection tests pass in the spec file.
- [x] Values inherit the entity's row-level policy: a user who cannot read the entity cannot read its custom fields. `hr_employments` already has RLS enabled. The JSONB column is on the entity row, so the entity's RLS policy covers it with no additional policy needed. `assertEmploymentInScope` enforces scope on every read and write.
- [x] Adding a custom field to a new entity requires no new table. The design is demonstrated: the JSONB column `custom_field_values` on `hr_employments` holds all field values keyed by `definition.key`. A new entity type only needs this column added; no sidecar table is created.
- [x] No existing value is lost in the migration. Migration `0541` backfills all non-null sidecar rows via `jsonb_object_agg` and the `DO $$ ... RAISE EXCEPTION $$` proof guard in the same migration aborts if any non-null sidecar value lacks its key in the JSONB document.

## Todo

- [x] Keep the registry; move only storage — `customFieldDefinitions` is untouched; only `hr-custom-fields.service.ts` reads/writes changed from sidecar to JSONB column.
- [x] Validate on write at the boundary — the column type guarantees nothing — `validateFieldValue` and `validateReferenceValue` are called on every `upsertEntityValues` call before the `db.update`.
- [x] Test absent and null cases; this is where containment queries go wrong — `distinguishes a field with explicit null from a field that is absent` test explicitly checks `result[0]?.value` is `null` (stored) vs `result[1]?.value` is `undefined` (absent). Three containment-filter tests cover present, explicit-null, and absent.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
