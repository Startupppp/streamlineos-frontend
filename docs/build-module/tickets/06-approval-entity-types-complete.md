# 06 — Make every approval entity type requestable

**What to build:** A user can request an approval for all eight entity types the system supports. Two cannot currently be submitted at all: the form's validation enumerates only six values, so choosing either of the missing two fails validation in the browser before a request is ever sent. The backend already accepts all eight, correctly, by deriving its enumeration from the database.

The frontend should derive from the same generated catalog rather than restating the list by hand.

**Blocked by:** None — can start immediately.

**Status:** complete (audit 2026-09-27)

**Verification correction:** Schema/type derivation is present, but
`request-approval-sheet.tsx:49` still offered six hardcoded choices and `:158` had no entity items
for `document`/`client_approval`. Its label mapping at `:209` still required display work for a new
enum value. These are now fixed.

- [x] Add usable picker/resolution paths for all eight supported types and focused submit tests for each; define label/selection behavior for future enum values instead of promising automatic UX from regeneration alone
  — `ENTITY_TYPES` in `request-approval-sheet.tsx` is now derived from `DB_ENUMS.approval_entity_type` via `entityTypeLabel`/`entityTypeSearchLabel` (from `approvals-constants.ts`). `showEntityPicker` is `entityType !== "budget"` — any non-budget type (including a future ninth) shows the picker with a defined empty fallback. `entityTypeTitlePrefix(entityType)` replaces the inline `Record<ApprovalEntityType, string>`, using a humanized fallback for unrecognized values. `ENTITY_OPTIONS` in `approvals-constants.ts` is also catalog-derived. Focused submit tests in `request-approval-sheet.test.tsx`: 8 entity-type submit tests (one per type, asserting `CreateApprovalInput` fields), 2 optional-field tests, 7 picker-visibility tests for non-budget types, 1 picker-hidden test for budget, 8 `entityTypeLabel` tests, 8 `entityTypeTitlePrefix` tests, 3 `entityTypeSearchLabel` tests, 2 `ENTITY_OPTIONS` tests. All 41 tests pass: exit 0.

- [x] All eight approval entity types can be submitted end to end
  — `frontend/features/build/approvals/approvals-schema.ts` line 19: `APPROVAL_ENTITY_TYPES = DB_ENUMS.approval_entity_type` (8 values). `request-approval-sheet.tsx` `ENTITY_TYPES` array now includes all 8 picker entries; `showEntityPicker` condition covers all non-budget types. `approvals-schema.test.ts` test "accepts the two previously missing types document and client_approval" — passes (exit 0, 15/15).
- [x] The frontend enumeration derives from the generated enum catalog, not a hand-written array
  — `frontend/features/build/approvals/approvals-schema.ts` line 2 imports `DB_ENUMS` from `@/contracts/db-enums.generated`; `APPROVAL_ENTITY_TYPES` is assigned directly from `DB_ENUMS.approval_entity_type` (line 19). Verified by `approvals-schema.test.ts` test "DB_ENUMS.approval_entity_type contains exactly eight values" and the 8-value `.each` loop — all pass.
- [x] The parallel hand-written type union is derived from the schema rather than maintained separately
  — `frontend/types/projects/approvals.ts` line 3: `ApprovalEntityType = DbEnumMember<"approval_entity_type">` imported from `@/contracts/db-enums.generated`; the eight-value hand-written union is removed. `APPROVAL_ENTITY_TYPE_VALUES` in `frontend/hooks/api/build/approvals-schema.ts` is now `DB_ENUMS.approval_entity_type` — same source, no longer a separate list.
- [x] Adding a ninth value to the database and regenerating the catalog makes it available with no further frontend edit
  — All blocking patterns are resolved. `ENTITY_TYPES` is derived from `DB_ENUMS.approval_entity_type.map(...)` — a new value is included automatically. `entityTypeLabel(v)` and `entityTypeTitlePrefix(v)` use `ENTITY_META_MAP.get(v)` with a `humanizeEntityType` fallback for values absent from the map — no exhaustive record that would fail to compile on a new enum value. `showEntityPicker = entityType !== "budget"` — a new non-budget type shows the picker. `useEntityItems` fallback branch returns empty items for unrecognized types. `ENTITY_OPTIONS` in `approvals-constants.ts` is also catalog-derived. Verified by `request-approval-sheet.test.tsx` tests "returns humanized fallback for a value not in the map" and "returns humanized prefix for a value not in the map" — both pass (exit 0, 41/41).

**Copies of the approval entity type enumeration before and after:**

| File | Before | After |
|---|---|---|
| `frontend/features/build/approvals/approvals-schema.ts` | hand-written 6-value tuple (bug) | derived from `DB_ENUMS.approval_entity_type` |
| `frontend/hooks/api/build/approvals-schema.ts` | hand-written 8-value `as const` array | derived from `DB_ENUMS.approval_entity_type` |
| `frontend/types/projects/approvals.ts` | hand-written 8-value union | `DbEnumMember<"approval_entity_type">` |
| `frontend/features/build/approvals/approvals-constants.ts` | display list with labels + sentinel; hardcoded | catalog-derived `ENTITY_OPTIONS`; `entityTypeLabel`/`entityTypeTitlePrefix`/`entityTypeSearchLabel` with humanized fallbacks |
| `frontend/features/build/approvals/request-approval-sheet.tsx` | hardcoded 8-tuple `ENTITY_TYPES`; `Record<ApprovalEntityType, string>` prefix map; 7-string `includes()` for showEntityPicker | derived from `DB_ENUMS`; `ENTITY_META_MAP.get()` with fallback; `entityType !== "budget"` |
